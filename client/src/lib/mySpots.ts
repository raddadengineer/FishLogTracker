import { safeJsonParse } from "@/lib/utils";

export type MySpot = {
  id: string; // stable key: e.g. lake:123
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

const KEY = "fishtracker_my_spots";

export function getMySpots(): MySpot[] {
  return safeJsonParse<MySpot[]>(localStorage.getItem(KEY) || "[]", []);
}

function setMySpots(spots: MySpot[]) {
  localStorage.setItem(KEY, JSON.stringify(spots));
}

export function isSpotSaved(id: string): boolean {
  return getMySpots().some((s) => s.id === id);
}

export function saveSpot(spot: Omit<MySpot, "createdAt">): MySpot {
  const spots = getMySpots();
  const existing = spots.find((s) => s.id === spot.id);
  if (existing) return existing;
  const next: MySpot = { ...spot, createdAt: new Date().toISOString() };
  setMySpots([...spots, next]);
  return next;
}

export function removeSpot(id: string) {
  const spots = getMySpots();
  const next = spots.filter((s) => s.id !== id);
  setMySpots(next);
}

