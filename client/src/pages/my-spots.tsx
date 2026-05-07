import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addManySpots, dedupeMySpots, getMySpots, removeSpot, updateSpot, type MySpot } from "@/lib/mySpots";
import { Map as MapIcon, Trash2, PlusCircle, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getFishSpeciesById } from "@/lib/fishSpecies";
import { formatSize } from "@/lib/utils";
import { pushMySpotsToCloud } from "@/lib/mySpotsCloud";

export default function MySpotsPage() {
  const { toast } = useToast();
  const [spots, setSpots] = useState<MySpot[]>(() => getMySpots());
  const [noteDraft, setNoteDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const { data: catches = [] } = useQuery({
    queryKey: ["/api/catches"],
    enabled: true,
  });

  useEffect(() => {
    const refresh = () => setSpots(getMySpots());
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  const spotStats = useMemo(() => {
    const list = Array.isArray(catches) ? (catches as any[]) : [];
    const byName = new Map<
      string,
      { count: number; topSpecies?: string; topSpeciesCount: number; biggest?: { species: string; size: number } }
    >();

    const norm = (s: string) => s.trim().toLowerCase();

    for (const s of spots) {
      byName.set(norm(s.name), { count: 0, topSpeciesCount: 0 });
    }

    // Build counts
    const speciesCounts: Record<string, Record<string, number>> = {};
    for (const c of list) {
      const lake = c.lakeName ? norm(String(c.lakeName)) : "";
      if (!lake || !byName.has(lake)) continue;
      const st = byName.get(lake)!;
      st.count += 1;

      const sp = String(c.species ?? "");
      speciesCounts[lake] = speciesCounts[lake] || {};
      speciesCounts[lake][sp] = (speciesCounts[lake][sp] || 0) + 1;

      const sz = Number(c.size);
      if (Number.isFinite(sz)) {
        if (!st.biggest || sz > st.biggest.size) st.biggest = { species: sp, size: sz };
      }
    }

    // Top species per lake
    for (const [lake, counts] of Object.entries(speciesCounts)) {
      let bestSp = "";
      let bestCt = 0;
      for (const [sp, ct] of Object.entries(counts)) {
        if (ct > bestCt) {
          bestCt = ct;
          bestSp = sp;
        }
      }
      const st = byName.get(lake);
      if (st && bestSp) {
        st.topSpecies = bestSp;
        st.topSpeciesCount = bestCt;
      }
    }

    return byName;
  }, [catches, spots]);

  const importCandidates = useMemo(() => {
    const list = Array.isArray(catches) ? (catches as any[]) : [];
    const existing = spots;

    const normName = (s: string) => s.trim().toLowerCase();
    const metersBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
      // Good enough for small distances; avoids pulling in a geo lib.
      const latM = 111_320;
      const avgLatRad = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
      const lngM = Math.cos(avgLatRad) * 111_320;
      const dLat = (a.latitude - b.latitude) * latM;
      const dLng = (a.longitude - b.longitude) * lngM;
      return Math.hypot(dLat, dLng);
    };

    const isNearExisting = (name: string, latitude: number, longitude: number) => {
      const target = { latitude, longitude };
      const nn = normName(name);
      for (const s of existing) {
        if (normName(s.name) !== nn) continue;
        if (metersBetween(target, { latitude: s.latitude, longitude: s.longitude }) <= 100) return true;
      }
      return false;
    };

    const pick: Array<{ id: string; name: string; latitude: number; longitude: number }> = [];
    const seen = new Set<string>();

    for (const c of list) {
      const name = String(c.lakeName || "").trim();
      const latitude = Number(c.latitude);
      const longitude = Number(c.longitude);
      if (!name) continue;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      // Round to reduce duplicate spots from noisy GPS.
      const latR = Math.round(latitude * 10_000) / 10_000;
      const lngR = Math.round(longitude * 10_000) / 10_000;
      const key = `${normName(name)}|${latR}|${lngR}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (isNearExisting(name, latR, lngR)) continue;

      pick.push({
        id: `catchlake:${encodeURIComponent(normName(name))}:${latR}:${lngR}`,
        name,
        latitude: latR,
        longitude: lngR,
      });
    }

    // Keep the UI tidy; we can add paging later if needed.
    return pick.slice(0, 50);
  }, [catches, spots]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">My Spots</h1>
          <p className="text-sm text-gray-600">Saved lakes/spots on this device.</p>
        </div>
        <div className="flex items-center gap-2">
          {localStorage.getItem("currentUserId") ? (
            <Button
              variant="outline"
              disabled={isCloudSyncing}
              onClick={async () => {
                setIsCloudSyncing(true);
                try {
                  const res = await pushMySpotsToCloud(getMySpots());
                  toast({ title: "Synced", description: `Saved ${res.count} spot(s) to your account.` });
                } catch (e) {
                  toast({
                    title: "Sync failed",
                    description: e instanceof Error ? e.message : "Could not sync spots",
                    variant: "destructive",
                  });
                } finally {
                  setIsCloudSyncing(false);
                }
              }}
            >
              {isCloudSyncing ? "Syncing…" : "Sync"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={spots.length < 2}
            onClick={() => {
              const res = dedupeMySpots(100);
              setSpots(getMySpots());
              toast({
                title: "Cleaned up",
                description:
                  res.removed > 0
                    ? `Merged and removed ${res.removed} duplicate spot${res.removed === 1 ? "" : "s"}.`
                    : "No duplicates found.",
              });
            }}
          >
            Clean up
          </Button>
          <Button
            variant="outline"
            disabled={isImporting || importCandidates.length === 0}
            onClick={() => {
              setIsImporting(true);
              try {
                const res = addManySpots(importCandidates);
                setSpots(getMySpots());
                toast({
                  title: "Imported",
                  description:
                    res.added > 0
                      ? `Added ${res.added} spot${res.added === 1 ? "" : "s"} from catches.`
                      : "No new spots found to import.",
                });
              } finally {
                setIsImporting(false);
              }
            }}
          >
            Import ({importCandidates.length})
          </Button>
          <Button asChild variant="outline">
            <Link href="/map">
              <MapIcon className="h-4 w-4 mr-1" />
              Open map
            </Link>
          </Button>
        </div>
      </div>

      {spots.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            No saved spots yet. Open the map, select a lake, and tap “Save spot”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {spots
            .slice()
            .reverse()
            .map((s) => (
              <Card key={s.id} className="bg-white shadow-sm border border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/my-spots/${encodeURIComponent(s.id)}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                    <div className="text-[11px] text-gray-500 mt-1">
                      Saved {new Date(s.createdAt).toLocaleString()}
                    </div>
                    {s.lastVisitedAt ? (
                      <div className="text-[11px] text-emerald-700 mt-1">
                        Last visited {new Date(s.lastVisitedAt).toLocaleString()}
                      </div>
                    ) : null}
                    {s.notes ? (
                      <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                        Notes: {s.notes}
                      </div>
                    ) : null}

                    {(() => {
                      const st = spotStats.get(s.name.trim().toLowerCase());
                      if (!st) return null;
                      return (
                        <div className="mt-2 text-[11px] text-gray-700">
                          <div>
                            <span className="font-medium">{st.count}</span> catches
                          </div>
                          {st.topSpecies ? (
                            <div>
                              Top species:{" "}
                              <span className="font-medium">
                                {getFishSpeciesById(st.topSpecies)?.name || st.topSpecies}
                              </span>{" "}
                              ({st.topSpeciesCount})
                            </div>
                          ) : null}
                          {st.biggest ? (
                            <div>
                              Biggest:{" "}
                              <span className="font-medium">
                                {getFishSpeciesById(st.biggest.species)?.name || st.biggest.species}
                              </span>{" "}
                              ({formatSize(st.biggest.size)})
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/map?lat=${encodeURIComponent(String(s.latitude))}&lng=${encodeURIComponent(String(s.longitude))}`}>
                        <MapIcon className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link
                        href={`/map?logCatch=1&lakeName=${encodeURIComponent(s.name)}&lat=${encodeURIComponent(
                          String(s.latitude),
                        )}&lng=${encodeURIComponent(String(s.longitude))}`}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Log here
                      </Link>
                    </Button>

                    <Dialog
                      open={editingId === s.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingId(s.id);
                          setNoteDraft(s.notes || "");
                        } else {
                          setEditingId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                          <DialogTitle>Edit notes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="text-sm font-medium">{s.name}</div>
                          <Textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add tips (best time, lure, access, etc.)"
                            className="min-h-[120px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                updateSpot(s.id, { notes: noteDraft.trim() || undefined });
                                setSpots(getMySpots());
                                toast({ title: "Saved", description: "Spot notes updated." });
                                setEditingId(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeSpot(s.id);
                        setSpots(getMySpots());
                        toast({ title: "Removed", description: "Spot removed from My Spots." });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

