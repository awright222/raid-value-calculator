import { getAllPacks } from '../firebase/database';
import { getItemTypeById } from '../types/itemTypes';

export interface ItemPriceData {
  itemTypeId: string;
  price: number;
  confidence: number;
  totalQuantity: number;
}

export interface PricingResult {
  itemPrices: Record<string, number>;
  itemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }>;
  totalPacks: number;
}

export interface PackValueAnalysis {
  grade: 'SSS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | 'NEW';
  totalValue: number;
  dollarsPerDollar: number; 
  comparison: {
    betterThanPercent: number;
    totalPacksCompared: number;
  };
  similarPacks: Array<{
    name: string;
    price: number;
    totalValue: number;
    dollarsPerDollar: number;
  }>;
}

/**
 * Advanced dynamic pricing algorithm that discovers item prices through iterative deduction
 * This is the same algorithm used in ItemValues but extracted for reuse
 */

// Cache to ensure both ItemValues and PackAnalyzer use identical pricing data
let pricingCache: PricingResult | null = null;
// @ts-ignore - Used in cache logic that's temporarily disabled
let lastCacheTime: number = 0;
// @ts-ignore - Used in cache logic that's temporarily disabled
const CACHE_DURATION_MS = 30000; // 30 seconds

// Function to clear the cache when needed
export const clearPricingCache = () => {
  pricingCache = null;
  lastCacheTime = 0;
  console.log('🗑️ Pricing cache cleared');
};

