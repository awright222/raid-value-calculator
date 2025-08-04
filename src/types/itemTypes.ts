export interface ItemType {
  id: string;
  name: string;
  category: string;
  baseValue?: number; // For items with fixed conversion rates (like energy pots)
  marketValue?: number; // Market value in USD for non-energy items
  description?: string;
  utilityScore?: number; // 1-10 scale for gameplay utility (defaults to 5 if not set)
  utilityReasoning?: string; // Why this score was assigned
  lastUtilityUpdate?: Date; // Track when reviewed
}

export interface PackItem {
  itemTypeId: string;
  quantity: number;
}

export interface PackData {
  price: number;
  items: PackItem[];
}

export const ITEM_CATEGORIES = {
  ENERGY: 'Energy',
  CURRENCY: 'Currency',
  LEVELING: 'Leveling',
  RANKING: 'Ranking Up',
  ASCENSION: 'Ascension Potions',
  GEAR_ASCENSION: 'Gear Ascension Items',
  ACCESSORY_ASCENSION: 'Accessory Ascension Items',
  SUMMONING: 'Summoning Shards',
  SOUL_SUMMONING: 'Soul Summoning',
  SKILL_TOMES: 'Skill Tomes',
  FARMING: 'Farming & Convenience'
} as const;

export const ITEM_TYPES: ItemType[] = [
  // Energy - Essential for gameplay
  {
    id: 'energy_pot',
    name: 'Energy Pot',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 130,
    description: '1 Energy Pot = 130 Energy',
    utilityScore: 9,
    utilityReasoning: 'Essential for farming - always needed'
  },
  {
    id: 'raw_energy',
    name: 'Raw Energy',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 1,
    description: 'Direct energy units',
    utilityScore: 9,
    utilityReasoning: 'Essential for farming - always needed'
  },

  // Currency
  {
    id: 'silver',
    name: 'Silver',
    category: ITEM_CATEGORIES.CURRENCY,
    description: 'In-game currency for upgrades and purchases',
    utilityScore: 8,
    utilityReasoning: 'Constantly needed for gear upgrades and champion development'
  },
  {
    id: 'gems',
    name: 'Gems',
    category: ITEM_CATEGORIES.CURRENCY,
    description: 'Premium currency for energy, masteries, and purchases',
    utilityScore: 7,
    utilityReasoning: 'Useful but less efficient than energy packs for most players'
  },

  // Leveling
  {
    id: 'xp_brew',
    name: 'XP Brew',
    category: ITEM_CATEGORIES.LEVELING,
    description: 'Experience brew for champion leveling',
    utilityScore: 4,
    utilityReasoning: 'Farmable in campaign - low priority for purchases'
  },
  {
    id: 'xp_barrel',
    name: 'XP Barrel',
    category: ITEM_CATEGORIES.LEVELING,
    description: 'Large experience boost for champions',
    utilityScore: 4,
    utilityReasoning: 'Farmable in campaign - low priority for purchases'
  },
  {
    id: 'xp_boost_1d',
    name: '100% XP Boost (1d.)',
    category: ITEM_CATEGORIES.LEVELING,
    description: '100% XP boost for 1 day',
    utilityScore: 6,
    utilityReasoning: 'Useful for efficient farming periods'
  },

  // Ranking Up
  {
    id: 'chicken_3star',
    name: '3 ⭐ Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '3-star food champion for ranking up',
    utilityScore: 5,
    utilityReasoning: 'Moderately useful - can be obtained through farming'
  },
  {
    id: 'chicken_4star',
    name: '4 ⭐ Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '4-star food champion for ranking up',
    utilityScore: 6,
    utilityReasoning: 'More valuable than 3-star, harder to obtain'
  },
  {
    id: 'chicken_5star',
    name: '5 ⭐ Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '5-star food champion for ranking up',
    utilityScore: 7,
    utilityReasoning: 'High value - significant time saver for 6-starring champions'
  },
  {
    id: 'meal',
    name: 'Feast',
    category: ITEM_CATEGORIES.RANKING,
    description: 'Special food item for champion ranking',
    utilityScore: 6,
    utilityReasoning: 'Useful for ranking up, depends on rarity'
  },

  // Ascension Potions
  {
    id: 'superior_arcane_potion',
    name: 'Superior Arcane Potion',
    category: ITEM_CATEGORIES.ASCENSION,
    description: 'Superior ascension potion for Arcane affinity champions'
  },
  {
    id: 'superior_spirit_potion',
    name: 'Superior Spirit Potion',
    category: ITEM_CATEGORIES.ASCENSION,
    description: 'Superior ascension potion for Spirit affinity champions'
  },
  {
    id: 'superior_magic_potion',
    name: 'Superior Magic Potion',
    category: ITEM_CATEGORIES.ASCENSION,
    description: 'Superior ascension potion for Magic affinity champions'
  },
  {
    id: 'superior_force_potion',
    name: 'Superior Force Potion',
    category: ITEM_CATEGORIES.ASCENSION,
    description: 'Superior ascension potion for Force affinity champions'
  },
  {
    id: 'superior_void_potion',
    name: 'Superior Void Potion',
    category: ITEM_CATEGORIES.ASCENSION,
    description: 'Superior ascension potion for Void affinity champions'
  },

  // Gear Ascension Items
  {
    id: 'lesser_oil',
    name: 'Lesser Oil',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: 'Lesser oil for gear ascension'
  },
  {
    id: 'greater_oil',
    name: 'Greater Oil',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: 'Greater oil for gear ascension'
  },
  {
    id: 'superior_oil',
    name: 'Superior Oil',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: 'Superior oil for gear ascension'
  },
  {
    id: 'chaos_dust',
    name: 'Chaos Dust',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: 'Chaos dust for gear ascension'
  },
  {
    id: '5_star_epic_chaos_ore',
    name: '5 ⭐ Epic Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '5 star epic chaos ore for gear ascension'
  },
  {
    id: '6_star_epic_chaos_ore',
    name: '6 ⭐ Epic Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '6 star epic chaos ore for gear ascension'
  },
  {
    id: '5_star_legendary_chaos_ore',
    name: '5 ⭐ Legendary Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '5 star legendary chaos ore for gear ascension'
  },
  {
    id: '6_star_legendary_chaos_ore',
    name: '6 ⭐ Legendary Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '6 star legendary chaos ore for gear ascension'
  },
  {
    id: '5_star_mythical_chaos_ore',
    name: '5 ⭐ Mythical Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '5 star mythical chaos ore for gear ascension'
  },
  {
    id: '6_star_mythical_chaos_ore',
    name: '6 ⭐ Mythical Chaos Ore',
    category: ITEM_CATEGORIES.GEAR_ASCENSION,
    description: '6 star mythical chaos ore for gear ascension'
  },

  // Accessory Ascension Items
  {
    id: 'lesser_extract',
    name: 'Lesser Extract',
    category: ITEM_CATEGORIES.ACCESSORY_ASCENSION,
    description: 'Lesser extract for accessory ascension'
  },
  {
    id: 'greater_extract',
    name: 'Greater Extract',
    category: ITEM_CATEGORIES.ACCESSORY_ASCENSION,
    description: 'Greater extract for accessory ascension'
  },
  {
    id: 'superior_extract',
    name: 'Superior Extract',
    category: ITEM_CATEGORIES.ACCESSORY_ASCENSION,
    description: 'Superior extract for accessory ascension'
  },
  {
    id: 'chaos_powder',
    name: 'Chaos Powder',
    category: ITEM_CATEGORIES.ACCESSORY_ASCENSION,
    description: 'Chaos powder for accessory ascension'
  },

  // Summoning Shards
  {
    id: 'ancient_shard',
    name: 'Ancient Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Common summoning shard',
    utilityScore: 6,
    utilityReasoning: 'Useful for champion collection and fodder'
  },
  {
    id: 'void_shard',
    name: 'Void Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Void affinity summoning shard',
    utilityScore: 7,
    utilityReasoning: 'More valuable than ancient shards - limited void pool'
  },
  {
    id: 'primal_shard',
    name: 'Primal Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Primal summoning shard',
    utilityScore: 8,
    utilityReasoning: 'High value - rare summoning opportunity'
  },
  {
    id: 'sacred_shard',
    name: 'Sacred Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Legendary summoning shard',
    utilityScore: 10,
    utilityReasoning: 'Maximum value - guaranteed epic or legendary champion'
  },
  {
    id: 'prism_crystals',
    name: 'Prism Crystals',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Premium summoning crystals',
    utilityScore: 9,
    utilityReasoning: 'Very high value - rare premium summoning resource'
  },

  // Soul Summoning
  {
    id: 'mortal_soulstone',
    name: 'Mortal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    description: 'Soul summoning stone (mortal tier)'
  },
  {
    id: 'immortal_soulstone',
    name: 'Immortal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    description: 'Soul summoning stone (immortal tier)'
  },
  {
    id: 'eternal_soulstone',
    name: 'Eternal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    description: 'Soul summoning stone (eternal tier)'
  },
  {
    id: 'prism_jewel',
    name: 'Prism Jewel',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    description: 'Premium soul summoning currency'
  },

  // Skill Tomes
  {
    id: 'rare_skill_tome',
    name: 'Rare Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for rare champions',
    utilityScore: 6,
    utilityReasoning: 'Useful for completing rare champions'
  },
  {
    id: 'epic_skill_tome',
    name: 'Epic Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for epic champions',
    utilityScore: 8,
    utilityReasoning: 'High value - essential for meta epic champions'
  },
  {
    id: 'legendary_skill_tome',
    name: 'Legendary Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for legendary champions',
    utilityScore: 10,
    utilityReasoning: 'Maximum value - extremely rare and essential for legendary champions'
  },
  {
    id: 'mythical_skill_tome',
    name: 'Mythical Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for mythical champions',
    utilityScore: 10,
    utilityReasoning: 'Maximum value - extremely rare for highest tier champions'
  },

  // Farming & Convenience
  {
    id: 'multi_battle_attempts',
    name: 'Multi-Battle Attempts',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Attempts for automated multi-battle farming',
    utilityScore: 2,
    utilityReasoning: 'Nearly useless - easily obtained through gameplay'
  },
  {
    id: 'demon_lord_key',
    name: 'Demon Lord Key',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Key for accessing Demon Lord battles'
  },
  {
    id: 'classic_arena_refill',
    name: 'Classic Arena Refill',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Refill for Classic Arena battles'
  },
  {
    id: 'live_arena_refill',
    name: 'Live Arena Refill',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Refill for Live Arena battles'
  },
  {
    id: 'tag_team_arena_refill',
    name: 'Tag Team Arena Refill',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Refill for Tag Team Arena battles'
  }
];

