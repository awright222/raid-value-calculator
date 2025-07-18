export interface ItemType {
  id: string;
  name: string;
  category: string;
  baseValue?: number; // For items with fixed conversion rates (like energy pots)
  marketValue?: number; // Market value in USD for non-energy items
  energyEquivalent?: number; // Energy equivalent for value comparison
  description?: string;
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
  SUMMONING: 'Summoning Shards',
  SOUL_SUMMONING: 'Soul Summoning',
  SKILL_TOMES: 'Skill Tomes',
  FARMING: 'Farming & Convenience'
} as const;

export const ITEM_TYPES: ItemType[] = [
  // Energy
  {
    id: 'energy_pot',
    name: 'Energy Pot',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 130,
    description: '1 Energy Pot = 130 Energy'
  },
  {
    id: 'raw_energy',
    name: 'Raw Energy',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 1,
    description: 'Direct energy units'
  },

  // Currency
  {
    id: 'silver',
    name: 'Silver',
    category: ITEM_CATEGORIES.CURRENCY,
    description: 'In-game currency for upgrades and purchases'
  },
  {
    id: 'gems',
    name: 'Gems',
    category: ITEM_CATEGORIES.CURRENCY,
    description: 'Premium currency for energy, masteries, and purchases'
  },

  // Leveling
  {
    id: 'xp_brew',
    name: 'XP Brew',
    category: ITEM_CATEGORIES.LEVELING,
    description: 'Experience brew for champion leveling'
  },
  {
    id: 'xp_barrel',
    name: 'XP Barrel',
    category: ITEM_CATEGORIES.LEVELING,
    description: 'Large experience boost for champions'
  },
  {
    id: 'xp_boost_1d',
    name: '100% XP Boost (1d.)',
    category: ITEM_CATEGORIES.LEVELING,
    description: '100% XP boost for 1 day'
  },

  // Ranking Up
  {
    id: 'chicken_3star',
    name: '3 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '3-star food champion for ranking up'
  },
  {
    id: 'chicken_4star',
    name: '4 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '4-star food champion for ranking up'
  },
  {
    id: 'chicken_5star',
    name: '5 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    description: '5-star food champion for ranking up'
  },
  {
    id: 'meal',
    name: 'Meal',
    category: ITEM_CATEGORIES.RANKING,
    description: 'Special food item for champion ranking'
  },

  // Summoning Shards
  {
    id: 'ancient_shard',
    name: 'Ancient Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Common summoning shard'
  },
  {
    id: 'void_shard',
    name: 'Void Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Void affinity summoning shard'
  },
  {
    id: 'primal_shard',
    name: 'Primal Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Primal summoning shard'
  },
  {
    id: 'sacred_shard',
    name: 'Sacred Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    description: 'Legendary summoning shard'
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
    description: 'Skill book for rare champions'
  },
  {
    id: 'epic_skill_tome',
    name: 'Epic Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for epic champions'
  },
  {
    id: 'legendary_skill_tome',
    name: 'Legendary Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for legendary champions'
  },
  {
    id: 'mythical_skill_tome',
    name: 'Mythical Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    description: 'Skill book for mythical champions'
  },

  // Farming & Convenience
  {
    id: 'multi_battle_attempts',
    name: 'Multi-Battle Attempts',
    category: ITEM_CATEGORIES.FARMING,
    description: 'Attempts for automated multi-battle farming'
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

export function getItemTypeById(id: string): ItemType | undefined {
  return ITEM_TYPES.find(item => item.id === id);
}

export function getItemTypesByCategory(category: string): ItemType[] {
  return ITEM_TYPES.filter(item => item.category === category);
}

export function getAllCategories(): string[] {
  return Object.values(ITEM_CATEGORIES);
}

export function calculatePackValue(packItems: PackItem[]): {
  totalMarketValue: number;
  totalEnergyEquivalent: number;
  costPerEnergyEquivalent: number;
  itemBreakdown: Array<{
    itemType: ItemType;
    quantity: number;
    marketValue: number;
    energyEquivalent: number;
  }>;
} {
  // This function now returns empty values since market values are calculated
  // dynamically from actual pack data in the components
  // packItems parameter kept for backwards compatibility
  console.log('calculatePackValue called with', packItems.length, 'items');
  
  return {
    totalMarketValue: 0,
    totalEnergyEquivalent: 0,
    costPerEnergyEquivalent: 0,
    itemBreakdown: []
  };
}
