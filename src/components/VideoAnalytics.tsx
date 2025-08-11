import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getVideoStats, cleanupOldAnalytics } from '../firebase/videoAnalytics';
import type { VideoStats } from '../firebase/videoAnalytics';
import { useTheme } from '../contexts/ThemeContext';

const VideoAnalytics: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const videoStats = await getVideoStats();
      setStats(videoStats);
    } catch (error) {
      console.error('Failed to load video analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      await cleanupOldAnalytics(30); // Keep 30 days
      await loadStats(); // Refresh stats after cleanup
    } catch (error) {
      console.error('Failed to cleanup analytics:', error);
    } finally {
      setCleaning(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString() + ' ' + timestamp.toDate().toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className={`ml-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading video analytics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className={`text-center py-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Failed to load video analytics data
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          🎬 Demo Video Analytics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className={`px-3 py-1 rounded text-sm ${
              cleaning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {cleaning ? 'Cleaning...' : 'Cleanup Old Data'}
          </button>
          <button
            onClick={loadStats}
            className="px-3 py-1 bg-primary-100 text-primary-700 rounded text-sm hover:bg-primary-200"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-blue-600'}`}>Total Views</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-blue-800'}`}>
            {stats.totalViews}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-green-600'}`}>Total Plays</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-green-800'}`}>
            {stats.totalPlays}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-purple-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-purple-600'}`}>Completions</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-purple-800'}`}>
            {stats.totalCompletions}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-orange-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-orange-600'}`}>Avg Watch Time</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-orange-800'}`}>
            {formatDuration(stats.averageWatchTime)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-teal-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-teal-600'}`}>Avg Watch %</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-teal-800'}`}>
            {stats.averageWatchPercentage.toFixed(1)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-pink-50'}`}
        >
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-pink-600'}`}>Completion Rate</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-pink-800'}`}>
            {stats.completionRate.toFixed(1)}%
          </div>
        </motion.div>
      </div>

      {/* Recent Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
      >
        <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Recent Sessions
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Date</th>
                <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Watch Time</th>
                <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Watch %</th>
                <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Events</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSessions.map((session) => (
                <tr key={session.sessionId} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatDate(session.timestamp)}
                  </td>
                  <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatDuration(session.totalWatchTime)}
                  </td>
                  <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={`px-2 py-1 rounded text-xs ${
                      session.maxWatchPercentage >= 90 
                        ? 'bg-green-100 text-green-800' 
                        : session.maxWatchPercentage >= 50 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {session.maxWatchPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="flex flex-wrap gap-1">
                      {session.events.map((event, idx) => (
                        <span
                          key={idx}
                          className={`px-1 py-0.5 rounded text-xs ${
                            event.event === 'view' ? 'bg-blue-100 text-blue-700' :
                            event.event === 'play' ? 'bg-green-100 text-green-700' :
                            event.event === 'pause' ? 'bg-yellow-100 text-yellow-700' :
                            event.event === 'ended' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {event.event}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoAnalytics;
