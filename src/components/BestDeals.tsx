import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllPacks } from '../firebase/database';
import { getItemTypeById } from '../types/itemTypes';
import GradeDisplay from './GradeDisplay';

interface PackWithValue {
  id: string;
  name: string;
  price: number;
  items: Array<{ itemTypeId: string; quantity: number }>;
  totalValue: number;
  savings: number;
  savingsPercentage: number;
  grade: string;
  createdAt: any;
}

export default function BestDeals() {
  const [bestPacks, setBestPacks] = useState<PackWithValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'savings' | 'percentage' | 'recent'>('percentage');

  useEffect(() => {
    loadBestDeals();
  }, []);

  const loadBestDeals = async () => {
    try {
      const packs = await getAllPacks();
      
      // Use the same weighted price inference system
      let itemStats: Record<string, { totalCost: number; totalQuantity: number }> = {};
      let currentPrices: Record<string, number> = {};
      
      // Step 1: Get prices from single-item packs (these are definitive)
      packs.forEach(pack => {
        if (!pack.items || pack.items.length !== 1) return;
        
        const item = pack.items[0];
        if (!itemStats[item.itemTypeId]) {
          itemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0 };
        }
        
        itemStats[item.itemTypeId].totalCost += pack.price;
        itemStats[item.itemTypeId].totalQuantity += item.quantity;
      });

      // Calculate initial prices from single-item packs
      Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
        currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
      });

      // Step 2: Iteratively infer prices from multi-item packs using weighted distribution
      const multiItemPacks = packs.filter(pack => pack.items && pack.items.length > 1);
      const maxIterations = 10;
      let iteration = 0;

      while (iteration < maxIterations) {
        let pricesChanged = false;
        const newItemStats: Record<string, { totalCost: number; totalQuantity: number }> = { ...itemStats };

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
          if (unknownItems.length > 0 && knownValue < pack.price) {
            const remainingValue = pack.price - knownValue;
            const totalUnknownQuantity = unknownItems.reduce((sum, item) => sum + item.quantity, 0);
            
            if (totalUnknownQuantity > 0) {
              unknownItems.forEach(item => {
                const inferredPricePerItem = (remainingValue * item.quantity) / totalUnknownQuantity / item.quantity;
                
                if (!newItemStats[item.itemTypeId]) {
                  newItemStats[item.itemTypeId] = { totalCost: 0, totalQuantity: 0 };
                }
                
                newItemStats[item.itemTypeId].totalCost += inferredPricePerItem * item.quantity;
                newItemStats[item.itemTypeId].totalQuantity += item.quantity;
              });
            }
          }
        });

        // Update prices and check for changes
        const previousPrices = { ...currentPrices };
        Object.entries(newItemStats).forEach(([itemTypeId, stats]) => {
          if (stats.totalQuantity > 0) {
            currentPrices[itemTypeId] = stats.totalCost / stats.totalQuantity;
          }
        });

        // Check if prices have stabilized
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

      // Now evaluate each pack against these weighted average prices
      const packsWithValue: PackWithValue[] = [];

      packs.forEach(pack => {
        if (!pack.items || pack.items.length === 0) return;

        let totalMarketValue = 0;
        pack.items.forEach(item => {
          const averagePrice = currentPrices[item.itemTypeId];
          if (averagePrice) {
            totalMarketValue += item.quantity * averagePrice;
          }
        });

        const savings = totalMarketValue - pack.price;
        const savingsPercentage = totalMarketValue > 0 ? (savings / totalMarketValue) * 100 : 0;

        // Only include packs with positive savings (better than average)
        if (savings > 0 && savingsPercentage > 5) { // At least 5% better than average
          // Simple grading based on savings percentage
          let calculatedGrade = 'F';
          if (savingsPercentage >= 50) calculatedGrade = 'A+';
          else if (savingsPercentage >= 40) calculatedGrade = 'A';
          else if (savingsPercentage >= 30) calculatedGrade = 'B+';
          else if (savingsPercentage >= 20) calculatedGrade = 'B';
          else if (savingsPercentage >= 10) calculatedGrade = 'C+';
          else if (savingsPercentage >= 5) calculatedGrade = 'C';
          else calculatedGrade = 'D';

          packsWithValue.push({
            id: pack.id || '',
            name: pack.name || pack.display_name || 'Unknown Pack',
            price: pack.price,
            items: pack.items,
            totalValue: totalMarketValue,
            savings,
            savingsPercentage,
            grade: calculatedGrade, // Use our calculated grade
            createdAt: pack.created_at
          });
        }
      });

      setBestPacks(packsWithValue);
    } catch (error) {
      // Error loading best deals - will show empty state
    } finally {
      setLoading(false);
    }
  };

  const sortedPacks = [...bestPacks].sort((a, b) => {
    switch (sortBy) {
      case 'savings':
        return b.savings - a.savings;
      case 'percentage':
        return b.savingsPercentage - a.savingsPercentage;
      case 'recent':
        return (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0);
      default:
        return b.savingsPercentage - a.savingsPercentage;
    }
  }).slice(0, 3); // Limit to top 3 deals

  if (loading) {
    return (
      <div className="glass-effect rounded-3xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-secondary-600">Finding the best deals...</p>
      </div>
    );
  }

  if (bestPacks.length === 0) {
    return (
            <div className="glass-effect rounded-3xl p-8 text-center">
        <div className="text-6xl mb-4">�</div>
        <h3 className="text-xl font-semibold text-secondary-800 mb-2">No Great Deals Yet</h3>
        <p className="text-secondary-600 mb-6">
          Submit some packs to find the best deals worth buying!
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
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">� Deal Spotlight</h2>
            <p className="text-secondary-600">Top 3 packs worth buying - with full details</p>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'savings' | 'percentage' | 'recent')}
            className="glass-input rounded-xl px-4 py-2 min-w-[150px]"
          >
            <option value="percentage">Best % Savings</option>
            <option value="savings">Highest $ Savings</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>

        <div className="grid gap-6">
          {sortedPacks.slice(0, 10).map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-green-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <GradeDisplay grade={pack.savingsPercentage >= 70 ? 'A+' : pack.grade} />
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-800">
                        {pack.name}
                      </h3>
                      <p className="text-sm text-green-600 font-medium">
                        ${pack.price ? pack.price.toFixed(2) : '0.00'} - Save ${pack.savings ? pack.savings.toFixed(2) : '0.00'} ({pack.savingsPercentage ? pack.savingsPercentage.toFixed(1) : '0'}% off)
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-secondary-600 mb-3">
                    <span className="font-medium">Contains: </span>
                    {pack.items.map((item, idx) => {
                      const itemType = getItemTypeById(item.itemTypeId);
                      return (
                        <span key={item.itemTypeId}>
                          {item.quantity}x {itemType?.name || 'Unknown'}
                          {idx < pack.items.length - 1 ? ', ' : ''}
                        </span>
                      );
                    })}
                  </div>
                  
                  <div className="text-xs text-secondary-500">
                    Last seen: {pack.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-secondary-800">
                    ${pack.totalValue ? pack.totalValue.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-sm text-secondary-600">Market Value</div>
                </div>
              </div>
              
              <div className="mt-4 bg-green-100 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-800 font-medium">
                    {pack.grade === 'A+' ? 'Exceptional Value!' :
                     pack.grade === 'A' ? 'Excellent Value!' :
                     pack.grade === 'B+' ? 'Very Good Value!' :
                     pack.grade === 'B' ? 'Good Value!' :
                     pack.grade === 'C+' ? 'Fair Value' :
                     pack.grade === 'C' ? 'Decent Value' :
                     'Below Average Value'}
                  </span>
                  <span className="text-green-600">
                    {pack.grade === 'A+' ? '🔥 Amazing Deal' :
                     pack.grade === 'A' ? '🔥 Amazing Deal' :
                     pack.grade === 'B+' ? '⭐ Great Deal' :
                     pack.grade === 'B' ? '⭐ Great Deal' :
                     pack.grade === 'C+' ? '👍 Good Deal' :
                     pack.grade === 'C' ? '👍 Decent Deal' :
                     '⚠️ Fair Deal'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {sortedPacks.length > 10 && (
          <div className="text-center mt-6">
            <p className="text-secondary-600">
              Showing top 10 deals • {sortedPacks.length} total good deals found
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
