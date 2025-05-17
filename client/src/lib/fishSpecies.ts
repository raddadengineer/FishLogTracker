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
  // Trout & Salmon Family
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
    id: 'brown_trout',
    name: 'Brown Trout',
    scientificName: 'Salmo trutta',
    description: 'A European species widely introduced throughout North America, known for being challenging to catch.',
    habitat: 'Cold lakes and streams',
    avgSize: 14,
    recordSize: 40,
    icon: 'ri-fish-line',
    color: 'text-amber-700',
  },
  {
    id: 'brook_trout',
    name: 'Brook Trout',
    scientificName: 'Salvelinus fontinalis',
    description: 'A strikingly beautiful char species native to eastern North America.',
    habitat: 'Clean, cold mountain streams and lakes',
    avgSize: 10,
    recordSize: 31,
    icon: 'ri-fish-line',
    color: 'text-orange-600',
  },
  {
    id: 'lake_trout',
    name: 'Lake Trout',
    scientificName: 'Salvelinus namaycush',
    description: 'A freshwater char native to northern North America, typically requires deep, cold water.',
    habitat: 'Deep, cold lakes',
    avgSize: 24,
    recordSize: 72,
    icon: 'ri-fish-line',
    color: 'text-slate-600',
  },
  {
    id: 'chinook_salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    description: 'Also called King Salmon, the largest of the Pacific salmon species.',
    habitat: 'Ocean, large lakes, and rivers during spawning',
    avgSize: 36,
    recordSize: 58,
    icon: 'ri-fish-line',
    color: 'text-red-700',
  },
  
  // Bass Family
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
    id: 'spotted_bass',
    name: 'Spotted Bass',
    scientificName: 'Micropterus punctulatus',
    description: 'Similar to largemouth bass but with a smaller mouth and spotted pattern.',
    habitat: 'Clear, flowing streams and reservoirs',
    avgSize: 12,
    recordSize: 22,
    icon: 'ri-fish-line',
    color: 'text-emerald-500',
  },
  {
    id: 'striped_bass',
    name: 'Striped Bass',
    scientificName: 'Morone saxatilis',
    description: 'An anadromous fish that can live in both fresh and saltwater environments.',
    habitat: 'Coastal waters, rivers, and reservoirs',
    avgSize: 24,
    recordSize: 80,
    icon: 'ri-fish-line',
    color: 'text-blue-800',
  },
  
  // Pike & Muskie Family
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
    id: 'chain_pickerel',
    name: 'Chain Pickerel',
    scientificName: 'Esox niger',
    description: 'A smaller member of the pike family with distinctive chain-like markings.',
    habitat: 'Vegetated lakes, ponds, and slow rivers',
    avgSize: 15,
    recordSize: 30,
    icon: 'ri-fish-line',
    color: 'text-green-600',
  },
  
  // Walleye & Perch Family
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
    id: 'sauger',
    name: 'Sauger',
    scientificName: 'Sander canadensis',
    description: 'Closely related to walleye but smaller with distinctive spotted pattern.',
    habitat: 'Large rivers and turbid lakes',
    avgSize: 12,
    recordSize: 28,
    icon: 'ri-fish-line',
    color: 'text-orange-700',
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
  
  // Catfish Family
  {
    id: 'channel_catfish',
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
    id: 'blue_catfish',
    name: 'Blue Catfish',
    scientificName: 'Ictalurus furcatus',
    description: 'Largest species of North American catfish, known for reaching enormous sizes.',
    habitat: 'Large rivers and reservoirs',
    avgSize: 25,
    recordSize: 143,
    icon: 'ri-fish-line',
    color: 'text-blue-700',
  },
  {
    id: 'flathead_catfish',
    name: 'Flathead Catfish',
    scientificName: 'Pylodictis olivaris',
    description: 'Large predatory catfish with a flattened head and distinctive coloration.',
    habitat: 'Large rivers and reservoirs',
    avgSize: 24,
    recordSize: 123,
    icon: 'ri-fish-line',
    color: 'text-yellow-800',
  },
  
  // Panfish
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
    id: 'pumpkinseed',
    name: 'Pumpkinseed',
    scientificName: 'Lepomis gibbosus',
    description: 'Colorful panfish with distinctive orange-red spots and blue streaks on the face.',
    habitat: 'Ponds, lakes, and slow streams',
    avgSize: 5,
    recordSize: 12,
    icon: 'ri-fish-line',
    color: 'text-orange-500',
  },
  {
    id: 'rock_bass',
    name: 'Rock Bass',
    scientificName: 'Ambloplites rupestris',
    description: 'Reddish-eyed sunfish that prefers rocky areas, often caught while fishing for other species.',
    habitat: 'Rocky areas of lakes and streams',
    avgSize: 7,
    recordSize: 17,
    icon: 'ri-fish-line',
    color: 'text-red-600',
  },
  
  // Carp Family
  {
    id: 'common_carp',
    name: 'Common Carp',
    scientificName: 'Cyprinus carpio',
    description: 'Widely distributed freshwater fish originally from Asia, popular for sport fishing in some regions.',
    habitat: 'Lakes, ponds, and slow-moving rivers',
    avgSize: 24,
    recordSize: 75,
    icon: 'ri-fish-line',
    color: 'text-amber-800',
  },
  {
    id: 'grass_carp',
    name: 'Grass Carp',
    scientificName: 'Ctenopharyngodon idella',
    description: 'Large herbivorous fish used for aquatic weed control in many waterways.',
    habitat: 'Lakes, ponds, and slow rivers with vegetation',
    avgSize: 30,
    recordSize: 70,
    icon: 'ri-fish-line',
    color: 'text-lime-700',
  },
  
  // Other
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
