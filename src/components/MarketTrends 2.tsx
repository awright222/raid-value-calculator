import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getAllPriceHistory, 
  type PriceSnapshot
} from '../firebase/historical';
import { getItemTypes, type ItemType } from '../types/itemTypes';

interface ItemPriceTrend {
  itemTypeId: string;
  itemName: string;
  category: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'stable';
  highPrice: number;
  lowPrice: number;
  dataPoints: number;
  lastUpdate: Date;
  priceHistory: PriceSnapshot[];
}

interface SimpleChartProps {
  data: PriceSnapshot[];
  itemName: string;
  isDark: boolean;
}

function SimpleChart({ data, itemName, isDark }: SimpleChartProps) {
  if (data.length < 2) {
    return (
      <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Need at least 2 data points to show trend
      </div>
    );
  }

  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
  
  // Calculate chart dimensions
  const maxPrice = Math.max(...sortedData.map(d => d.price));
  const minPrice = Math.min(...sortedData.map(d => d.price));
  const priceRange = maxPrice - minPrice;
  
  // Create SVG path
  const chartWidth = 400;
  const chartHeight = 200;
  const padding = 20;
  
  const points = sortedData.map((point, index) => {
    const x = padding + (index / (sortedData.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((point.price - minPrice) / priceRange) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' L');

  const pathData = `M${points}`;
  
  // Determine trend color
  const isUp = sortedData[sortedData.length - 1].price > sortedData[0].price;
  const trendColor = isUp ? '#10B981' : '#EF4444'; // Green for up, red for down

  return (
    <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {itemName} Price History
      </h3>
      
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d={`M 40 0 L 0 0 0 20`} fill="none" stroke={isDark ? '#374151' : '#E5E7EB'} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Price line */}
          <path 
            d={pathData} 
            fill="none" 
            stroke={trendColor} 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {sortedData.map((point, index) => {
            const x = padding + (index / (sortedData.length - 1)) * (chartWidth - 2 * padding);
            const y = chartHeight - padding - ((point.price - minPrice) / priceRange) * (chartHeight - 2 * padding);
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={trendColor}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Price labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{sortedData[0].timestamp.toDate().toLocaleDateString()}</span>
          <span>{sortedData[sortedData.length - 1].timestamp.toDate().toLocaleDateString()}</span>
        </div>
        
        {/* Price range */}
        <div className={`grid grid-cols-2 gap-4 mt-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <div>
            <span className="block text-xs text-gray-500">High</span>
            <span className="font-semibold">${maxPrice.toFixed(6)}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Low</span>
            <span className="font-semibold">${minPrice.toFixed(6)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend, isDark }: { trend: ItemPriceTrend; isDark: boolean }) {
  const changeColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-gray-500'
  };

  const changeIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→'
  };

  // Scale currency prices for better readability
  const getCurrencyScaling = (): { scale: number; unit: string } => {
    if (trend.category !== 'Currency') {
      return { scale: 1, unit: '' };
    }
    
    switch (trend.itemTypeId) {
      case 'silver':
        return { scale: 10000, unit: ' per 10k' };
      case 'gems':
        return { scale: 100, unit: ' per 100' };
      default:
        return { scale: 1, unit: '' };
    }
  };

  const { scale, unit } = getCurrencyScaling();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl border ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } hover:shadow-lg transition-shadow`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {trend.itemName}
          </h3>
          <span className={`text-sm px-2 py-1 rounded-full ${
            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            {trend.category}
          </span>
        </div>
        <div className={`text-2xl ${changeColors[trend.changeDirection]}`}>
          {changeIcons[trend.changeDirection]}
        </div>
      </div>

      <div className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        ${(trend.currentPrice * scale).toFixed(scale > 1 ? 2 : 6)}{unit}
      </div>

      <div className={`text-sm mb-3 ${changeColors[trend.changeDirection]}`}>
        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}% from last update
      </div>

      <div className={`grid grid-cols-2 gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div>
          <span className="block text-xs">High</span>
          <span className="font-semibold">${(trend.highPrice * scale).toFixed(scale > 1 ? 2 : 6)}</span>
        </div>
        <div>
          <span className="block text-xs">Low</span>
          <span className="font-semibold">${(trend.lowPrice * scale).toFixed(scale > 1 ? 2 : 6)}</span>
        </div>
      </div>

      <div className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {trend.dataPoints} data points • Updated {trend.lastUpdate.toLocaleDateString()}
      </div>
    </motion.div>
  );
}

export default function MarketTrends() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [priceTrends, setPriceTrends] = useState<ItemPriceTrend[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'charts'>('overview');

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Load price history and available items
      const [historyData, itemTypes] = await Promise.all([
        getAllPriceHistory(),
        getItemTypes()
      ]);
      
      // Calculate price trends for items with historical data
      const trends = calculatePriceTrends(historyData, itemTypes);
      setPriceTrends(trends);
      
      // Set default selection to first item with price data
      if (trends.length > 0 && !selectedItemId) {
        setSelectedItemId(trends[0].itemTypeId);
      }
      
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceTrends = (history: PriceSnapshot[], itemTypes: ItemType[]): ItemPriceTrend[] => {
    const itemGroups = new Map<string, PriceSnapshot[]>();
    
    // Group price history by item
    history.forEach(snapshot => {
      if (!itemGroups.has(snapshot.itemTypeId)) {
        itemGroups.set(snapshot.itemTypeId, []);
      }
      itemGroups.get(snapshot.itemTypeId)!.push(snapshot);
    });
    
    const trends: ItemPriceTrend[] = [];
    
    itemGroups.forEach((snapshots, itemTypeId) => {
      if (snapshots.length < 2) return; // Need at least 2 data points for trend
      
      // Sort by timestamp
      snapshots.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
      
      const itemType = itemTypes.find(item => item.id === itemTypeId);
      if (!itemType) return;
      
      const currentPrice = snapshots[snapshots.length - 1].price;
      const previousPrice = snapshots[snapshots.length - 2].price;
      const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      let changeDirection: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 2) { // 2% threshold for significant change
        changeDirection = changePercent > 0 ? 'up' : 'down';
      }
      
      const prices = snapshots.map(s => s.price);
      const highPrice = Math.max(...prices);
      const lowPrice = Math.min(...prices);
      
      trends.push({
        itemTypeId,
        itemName: itemType.name,
        category: itemType.category,
        currentPrice,
        previousPrice,
        changePercent,
        changeDirection,
        highPrice,
        lowPrice,
        dataPoints: snapshots.length,
        lastUpdate: snapshots[snapshots.length - 1].timestamp.toDate(),
        priceHistory: snapshots
      });
    });
    
    // Sort by category then by name
    return trends.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.itemName.localeCompare(b.itemName);
    });
  };

  const getSelectedItemTrend = () => {
    return priceTrends.find(trend => trend.itemTypeId === selectedItemId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (priceTrends.length === 0) {
    return (
      <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="text-6xl mb-4">📈</div>
        <h2 className="text-xl font-semibold mb-2">No Price History Available</h2>
        <p>Price trends will appear here as pack data is analyzed over time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Market Trends
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Track item price movements over time
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`flex rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-1`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? isDark
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-900'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'charts'
                ? isDark
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-900'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Charts
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {priceTrends.map((trend) => (
            <TrendCard key={trend.itemTypeId} trend={trend} isDark={isDark} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Item Selector */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Select Item to View Price Chart:
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            >
              {priceTrends.map((trend) => (
                <option key={trend.itemTypeId} value={trend.itemTypeId}>
                  {trend.itemName} ({trend.dataPoints} data points)
                </option>
              ))}
            </select>
          </div>

          {/* Chart */}
          {selectedItemId && (
            <SimpleChart
              data={getSelectedItemTrend()?.priceHistory || []}
              itemName={getSelectedItemTrend()?.itemName || ''}
              isDark={isDark}
            />
          )}
        </div>
      )}
    </div>
  );
}
