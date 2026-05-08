import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveTrip, getTripHistory, type Trip } from "@/lib/trips";
import { getOfflineCatches } from "@/lib/localStorageSync";
import { getFishSpeciesById } from "@/lib/fishSpecies";

type CatchLike = { id: number; species?: string; size?: number; lakeName?: string; catchDate?: string };

function titleForTrip(t: Trip) {
  if (t.name && t.name.trim()) return t.name.trim();
  const start = new Date(t.startedAt).toLocaleString();
  return `Trip • ${start}`;
}

export default function TripsPage() {
  const [active, setActive] = useState(() => getActiveTrip());
  const [history, setHistory] = useState<Trip[]>(() => getTripHistory());

  const { data: catches = [] } = useQuery({ queryKey: ["/api/catches"], enabled: true });

  useEffect(() => {
    const refresh = () => {
      setActive(getActiveTrip());
      setHistory(getTripHistory());
    };
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

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

  const allTrips = useMemo(() => {
    const list: Trip[] = [];
    if (active) list.push(active);
    list.push(...history);
    return list;
  }, [active, history]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Trips</h1>
          <p className="text-sm text-gray-600">Trip Mode history saved on this device.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back</Link>
        </Button>
      </div>

      {allTrips.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            No trips yet. Tap “Start Trip” in the header, then log catches. When you’re done, tap “End Trip”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allTrips.map((t) => {
            const ended = Boolean(t.endedAt);
            const entries = t.entries || [];

            // Derive a lightweight summary from the first few entries we can resolve.
            let sampleSpecies: string | undefined;
            for (const e of entries) {
              if (e.kind === "catch") {
                const c = catchById.get(e.catchId);
                if (c?.species) {
                  sampleSpecies = getFishSpeciesById(String(c.species))?.name || String(c.species);
                  break;
                }
              } else {
                const oc = offlineById.get(e.offlineCatchId);
                if (oc?.species) {
                  sampleSpecies = getFishSpeciesById(String(oc.species))?.name || String(oc.species);
                  break;
                }
              }
            }

            return (
              <Card key={t.id} className="bg-white shadow-sm border border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/trips/${encodeURIComponent(t.id)}`} className="hover:underline">
                      {titleForTrip(t)}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="text-xs text-gray-700">
                    <div>
                      <span className="font-medium">{entries.length}</span> entries{" "}
                      <span className="text-gray-500">({ended ? "ended" : "active"})</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Started {new Date(t.startedAt).toLocaleString()}
                      {t.endedAt ? ` • Ended ${new Date(t.endedAt).toLocaleString()}` : ""}
                    </div>
                    {sampleSpecies ? (
                      <div className="text-[11px] text-gray-600 mt-1">Sample species: {sampleSpecies}</div>
                    ) : null}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/trips/${encodeURIComponent(t.id)}`}>View summary</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

