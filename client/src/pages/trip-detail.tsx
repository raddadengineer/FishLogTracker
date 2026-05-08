import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveTrip, getTripHistory, type Trip, type TripEntry } from "@/lib/trips";
import { getOfflineCatches } from "@/lib/localStorageSync";
import { getFishSpeciesById } from "@/lib/fishSpecies";

type CatchLike = { id: number; species?: string; size?: number; lakeName?: string; catchDate?: string };

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function durationMs(t: Trip) {
  const a = new Date(t.startedAt).getTime();
  const b = new Date(t.endedAt || new Date().toISOString()).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, b - a);
}

function fmtDuration(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const tripId = params?.id ? String(params.id) : "";

  const { data: catches = [] } = useQuery({ queryKey: ["/api/catches"], enabled: true });

  const trip = useMemo(() => {
    const active = getActiveTrip();
    if (active?.id === tripId) return active;
    return getTripHistory().find((t) => t.id === tripId) || null;
  }, [tripId]);

  const offlineById = useMemo(() => {
    const rows = getOfflineCatches();
    const m = new Map<string, (typeof rows)[number]>();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, []);

  const catchById = useMemo(() => {
    const list = Array.isArray(catches) ? (catches as CatchLike[]) : [];
    const m = new Map<number, CatchLike>();
    for (const c of list) m.set(Number(c.id), c);
    return m;
  }, [catches]);

  const resolved = useMemo(() => {
    if (!trip) return [];
    const out: Array<
      | { kind: "catch"; id: number; species?: string; lakeName?: string; when?: string }
      | { kind: "offlineCatch"; id: string; species?: string; lakeName?: string; when?: string; synced?: boolean }
    > = [];

    for (const e of trip.entries || []) {
      const entry = e as TripEntry;
      if (entry.kind === "catch") {
        const c = catchById.get(entry.catchId);
        out.push({
          kind: "catch",
          id: entry.catchId,
          species: c?.species ? String(c.species) : undefined,
          lakeName: c?.lakeName ? String(c.lakeName) : undefined,
          when: c?.catchDate ? String(c.catchDate) : entry.createdAt,
        });
      } else {
        const oc = offlineById.get(entry.offlineCatchId);
        out.push({
          kind: "offlineCatch",
          id: entry.offlineCatchId,
          species: oc?.species ? String(oc.species) : undefined,
          lakeName: oc?.lakeName ? String(oc.lakeName) : undefined,
          when: oc?.catchDate ? String(oc.catchDate) : entry.createdAt,
          synced: oc?.synced,
        });
      }
    }
    return out;
  }, [trip, catchById, offlineById]);

  const stats = useMemo(() => {
    const speciesCounts: Record<string, number> = {};
    let withLake = 0;
    for (const r of resolved) {
      if (r.lakeName) withLake++;
      const sp = r.species ? String(r.species) : "";
      if (sp) speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
    }
    const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { speciesCounts, topSpecies, withLake };
  }, [resolved]);

  if (!trip) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Trip not found</h1>
            <p className="text-sm text-gray-600">This trip isn’t available on this device.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/trips">Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const ended = Boolean(trip.endedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{trip.name?.trim() ? trip.name.trim() : "Trip summary"}</h1>
          <p className="text-sm text-gray-600">{ended ? "Ended trip" : "Active trip"} • {trip.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/trips">Trips</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/map">Map</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">When</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <div>Start: <span className="font-medium">{fmt(trip.startedAt)}</span></div>
            <div>
              End: <span className="font-medium">{trip.endedAt ? fmt(trip.endedAt) : "—"}</span>
            </div>
            <div className="text-xs text-gray-500">Duration: {fmtDuration(durationMs(trip))}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Totals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <div>
              Entries: <span className="font-medium">{resolved.length}</span>
            </div>
            <div>
              With lake: <span className="font-medium">{stats.withLake}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top species</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            {stats.topSpecies ? (
              <div className="font-medium">
                {getFishSpeciesById(String(stats.topSpecies))?.name || String(stats.topSpecies)}
              </div>
            ) : (
              <div className="text-gray-500">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resolved.length === 0 ? (
            <div className="text-sm text-gray-600">No catches logged in this trip yet.</div>
          ) : (
            resolved.map((r, idx) => {
              const sp = r.species ? (getFishSpeciesById(String(r.species))?.name || String(r.species)) : "Catch";
              const lake = r.lakeName || "(no lake)";
              return (
                <div key={`${r.kind}-${String((r as any).id)}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {sp} • {lake}
                      {r.kind === "offlineCatch" && r.synced === false ? (
                        <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          offline
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500">{r.when ? fmt(r.when) : ""}</div>
                  </div>
                  {r.kind === "catch" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/catches/${encodeURIComponent(String(r.id))}`}>Open</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/offline-catches">Queue</Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

