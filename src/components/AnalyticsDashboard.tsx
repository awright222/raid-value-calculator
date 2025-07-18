import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAnalytics } from '../services/analytics';

interface AnalyticsSummary {
  uniqueUsers: number;
  totalVisits: number;
  popularPacks: Array<{ name: string; views: number }>;
  peakHours: Array<{ hour: number; activity: number }>;
}

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    uniqueUsers: 0,
    totalVisits: 0,
    popularPacks: [],
    peakHours: []
  });
  const [loading, setLoading] = useState(true);
  const analytics = useAnalytics();

  useEffect(() => {
    loadAnalyticsSummary();
  }, []);

  const loadAnalyticsSummary = async () => {
    try {
      const data = await analytics.getAnalyticsSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Analytics Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Unique Users</p>
                <p className="text-2xl font-bold">{summary.uniqueUsers.toLocaleString()}</p>
              </div>
              <div className="text-3xl opacity-80">👥</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Visits</p>
                <p className="text-2xl font-bold">{summary.totalVisits.toLocaleString()}</p>
              </div>
              <div className="text-3xl opacity-80">📈</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Avg. Session</p>
                <p className="text-2xl font-bold">
                  {summary.uniqueUsers > 0 
                    ? (summary.totalVisits / summary.uniqueUsers).toFixed(1)
                    : '0'
                  }
                </p>
              </div>
              <div className="text-3xl opacity-80">⏱️</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Tracked Packs</p>
                <p className="text-2xl font-bold">{summary.popularPacks.length}</p>
              </div>
              <div className="text-3xl opacity-80">📦</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Packs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">🔥 Most Viewed Packs</h3>
          
          {summary.popularPacks.length > 0 ? (
            <div className="space-y-3">
              {summary.popularPacks.map((pack, index) => (
                <motion.div
                  key={pack.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className={`flex w-6 h-6 rounded-full text-xs font-bold text-white items-center justify-center mr-3 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-400' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800 truncate">{pack.name}</span>
                  </div>
                  <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                    {pack.views} views
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No pack views tracked yet</p>
              <p className="text-sm mt-2">Data will appear once users start viewing packs</p>
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">🕐 Peak Activity Hours</h3>
          
          {summary.peakHours.length > 0 ? (
            <div className="space-y-3">
              {summary.peakHours.map((hour, index) => (
                <motion.div
                  key={hour.hour}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🕐</span>
                    <span className="font-medium text-gray-800">{formatHour(hour.hour)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(hour.activity / Math.max(...summary.peakHours.map(h => h.activity))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{hour.activity} events</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No activity data yet</p>
              <p className="text-sm mt-2">Usage patterns will appear over time</p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3 mt-0.5">🔒</div>
          <div>
            <h4 className="font-medium text-blue-800 mb-1">Privacy-Compliant Analytics</h4>
            <p className="text-sm text-blue-700">
              All data is anonymized and aggregated. No personal information is collected or stored. 
              Users can opt out at any time through cookie preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
