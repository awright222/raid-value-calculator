import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { calculateItemPrices } from '../services/pricingService';
import { useAnalytics } from '../services/analytics';
import { 
  getLatestMarketTrends,
  type MarketTrend 
} from '../firebase/historical';
import MarketBestDeals from './MarketBestDeals';

interface ItemPriceTrend {
  itemName: string;
  currentPrice: number;
  priceHistory: { date: string; price: number; confidence: number }[];
  totalPacks: number;
  confidence: number;
}

interface FlipCardProps {
  item: ItemPriceTrend;
  index: number;
}

function FlipCard({ item, index }: FlipCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFlipped, setIsFlipped] = useState(false);
  const analytics = useAnalytics();
  
  // Calculate price trend based on visible data (last 3 days shown on flip card)
  const visibleHistory = item.priceHistory.slice(-3); // Last 3 days (what user sees on flip)
  const priceChange = visibleHistory.length >= 2 
    ? ((visibleHistory[visibleHistory.length - 1].price - visibleHistory[0].price) / visibleHistory[0].price) * 100
    : 0;
  
  // Debug logging for confusing trends
  if (Math.abs(priceChange) > 10) {
    console.log(`🔍 ${item.itemName} trend debug:`, {
      priceChange: `${priceChange.toFixed(1)}%`,
      firstPrice: `${item.priceHistory[0]?.date}: $${item.priceHistory[0]?.price.toFixed(4)}`,
      lastPrice: `${item.priceHistory[item.priceHistory.length - 1]?.date}: $${item.priceHistory[item.priceHistory.length - 1]?.price.toFixed(4)}`,
      allPrices: item.priceHistory.map(p => `${p.date}: $${p.price.toFixed(4)}`)
    });
  }
  
  const trendColor = priceChange > 0 ? 'text-green-500' : priceChange < 0 ? 'text-red-500' : 'text-gray-500';
  const trendDirection = priceChange > 0 ? '↗' : priceChange < 0 ? '↘' : '→';
  
  // Create simple price chart data points
  const chartPoints = item.priceHistory.slice(-7).map((point, i, arr) => ({
    x: (i / (arr.length - 1)) * 100,
    y: 100 - ((point.price - Math.min(...arr.map(p => p.price))) / (Math.max(...arr.map(p => p.price)) - Math.min(...arr.map(p => p.price)))) * 80
  }));
  
  const pathData = chartPoints.length > 1 
    ? `M ${chartPoints[0].x} ${chartPoints[0].y} ` + 
      chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flip-card w-full h-64"
      onClick={() => {
        const newFlipped = !isFlipped;
        analytics.trackEngagement('market_trends_flip', {
          itemName: item.itemName,
          flippedTo: newFlipped ? 'details' : 'chart',
          currentPrice: item.currentPrice,
          trend: item.priceHistory.length >= 2 ? 
            (item.priceHistory[item.priceHistory.length - 1].price > item.priceHistory[item.priceHistory.length - 2].price ? 'up' : 'down') : 'stable'
        });
        setIsFlipped(newFlipped);
      }}
    >
      <motion.div
        className="flip-card-inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Front Side */}
        <div className={`flip-card-front p-6 rounded-lg border cursor-pointer ${
          isDark 
            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' 
            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {item.itemName}
            </h3>
            <div className={`text-2xl ${trendColor}`}>
              {trendDirection}
            </div>
          </div>
          
          <div className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            ${item.currentPrice.toFixed(4)}
          </div>
          
          <div className={`text-sm mb-4 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {Math.abs(priceChange).toFixed(1)}% {priceChange >= 0 ? 'increase' : 'decrease'}
          </div>
          
          <div className="flex justify-between items-center">
            <div className={`text-xs ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Market price estimate
            </div>
            <div className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Click to flip
            </div>
          </div>
        </div>
        
        {/* Back Side */}
        <div className={`flip-card-back p-6 rounded-lg border cursor-pointer ${
          isDark 
            ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
            : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className={`text-lg font-semibold truncate pr-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {item.itemName} Trend
            </h3>
            <button className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            }`}>
              ← Back
            </button>
          </div>
          
          {/* Mini Chart */}
          <div className="mb-6">
            <svg width="100%" height="80" className="overflow-visible">
              {pathData && (
                <>
                  <defs>
                    <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={isDark ? '#60a5fa' : '#3b82f6'} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={isDark ? '#60a5fa' : '#3b82f6'} stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  <path
                    d={`${pathData} L 100 100 L 0 100 Z`}
                    fill={`url(#gradient-${index})`}
                  />
                  <path
                    d={pathData}
                    stroke={isDark ? '#60a5fa' : '#3b82f6'}
                    strokeWidth="2"
                    fill="none"
                  />
                  {chartPoints.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill={isDark ? '#60a5fa' : '#3b82f6'}
                    />
                  ))}
                </>
              )}
            </svg>
          </div>
          
          {/* Price History */}
          <div className="space-y-2">
            {item.priceHistory.slice(-3).map((point, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <div className={`text-xs truncate flex-shrink-0 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {point.date}
                </div>
                <div className={`text-xs font-medium text-right ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  ${point.price.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MarketTrends() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [itemTrends, setItemTrends] = useState<ItemPriceTrend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actualTotalPacks, setActualTotalPacks] = useState<number>(0);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const analytics = useAnalytics();

  // Helper function to create market trends from pack data
  const createTrendFromPacks = async (packs: any[], period: 'weekly' | 'monthly'): Promise<MarketTrend | null> => {
    try {
      if (packs.length === 0) return null;

      const now = new Date();
      const periodDays = period === 'weekly' ? 7 : 30;
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      
      // Filter packs for this period
      const periodPacks = packs.filter(pack => {
        const packDate = pack.created_at?.toDate() || new Date(0);
        return packDate >= periodStart;
      });

      if (periodPacks.length === 0) return null;

      // Find best deal (lowest cost per energy)
      const packsWithCostPerEnergy = periodPacks.map(pack => {
        // Calculate cost per energy for each pack
        const totalEnergy = pack.items?.reduce((sum: number, item: any) => {
          if (item.itemTypeId === 'energy_pot') return sum + (item.quantity * 130);
          if (item.itemTypeId === 'energy') return sum + item.quantity;
          return sum;
        }, 0) || 1;
        
        const costPerEnergy = pack.price / Math.max(totalEnergy, 1);
        
        // Simple grading based on cost per energy
        let grade = 'F';
        if (costPerEnergy <= 0.005) grade = 'S';
        else if (costPerEnergy <= 0.008) grade = 'A';
        else if (costPerEnergy <= 0.012) grade = 'B';
        else if (costPerEnergy <= 0.016) grade = 'C';
        else if (costPerEnergy <= 0.020) grade = 'D';

        return {
          ...pack,
          costPerEnergy,
          grade,
          totalEnergy,
          packName: pack.display_name || pack.name || 'Unknown Pack' // Use the actual pack name fields
        };
      });

      // Sort by cost per energy (lowest first = best deals)
      packsWithCostPerEnergy.sort((a, b) => a.costPerEnergy - b.costPerEnergy);
      const bestDeal = packsWithCostPerEnergy[0];
      const worstDeal = packsWithCostPerEnergy[packsWithCostPerEnergy.length - 1];

      // Calculate average grade
      const gradeValues = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
      const avgGradeValue = packsWithCostPerEnergy.reduce((sum, pack) => 
        sum + (gradeValues[pack.grade as keyof typeof gradeValues] || 1), 0) / packsWithCostPerEnergy.length;
      
      const gradeLetters = Object.keys(gradeValues) as (keyof typeof gradeValues)[];
      const avgGrade = gradeLetters.find(grade => gradeValues[grade] <= avgGradeValue + 0.5) || 'F';

      const trend: MarketTrend = {
        period,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(now),
        totalPacksAnalyzed: periodPacks.length,
        averageGrade: avgGrade,
        averageCostPerEnergy: packsWithCostPerEnergy.reduce((sum, pack) => sum + pack.costPerEnergy, 0) / packsWithCostPerEnergy.length,
        bestDeal: {
          packName: bestDeal.packName || 'Unknown Pack',
          grade: bestDeal.grade,
          costPerEnergy: bestDeal.costPerEnergy,
          price: bestDeal.price,
          items: bestDeal.items || []
        },
        worstDeal: {
          packName: worstDeal.packName || 'Unknown Pack',
          grade: worstDeal.grade,
          costPerEnergy: worstDeal.costPerEnergy,
          price: worstDeal.price,
          items: worstDeal.items || []
        },
        trendDirection: 'stable', // Default for now
        created_at: Timestamp.fromDate(now)
      };

      return trend;
    } catch (error) {
      console.error(`Error creating ${period} trend:`, error);
      return null;
    }
  };

  useEffect(() => {
    loadMarketData();
    // Track Market Trends page view
    analytics.trackPageView('market_trends', {
      feature: 'price_analysis'
    });
  }, []);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 MarketTrends: Loading real market data...');
      
      // Get real item prices from the same service as ItemValues tab
      const { itemPrices, totalPacks } = await calculateItemPrices();
      console.log(`📦 MarketTrends: Loaded prices for ${Object.keys(itemPrices).length} items from ${totalPacks} packs`);
      
      // Load market trends data for best deals - try direct approach with packs collection
      let marketTrendsData = await getLatestMarketTrends();
      console.log(`📈 MarketTrends: Loaded ${marketTrendsData.length} existing market trends`);
      
      // If no trends exist, create them directly from packs data
      if (marketTrendsData.length === 0) {
        console.log('🔄 MarketTrends: No trends found, creating from packs data...');
        try {
          // Import the getAllPacks function to get actual pack data
          const { getAllPacks } = await import('../firebase/database');
          const allPacks = await getAllPacks();
          console.log(`📊 MarketTrends: Found ${allPacks.length} total packs`);
          
          if (allPacks.length > 0) {
            // Filter recent packs (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentPacks = allPacks.filter(pack => {
              const packDate = pack.created_at?.toDate() || new Date(0);
              return packDate >= thirtyDaysAgo;
            });
            
            console.log(`📅 MarketTrends: ${recentPacks.length} packs from last 30 days`);
            
            if (recentPacks.length > 0) {
              // Debug: Log sample pack structure
              console.log('📋 Sample pack structure:', {
                name: recentPacks[0].name,
                display_name: recentPacks[0].display_name,
                price: recentPacks[0].price,
                keys: Object.keys(recentPacks[0])
              });
              
              // Create simplified trends from pack data
              const weeklyTrend = await createTrendFromPacks(recentPacks, 'weekly');
              const monthlyTrend = await createTrendFromPacks(recentPacks, 'monthly');
              
              marketTrendsData = [weeklyTrend, monthlyTrend].filter((trend): trend is MarketTrend => trend !== null);
              console.log(`✅ MarketTrends: Generated ${marketTrendsData.length} trends from pack data`);
            }
          }
        } catch (error) {
          console.error('❌ MarketTrends: Failed to create trends from packs:', error);
        }
      }
      
      // Store the actual total pack count for display
      setActualTotalPacks(totalPacks);
      setMarketTrends(marketTrendsData);
      
      // Create price trends with REAL historical data from pack submissions
      console.log('📊 MarketTrends: Building historical trends from pack data...');
      const trends: ItemPriceTrend[] = [];
      
      // Get all packs from the last 30 days to build real historical data
      const { getAllPacks } = await import('../firebase/database');
      const allPacks = await getAllPacks();
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentPacks = allPacks.filter(pack => {
        const packDate = pack.created_at?.toDate() || new Date(0);
        return packDate >= thirtyDaysAgo && pack.items && pack.items.length > 0;
      });
      
      console.log(`📦 MarketTrends: Using ${recentPacks.length} recent packs for historical analysis`);
      
      for (const [itemTypeId, currentPrice] of Object.entries(itemPrices)) {
        // Get proper item names
        let itemName = itemTypeId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        
        // Special naming cases
        if (itemTypeId === 'energy_pot') itemName = 'Energy Pot';
        else if (itemTypeId === 'primal_shard') itemName = 'Primal Shard';
        else if (itemTypeId === 'sacred_shard') itemName = 'Sacred Shard';
        else if (itemTypeId === 'void_shard') itemName = 'Void Shard';
        else if (itemTypeId === 'ancient_shard') itemName = 'Ancient Shard';
        else if (itemTypeId === 'mystery_shard') itemName = 'Mystery Shard';
        
        // Find packs containing this item and build historical pricing
        const packsWithItem = recentPacks.filter(pack => 
          pack.items && pack.items.some((item: any) => item.itemTypeId === itemTypeId)
        );
        
        console.log(`� ${itemName}: Found in ${packsWithItem.length} packs over last 30 days`);
        
        // Build daily price history for the last 7 days
        const priceHistory = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - i);
          
          // Find packs from this day (±12 hours)
          const dayStart = new Date(targetDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(targetDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayPacks = packsWithItem.filter(pack => {
            const packDate = pack.created_at?.toDate();
            return packDate && packDate >= dayStart && packDate <= dayEnd;
          });
          
          let dayPrice = currentPrice; // Default to current price
          
          if (dayPacks.length > 0) {
            // Calculate average price for this day using the same pricing logic
            const dayItemCosts = dayPacks.map(pack => {
              if (!pack.items) return 0;
              const item = pack.items.find((item: any) => item.itemTypeId === itemTypeId);
              const itemQuantity = item?.quantity || 1;
              // Rough estimate: distribute pack price by item quantities
              const totalItems = pack.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
              return (pack.price * itemQuantity) / totalItems;
            });
            
            if (dayItemCosts.length > 0 && dayPacks[0].items) {
              const firstPackItem = dayPacks[0].items.find((item: any) => item.itemTypeId === itemTypeId);
              const itemQuantity = firstPackItem?.quantity || 1;
              dayPrice = dayItemCosts.reduce((sum, cost) => sum + cost, 0) / dayItemCosts.length / itemQuantity;
            }
          }
          
          priceHistory.push({
            date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: Math.max(0.0001, dayPrice),
            confidence: dayPacks.length > 0 ? Math.min(95, dayPacks.length * 20) : 50
          });
        }
        
        console.log(`📊 ${itemName} price history:`, priceHistory.map(p => `${p.date}: $${p.price.toFixed(4)}`).join(', '));
        
        trends.push({
          itemName,
          currentPrice,
          priceHistory,
          totalPacks: 0, // Not displaying pack count anymore
          confidence: 0  // Not displaying confidence anymore
        });
      }
      
      // Sort by price descending to show most valuable items first
      trends.sort((a, b) => b.currentPrice - a.currentPrice);
      
      console.log(`✅ MarketTrends: Generated trends for ${trends.length} items`);
      console.log('📊 Sample prices:', trends.slice(0, 3).map(t => `${t.itemName}: $${t.currentPrice.toFixed(4)}`));
      
      setItemTrends(trends);
    } catch (error) {
      console.error('❌ MarketTrends: Failed to load market data:', error);
      setError('Failed to load market data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className={`text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading market trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className={`text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={loadMarketData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className={`text-3xl font-bold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Market Trends
        </h1>
        <p className={`text-lg ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Interactive price cards with flip animations to explore item value trends and market insights
        </p>
      </motion.div>

      {/* Market Intelligence Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`mb-8 p-6 rounded-lg border ${
          isDark 
            ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700/30' 
            : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
        }`}
      >
        <h2 className={`text-xl font-semibold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          📊 Market Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`text-center ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {itemTrends.length}
            </div>
            <div className="text-sm">Items Tracked</div>
          </div>
          <div className={`text-center relative group ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className={`text-2xl font-bold cursor-help ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              ${itemTrends.length > 0 ? itemTrends[0].currentPrice.toFixed(4) : '0.0000'}
            </div>
            <div className="text-sm">Highest Value Item</div>
            
            {/* Tooltip */}
            {itemTrends.length > 0 && (
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap ${
                isDark 
                  ? 'bg-gray-800 text-white border border-gray-600' 
                  : 'bg-white text-gray-800 border border-gray-200 shadow-lg'
              }`}>
                {itemTrends[0].itemName}
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                  isDark ? 'border-t-gray-800' : 'border-t-white'
                }`}></div>
              </div>
            )}
          </div>
          <div className={`text-center ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-purple-400' : 'text-purple-600'
            }`}>
              {actualTotalPacks}
            </div>
            <div className="text-sm">Packs Analyzed</div>
          </div>
        </div>
      </motion.div>

      {/* Best Deals Section */}
      <MarketBestDeals marketTrends={marketTrends} isDark={isDark} />

      {/* Flip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {itemTrends.map((item, index) => (
          <FlipCard key={item.itemName} item={item} index={index} />
        ))}
      </div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className={`mt-8 text-center text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
        💡 Click any card to flip it and see detailed price trends
      </motion.div>
    </div>
  );
}
