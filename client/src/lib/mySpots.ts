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

export function spotIdFromNameCoords(
  name: string,
  latitude: number,
  longitude: number,
): string {
  const norm = String(name || "").trim().toLowerCase();
  const latR = Math.round(Number(latitude) * 10_000) / 10_000;
  const lngR = Math.round(Number(longitude) * 10_000) / 10_000;
  return `spot:${encodeURIComponent(norm)}:${latR}:${lngR}`;
}

export function saveSpot(spot: Omit<MySpot, "createdAt">): MySpot {
  const spots = getMySpots();
  const existing = spots.find((s) => s.id === spot.id);
  if (existing) return existing;
  const next: MySpot = { ...spot, createdAt: new Date().toISOString() };
  setMySpots([...spots, next]);
  return next;
}

export function addManySpots(spotsToAdd: Array<Omit<MySpot, "createdAt">>): { added: number; total: number } {
  const current = getMySpots();
  const existingIds = new Set(current.map((s) => s.id));
  const now = new Date().toISOString();

  const additions: MySpot[] = [];
  for (const spot of spotsToAdd) {
    if (!spot?.id) continue;
    if (existingIds.has(spot.id)) continue;
    existingIds.add(spot.id);
    additions.push({ ...spot, createdAt: now });
  }

  if (additions.length > 0) setMySpots([...current, ...additions]);
  return { added: additions.length, total: current.length + additions.length };
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

function metersBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const latM = 111_320;
  const avgLatRad = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const lngM = Math.cos(avgLatRad) * 111_320;
  const dLat = (a.latitude - b.latitude) * latM;
  const dLng = (a.longitude - b.longitude) * lngM;
  return Math.hypot(dLat, dLng);
}

export function dedupeMySpots(maxMeters: number = 100): { removed: number; kept: number } {
  const spots = getMySpots();
  if (spots.length <= 1) return { removed: 0, kept: spots.length };

  const norm = (s: string) => String(s || "").trim().toLowerCase();

  // Prefer keeping the spot with notes, then most recently visited, then newest.
  const score = (s: MySpot) => {
    const notesScore = s.notes && s.notes.trim() ? 10_000_000_000 : 0;
    const visitedScore = s.lastVisitedAt ? new Date(s.lastVisitedAt).getTime() : 0;
    const createdScore = s.createdAt ? new Date(s.createdAt).getTime() : 0;
    return notesScore + visitedScore + createdScore;
  };

  const remaining: MySpot[] = [];

  // Simple O(n^2) grouping; lists are small.
  for (const s of spots) {
    const name = norm(s.name);
    let mergedInto: MySpot | null = null;

    for (const k of remaining) {
      if (norm(k.name) !== name) continue;
      const d = metersBetween({ latitude: s.latitude, longitude: s.longitude }, { latitude: k.latitude, longitude: k.longitude });
      if (d <= maxMeters) {
        mergedInto = k;
        break;
      }
    }

    if (!mergedInto) {
      remaining.push(s);
      continue;
    }

    // Merge metadata; keep the "best" record as base, but don't lose notes/lastVisited.
    const keep = score(mergedInto) >= score(s) ? mergedInto : s;
    const drop = keep === mergedInto ? s : mergedInto;

    keep.notes = keep.notes || drop.notes;
    if (!keep.lastVisitedAt || (drop.lastVisitedAt && new Date(drop.lastVisitedAt) > new Date(keep.lastVisitedAt))) {
      keep.lastVisitedAt = drop.lastVisitedAt;
    }
    if (new Date(drop.createdAt) < new Date(keep.createdAt)) {
      keep.createdAt = drop.createdAt;
    }

    if (keep === s) {
      // Replace existing kept record in remaining with s
      const idx = remaining.findIndex((x) => x.id === mergedInto?.id);
      if (idx >= 0) remaining[idx] = keep;
    }
  }

  if (remaining.length !== spots.length) setMySpots(remaining);
  return { removed: spots.length - remaining.length, kept: remaining.length };
}

