import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllPacks } from '../firebase/database';
import { ITEM_TYPES, getItemTypeById } from '../types/itemTypes';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadItemValues();
  }, []);

  const loadItemValues = async () => {
    try {
      const packs = await getAllPacks();
      const itemStats: Record<string, { totalCost: number; totalQuantity: number; packCount: number }> = {};

      // Calculate statistics for each item type
      packs.forEach(pack => {
        if (!pack.items || pack.items.length === 0) return;
        
        const packPrice = pack.price;
        const totalItems = pack.items.reduce((sum, item) => sum + item.quantity, 0);
        
        pack.items.forEach(item => {
          if (!itemStats[item.itemTypeId]) {
            itemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0, packCount: 0 };
          }
          
          // Proportional cost allocation based on quantity
          const itemProportion = item.quantity / totalItems;
          const itemCost = packPrice * itemProportion;
          
          itemStats[item.itemTypeId].totalCost += itemCost;
          itemStats[item.itemTypeId].totalQuantity += item.quantity;
          itemStats[item.itemTypeId].packCount += 1;
        });
      });

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
    } catch (error) {
      console.error('Error loading item values:', error);
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">📊 Item Values</h2>
            <p className="text-secondary-600">Average prices based on pack data</p>
          </div>
          
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
                  <div className="text-sm text-secondary-600">
                    {item.totalQuantity.toLocaleString()} total • {item.packCount} packs
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
