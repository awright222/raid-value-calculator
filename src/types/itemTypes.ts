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
  SKILL_TOMES: 'Skill Tomes'
} as const;

export const ITEM_TYPES: ItemType[] = [
  // Energy
  {
    id: 'energy_pot',
    name: 'Energy Pot',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 130,
    marketValue: 0.05, // ~$0.05 per energy pot
    energyEquivalent: 130,
    description: '1 Energy Pot = 130 Energy'
  },
  {
    id: 'raw_energy',
    name: 'Raw Energy',
    category: ITEM_CATEGORIES.ENERGY,
    baseValue: 1,
    marketValue: 0.0004, // ~$0.0004 per energy unit
    energyEquivalent: 1,
    description: 'Direct energy units'
  },

  // Currency
  {
    id: 'silver',
    name: 'Silver',
    category: ITEM_CATEGORIES.CURRENCY,
    marketValue: 0.000002, // ~$0.000002 per silver (1M silver ≈ $2)
    energyEquivalent: 0.4, // Energy equivalent based on farming efficiency
    description: 'In-game currency for upgrades and purchases'
  },

  // Leveling
  {
    id: 'xp_brew',
    name: 'XP Brew',
    category: ITEM_CATEGORIES.LEVELING,
    marketValue: 0.015, // ~$0.015 per XP brew
    energyEquivalent: 30, // Equivalent energy value for comparison
    description: 'Experience brew for champion leveling'
  },
  {
    id: 'xp_barrel',
    name: 'XP Barrel',
    category: ITEM_CATEGORIES.LEVELING,
    marketValue: 0.08, // ~$0.08 per XP barrel
    energyEquivalent: 160, // Equivalent energy value for comparison
    description: 'Large experience boost for champions'
  },

  // Ranking Up
  {
    id: 'chicken_3star',
    name: '3 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    marketValue: 0.25, // ~$0.25 per 3-star chicken
    energyEquivalent: 500, // Energy equivalent for farming/leveling
    description: '3-star food champion for ranking up'
  },
  {
    id: 'chicken_4star',
    name: '4 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    marketValue: 1.20, // ~$1.20 per 4-star chicken
    energyEquivalent: 2400, // Energy equivalent for farming/leveling
    description: '4-star food champion for ranking up'
  },
  {
    id: 'chicken_5star',
    name: '5 Star Chicken',
    category: ITEM_CATEGORIES.RANKING,
    marketValue: 6.00, // ~$6.00 per 5-star chicken
    energyEquivalent: 12000, // Energy equivalent for farming/leveling
    description: '5-star food champion for ranking up'
  },
  {
    id: 'meal',
    name: 'Meal',
    category: ITEM_CATEGORIES.RANKING,
    marketValue: 0.10, // ~$0.10 per meal
    energyEquivalent: 200, // Energy equivalent
    description: 'Special food item for champion ranking'
  },

  // Summoning Shards
  {
    id: 'ancient_shard',
    name: 'Ancient Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    marketValue: 0.30, // ~$0.30 per ancient shard
    energyEquivalent: 600, // Energy equivalent based on farming time
    description: 'Common summoning shard'
  },
  {
    id: 'void_shard',
    name: 'Void Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    marketValue: 1.50, // ~$1.50 per void shard
    energyEquivalent: 3000, // Energy equivalent based on rarity
    description: 'Void affinity summoning shard'
  },
  {
    id: 'primal_shard',
    name: 'Primal Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    marketValue: 2.00, // ~$2.00 per primal shard
    energyEquivalent: 4000, // Energy equivalent based on rarity
    description: 'Primal summoning shard'
  },
  {
    id: 'sacred_shard',
    name: 'Sacred Shard',
    category: ITEM_CATEGORIES.SUMMONING,
    marketValue: 12.00, // ~$12.00 per sacred shard
    energyEquivalent: 24000, // Energy equivalent based on rarity
    description: 'Legendary summoning shard'
  },

  // Soul Summoning
  {
    id: 'mortal_soulstone',
    name: 'Mortal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    marketValue: 0.40, // ~$0.40 per mortal soulstone
    energyEquivalent: 800, // Energy equivalent
    description: 'Soul summoning stone (mortal tier)'
  },
  {
    id: 'immortal_soulstone',
    name: 'Immortal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    marketValue: 2.50, // ~$2.50 per immortal soulstone
    energyEquivalent: 5000, // Energy equivalent
    description: 'Soul summoning stone (immortal tier)'
  },
  {
    id: 'eternal_soulstone',
    name: 'Eternal Soulstone',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    marketValue: 15.00, // ~$15.00 per eternal soulstone
    energyEquivalent: 30000, // Energy equivalent
    description: 'Soul summoning stone (eternal tier)'
  },
  {
    id: 'prism_jewel',
    name: 'Prism Jewel',
    category: ITEM_CATEGORIES.SOUL_SUMMONING,
    marketValue: 0.25, // ~$0.25 per prism jewel
    energyEquivalent: 500, // Energy equivalent
    description: 'Premium soul summoning currency'
  },

  // Skill Tomes
  {
    id: 'rare_skill_tome',
    name: 'Rare Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    marketValue: 0.75, // ~$0.75 per rare skill tome
    energyEquivalent: 1500, // Energy equivalent based on farming difficulty
    description: 'Skill book for rare champions'
  },
  {
    id: 'epic_skill_tome',
    name: 'Epic Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    marketValue: 3.50, // ~$3.50 per epic skill tome
    energyEquivalent: 7000, // Energy equivalent based on farming difficulty
    description: 'Skill book for epic champions'
  },
  {
    id: 'legendary_skill_tome',
    name: 'Legendary Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    marketValue: 20.00, // ~$20.00 per legendary skill tome
    energyEquivalent: 40000, // Energy equivalent based on rarity
    description: 'Skill book for legendary champions'
  },
  {
    id: 'mythical_skill_tome',
    name: 'Mythical Skill Tome',
    category: ITEM_CATEGORIES.SKILL_TOMES,
    marketValue: 50.00, // ~$50.00 per mythical skill tome
    energyEquivalent: 100000, // Energy equivalent based on extreme rarity
    description: 'Skill book for mythical champions'
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
  let totalMarketValue = 0;
  let totalEnergyEquivalent = 0;
  const itemBreakdown: Array<{
    itemType: ItemType;
    quantity: number;
    marketValue: number;
    energyEquivalent: number;
  }> = [];

  packItems.forEach(item => {
    const itemType = getItemTypeById(item.itemTypeId);
    if (itemType && itemType.marketValue && itemType.energyEquivalent) {
      const itemMarketValue = item.quantity * itemType.marketValue;
      const itemEnergyEquivalent = item.quantity * itemType.energyEquivalent;
      
      totalMarketValue += itemMarketValue;
      totalEnergyEquivalent += itemEnergyEquivalent;
      
      itemBreakdown.push({
        itemType,
        quantity: item.quantity,
        marketValue: itemMarketValue,
        energyEquivalent: itemEnergyEquivalent
      });
    }
  });

  const costPerEnergyEquivalent = totalEnergyEquivalent > 0 ? totalMarketValue / totalEnergyEquivalent : 0;

  return {
    totalMarketValue,
    totalEnergyEquivalent,
    costPerEnergyEquivalent,
    itemBreakdown
  };
}
