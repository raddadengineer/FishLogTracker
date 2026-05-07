export type BadgeId =
  | "first_catch"
  | "first_photo"
  | "first_gps"
  | "five_species"
  | "ten_catches"
  | "big_fish_20"
  | "night_owl"
  | "lake_hopper_5";

export type BadgeDef = {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // emoji for now (simple + fun)
};

export const BADGES: BadgeDef[] = [
  { id: "first_catch", name: "First Catch", description: "Log your very first catch.", icon: "🎣" },
  { id: "first_photo", name: "Proof!", description: "Log a catch with a photo.", icon: "📸" },
  { id: "first_gps", name: "Pin Dropper", description: "Log a catch with GPS coordinates.", icon: "📍" },
  { id: "ten_catches", name: "Getting Hooked", description: "Log 10 catches.", icon: "🪝" },
  { id: "five_species", name: "Species Sampler", description: "Catch 5 different species.", icon: "🐟" },
  { id: "big_fish_20", name: "Big One", description: "Log a fish 20 inches or bigger.", icon: "🏆" },
  { id: "night_owl", name: "Night Owl", description: "Log a catch between 12am–4am.", icon: "🌙" },
  { id: "lake_hopper_5", name: "Lake Hopper", description: "Log catches on 5 different lakes.", icon: "🗺️" },
];

type CatchLike = {
  id?: number | string;
  species?: string;
  size?: number | string;
  lakeName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  photos?: unknown;
  photoData?: unknown;
  catchDate?: string;
  createdAt?: string;
};

const hasPhoto = (c: CatchLike) => {
  if (Array.isArray(c.photos)) return c.photos.length > 0;
  // server may store photos differently in some paths
  if (Array.isArray(c.photoData)) return c.photoData.length > 0;
  return false;
};

const hasGps = (c: CatchLike) => {
  const la = Number(c.latitude);
  const ln = Number(c.longitude);
  return Number.isFinite(la) && Number.isFinite(ln);
};

export function computeEarnedBadges(catches: CatchLike[]): BadgeId[] {
  const earned = new Set<BadgeId>();
  const list = Array.isArray(catches) ? catches : [];

  if (list.length >= 1) earned.add("first_catch");
  if (list.length >= 10) earned.add("ten_catches");

  if (list.some(hasPhoto)) earned.add("first_photo");
  if (list.some(hasGps)) earned.add("first_gps");

  const uniqueSpecies = new Set(
    list.map((c) => String(c.species ?? "")).filter((s) => s && s !== "undefined" && s !== "null"),
  );
  if (uniqueSpecies.size >= 5) earned.add("five_species");

  if (
    list.some((c) => {
      const s = Number(c.size);
      return Number.isFinite(s) && s >= 20;
    })
  ) {
    earned.add("big_fish_20");
  }

  const uniqueLakes = new Set(
    list
      .map((c) => (c.lakeName ? String(c.lakeName).trim() : ""))
      .filter((s) => s),
  );
  if (uniqueLakes.size >= 5) earned.add("lake_hopper_5");

  const night = list.some((c) => {
    const dt = new Date(c.catchDate ?? c.createdAt ?? "");
    const h = dt.getHours();
    return Number.isFinite(h) && (h >= 0 && h < 4);
  });
  if (night) earned.add("night_owl");

  return Array.from(earned);
}

