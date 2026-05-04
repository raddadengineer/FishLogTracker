import { Link, useParams } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CatchCard from "@/components/catches/CatchCard";
import LeafletMap from "@/components/maps/LeafletMap";
import { formatCoordinates, formatDepth } from "@/lib/utils";

type CatchApi = {
  id: number;
  userId: string;
  species: string;
  size: number | string;
  weight?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  depth?: number | string | null;
  lakeName?: string | null;
  catchDate?: string;
  user?: { username?: string };
};

export default function CatchDetailPage() {
  const params = useParams<{ id: string }>();
  const idNum = params.id ? parseInt(params.id, 10) : NaN;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/catches", idNum],
    enabled: Number.isFinite(idNum),
  });

  const api = data as CatchApi | undefined;

  const { lat, lng, hasGps } = useMemo(() => {
    if (!api) return { lat: NaN, lng: NaN, hasGps: false };
    const la =
      api.latitude != null && api.latitude !== ""
        ? Number(api.latitude)
        : NaN;
    const ln =
      api.longitude != null && api.longitude !== ""
        ? Number(api.longitude)
        : NaN;
    return {
      lat: la,
      lng: ln,
      hasGps: Number.isFinite(la) && Number.isFinite(ln),
    };
  }, [api]);

  const mapCatches = useMemo(() => {
    if (!api || !hasGps) return [];
    return [
      {
        id: api.id,
        latitude: lat,
        longitude: lng,
        species: String(api.species),
        size: Number(api.size),
        userId: String(api.userId),
        username: api.user?.username ?? "Angler",
        catchDate: String(api.catchDate ?? ""),
        lakeName: api.lakeName ?? undefined,
        photos: undefined as string[] | undefined,
      },
    ];
  }, [api, hasGps, lat, lng]);

  if (!Number.isFinite(idNum)) {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4">
        <p className="text-muted-foreground">Invalid catch link.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !api || typeof data !== "object") {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4">
        <p className="text-muted-foreground">Catch not found.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link href="/map">Explore map</Link>
        </Button>
      </div>
    );
  }

  const depthVal =
    api.depth != null ? Number(api.depth) : undefined;

  return (
    <div className="container max-w-xl mx-auto py-6 px-4">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/map">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to map
        </Link>
      </Button>

      {hasGps ? (
        <Card className="mb-4 overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5" />
              Location map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0">
            <p className="px-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">GPS:</span>{" "}
              {formatCoordinates(lat, lng)}
              {depthVal != null && Number.isFinite(depthVal) && (
                <span>
                  {" "}
                  · Depth: {formatDepth(depthVal)}
                </span>
              )}
            </p>
            <div className="border-t border-border">
              <LeafletMap catches={mapCatches} lakes={[]} height="280px" showControls />
            </div>
            <div className="flex flex-wrap gap-4 px-6 pb-2">
              <a
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Google Maps
              </a>
              <a
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                OpenStreetMap
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 border-dashed bg-muted/20">
          <CardContent className="py-4 text-sm text-muted-foreground">
            No GPS coordinates are stored for this catch. If you logged it without location permission or before GPS
            was enabled, edit the catch and set a pin on the map to save latitude and longitude.
          </CardContent>
        </Card>
      )}

      <CatchCard
        catchData={{
          ...(data as Record<string, unknown>),
          id: Number(api.id),
          size: Number(api.size),
          latitude: hasGps ? lat : undefined,
          longitude: hasGps ? lng : undefined,
          depth: depthVal,
          weight:
            api.weight != null && api.weight !== ""
              ? Number(api.weight)
              : undefined,
        }}
      />
    </div>
  );
}
