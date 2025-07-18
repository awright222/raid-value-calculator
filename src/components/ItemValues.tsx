import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { savePriceSnapshot } from '../firebase/historical';
import { calculateItemPrices, clearPricingCache } from '../services/pricingService';
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

      // Use the shared pricing service
      const { itemStats, totalPacks } = await calculateItemPrices(isRefresh);
      setTotalPacks(totalPacks);

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

      setItemValues(values);
      setLastUpdated(new Date());
      
      // Save historical price snapshot
      try {
        const priceData: Record<string, { price: number; packCount: number; totalQuantity: number; itemName: string }> = {};
        Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
          const itemType = getItemTypeById(itemTypeId);
          priceData[itemTypeId] = {
            price: stats.totalCost / stats.totalQuantity,
            packCount: stats.packCount,
            totalQuantity: stats.totalQuantity,
            itemName: itemType?.name || 'Unknown Item'
          };
        });
        
        await savePriceSnapshot(priceData);
        // Historical price snapshot saved
      } catch (error) {
        console.error('Failed to save price snapshot:', error);
      }
    } catch (error) {
      console.error('Failed to load item values:', error);
      
      // Show specific error message to help with debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    clearPricingCache(); // Clear cache to force fresh calculation
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
            {totalPacks < 50 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Limited data available ({totalPacks} packs) - prices may be unstable. 
                Community submissions needed for accuracy.
              </p>
            )}
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