// Cache for Firebase-loaded item types
let firebaseItemTypesCache: ItemType[] | null = null;
let firebaseLoadPromise: Promise<ItemType[]> | null = null;

// Function to get item types from Firebase with fallback to static
export const getItemTypes = async (): Promise<ItemType[]> => {
  // Return cached version if available
  if (firebaseItemTypesCache) {
    console.log('Returning cached Firebase item types');
    return firebaseItemTypesCache;
  }
  
  // Return ongoing promise if already loading
  if (firebaseLoadPromise) {
    console.log('Waiting for ongoing Firebase load...');
    return firebaseLoadPromise;
  }
  
  // Try to load from Firebase
  firebaseLoadPromise = (async () => {
    try {
      console.log('Attempting to load item types from Firebase...');
      const { getItemTypesFromFirebase } = await import('../firebase/itemTypes');
      const firebaseItemTypes = await getItemTypesFromFirebase();
      
      if (firebaseItemTypes.length > 0) {
        console.log(`Loaded ${firebaseItemTypes.length} item types from Firebase`);
        firebaseItemTypesCache = firebaseItemTypes;
        return firebaseItemTypes;
      } else {
        console.log('No item types found in Firebase, using static data');
      }
    } catch (error) {
      console.warn('Failed to load item types from Firebase, using static data:', error);
    }
    
    // Fallback to static data
    console.log('Using static item types data');
    return ITEM_TYPES;
  })();
  
  return firebaseLoadPromise;
};

