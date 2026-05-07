export type TripEntry =
  | { kind: "catch"; catchId: number; createdAt: string }
  | { kind: "offlineCatch"; offlineCatchId: string; createdAt: string };

export type Trip = {
  id: string;
  name?: string;
  startedAt: string;
  endedAt?: string;
  entries: TripEntry[];
};

const ACTIVE_KEY = "fishtracker_active_trip";
const HISTORY_KEY = "fishtracker_trip_history";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function newId() {
  return `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getActiveTrip(): Trip | null {
  const t = safeParse<Trip | null>(localStorage.getItem(ACTIVE_KEY), null);
  return t && !t.endedAt ? t : null;
}

export function getTripHistory(): Trip[] {
  return safeParse<Trip[]>(localStorage.getItem(HISTORY_KEY), []);
}

function setTripHistory(trips: Trip[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trips));
}

export function startTrip(name?: string): Trip {
  const existing = getActiveTrip();
  if (existing) return existing;
  const trip: Trip = {
    id: newId(),
    name: name?.trim() || undefined,
    startedAt: new Date().toISOString(),
    entries: [],
  };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(trip));
  return trip;
}

export function endTrip(): Trip | null {
  const trip = getActiveTrip();
  if (!trip) return null;
  const ended: Trip = { ...trip, endedAt: new Date().toISOString() };
  localStorage.removeItem(ACTIVE_KEY);
  const hist = getTripHistory();
  setTripHistory([ended, ...hist].slice(0, 50));
  return ended;
}

export function addTripCatch(catchId: number) {
  const trip = getActiveTrip();
  if (!trip) return;
  const next: Trip = {
    ...trip,
    entries: [...trip.entries, { kind: "catch", catchId, createdAt: new Date().toISOString() }],
  };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
}

export function addTripOfflineCatch(offlineCatchId: string) {
  const trip = getActiveTrip();
  if (!trip) return;
  const next: Trip = {
    ...trip,
    entries: [...trip.entries, { kind: "offlineCatch", offlineCatchId, createdAt: new Date().toISOString() }],
  };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
}

