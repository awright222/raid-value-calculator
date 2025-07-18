import { getAllPacks } from '../firebase/database';
import { getItemTypeById } from '../types/itemTypes';

export interface ItemPriceData {
  itemTypeId: string;
  price: number;
  confidence: number;
  packCount: number;
  totalQuantity: number;
}

export interface PricingResult {
  itemPrices: Record<string, number>;
  itemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }>;
  totalPacks: number;
}

/**
 * Advanced dynamic pricing algorithm that discovers item prices through iterative deduction
 * This is the same algorithm used in ItemValues but extracted for reuse
 */

// Cache to ensure both ItemValues and PackAnalyzer use identical pricing data
let pricingCache: PricingResult | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION_MS = 30000; // 30 seconds

// Function to clear the cache when needed
export const clearPricingCache = () => {
  pricingCache = null;
  lastCacheTime = 0;
  console.log('🗑️ Pricing cache cleared');
};

export const calculateItemPrices = async (forceRefresh: boolean = false): Promise<PricingResult> => {
  // Check if we have valid cached data
  const now = Date.now();
  if (!forceRefresh && pricingCache && (now - lastCacheTime) < CACHE_DURATION_MS) {
    console.log('🚀 Using cached pricing data');
    return pricingCache;
  }

  console.log('🔄 Calculating fresh pricing data...');
  const packs = await getAllPacks();
  console.log('Pricing Algorithm: Loading data from', packs.length, 'packs');
  
  // Filter packs that have items data (include ALL items, not just energy items)
  const packsWithItems = packs.filter(pack => pack.items && pack.items.length > 0);
  const packsWithoutItems = packs.filter(pack => !pack.items || pack.items.length === 0);
  const energyPacks = packs.filter(pack => pack.items && pack.items.length > 0 && pack.total_energy > 0);
  const nonEnergyPacks = packs.filter(pack => pack.items && pack.items.length > 0 && pack.total_energy === 0);
  
  console.log('Packs with items data (all types):', packsWithItems.length);
  console.log('Packs without items data:', packsWithoutItems.length);
  console.log('Energy packs:', energyPacks.length);
  console.log('Non-energy packs (shards, tomes, etc.):', nonEnergyPacks.length);
  
  if (nonEnergyPacks.length > 0) {
    console.log('Sample non-energy pack:', nonEnergyPacks[0]);
    console.log('Items in non-energy pack:', nonEnergyPacks[0].items);
  }
  
  // Debug: Check pack structure
  if (packsWithItems.length > 0) {
    console.log('Sample pack with items:', packsWithItems[0]);
    console.log('Items in first pack:', packsWithItems[0].items);
  }
  
  let itemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }> = {};
  let currentPrices: Record<string, number> = {};

  // Step 1: Get baseline prices from single-item packs (these are definitive for ANY item type)
  let singleItemPackCount = 0;
  packsWithItems.forEach(pack => {
    if (!pack.items || pack.items.length !== 1) return;
    
    singleItemPackCount++;
    const item = pack.items[0];
    if (!itemStats[item.itemTypeId]) {
      itemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
    }
    
    itemStats[item.itemTypeId].totalCost += pack.price;
    itemStats[item.itemTypeId].totalQuantity += item.quantity;
    itemStats[item.itemTypeId].packCount += 1;
  });
  
  console.log('Found', singleItemPackCount, 'single-item packs establishing baseline prices');
  console.log('Baseline prices established for:', Object.keys(itemStats).length, 'item types');

  // Calculate baseline prices from single-item packs
  Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
    const pricePerUnit = stats.totalCost / stats.totalQuantity;
    currentPrices[itemTypeId] = pricePerUnit;
    
    const itemType = getItemTypeById(itemTypeId);
    console.log(`Baseline: ${itemType?.name || itemTypeId} = $${pricePerUnit.toFixed(6)} (${stats.packCount} packs, ${stats.totalQuantity} items, avg pack price: $${(stats.totalCost / stats.packCount).toFixed(2)})`);
  });

  // Step 2: Iteratively calculate unknown item prices from multi-item packs
  // This will discover new item prices and refine existing ones
  const multiItemPacks = packsWithItems.filter(pack => pack.items && pack.items.length > 1);
  console.log('Processing', multiItemPacks.length, 'multi-item packs to discover/refine prices');
  
  const maxIterations = 15; // Increased iterations for better convergence
  let iteration = 0;

  while (iteration < maxIterations) {
    let pricesChanged = false;
    let newPricesFound = 0;
    const newItemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }> = { ...itemStats };

    multiItemPacks.forEach(pack => {
      if (!pack.items || pack.items.length <= 1) return;

      // Separate known and unknown items
      let knownValue = 0;
      let knownItems: Array<{ itemTypeId: string; quantity: number; price: number }> = [];
      let unknownItems: Array<{ itemTypeId: string; quantity: number }> = [];

      pack.items.forEach(item => {
        if (currentPrices[item.itemTypeId] !== undefined) {
          const itemValue = currentPrices[item.itemTypeId] * item.quantity;
          knownValue += itemValue;
          knownItems.push({
            itemTypeId: item.itemTypeId,
            quantity: item.quantity,
            price: currentPrices[item.itemTypeId]
          });
        } else {
          unknownItems.push(item);
        }
      });

      // If we have some known items and some unknown items, we can infer unknown prices
      if (unknownItems.length > 0 && knownItems.length > 0 && knownValue < pack.price) {
        const remainingValue = pack.price - knownValue;
        
        if (remainingValue > 0) {
          // Distribute remaining value proportionally by quantity
          const totalUnknownQuantity = unknownItems.reduce((sum, item) => sum + item.quantity, 0);
          
          unknownItems.forEach(item => {
            const proportionalValue = (remainingValue * item.quantity) / totalUnknownQuantity;
            
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
              newPricesFound++;
            }
            
            newItemStats[item.itemTypeId].totalCost += proportionalValue;
            newItemStats[item.itemTypeId].totalQuantity += item.quantity;
            newItemStats[item.itemTypeId].packCount += 1;
          });
        }
      }
      
      // Also use this pack to refine existing price estimates
      if (unknownItems.length === 0 && knownItems.length > 1) {
        // This pack contains only known items - use it to validate/refine prices
        const calculatedValue = knownItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const actualValue = pack.price;
        
        if (Math.abs(calculatedValue - actualValue) > 0.01) {
          // There's a discrepancy - adjust prices proportionally
          const adjustmentFactor = actualValue / calculatedValue;
          
          knownItems.forEach(item => {
            const adjustedValue = (item.price * item.quantity * adjustmentFactor);
            
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { ...itemStats[item.itemTypeId] };
            }
            
            newItemStats[item.itemTypeId].totalCost += adjustedValue;
            newItemStats[item.itemTypeId].totalQuantity += item.quantity;
            newItemStats[item.itemTypeId].packCount += 1;
          });
        }
      }
    });

    // Update prices and check for changes
    const previousPrices = { ...currentPrices };
    Object.entries(newItemStats).forEach(([itemTypeId, stats]) => {
      if (stats.totalQuantity > 0) {
        const newPrice = stats.totalCost / stats.totalQuantity;
        currentPrices[itemTypeId] = newPrice;
        
        // Log new discoveries
        if (previousPrices[itemTypeId] === undefined) {
          console.log(`🆕 Discovered: ${getItemTypeById(itemTypeId)?.name || itemTypeId} = $${newPrice.toFixed(6)}`);
        }
      }
    });

    // Check if prices have stabilized
    const tolerance = 0.001;
    pricesChanged = Object.keys(currentPrices).some(itemTypeId => {
      const oldPrice = previousPrices[itemTypeId] || 0;
      const newPrice = currentPrices[itemTypeId] || 0;
      return Math.abs(newPrice - oldPrice) > tolerance;
    });

    console.log(`Iteration ${iteration + 1}: Found ${newPricesFound} new items, prices changed: ${pricesChanged}`);
    
    if (!pricesChanged && newPricesFound === 0) break;
    iteration++;
    itemStats = newItemStats;
  }

  console.log(`Algorithm completed after ${iteration} iterations`);
  console.log(`Final pricing model covers ${Object.keys(currentPrices).length} different item types`);

  // Data quality assessment
  if (packs.length < 100) {
    console.warn(`⚠️ LIMITED DATA WARNING: Only ${packs.length} packs available. Prices may be unstable.`);
    console.warn(`   Recommend collecting more pack data for accurate pricing.`);
  }
  if (singleItemPackCount < 20) {
    console.warn(`⚠️ FEW BASELINE PACKS: Only ${singleItemPackCount} single-item packs for baseline pricing.`);
    console.warn(`   Consider adding more single-item reference packs.`);
  }

  // Show final prices for debugging with sanity checks
  console.log('\n=== FINAL PRICING ANALYSIS ===');
  const finalPrices = Object.entries(currentPrices).map(([itemTypeId, price]) => {
    const itemType = getItemTypeById(itemTypeId);
    const stats = itemStats[itemTypeId];
    const avgPackPrice = stats ? (stats.totalCost / stats.packCount) : 0;
    
    return {
      itemTypeId,
      name: itemType?.name || itemTypeId,
      price,
      packCount: stats?.packCount || 0,
      avgPackPrice,
      priceText: `${itemType?.name || itemTypeId}: $${price.toFixed(4)} (${stats?.packCount || 0} packs, avg pack: $${avgPackPrice.toFixed(2)})`
    };
  }).sort((a, b) => b.price - a.price); // Sort by price descending

  // Show top 10 most expensive items
  console.log('Most expensive items:');
  finalPrices.slice(0, 10).forEach(item => console.log(`  ${item.priceText}`));
  
  // Show energy baseline for comparison
  const energyPrice = currentPrices['raw_energy'];
  if (energyPrice) {
    console.log(`\n🔋 Raw Energy baseline: $${energyPrice.toFixed(6)} per energy`);
    console.log('Items priced relative to energy:');
    ['sacred_shard', 'void_shard', 'legendary_skill_tome', 'silver'].forEach(itemId => {
      if (currentPrices[itemId]) {
        const energyEquivalent = currentPrices[itemId] / energyPrice;
        const itemType = getItemTypeById(itemId);
        console.log(`  ${itemType?.name || itemId}: ${energyEquivalent.toFixed(0)} energy equivalent`);
      }
    });
  }

  const result = {
    itemPrices: currentPrices,
    itemStats,
    totalPacks: packs.length
  };

  // Cache the result
  pricingCache = result;
  lastCacheTime = Date.now();
  console.log('💾 Pricing data cached for', Object.keys(currentPrices).length, 'items');

  // Validate key prices for consistency
  console.log('\n🔍 PRICE VALIDATION:');
  if (currentPrices['silver']) {
    console.log(`Silver: $${currentPrices['silver'].toFixed(6)} per silver`);
    console.log(`  100k silver = $${(currentPrices['silver'] * 100000).toFixed(2)}`);
  }
  if (currentPrices['sacred_shard']) {
    console.log(`Sacred Shard: $${currentPrices['sacred_shard'].toFixed(2)} per shard`);
  }
  if (currentPrices['raw_energy']) {
    console.log(`Raw Energy: $${currentPrices['raw_energy'].toFixed(6)} per energy`);
  }

  return result;
};
