import { getFishSpeciesById } from "@/lib/fishSpecies";

type CatchLike = {
  species?: string;
  size?: number | string;
  catchDate?: string;
  createdAt?: string;
};

function toDateOnlyKey(d: Date) {
  // local date key (avoids timezone surprises for streaks)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCatchDate(c: CatchLike): Date | null {
  const raw = c.catchDate ?? c.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function computeStreak(catches: CatchLike[]) {
  const dates = new Set<string>();
  for (const c of catches || []) {
    const d = getCatchDate(c);
    if (!d) continue;
    dates.add(toDateOnlyKey(d));
  }

  const sorted = Array.from(dates).sort(); // ascending YYYY-MM-DD
  if (sorted.length === 0) return { current: 0, best: 0 };

  // best streak
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) run++;
    else run = 1;
    best = Math.max(best, run);
  }

  // current streak: count backwards from today (or yesterday if no catch today)
  const todayKey = toDateOnlyKey(new Date());
  const yesterdayKey = toDateOnlyKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  let anchor = dates.has(todayKey) ? todayKey : dates.has(yesterdayKey) ? yesterdayKey : null;
  if (!anchor) return { current: 0, best };

  let current = 1;
  let cursor = new Date(anchor);
  while (true) {
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    if (dates.has(toDateOnlyKey(cursor))) current++;
    else break;
  }

  return { current, best };
}

export type PbUpdate = {
  isNewOverall: boolean;
  isNewSpecies: boolean;
  overallPrev?: number;
  speciesPrev?: number;
  speciesName?: string;
};

type PbStore = {
  overallMax: number;
  speciesMax: Record<string, number>;
};

function pbKey(userId: string) {
  return `fishtracker_pbs_${userId}`;
}

function readStore(userId: string): PbStore {
  try {
    const raw = localStorage.getItem(pbKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<PbStore>) : null;
    return {
      overallMax: Number(parsed?.overallMax) || 0,
      speciesMax: (parsed?.speciesMax as Record<string, number>) || {},
    };
  } catch {
    return { overallMax: 0, speciesMax: {} };
  }
}

function writeStore(userId: string, store: PbStore) {
  localStorage.setItem(pbKey(userId), JSON.stringify(store));
}

export function maybeUpdatePbs(params: { userId?: string | null; species?: string; size?: number | string }): PbUpdate | null {
  const userId = params.userId ? String(params.userId) : "";
  if (!userId) return null;

  const sizeNum = Number(params.size);
  if (!Number.isFinite(sizeNum) || sizeNum <= 0) return null;

  const speciesId = params.species ? String(params.species) : "";
  const store = readStore(userId);

  const overallPrev = store.overallMax || 0;
  const isNewOverall = sizeNum > overallPrev;
  if (isNewOverall) store.overallMax = sizeNum;

  const speciesPrev = speciesId ? store.speciesMax[speciesId] || 0 : 0;
  const isNewSpecies = speciesId ? sizeNum > speciesPrev : false;
  if (isNewSpecies && speciesId) store.speciesMax[speciesId] = sizeNum;

  if (isNewOverall || isNewSpecies) {
    writeStore(userId, store);
    return {
      isNewOverall,
      isNewSpecies,
      overallPrev: isNewOverall ? overallPrev : undefined,
      speciesPrev: isNewSpecies ? speciesPrev : undefined,
      speciesName: speciesId ? getFishSpeciesById(speciesId)?.name : undefined,
    };
  }

  return null;
}

