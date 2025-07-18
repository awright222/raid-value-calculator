import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getAllPriceHistory, 
  getPackAnalysisHistory, 
  getLatestMarketTrends,
  type PriceSnapshot,
  type PackAnalysisHistory,
  type MarketTrend
} from '../firebase/historical';

interface TrendCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

function TrendCard({ title, value, change, changeType, subtitle }: TrendCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const changeColors = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg border ${
        isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}
    >
      <h3 className={`text-lg font-semibold mb-2 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {title}
      </h3>
      <div className={`text-3xl font-bold mb-1 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </div>
      <div className={`text-sm ${changeColors[changeType]}`}>
        {change}
      </div>
      {subtitle && (
        <div className={`text-sm mt-2 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}

interface PriceHistoryItemProps {
  snapshot: PriceSnapshot;
}

function PriceHistoryItem({ snapshot }: PriceHistoryItemProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className={`p-4 rounded-lg border ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {snapshot.itemName}
          </h4>
          <div className={`text-2xl font-bold text-blue-500 mt-1`}>
            ${(snapshot.price && isFinite(snapshot.price)) ? snapshot.price.toFixed(4) : '0.0000'}
          </div>
          <div className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            From {snapshot.packCount} packs ({snapshot.totalQuantity} items)
          </div>
        </div>
        <div className={`text-right text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {snapshot.timestamp.toDate().toLocaleDateString()}
          <div className="mt-1">
            {snapshot.confidence}% confidence
          </div>
        </div>
      </div>
    </div>
  );
}

interface PackHistoryItemProps {
  pack: PackAnalysisHistory;
}

function PackHistoryItem({ pack }: PackHistoryItemProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case 'S': return 'text-purple-500';
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            ${pack.packPrice} Pack
          </h4>
          <div className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {pack.packName}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getGradeColor(pack.grade)}`}>
            {pack.grade}
          </div>
          <div className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {pack.analysisDate.toDate().toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Cost per Energy:
          </span>
          <div className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            ${(pack.costPerEnergy && isFinite(pack.costPerEnergy)) ? pack.costPerEnergy.toFixed(4) : '0.0000'}
          </div>
        </div>
        <div>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Better than:
          </span>
          <div className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {(pack.betterThanPercent && isFinite(pack.betterThanPercent)) ? pack.betterThanPercent.toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketTrends() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceSnapshot[]>([]);
  const [packHistory, setPackHistory] = useState<PackAnalysisHistory[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [activeTab, setActiveTab] = useState<'trends' | 'prices' | 'packs'>('trends');

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Load all historical data in parallel
      const [prices, packs, trends] = await Promise.all([
        getAllPriceHistory(),
        getPackAnalysisHistory(),
        getLatestMarketTrends()
      ]);
      
      setPriceHistory(prices);
      setPackHistory(packs);
      setMarketTrends(trends);
    } catch (error) {
      console.error('Failed to load historical data:', error);
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

  const weeklyTrend = marketTrends.find(t => t.period === 'weekly');
  const monthlyTrend = marketTrends.find(t => t.period === 'monthly');

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
          Track how deal quality and item prices change over time
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {[
            { id: 'trends', label: 'Market Overview' },
            { id: 'prices', label: 'Price History' },
            { id: 'packs', label: 'Pack Analysis' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market Overview Tab */}
      {activeTab === 'trends' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Trend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrendCard
              title="This Week's Average"
              value={weeklyTrend?.averageGrade || 'N/A'}
              change={`${weeklyTrend?.totalPacksAnalyzed || 0} packs analyzed`}
              changeType="neutral"
              subtitle={weeklyTrend ? `$${(weeklyTrend.averageCostPerEnergy && isFinite(weeklyTrend.averageCostPerEnergy)) ? weeklyTrend.averageCostPerEnergy.toFixed(4) : '0.0000'} per energy` : undefined}
            />
            
            <TrendCard
              title="Monthly Average"
              value={monthlyTrend?.averageGrade || 'N/A'}
              change={`${monthlyTrend?.totalPacksAnalyzed || 0} packs analyzed`}
              changeType="neutral"
              subtitle={monthlyTrend ? `$${(monthlyTrend.averageCostPerEnergy && isFinite(monthlyTrend.averageCostPerEnergy)) ? monthlyTrend.averageCostPerEnergy.toFixed(4) : '0.0000'} per energy` : undefined}
            />
            
            <TrendCard
              title="Best Weekly Deal"
              value={weeklyTrend?.bestDeal.grade || 'N/A'}
              change={weeklyTrend ? `$${(weeklyTrend.bestDeal.costPerEnergy && isFinite(weeklyTrend.bestDeal.costPerEnergy)) ? weeklyTrend.bestDeal.costPerEnergy.toFixed(4) : '0.0000'} per energy` : 'No data'}
              changeType="positive"
              subtitle={weeklyTrend ? weeklyTrend.bestDeal.packName : undefined}
            />
            
            <TrendCard
              title="Total Data Points"
              value={`${priceHistory.length + packHistory.length}`}
              change={`${priceHistory.length} prices, ${packHistory.length} packs`}
              changeType="neutral"
            />
          </div>

          {/* No data message */}
          {marketTrends.length === 0 && (
            <div className={`text-center py-12 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p className="text-lg mb-2">No trend data available yet</p>
              <p className="text-sm">Analyze some packs to start building historical data!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Price History Tab */}
      {activeTab === 'prices' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {priceHistory.length > 0 ? (
            priceHistory.map((snapshot) => (
              <PriceHistoryItem key={snapshot.id} snapshot={snapshot} />
            ))
          ) : (
            <div className={`text-center py-12 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p className="text-lg mb-2">No price history available yet</p>
              <p className="text-sm">Price snapshots will appear here as the system learns item values</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Pack Analysis Tab */}
      {activeTab === 'packs' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {packHistory.length > 0 ? (
            packHistory.map((pack) => (
              <PackHistoryItem key={pack.id} pack={pack} />
            ))
          ) : (
            <div className={`text-center py-12 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p className="text-lg mb-2">No pack analysis history available yet</p>
              <p className="text-sm">Analyzed packs will appear here to track deal quality over time</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
