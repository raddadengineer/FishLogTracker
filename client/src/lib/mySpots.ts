import { safeJsonParse } from "@/lib/utils";

export type MySpot = {
  id: string; // stable key: e.g. lake:123
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  notes?: string;
  lastVisitedAt?: string;
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

export function updateSpot(id: string, patch: Partial<MySpot>) {
  const spots = getMySpots();
  const next = spots.map((s) => (s.id === id ? { ...s, ...patch } : s));
  setMySpots(next);
}

export function touchSpotLastVisitedByName(lakeName?: string | null) {
  const name = lakeName ? String(lakeName).trim().toLowerCase() : "";
  if (!name) return;
  const now = new Date().toISOString();
  const spots = getMySpots();
  let changed = false;
  const next = spots.map((s) => {
    if (String(s.name).trim().toLowerCase() === name) {
      changed = true;
      return { ...s, lastVisitedAt: now };
    }
    return s;
  });
  if (changed) setMySpots(next);
}

