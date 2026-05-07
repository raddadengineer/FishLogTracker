import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

type Props = {
  initialLat: number;
  initialLng: number;
  onCancel: () => void;
  onSave: (next: { latitude: number; longitude: number }) => Promise<void> | void;
};

export default function CatchPinEditor({ initialLat, initialLng, onCancel, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const start = useMemo(() => [initialLat, initialLng] as [number, number], [initialLat, initialLng]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView(start, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);

      const marker = L.marker(start, { draggable: true });
      marker.addTo(mapRef.current);
      markerRef.current = marker;

      mapRef.current.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
      });
    } else {
      mapRef.current.setView(start, Math.max(mapRef.current.getZoom(), 14));
      markerRef.current?.setLatLng(start);
    }

    return () => {
      // keep map instance alive for dialog reopen? No, destroy to avoid stale sizes.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!markerRef.current) return;
    const ll = markerRef.current.getLatLng();
    setIsSaving(true);
    try {
      await onSave({ latitude: ll.lat, longitude: ll.lng });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Drag the pin or tap the map to place it.
      </div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border" style={{ height: 360 }} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save pin"}
        </Button>
      </div>
    </div>
  );
}

