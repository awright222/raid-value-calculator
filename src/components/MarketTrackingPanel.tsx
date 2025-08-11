import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  triggerMarketSnapshot, 
  getMarketTrackingStats,
  getMarketSnapshots,
  type DailyMarketSnapshot 
} from '../firebase/priceTracking';

interface MarketTrackingPanelProps {
  isDark: boolean;
}

interface TrackingStats {
  totalSnapshots: number;
  dateRange: { start: string; end: string };
  trackingDays: number;
  averagePacksPerDay: number;
}

export const MarketTrackingPanel: React.FC<MarketTrackingPanelProps> = ({ isDark }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [recentSnapshots, setRecentSnapshots] = useState<DailyMarketSnapshot[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTriggerSnapshot = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await triggerMarketSnapshot();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Refresh stats
        loadTrackingStats();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to create snapshot: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingStats = async () => {
    try {
      const trackingStats = await getMarketTrackingStats();
      setStats(trackingStats);
      
      // Load recent snapshots
      if (trackingStats) {
        const snapshots = await getMarketSnapshots(trackingStats.dateRange.start);
        setRecentSnapshots(snapshots.slice(0, 7)); // Last 7 days
      }
    } catch (error) {
      console.error('Error loading tracking stats:', error);
    }
  };

  // Load stats on component mount
  React.useEffect(() => {
    loadTrackingStats();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'S':
      case 'SSS':
        return 'text-green-500';
      case 'B':
        return 'text-blue-500';
      case 'C':
        return 'text-yellow-500';
      case 'D':
        return 'text-orange-500';
      case 'F':
        return 'text-red-500';
      default:
        return isDark ? 'text-gray-400' : 'text-gray-600';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          📊 Market Price Tracking
        </h3>
        
        <motion.button
          onClick={handleTriggerSnapshot}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-4 py-2 rounded-lg font-medium ${
            loading
              ? 'opacity-50 cursor-not-allowed'
              : isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? 'Creating...' : 'Create Snapshot'}
        </motion.button>
      </div>

      {/* Status Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Tracking Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {stats.totalSnapshots}
            </div>
            <div className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total Snapshots
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              {stats.trackingDays}
            </div>
            <div className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Days Tracked
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-purple-400' : 'text-purple-600'
            }`}>
              {Math.round(stats.averagePacksPerDay)}
            </div>
            <div className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Avg Packs/Day
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`text-sm font-medium ${
              isDark ? 'text-orange-400' : 'text-orange-600'
            }`}>
              {formatDate(stats.dateRange.start)} - {formatDate(stats.dateRange.end)}
            </div>
            <div className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Date Range
            </div>
          </div>
        </div>
      )}

      {/* Recent Snapshots */}
      {recentSnapshots.length > 0 && (
        <div>
          <h4 className={`text-lg font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Recent Market Snapshots
          </h4>

          <div className="space-y-3">
            {recentSnapshots.map((snapshot, index) => (
              <motion.div
                key={snapshot.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatDate(snapshot.date)}
                  </div>
                  
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {snapshot.marketMetrics.totalPacksAnalyzed} packs analyzed
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Avg Cost/Energy:
                    </span>
                    <div className="font-medium">
                      ${snapshot.marketMetrics.averageCostPerEnergy.toFixed(4)}
                    </div>
                  </div>

                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Grade:
                    </span>
                    <div className={`font-medium ${getGradeColor(snapshot.marketMetrics.averageGrade)}`}>
                      {snapshot.marketMetrics.averageGrade}
                    </div>
                  </div>

                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Price Range:
                    </span>
                    <div className="font-medium">
                      ${snapshot.marketMetrics.priceRanges.cheapest.toFixed(4)} - 
                      ${snapshot.marketMetrics.priceRanges.mostExpensive.toFixed(4)}
                    </div>
                  </div>

                  <div>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Items Tracked:
                    </span>
                    <div className="font-medium">
                      {snapshot.itemPrices.length}
                    </div>
                  </div>
                </div>

                {/* Top pack for the day */}
                {snapshot.packAnalytics.topPerformingPacks[0] && (
                  <div className={`mt-3 pt-3 border-t ${
                    isDark ? 'border-gray-600' : 'border-gray-200'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Best Deal:
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {snapshot.packAnalytics.topPerformingPacks[0].packName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${getGradeColor(snapshot.packAnalytics.topPerformingPacks[0].grade)}`}>
                          Grade {snapshot.packAnalytics.topPerformingPacks[0].grade}
                        </span>
                        <span className={`text-sm font-medium ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>
                          ${snapshot.packAnalytics.topPerformingPacks[0].costPerEnergy.toFixed(4)}/energy
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking Description */}
      <div className={`mt-6 p-4 rounded-lg ${
        isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
      }`}>
        <h5 className={`font-semibold mb-2 ${
          isDark ? 'text-blue-300' : 'text-blue-800'
        }`}>
          📈 Long-term Price Tracking
        </h5>
        <p className={`text-sm ${
          isDark ? 'text-blue-200' : 'text-blue-700'
        }`}>
          This system creates daily snapshots of market conditions to build comprehensive 
          historical data. Use this for year-end analysis, seasonal trend detection, and 
          multi-year market evolution studies. Each snapshot captures item prices, pack 
          performance, and market health metrics.
        </p>
        
        <div className="mt-3 space-y-1 text-xs">
          <div className={isDark ? 'text-blue-300' : 'text-blue-600'}>
            • Daily automated snapshots capture complete market state
          </div>
          <div className={isDark ? 'text-blue-300' : 'text-blue-600'}>
            • Historical comparisons show price trends and volatility
          </div>
          <div className={isDark ? 'text-blue-300' : 'text-blue-600'}>
            • Long-term data enables seasonal pattern analysis
          </div>
          <div className={isDark ? 'text-blue-300' : 'text-blue-600'}>
            • Market health metrics track ecosystem evolution
          </div>
        </div>
      </div>
    </div>
  );
};