// Function to invalidate cache (call after admin updates)
export const invalidateItemTypesCache = (): void => {
  firebaseItemTypesCache = null;
  firebaseLoadPromise = null;
};

// Synchronous function for backward compatibility (uses static data)
export function getItemTypeById(id: string): ItemType | undefined {
  return ITEM_TYPES.find(item => item.id === id);
}

// Get utility score for an item (defaults to 5 if not set)
export function getUtilityScore(itemType: ItemType | undefined, usePersonalized: boolean = false): number {
  if (!itemType) return 5;
  
  if (usePersonalized && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('raid_value_calc_user_utility_prefs');
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs[itemType.id] !== undefined) {
          return prefs[itemType.id];
        }
      }
    } catch (error) {
      console.warn('Failed to load user utility preferences:', error);
    }
  }
  
  return itemType.utilityScore ?? 5;
}

// Calculate utility-adjusted price
export function calculateUtilityAdjustedPrice(basePrice: number, utilityScore: number): number {
  // Utility score of 5 = no adjustment (1.0x multiplier)
  // Utility score of 10 = 1.5x multiplier (more valuable)
  // Utility score of 1 = 0.2x multiplier (much less valuable)
  const multiplier = 0.2 + (utilityScore - 1) * (1.3 / 9);
  return basePrice * multiplier;
}

export function getItemTypesByCategory(category: string): ItemType[] {
  return ITEM_TYPES.filter(item => item.category === category);
}

export function getAllCategories(): string[] {
  return Object.values(ITEM_CATEGORIES);
}

export function calculatePackValue(_packItems: PackItem[]): {
  totalMarketValue: number;
  itemBreakdown: Array<{
    itemType: ItemType;
    quantity: number;
    marketValue: number;
  }>;
} {
  // This function now returns empty values since market values are calculated
  // dynamically from actual pack data in the components
  // packItems parameter kept for backwards compatibility
  
  return {
    totalMarketValue: 0,
    itemBreakdown: []
  };
}
