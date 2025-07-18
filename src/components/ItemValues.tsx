import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllPacks } from '../firebase/database';
import { ITEM_TYPES, getItemTypeById } from '../types/itemTypes';
import ConfidenceIndicator from './ConfidenceIndicator';

interface ItemValue {
  itemTypeId: string;
  itemName: string;
  category: string;
  averagePrice: number;
  totalQuantity: number;
  packCount: number;
}

export default function ItemValues() {
  const [itemValues, setItemValues] = useState<ItemValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [totalPacks, setTotalPacks] = useState<number>(0);

  useEffect(() => {
    loadItemValues();
  }, []);

  const loadItemValues = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const packs = await getAllPacks();
      console.log('Loading item values from', packs.length, 'packs');
      setTotalPacks(packs.length);
      
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
        currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
        console.log(`Baseline: ${getItemTypeById(itemTypeId)?.name || itemTypeId} = $${(stats.totalCost / stats.totalQuantity).toFixed(4)}`);
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
              console.log(`🆕 Discovered: ${getItemTypeById(itemTypeId)?.name || itemTypeId} = $${newPrice.toFixed(4)}`);
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

      // Convert to ItemValue array
      const values: ItemValue[] = Object.entries(itemStats).map(([itemTypeId, stats]) => {
        const itemType = getItemTypeById(itemTypeId);
        return {
          itemTypeId,
          itemName: itemType?.name || 'Unknown Item',
          category: itemType?.category || 'Unknown',
          averagePrice: stats.totalCost / stats.totalQuantity,
          totalQuantity: stats.totalQuantity,
          packCount: stats.packCount
        };
      }).sort((a, b) => a.itemName.localeCompare(b.itemName));

      console.log('Final item values calculated:', values.length, 'items');
      console.log('Items with highest confidence (most pack data):');
      const topConfidenceItems = values
        .sort((a, b) => b.packCount - a.packCount)
        .slice(0, 5)
        .map(item => `${item.itemName}: $${item.averagePrice.toFixed(4)} (${item.packCount} packs)`);
      console.log(topConfidenceItems);

      setItemValues(values);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading item values:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadItemValues(true);
  };

  const categories = ['all', ...new Set(ITEM_TYPES.map(item => item.category))];
  const filteredValues = selectedCategory === 'all' 
    ? itemValues 
    : itemValues.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="glass-effect rounded-3xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-secondary-600">Loading item values...</p>
      </div>
    );
  }

  if (itemValues.length === 0) {
    return (
      <div className="glass-effect rounded-3xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-secondary-800 mb-2">No Data Yet</h3>
        <p className="text-secondary-600 mb-6">
          Add some packs in the Admin panel to see average item values!
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="glass-effect rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary-800 dark:text-gray-200 mb-2">📊 Item Values</h2>
            <p className="text-secondary-600 dark:text-gray-400">
              Average prices based on {totalPacks} pack{totalPacks !== 1 ? 's' : ''}
              <span className="ml-2 text-xs text-secondary-500 dark:text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
              {/* Show warning if some packs don't have items data */}
              {totalPacks > 0 && itemValues.length === 0 && (
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                  (⚠️ No packs have detailed item data)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center space-x-2"
            >
              <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>
                🔄
              </span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-input rounded-xl px-4 py-2 min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {categories.slice(1).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredValues.map((item, index) => (
            <motion.div
              key={item.itemTypeId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-secondary-800">{item.itemName}</h3>
                  <p className="text-sm text-secondary-600">{item.category}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    ${item.averagePrice.toFixed(4)}
                  </div>
                  <ConfidenceIndicator 
                    totalQuantity={item.totalQuantity}
                    packCount={item.packCount}
                    className="justify-end"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
