import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAnalytics } from '../services/analytics';

interface AnalyticsSummary {
  uniqueUsers: number;
  totalVisits: number;
  avgSessionDuration?: number;
  popularPacks: Array<{ name: string; views: number }>;
  peakHours: Array<{ hour: number; activity: number }>;
  regionData?: Array<{ country: string; region: string; users: number }>;
  engagementData: {
    totalEngagements: number;
    topEngagements: Array<{ action: string; count: number }>;
    priceRangeInterest: Record<string, number>;
    categoryPreferences: Record<string, number>;
  };
  conversionData: {
    totalConversions: number;
    conversionsByType: Record<string, number>;
    packSubmissions: {
      total: number;
      successRate: number;
      priceRangeDistribution: Record<string, number>;
    };
  };
}

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    uniqueUsers: 0,
    totalVisits: 0,
    popularPacks: [],
    peakHours: [],
    engagementData: {
      totalEngagements: 0,
      topEngagements: [],
      priceRangeInterest: {},
      categoryPreferences: {}
    },
    conversionData: {
      totalConversions: 0,
      conversionsByType: {},
      packSubmissions: {
        total: 0,
        successRate: 0,
        priceRangeDistribution: {}
      }
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">📊 Analytics Overview</h2>
        
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
                <p className="text-purple-100 text-sm">Avg. Session Duration</p>
                <p className="text-2xl font-bold">
                  {summary.avgSessionDuration 
                    ? `${Math.round(summary.avgSessionDuration / 60000)}m ${Math.round((summary.avgSessionDuration % 60000) / 1000)}s`
                    : 'N/A'
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
                <p className="text-orange-100 text-sm">Unique Pack Types</p>
                <p className="text-2xl font-bold">{summary.popularPacks.length}</p>
                <p className="text-xs text-orange-200 mt-1">packs analyzed</p>
              </div>
              <div className="text-3xl opacity-80">📦</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Packs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🔥 Most Viewed Packs</h3>
          
          {summary.popularPacks.length > 0 ? (
            <div className="space-y-3">
              {summary.popularPacks.map((pack, index) => (
                <motion.div
                  key={pack.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
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
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{pack.name}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-600 px-2 py-1 rounded">
                    {pack.views} views
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No pack views tracked yet</p>
              <p className="text-sm mt-2">Data will appear once users start viewing packs</p>
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🕐 Peak Activity Hours</h3>
          
          {summary.peakHours.length > 0 ? (
            <div className="space-y-3">
              {summary.peakHours.map((hour, index) => (
                <motion.div
                  key={hour.hour}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🕐</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatHour(hour.hour)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(hour.activity / Math.max(...summary.peakHours.map(h => h.activity))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{hour.activity} events</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No activity data yet</p>
              <p className="text-sm mt-2">Usage patterns will appear over time</p>
            </div>
          )}
        </div>

        {/* User Engagement Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🎯 User Engagement</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Engagement Actions */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Top Actions</h4>
              {summary.engagementData.topEngagements.length > 0 ? (
                <div className="space-y-2">
                  {summary.engagementData.topEngagements.slice(0, 5).map((engagement) => (
                    <div key={engagement.action} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{engagement.action.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-blue-600 dark:text-blue-400">{engagement.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No engagement data yet</p>
              )}
            </div>

            {/* Category Preferences */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Category Interest</h4>
              {Object.keys(summary.engagementData.categoryPreferences).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(summary.engagementData.categoryPreferences)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{category}</span>
                        <span className="text-sm text-green-600 dark:text-green-400">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No category data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Spending Interest Patterns */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">💰 Spending Interest Patterns (Advertiser Gold!)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price Range Interest */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Price Range Analysis</h4>
              {Object.keys(summary.engagementData.priceRangeInterest).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(summary.engagementData.priceRangeInterest)
                    .sort((a, b) => b[1] - a[1])
                    .map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{range}</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ 
                                width: `${(count / Math.max(...Object.values(summary.engagementData.priceRangeInterest))) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-green-600 dark:text-green-400 font-bold">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No price range data yet</p>
              )}
            </div>

            {/* Pack Submission Analysis */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Pack Submissions</h4>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Total Submissions</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.conversionData.packSubmissions.total}</span>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Success Rate</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{summary.conversionData.packSubmissions.successRate.toFixed(1)}%</span>
                  </div>
                </div>
                {Object.keys(summary.conversionData.packSubmissions.priceRangeDistribution).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Submission Price Ranges:</p>
                    {Object.entries(summary.conversionData.packSubmissions.priceRangeDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([range, count]) => (
                        <div key={range} className="flex items-center justify-between text-xs py-1">
                          <span className="text-gray-700 dark:text-gray-300">{range}</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Tracking */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🎯 Conversion Events</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.conversionData.conversionsByType).map(([type, count]) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-700/50"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{count}</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 capitalize">{type.replace(/_/g, ' ')}</div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">📈 Advertiser Insights</h4>
            <div className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
              <p>• <strong>{summary.uniqueUsers}</strong> unique engaged users</p>
              <p>• <strong>{summary.conversionData.totalConversions}</strong> high-intent actions (calculations, submissions)</p>
              <p>• <strong>{Object.keys(summary.engagementData.priceRangeInterest).length}</strong> different price ranges analyzed</p>
              <p>• <strong>100%</strong> Raid Shadow Legends audience (premium gaming demographic)</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Regions */}
      {summary.regionData && summary.regionData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🌍 User Regions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">By Region</h4>
              <div className="space-y-3">
                {summary.regionData.slice(0, 8).map((region, index) => (
                  <motion.div
                    key={region.region}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {region.region === 'America' ? '🌎' : 
                         region.region === 'Europe' ? '🌍' : 
                         region.region === 'Asia' ? '🌏' : 
                         region.region === 'Pacific' ? '🏝️' : '🌐'}
                      </span>
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {region.region === 'America' ? 'Americas' : 
                           region.region === 'Europe' ? 'Europe' : 
                           region.region === 'Asia' ? 'Asia' : 
                           region.region === 'Pacific' ? 'Pacific' : region.region}
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {region.users} {region.users === 1 ? 'user' : 'users'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(region.users / Math.max(...summary.regionData!.map(r => r.users))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {Math.round((region.users / summary.uniqueUsers) * 100)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Global Reach</h4>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">🗺️</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {summary.regionData.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    regions reached
                  </div>
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                    Based on user timezone data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
