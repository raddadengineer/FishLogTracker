import { clientAuthHeaders } from "@/lib/queryClient";
import { getMySpots, type MySpot } from "@/lib/mySpots";

export async function pullMySpotsFromCloud(): Promise<MySpot[]> {
  const res = await fetch("/api/my-spots", { credentials: "include", headers: { ...clientAuthHeaders() } });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  const data = (await res.json()) as any[];
  return (Array.isArray(data) ? data : []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    notes: r.notes ? String(r.notes) : undefined,
    lastVisitedAt: r.lastVisitedAt ? String(r.lastVisitedAt) : undefined,
  }));
}

export async function pushMySpotsToCloud(spots: MySpot[] = getMySpots()): Promise<{ count: number }> {
  const res = await fetch("/api/my-spots/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
    body: JSON.stringify({
      spots: spots.map((s) => ({
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        notes: s.notes,
        lastVisitedAt: s.lastVisitedAt,
        createdAt: s.createdAt,
      })),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).message || res.statusText);
  return { count: Number((body as any).count ?? 0) };
}

