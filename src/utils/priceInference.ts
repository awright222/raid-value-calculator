/**
 * Utility for calculating weighted item prices from pack data
 * Uses an iterative approach to infer prices from multi-item packs
 */

export interface PackData {
  price: number;
  items: Array<{ itemTypeId: string; quantity: number }>;
}

export interface ItemPriceData {
  totalCost: number;
  totalQuantity: number;
  packCount: number;
}

/**
 * Calculate weighted average prices for items using intelligent price inference
 * 
 * Algorithm:
 * 1. Start with single-item packs (these give definitive prices)
 * 2. For multi-item packs, use known prices to infer unknown prices
 * 3. Iterate until prices converge
 * 
 * This avoids the naive approach of splitting pack costs equally by quantity,
 * which assumes all items have equal value (clearly wrong for primal shards vs energy)
 */
export function calculateWeightedItemPrices(
  packs: PackData[]
): Record<string, number> {
  let itemStats: Record<string, ItemPriceData> = {};
  let currentPrices: Record<string, number> = {};
  
  // Step 1: Get definitive prices from single-item packs
  packs.forEach(pack => {
    if (!pack.items || pack.items.length !== 1) return;
    
    const item = pack.items[0];
    if (!itemStats[item.itemTypeId]) {
      itemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
    }
    
    itemStats[item.itemTypeId].totalCost += pack.price;
    itemStats[item.itemTypeId].totalQuantity += item.quantity;
    itemStats[item.itemTypeId].packCount += 1;
  });

  // Calculate initial prices from single-item packs
  Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
    currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
  });

  // Step 2: Iteratively infer prices from multi-item packs
  const multiItemPacks = packs.filter(pack => pack.items && pack.items.length > 1);
  const maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    let pricesChanged = false;
    const newItemStats: Record<string, ItemPriceData> = JSON.parse(JSON.stringify(itemStats));

    multiItemPacks.forEach(pack => {
      if (!pack.items || pack.items.length <= 1) return;

      // Calculate known value from items we already have prices for
      let knownValue = 0;
      let unknownItems: Array<{ itemTypeId: string; quantity: number }> = [];

      pack.items.forEach(item => {
        if (currentPrices[item.itemTypeId]) {
          knownValue += currentPrices[item.itemTypeId] * item.quantity;
        } else {
          unknownItems.push(item);
        }
      });

      // If we have some known items and some unknown items, we can infer unknown prices
      if (unknownItems.length > 0) {
        const remainingValue = Math.max(0, pack.price - knownValue);
        const totalUnknownQuantity = unknownItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalUnknownQuantity > 0 && remainingValue > 0) {
          unknownItems.forEach(item => {
            // Distribute remaining value proportionally by quantity among unknown items
            const inferredPricePerItem = (remainingValue * item.quantity) / totalUnknownQuantity / item.quantity;
            
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
            }
            
            newItemStats[item.itemTypeId].totalCost += inferredPricePerItem * item.quantity;
            newItemStats[item.itemTypeId].totalQuantity += item.quantity;
            newItemStats[item.itemTypeId].packCount += 1;
          });
        } else if (remainingValue <= 0 && knownValue > 0) {
          // Known items already account for full pack value - this might be a discount pack
          // Don't infer negative values, but still count these items in the pack count
          unknownItems.forEach(item => {
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
            }
            newItemStats[item.itemTypeId].packCount += 1;
          });
        }
      }
    });

    // Update prices and check for convergence
    const previousPrices = { ...currentPrices };
    Object.entries(newItemStats).forEach(([itemTypeId, stats]) => {
      if (stats.totalQuantity > 0) {
        currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
      }
    });

    // Check if prices have stabilized (converged)
    const tolerance = 0.001;
    pricesChanged = Object.keys(currentPrices).some(itemTypeId => {
      const oldPrice = previousPrices[itemTypeId] || 0;
      const newPrice = currentPrices[itemTypeId] || 0;
      return Math.abs(newPrice - oldPrice) > tolerance;
    });

    if (!pricesChanged) break;
    iteration++;
    itemStats = newItemStats;
  }

  return currentPrices;
}

/**
 * Calculate weighted item prices with additional statistics
 */
export function calculateWeightedItemPricesWithStats(
  packs: PackData[]
): Record<string, { price: number; stats: ItemPriceData }> {
  let itemStats: Record<string, ItemPriceData> = {};
  let currentPrices: Record<string, number> = {};
  
  // Step 1: Get definitive prices from single-item packs
  packs.forEach(pack => {
    if (!pack.items || pack.items.length !== 1) return;
    
    const item = pack.items[0];
    if (!itemStats[item.itemTypeId]) {
      itemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
    }
    
    itemStats[item.itemTypeId].totalCost += pack.price;
    itemStats[item.itemTypeId].totalQuantity += item.quantity;
    itemStats[item.itemTypeId].packCount += 1;
  });

  // Calculate initial prices from single-item packs
  Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
    currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
  });

  // Step 2: Iteratively infer prices from multi-item packs
  const multiItemPacks = packs.filter(pack => pack.items && pack.items.length > 1);
  const maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    let pricesChanged = false;
    const newItemStats: Record<string, ItemPriceData> = JSON.parse(JSON.stringify(itemStats));

    multiItemPacks.forEach(pack => {
      if (!pack.items || pack.items.length <= 1) return;

      let knownValue = 0;
      let unknownItems: Array<{ itemTypeId: string; quantity: number }> = [];

      pack.items.forEach(item => {
        if (currentPrices[item.itemTypeId]) {
          knownValue += currentPrices[item.itemTypeId] * item.quantity;
        } else {
          unknownItems.push(item);
        }
      });

      if (unknownItems.length > 0) {
        const remainingValue = Math.max(0, pack.price - knownValue);
        const totalUnknownQuantity = unknownItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalUnknownQuantity > 0 && remainingValue > 0) {
          unknownItems.forEach(item => {
            const inferredPricePerItem = (remainingValue * item.quantity) / totalUnknownQuantity / item.quantity;
            
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
            }
            
            newItemStats[item.itemTypeId].totalCost += inferredPricePerItem * item.quantity;
            newItemStats[item.itemTypeId].totalQuantity += item.quantity;
            newItemStats[item.itemTypeId].packCount += 1;
          });
        } else if (remainingValue <= 0 && knownValue > 0) {
          // Known items already account for full pack value - this might be a discount pack
          // Don't infer negative values, but still count these items in the pack count
          unknownItems.forEach(item => {
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
            }
            newItemStats[item.itemTypeId].packCount += 1;
          });
        }
      }
    });

    const previousPrices = { ...currentPrices };
    Object.entries(newItemStats).forEach(([itemTypeId, stats]) => {
      if (stats.totalQuantity > 0) {
        currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
      }
    });

    const tolerance = 0.001;
    pricesChanged = Object.keys(currentPrices).some(itemTypeId => {
      const oldPrice = previousPrices[itemTypeId] || 0;
      const newPrice = currentPrices[itemTypeId] || 0;
      return Math.abs(newPrice - oldPrice) > tolerance;
    });

    if (!pricesChanged) break;
    iteration++;
    itemStats = newItemStats;
  }

  // Combine prices with stats
  const result: Record<string, { price: number; stats: ItemPriceData }> = {};
  Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
    result[itemTypeId] = {
      price: stats.totalCost / stats.totalQuantity,
      stats
    };
  });

  return result;
}
