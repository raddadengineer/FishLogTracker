import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Map, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/maps/LeafletMap";
import { getMySpots, type MySpot } from "@/lib/mySpots";
import { getFishSpeciesById } from "@/lib/fishSpecies";
import { formatSize } from "@/lib/utils";

export default function SpotDetailPage() {
  const params = useParams<{ id: string }>();
  const spotId = params.id ? decodeURIComponent(params.id) : "";

  const spot: MySpot | null = useMemo(() => {
    if (!spotId) return null;
    return getMySpots().find((s) => s.id === spotId) || null;
  }, [spotId]);

  const { data: catches = [], isLoading } = useQuery({
    queryKey: ["/api/catches"],
    enabled: true,
  });

  const spotCatches = useMemo(() => {
    if (!spot) return [];
    const name = spot.name.trim().toLowerCase();
    return (Array.isArray(catches) ? (catches as any[]) : []).filter(
      (c) => String(c.lakeName || "").trim().toLowerCase() === name,
    );
  }, [catches, spot]);

  const stats = useMemo(() => {
    let biggest: { species: string; size: number } | null = null;
    const speciesCounts: Record<string, number> = {};
    for (const c of spotCatches) {
      const sp = String(c.species ?? "");
      if (sp) speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
      const sz = Number(c.size);
      if (Number.isFinite(sz)) {
        if (!biggest || sz > biggest.size) biggest = { species: sp, size: sz };
      }
    }
    const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      count: spotCatches.length,
      topSpecies: topSpecies ? { species: topSpecies[0], count: topSpecies[1] } : null,
      biggest,
      recent: spotCatches
        .slice()
        .sort((a, b) => new Date(b.catchDate ?? b.createdAt ?? 0).getTime() - new Date(a.catchDate ?? a.createdAt ?? 0).getTime())
        .slice(0, 10),
    };
  }, [spotCatches]);

  if (!spot) {
    return (
      <div className="container max-w-xl mx-auto py-6 px-4">
        <p className="text-sm text-muted-foreground">Spot not found.</p>
        <Button asChild variant="link" className="px-0 mt-2">
          <Link href="/my-spots">Back to My Spots</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto py-6 px-4 space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link href="/my-spots">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Spots
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{spot.name}</h1>
          <div className="text-xs text-gray-600 mt-1">
            {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
          </div>
          {spot.notes ? <div className="text-sm text-gray-700 mt-2">{spot.notes}</div> : null}
        </div>
        <Button asChild variant="outline">
          <Link href={`/map?lat=${encodeURIComponent(String(spot.latitude))}&lng=${encodeURIComponent(String(spot.longitude))}`}>
            <Map className="h-4 w-4 mr-1" />
            Open map
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <LeafletMap
            catches={spotCatches
              .filter((c) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)))
              .map((c) => ({
                id: c.id,
                latitude: Number(c.latitude),
                longitude: Number(c.longitude),
                species: String(c.species),
                size: Number(c.size),
                userId: String(c.userId || ""),
                username: c.user?.username || "Angler",
                catchDate: String(c.catchDate || c.createdAt || ""),
                lakeName: c.lakeName || undefined,
              }))}
            lakes={[]}
            height="320px"
            withCard={false}
            showControls={false}
            clusterMarkers={false}
            initialCenter={{ latitude: spot.latitude, longitude: spot.longitude, zoom: 13 }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Catches</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{stats.count}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top species</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {stats.topSpecies ? (
              <>
                <div className="font-medium">
                  {getFishSpeciesById(stats.topSpecies.species)?.name || stats.topSpecies.species}
                </div>
                <div className="text-xs text-gray-600">{stats.topSpecies.count} catches</div>
              </>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            Biggest here
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {stats.biggest ? (
            <>
              <span className="font-medium">
                {getFishSpeciesById(stats.biggest.species)?.name || stats.biggest.species}
              </span>{" "}
              · {formatSize(stats.biggest.size)}
            </>
          ) : (
            <span className="text-gray-600">No catches yet.</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent catches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : stats.recent.length === 0 ? (
            <div className="text-sm text-gray-600">No catches recorded at this spot yet.</div>
          ) : (
            stats.recent.map((c: any) => (
              <Link key={c.id} href={`/catches/${c.id}`}>
                <a className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {getFishSpeciesById(c.species)?.name || c.species} · {formatSize(Number(c.size))}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(c.catchDate ?? c.createdAt ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </a>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

