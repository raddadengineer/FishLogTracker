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

  const insights = useMemo(() => {
    const byHour = new Array(24).fill(0) as number[];
    const byMonth = new Array(12).fill(0) as number[];
    const lureCounts: Record<string, number> = {};
    const speciesCounts: Record<string, number> = {};
    const topLureBySpecies: Record<string, Record<string, number>> = {};
    const pbBySpecies: Record<string, { size: number; catchId?: number; when?: string }> = {};
    const weatherCounts: Record<string, number> = {};
    const windDirCounts: Record<string, number> = {};

    for (const c of spotCatches) {
      const dt = new Date(c.catchDate ?? c.createdAt ?? 0);
      if (Number.isFinite(dt.getTime())) {
        byHour[dt.getHours()] += 1;
        byMonth[dt.getMonth()] += 1;
      }

      const lure = String(c.lure ?? "").trim();
      if (lure) lureCounts[lure] = (lureCounts[lure] || 0) + 1;

      const sp = String(c.species ?? "").trim();
      if (sp) speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;

      if (sp && lure) {
        topLureBySpecies[sp] = topLureBySpecies[sp] || {};
        topLureBySpecies[sp][lure] = (topLureBySpecies[sp][lure] || 0) + 1;
      }

      const sz = Number(c.size);
      if (sp && Number.isFinite(sz)) {
        const prev = pbBySpecies[sp];
        if (!prev || sz > prev.size) {
          pbBySpecies[sp] = {
            size: sz,
            catchId: typeof c.id === "number" ? c.id : Number(c.id),
            when: String(c.catchDate ?? c.createdAt ?? ""),
          };
        }
      }

      const wd = (c as any).weatherData;
      if (wd && typeof wd === "object") {
        const main = String((wd as any)?.weather?.main ?? (wd as any)?.weather ?? "").trim();
        if (main) weatherCounts[main] = (weatherCounts[main] || 0) + 1;

        const deg = Number((wd as any)?.wind?.deg ?? (wd as any)?.windDeg);
        if (Number.isFinite(deg)) {
          const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
          const idx = Math.round(((deg % 360) / 45)) % 8;
          const dir = dirs[idx];
          windDirCounts[dir] = (windDirCounts[dir] || 0) + 1;
        }
      }
    }

    const bestHour = byHour
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)[0];
    const bestMonth = byMonth
      .map((count, month) => ({ month, count }))
      .sort((a, b) => b.count - a.count)[0];
    const topLure = Object.entries(lureCounts).sort((a, b) => b[1] - a[1])[0];

    const topSpeciesList = Object.entries(speciesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([species, count]) => ({ species, count }));

    const topLureBySpeciesList = Object.entries(topLureBySpecies)
      .map(([species, lures]) => {
        const top = Object.entries(lures).sort((a, b) => b[1] - a[1])[0];
        return top ? { species, lure: top[0], count: top[1] } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 6) as Array<{ species: string; lure: string; count: number }>;

    const pbBySpeciesList = Object.entries(pbBySpecies)
      .map(([species, pb]) => ({ species, ...pb }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 6);

    const topWeather = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1])[0];
    const topWind = Object.entries(windDirCounts).sort((a, b) => b[1] - a[1])[0];

    const monthName = (m: number) =>
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] || "—";
    const hourLabel = (h: number) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const hh = h % 12 === 0 ? 12 : h % 12;
      return `${hh}${ampm}`;
    };

    return {
      bestHour: bestHour?.count ? { label: hourLabel(bestHour.hour), count: bestHour.count } : null,
      bestMonth: bestMonth?.count ? { label: monthName(bestMonth.month), count: bestMonth.count } : null,
      topLure: topLure ? { lure: topLure[0], count: topLure[1] } : null,
      topSpeciesList,
      topLureBySpeciesList,
      pbBySpeciesList,
      topWeather: topWeather ? { weather: topWeather[0], count: topWeather[1] } : null,
      topWind: topWind ? { dir: topWind[0], count: topWind[1] } : null,
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

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best month</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {insights.bestMonth ? (
              <>
                <div className="text-lg font-semibold">{insights.bestMonth.label}</div>
                <div className="text-xs text-gray-600">{insights.bestMonth.count} catches</div>
              </>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best time</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {insights.bestHour ? (
              <>
                <div className="text-lg font-semibold">{insights.bestHour.label}</div>
                <div className="text-xs text-gray-600">{insights.bestHour.count} catches</div>
              </>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top lure</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {insights.topLure ? (
              <>
                <div className="font-medium line-clamp-2">{insights.topLure.lure}</div>
                <div className="text-xs text-gray-600">{insights.topLure.count} catches</div>
              </>
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Species mix</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-700 space-y-1">
            {insights.topSpeciesList.length ? (
              insights.topSpeciesList.map((r) => (
                <div key={r.species} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate">
                    {getFishSpeciesById(r.species)?.name || r.species}
                  </div>
                  <div className="text-gray-600">{r.count}</div>
                </div>
              ))
            ) : (
              <span className="text-gray-600">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top lure by species</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-700 space-y-2">
          {insights.topLureBySpeciesList.length ? (
            insights.topLureBySpeciesList.map((r) => (
              <div key={r.species} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{getFishSpeciesById(r.species)?.name || r.species}</div>
                  <div className="text-gray-600 truncate">{r.lure}</div>
                </div>
                <div className="text-gray-600 shrink-0">{r.count}</div>
              </div>
            ))
          ) : (
            <span className="text-gray-600">No lure data yet.</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">PB by species (at this spot)</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-700 space-y-2">
          {insights.pbBySpeciesList.length ? (
            insights.pbBySpeciesList.map((r) => (
              <div key={r.species} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{getFishSpeciesById(r.species)?.name || r.species}</div>
                  <div className="text-gray-600 truncate">{r.catchId ? `Catch #${r.catchId}` : ""}</div>
                </div>
                <div className="shrink-0 font-medium">{formatSize(r.size)}</div>
              </div>
            ))
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </CardContent>
      </Card>

      {(insights.topWeather || insights.topWind) ? (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Best weather</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {insights.topWeather ? (
                <>
                  <div className="text-lg font-semibold">{insights.topWeather.weather}</div>
                  <div className="text-xs text-gray-600">{insights.topWeather.count} catches</div>
                </>
              ) : (
                <span className="text-gray-600">—</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Best wind</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {insights.topWind ? (
                <>
                  <div className="text-lg font-semibold">{insights.topWind.dir}</div>
                  <div className="text-xs text-gray-600">{insights.topWind.count} catches</div>
                </>
              ) : (
                <span className="text-gray-600">—</span>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

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
              <Link
                key={c.id}
                href={`/catches/${c.id}`}
                className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
              >
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
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

