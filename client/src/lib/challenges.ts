import { hasPhotos } from "@/lib/photoUtils";

export type ChallengeId = "weekly_3_catches" | "weekly_photo" | "weekly_new_species";

export type Challenge = {
  id: ChallengeId;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  completed: boolean;
};

type CatchLike = {
  species?: string;
  catchDate?: string;
  createdAt?: string;
  photoData?: any;
};

function startOfWeekLocal(d = new Date()) {
  // Monday-based week
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
}

export function weekKey(d = new Date()) {
  const s = startOfWeekLocal(d);
  const y = s.getFullYear();
  const m = String(s.getMonth() + 1).padStart(2, "0");
  const day = String(s.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // week starts YYYY-MM-DD
}

function inThisWeek(c: CatchLike) {
  const raw = c.catchDate ?? c.createdAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  const start = startOfWeekLocal().getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return t >= start && t < end;
}

export function computeWeeklyChallenges(catches: CatchLike[]): Challenge[] {
  const weekCatches = (Array.isArray(catches) ? catches : []).filter(inThisWeek);

  const c1 = weekCatches.length;
  const photoCount = weekCatches.filter((c) => hasPhotos(c as any)).length;

  const species = new Set(
    weekCatches.map((c) => String(c.species ?? "")).filter((s) => s && s !== "null" && s !== "undefined"),
  );

  const challenges: Challenge[] = [
    {
      id: "weekly_3_catches",
      title: "Weekend Warrior",
      description: "Log 3 catches this week",
      icon: "🎣",
      current: Math.min(c1, 3),
      target: 3,
      completed: c1 >= 3,
    },
    {
      id: "weekly_photo",
      title: "Proof or It Didn’t Happen",
      description: "Log 1 catch with a photo this week",
      icon: "📸",
      current: Math.min(photoCount, 1),
      target: 1,
      completed: photoCount >= 1,
    },
    {
      id: "weekly_new_species",
      title: "Mix It Up",
      description: "Log 2 different species this week",
      icon: "🐟",
      current: Math.min(species.size, 2),
      target: 2,
      completed: species.size >= 2,
    },
  ];

  return challenges;
}

export function challengeCompletionStorageKey(userId?: string | null) {
  const u = userId ? String(userId) : "anon";
  return `fishtracker_challenges_completed_${u}_${weekKey()}`;
}

