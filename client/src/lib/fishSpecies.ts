// Common fish species for the application

export interface FishSpecies {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  habitat: string;
  avgSize: number; // in inches
  recordSize: number; // in inches
  icon: string; // Remix icon class
  color: string; // Tailwind color class
}

export const fishSpecies: FishSpecies[] = [
  {
    id: 'rainbow_trout',
    name: 'Rainbow Trout',
    scientificName: 'Oncorhynchus mykiss',
    description: 'A popular game fish and food fish that is native to cold-water tributaries of the Pacific Ocean.',
    habitat: 'Cold lakes and rivers',
    avgSize: 16,
    recordSize: 42,
    icon: 'ri-fish-line',
    color: 'text-blue-500',
  },
  {
    id: 'largemouth_bass',
    name: 'Largemouth Bass',
    scientificName: 'Micropterus salmoides',
    description: 'A carnivorous freshwater gamefish that is the most popular game fish sought after by anglers in the U.S.',
    habitat: 'Lakes, ponds, and slow-moving rivers',
    avgSize: 15,
    recordSize: 29,
    icon: 'ri-fish-line',
    color: 'text-green-600',
  },
  {
    id: 'smallmouth_bass',
    name: 'Smallmouth Bass',
    scientificName: 'Micropterus dolomieu',
    description: 'A popular game fish sought by anglers, known for its fighting ability when hooked.',
    habitat: 'Rocky and gravelly areas of lakes and rivers',
    avgSize: 12,
    recordSize: 24,
    icon: 'ri-fish-line',
    color: 'text-amber-600',
  },
  {
    id: 'walleye',
    name: 'Walleye',
    scientificName: 'Sander vitreus',
    description: 'A freshwater perciform fish native to most of Canada and the northern United States.',
    habitat: 'Large lakes and rivers',
    avgSize: 14,
    recordSize: 35,
    icon: 'ri-fish-line',
    color: 'text-yellow-600',
  },
  {
    id: 'northern_pike',
    name: 'Northern Pike',
    scientificName: 'Esox lucius',
    description: 'A species of carnivorous fish of the genus Esox, known for its sharp teeth and predatory habits.',
    habitat: 'Vegetated lakes and slow rivers',
    avgSize: 24,
    recordSize: 52,
    icon: 'ri-fish-line',
    color: 'text-green-800',
  },
  {
    id: 'muskie',
    name: 'Muskie',
    scientificName: 'Esox masquinongy',
    description: 'Also called muskellunge, is a large, relatively uncommon freshwater fish.',
    habitat: 'Clear lakes and rivers',
    avgSize: 30,
    recordSize: 60,
    icon: 'ri-fish-line',
    color: 'text-teal-700',
  },
  {
    id: 'perch',
    name: 'Yellow Perch',
    scientificName: 'Perca flavescens',
    description: 'A popular panfish and game fish, commonly fished and served as a food fish.',
    habitat: 'Lakes and slow-moving rivers',
    avgSize: 8,
    recordSize: 19,
    icon: 'ri-fish-line',
    color: 'text-yellow-500',
  },
  {
    id: 'catfish',
    name: 'Channel Catfish',
    scientificName: 'Ictalurus punctatus',
    description: 'Most numerous catfish species in North America, widely stocked for food and sport.',
    habitat: 'Lakes, rivers, and reservoirs',
    avgSize: 20,
    recordSize: 58,
    icon: 'ri-fish-line',
    color: 'text-gray-700',
  },
  {
    id: 'bluegill',
    name: 'Bluegill',
    scientificName: 'Lepomis macrochirus',
    description: 'A popular panfish, named for the blue coloration on the lower portion of its gill and jaw.',
    habitat: 'Ponds, lakes, and slow-moving streams',
    avgSize: 6,
    recordSize: 15,
    icon: 'ri-fish-line',
    color: 'text-blue-600',
  },
  {
    id: 'crappie',
    name: 'Crappie',
    scientificName: 'Pomoxis',
    description: 'Popular among anglers and known for its excellent taste when cooked.',
    habitat: 'Vegetated areas in lakes and slow-moving rivers',
    avgSize: 8,
    recordSize: 19,
    icon: 'ri-fish-line',
    color: 'text-purple-500',
  },
  {
    id: 'other',
    name: 'Other Species',
    scientificName: 'Various',
    description: 'Other fish species not specifically listed.',
    habitat: 'Various',
    avgSize: 0,
    recordSize: 0,
    icon: 'ri-fish-line',
    color: 'text-gray-500',
  },
];

// Get a fish species by ID
export function getFishSpeciesById(id: string): FishSpecies {
  return fishSpecies.find(species => species.id === id) || fishSpecies[fishSpecies.length - 1];
}

// Get fish species as options for select input
export function getFishSpeciesOptions(): { value: string; label: string }[] {
  return fishSpecies
    .filter(species => species.id !== 'other') // Filter out "Other" to place at end
    .map(species => ({
      value: species.id,
      label: species.name,
    }))
    .concat({ value: 'other', label: 'Other Species' }); // Add "Other" at the end
}