export const calculateItemPrices = async (): Promise<Record<string, number>> => {
  console.log('� PricingService v1.2.3 - Starting calculateItemPrices() with enhanced debugging');
  console.log('🎯 FOCUSED: Looking specifically for chest pack processing issues');
  
  try {
    // Force refresh by clearing cache
    pricingCache = null;
    lastCacheTime = 0;
    
    // Check if we have valid cached data (but force refresh for debugging)
    // const now = Date.now(); // Currently not using cache
    // Temporarily disable caching for debugging
    // if (pricingCache && (now - lastCacheTime) < CACHE_DURATION_MS) {
    //   console.log('🚀 Using cached pricing data');
    //   return pricingCache.itemPrices;
    // }

    console.log('🔄 Calculating fresh pricing data...');
    
    // Add timeout and retry logic for getAllPacks
    let packs: any[] = [];
    try {
      console.log('🔄 Attempting to load packs from Firebase...');
      packs = await getAllPacks();
      console.log('✅ Successfully loaded', packs.length, 'packs from Firebase');
    } catch (error) {
      console.error('❌ Failed to load packs from Firebase:', error);
      
      // Log specific error details
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500) // Truncate stack trace
        });
      }
      
      // Check for specific error types
      if (error && typeof error === 'object') {
        console.error('Error object:', {
          code: (error as any).code,
          status: (error as any).status,
          statusText: (error as any).statusText
        });
      }
      
      // Return cached data if available, even if expired
      if (pricingCache) {
        console.log('🔄 Using expired cache due to Firebase error');
        return (pricingCache as any).itemPrices || {};
      }
      
      // If no cache available, return empty result
      console.log('⚠️ No cache available, returning empty pricing data');
      return {};
    }
    
    console.log('Pricing Algorithm: Processing data from', packs.length, 'packs');
  
  // DEBUG: Check if any packs contain chest items at the very beginning
  console.log('🚨 EARLY CHEST DEBUG - RAW PACK DATA:');
  const earlyChestPacks = packs.filter((pack: any) => {
    const hasChest = pack.items?.some((item: any) => 
      item.itemTypeId === 'magnificent_artifact_chest' || 
      (item.name && item.name.toLowerCase().includes('chest')) ||
      (item.itemName && item.itemName.toLowerCase().includes('chest'))
    );
    return hasChest;
  });
  console.log(`🎯 EARLY: Found ${earlyChestPacks.length} packs with chest items in raw data`);
  earlyChestPacks.forEach((pack: any, index: number) => {
    console.log(`🎯 EARLY Chest Pack ${index + 1}:`, {
      id: pack.id,
      price: pack.price,
      priceType: typeof pack.price,
      itemsLength: pack.items?.length,
      itemsExist: !!pack.items,
      rawItems: pack.items,
      submittedAt: pack.submittedAt
    });
  });
  
  // Filter packs that have items data and valid prices (include ALL items, not just energy items)
  const packsWithItems = packs.filter(pack => pack.items && pack.items.length > 0 && pack.price && pack.price > 0);
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
    if (!pack.items || pack.items.length !== 1 || !pack.price || pack.price <= 0) return;
    
    // Skip chest from baseline calculation - force it to be calculated via multi-item deduction
    const hasChest = pack.items.some((item: any) => item.itemTypeId === 'magnificent_artifact_chest');
    if (hasChest) {
      console.log('� CHEST PACK FOUND IN SINGLE-ITEM DATA, BUT SKIPPING BASELINE - forcing multi-item calculation');
      return; // Skip processing chest as baseline
    }
    
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
    console.log(`Baseline: ${itemType?.name || itemTypeId} = $${pricePerUnit.toFixed(6)} (${stats.packCount} packs, ${stats.totalQuantity} items)`);
  });

  console.log('✅ Baseline calculation complete. Found', singleItemPackCount, 'single-item packs for', Object.keys(itemStats).length, 'item types');

  // Step 2: Iteratively calculate unknown item prices from multi-item packs
  // This will discover new item prices and refine existing ones
  
  const multiItemPacks = packsWithItems.filter(pack => pack.items && pack.items.length > 1 && pack.price && pack.price > 0);
  console.log('🔍 Processing', multiItemPacks.length, 'multi-item packs to discover/refine prices');
  
  // PRIORITY PROCESSING: Find and process the target chest pack first
  const targetChestPack = multiItemPacks.find((pack: any) => {
    const hasChest = pack.items?.some((item: any) => item.itemTypeId === 'magnificent_artifact_chest');
    const hasSilver = pack.items?.some((item: any) => item.itemTypeId === 'silver');
    const hasOil = pack.items?.some((item: any) => item.itemTypeId === 'lesser_oil');
    return hasChest && hasSilver && hasOil && pack.price > 15; // Should be the $19.99 pack
  });
  
  if (targetChestPack) {
    console.log('🎯 FOUND TARGET CHEST PACK! Processing first to establish correct chest price:', {
      price: targetChestPack.price,
      items: targetChestPack.items?.map((i: any) => `${i.itemTypeId}(${i.quantity})`)
    });
    
    // Move target pack to the front of processing queue
    const otherPacks = multiItemPacks.filter(pack => pack !== targetChestPack);
    multiItemPacks.length = 0;
    multiItemPacks.push(targetChestPack, ...otherPacks);
  } else {
    console.log('❌ TARGET CHEST PACK NOT FOUND! Looking for pack with chest + silver + oil');
  }
  
  const maxIterations = 15; // Increased iterations for better convergence
  let iteration = 0;

  while (iteration < maxIterations) {
    let pricesChanged = false;
    let newPricesFound = 0;
    const newItemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }> = { ...itemStats };

    console.log(`🔄 Iteration ${iteration + 1} starting...`);
    
    // Add debug function to window for checking chest packs
    (window as any).debugChestPacks = () => {
      console.log('🔍 Searching for chest packs in all pack data...');
      packs.forEach((pack: any, index: number) => {
        const hasChest = pack.items?.some((item: any) => item.itemTypeId === 'magnificent_artifact_chest');
        if (hasChest) {
          console.log(`🎯 FOUND CHEST PACK ${index + 1}:`, {
            price: pack.price,
            items: pack.items,
            date: pack.submittedAt,
            isMultiItem: pack.items?.length > 1
          });
        }
      });
    };

    multiItemPacks.forEach(pack => {
      if (!pack.items || pack.items.length <= 1) return;

      // Separate known and unknown items
      let knownValue = 0;
      let knownItems: Array<{ itemTypeId: string; quantity: number; price: number }> = [];
      let unknownItems: Array<{ itemTypeId: string; quantity: number }> = [];

      // SPECIAL DEBUG FOR CHEST PACK
      const isChestPack = pack.items?.some((item: any) => item.itemTypeId === 'magnificent_artifact_chest');
      if (isChestPack) {
        console.log('🔥 PROCESSING CHEST PACK! Price:', pack.price, 'Items:', pack.items?.length);
      }

      pack.items.forEach((item: any) => {
        const currentPrice = currentPrices[item.itemTypeId];
        
        // SPECIAL DEBUG FOR CHEST ITEM
        if (item.itemTypeId === 'magnificent_artifact_chest') {
          console.log('🔥 CHEST ITEM PROCESSING - Current price:', currentPrice?.toFixed(4) || 'None');
          
          // FORCE CHEST TO BE UNKNOWN IN TARGET PACK
          const isTargetPack = pack.items?.some((i: any) => i.itemTypeId === 'silver') && 
                             pack.items?.some((i: any) => i.itemTypeId === 'lesser_oil') &&
                             pack.price > 15; // Should be the $19.99 pack
          
          if (isTargetPack) {
            console.log('🔧 FORCING CHEST TO BE UNKNOWN IN TARGET PACK - Overriding existing price');
            unknownItems.push(item);
            return; // Skip adding to known items - force as unknown
          }
        }
        
        // console.log(`Checking item: ${itemType?.name || item.itemTypeId} (${item.itemTypeId}), current price: ${currentPrice}, qty: ${item.quantity}`);
        
        if (currentPrice !== undefined) {
          // SPECIAL LOGIC: Skip chest if it's not being calculated from the target pack
          if (item.itemTypeId === 'magnificent_artifact_chest') {
            const isTargetPack = pack.items?.some((i: any) => i.itemTypeId === 'silver') && 
                               pack.items?.some((i: any) => i.itemTypeId === 'lesser_oil') &&
                               pack.price > 15; // Should be the $19.99 pack
            
            if (!isTargetPack) {
              console.log('🚫 SKIPPING CHEST CALCULATION - Not the target pack:', {
                packPrice: pack.price,
                hasSilver: pack.items?.some((i: any) => i.itemTypeId === 'silver'),
                hasOil: pack.items?.some((i: any) => i.itemTypeId === 'lesser_oil'),
                items: pack.items?.map((i: any) => i.itemTypeId),
                reason: 'Only target pack with silver+oil can calculate chest'
              });
              // Treat chest as unknown for non-target packs
              unknownItems.push(item);
              return; // Skip adding to known items
            } else {
              console.log('✅ TARGET PACK FOUND - CHEST CALCULATION ALLOWED:', {
                packPrice: pack.price,
                items: pack.items?.map((i: any) => `${i.itemTypeId}(${i.quantity})`)
              });
            }
          }
          
          const itemValue = currentPrice * item.quantity;
          knownValue += itemValue;
          knownItems.push({
            itemTypeId: item.itemTypeId,
            quantity: item.quantity,
            price: currentPrice
          });
          // console.log(`KNOWN: ${itemType?.name} - $${currentPrice.toFixed(6)} x ${item.quantity} = $${itemValue.toFixed(4)}`);
        } else {
          unknownItems.push(item);
          // console.log(`UNKNOWN: ${itemType?.name} - no price established yet`);
        }
      });

      // SPECIAL DEBUG FOR CHEST PACK ANALYSIS
      if (isChestPack) {
        console.log('🔥 CHEST PACK ANALYSIS - Unknown items:', unknownItems.length, 'Known items:', knownItems.length);
        
        if (knownItems.some(i => i.itemTypeId === 'magnificent_artifact_chest')) {
          console.log('❌ PROBLEM: Chest is being treated as KNOWN item! It should be UNKNOWN for proper deduction calculation.');
        }
      }

      // If we have some known items and some unknown items, we can infer unknown prices
      // Check if pack has valid price before processing
      if (unknownItems.length > 0 && knownItems.length > 0 && pack.price && pack.price > 0 && knownValue < pack.price) {
        const remainingValue = pack.price - knownValue;
        
        // SPECIAL DEBUG: If this pack contains the chest, show detailed calculation
        const hasChest = unknownItems.some(item => item.itemTypeId === 'magnificent_artifact_chest');
        if (hasChest) {
          console.log('💎 PACK CALCULATING CHEST PRICE - Pack:', pack.price, 'Known value:', knownValue.toFixed(4), 'Remaining for chest:', remainingValue.toFixed(4));
        }
        
        if (remainingValue > 0) {
          // Distribute remaining value proportionally by quantity
          const totalUnknownQuantity = unknownItems.reduce((sum, item) => sum + item.quantity, 0);
          
          console.log(`Pack $${pack.price}: Known items value $${knownValue.toFixed(4)}, remaining $${remainingValue.toFixed(4)} for ${unknownItems.length} unknown items (${totalUnknownQuantity} total qty)`);
          
          unknownItems.forEach(item => {
            // SPECIAL LOGIC: Skip chest calculation unless this is the target pack
            if (item.itemTypeId === 'magnificent_artifact_chest') {
              const isTargetPack = pack.items?.some((i: any) => i.itemTypeId === 'silver') && 
                                 pack.items?.some((i: any) => i.itemTypeId === 'lesser_oil') &&
                                 pack.price > 15; // Should be the $19.99 pack
              
              if (!isTargetPack) {
                console.log('🚫 BLOCKING CHEST DISCOVERY - Not target pack (price:', pack.price, ')');
                return; // Skip this item entirely
              } else {
                console.log('🎯 CHEST DISCOVERY ALLOWED - Target pack confirmed (price:', pack.price, ')');
              }
            }
            
            const proportionalValue = (remainingValue * item.quantity) / totalUnknownQuantity;
            
            if (!newItemStats[item.itemTypeId]) {
              newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
              newPricesFound++;
            }
            
            newItemStats[item.itemTypeId].totalCost += proportionalValue;
            newItemStats[item.itemTypeId].totalQuantity += item.quantity;
            newItemStats[item.itemTypeId].packCount += 1;
            
            const itemType = getItemTypeById(item.itemTypeId);
            console.log(`Unknown item: ${itemType?.name || item.itemTypeId} qty ${item.quantity} gets $${proportionalValue.toFixed(4)} ($${(proportionalValue/item.quantity).toFixed(6)} per unit)`);
          });
        }
      }
      
      // Also use this pack to refine existing price estimates
      if (unknownItems.length === 0 && knownItems.length > 1 && pack.price && pack.price > 0) {
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

    return currentPrices; // Return just the prices, not the full result object
  } catch (error) {
    console.error('Error calculating item prices:', error);
    
    // Log specific Firebase error details
    if (error instanceof Error) {
      console.error('Firebase Error Details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Return empty result on error to prevent app crash
    return {};
  }
};

/**
 * Analyze pack value using dynamic pricing instead of energy-based comparison
 */
export const analyzePackValueNew = async (
  packItems: Array<{ itemTypeId: string; quantity: number }>,
  packPrice: number
): Promise<PackValueAnalysis> => {
  try {
    console.log('🔍 Starting pack analysis:', { packItems, packPrice });
    
    // Get current pricing data
    const itemPrices = await calculateItemPrices();
    console.log('💰 Item prices loaded:', Object.keys(itemPrices).length, 'items');
    
    // Calculate total value of items in the pack
    let totalValue = 0;
    const itemBreakdown: Array<{ itemTypeId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];
    
    packItems.forEach(item => {
      const unitPrice = itemPrices[item.itemTypeId] || 0;
      const totalPrice = unitPrice * item.quantity;
      totalValue += totalPrice;
      
      console.log(`📦 ${item.itemTypeId}: ${item.quantity} × $${unitPrice.toFixed(6)} = $${totalPrice.toFixed(2)}`);
      
      itemBreakdown.push({
        itemTypeId: item.itemTypeId,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });
    });
    
    const dollarsPerDollar = totalValue / packPrice; // Value received per dollar spent
    
    console.log('🎯 Pack Value Analysis:');
    console.log(`Pack Price: $${packPrice}`);
    console.log(`Total Item Value: $${totalValue.toFixed(2)}`);
    console.log(`Value per Dollar: $${dollarsPerDollar.toFixed(2)}`);
    
    // Get all existing packs for comparison
    console.log('📊 Loading packs for comparison...');
    const allPacks = await getAllPacks();
    console.log(`📦 Loaded ${allPacks.length} total packs from database`);
    
    const packsWithItems = allPacks.filter(pack => pack.items && pack.items.length > 0 && pack.price && pack.price > 0);
    console.log(`📦 Found ${packsWithItems.length} valid packs with items and prices`);
    
    if (packsWithItems.length === 0) {
      console.log('⚠️ No comparison packs available, using fallback grading');
      // Fallback grading based on value ratio when no comparison data exists
      let fallbackGrade: 'SSS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
      
      if (dollarsPerDollar >= 2.0) fallbackGrade = 'SSS';        // 200%+ value
      else if (dollarsPerDollar >= 1.5) fallbackGrade = 'S';     // 150%+ value  
      else if (dollarsPerDollar >= 1.3) fallbackGrade = 'A';     // 130%+ value
      else if (dollarsPerDollar >= 1.1) fallbackGrade = 'B';     // 110%+ value
      else if (dollarsPerDollar >= 0.9) fallbackGrade = 'C';     // 90%+ value
      else if (dollarsPerDollar >= 0.7) fallbackGrade = 'D';     // 70%+ value
      else fallbackGrade = 'F';                                  // < 70% value
      
      console.log(`🎯 Fallback grade: ${fallbackGrade} (${dollarsPerDollar.toFixed(2)}x value ratio)`);
      
      return {
        grade: fallbackGrade,
        totalValue,
        dollarsPerDollar,
        comparison: {
          betterThanPercent: 0,
          totalPacksCompared: 0
        },
        similarPacks: []
      };
    }
    
    // Calculate value ratios for all existing packs
    const packValueRatios: Array<{ pack: any; valueRatio: number }> = [];
    
    for (const pack of packsWithItems) {
      if (!pack.items || pack.items.length === 0) continue;
      
      let packTotalValue = 0;
      
      pack.items.forEach((item: any) => {
        const unitPrice = itemPrices[item.itemTypeId] || 0;
        packTotalValue += unitPrice * item.quantity;
      });
      
      // Check if pack has a valid price before calculating ratio
      if (pack.price && pack.price > 0) {
        const packValueRatio = packTotalValue / pack.price;
        packValueRatios.push({ pack, valueRatio: packValueRatio });
      }
    }
    
    // Sort by value ratio (best deals first)
    packValueRatios.sort((a, b) => b.valueRatio - a.valueRatio);
    
    // Find where this pack ranks
    const betterPacks = packValueRatios.filter(p => p.valueRatio > dollarsPerDollar);
    const betterThanPercent = Math.round(((packValueRatios.length - betterPacks.length) / packValueRatios.length) * 100);

    console.log(`📊 Pack Analysis Results:`);
    console.log(`   This pack value ratio: ${dollarsPerDollar.toFixed(3)}`);
    console.log(`   Better than ${betterThanPercent}% of ${packValueRatios.length} historical packs`);
    console.log(`   Packs with better ratios: ${betterPacks.length}`);

    // Determine grade based on percentile (more reasonable thresholds)
    let grade: 'SSS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    if (betterThanPercent >= 95) grade = 'SSS';      // Top 5%
    else if (betterThanPercent >= 85) grade = 'S';   // Top 15%
    else if (betterThanPercent >= 70) grade = 'A';   // Top 30%
    else if (betterThanPercent >= 50) grade = 'B';   // Above average
    else if (betterThanPercent >= 30) grade = 'C';   // Below average but decent
    else if (betterThanPercent >= 15) grade = 'D';   // Bottom 30%
    else grade = 'F';                                // Bottom 15%    // Find similar packs (within 20% of total value)
    const valueRange = {
      min: totalValue * 0.8,
      max: totalValue * 1.2
    };
    
    const similarPacks = packValueRatios
      .filter(p => {
        if (!p.pack.items || p.pack.items.length === 0) return false;
        
        const packTotalValue = p.pack.items.reduce((sum: number, item: any) => {
          const unitPrice = itemPrices[item.itemTypeId] || 0;
          return sum + (unitPrice * item.quantity);
        }, 0);
        return packTotalValue >= valueRange.min && packTotalValue <= valueRange.max;
      })
      .slice(0, 5) // Top 5 similar packs
      .map(p => {
        const packTotalValue = p.pack.items!.reduce((sum: number, item: any) => {
          const unitPrice = itemPrices[item.itemTypeId] || 0;
          return sum + (unitPrice * item.quantity);
        }, 0);
        
        return {
          name: p.pack.items!.map((item: any) => {
            const itemType = getItemTypeById(item.itemTypeId);
            return `${item.quantity}x ${itemType?.name || 'Unknown'}`;
          }).join(', '),
          price: p.pack.price,
          totalValue: packTotalValue,
          dollarsPerDollar: p.valueRatio
        };
      });
    
    console.log(`📊 Grade: ${grade} (${betterThanPercent}% percentile)`);
    console.log(`📦 Compared against ${packValueRatios.length} valid packs (out of ${packsWithItems.length} total packs with items)`);
    console.log(`🎯 Found ${similarPacks.length} similar packs`);
    console.log(`💰 Value analysis: $${totalValue.toFixed(2)} market value vs $${packPrice} pack price = ${dollarsPerDollar.toFixed(2)} dollars per dollar`);
    
    // Debug: Show some sample pack ratios
    if (packValueRatios.length > 0) {
      console.log('📈 Top 3 best deals in database:');
      packValueRatios.slice(0, 3).forEach((p, i) => {
        const packValue = p.pack.items.reduce((sum: number, item: any) => {
          return sum + ((itemPrices[item.itemTypeId] || 0) * item.quantity);
        }, 0);
        console.log(`  ${i + 1}. $${packValue.toFixed(2)} value for $${p.pack.price} (${p.valueRatio.toFixed(2)}x ratio)`);
      });
      
      console.log('📉 Bottom 3 worst deals in database:');
      packValueRatios.slice(-3).forEach((p, i) => {
        const packValue = p.pack.items.reduce((sum: number, item: any) => {
          return sum + ((itemPrices[item.itemTypeId] || 0) * item.quantity);
        }, 0);
        console.log(`  ${packValueRatios.length - 2 + i}. $${packValue.toFixed(2)} value for $${p.pack.price} (${p.valueRatio.toFixed(2)}x ratio)`);
      });
      
      // Show where this pack would rank
      const thisPackRank = betterPacks.length + 1;
      console.log(`🎯 This pack would rank #${thisPackRank} out of ${packValueRatios.length} packs`);
    }
    
    return {
      grade,
      totalValue,
      dollarsPerDollar,
      comparison: {
        betterThanPercent,
        totalPacksCompared: packValueRatios.length
      },
      similarPacks
    };
    
  } catch (error) {
    console.error('❌ Error analyzing pack value:', error);
    
    // Check if it's a Firebase/network error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // If we have specific error types, handle them
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Firebase error code:', (error as any).code);
    }
    
    // Return a fallback result instead of throwing
    console.log('🔄 Returning fallback analysis due to error');
    return {
      grade: 'C',
      totalValue: 0,
      dollarsPerDollar: 0,
      comparison: {
        betterThanPercent: 50,
        totalPacksCompared: 0
      },
      similarPacks: []
    };
  }
};
