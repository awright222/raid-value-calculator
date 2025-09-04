import { motion } from 'framer-motion';
import { type MarketTrend } from '../firebase/historical';

interface MarketBestDealsProps {
  marketTrends: MarketTrend[];
  isDark: boolean;
}

export default function MarketBestDeals({ marketTrends, isDark }: MarketBestDealsProps) {
  const weeklyTrend = marketTrends.find(t => t.period === 'weekly');
  const monthlyTrend = marketTrends.find(t => t.period === 'monthly');

  console.log('🏆 MarketBestDeals: Rendering with', marketTrends.length, 'trends');
  console.log('📊 Weekly trend:', weeklyTrend ? 'found' : 'not found');
  console.log('📊 Monthly trend:', monthlyTrend ? 'found' : 'not found');

  if (marketTrends.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`mb-8 p-6 rounded-lg border text-center ${
          isDark 
            ? 'bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-700/30' 
            : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
        }`}
      >
        <h2 className={`text-xl font-semibold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          🏆 Best Deals
        </h2>
        <p className={`text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          No market trends data available yet. Analyze some packs to see best deals!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`mb-8 p-6 rounded-lg border ${
        isDark 
          ? 'bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border-orange-700/30' 
          : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200'
      }`}
    >
      <h2 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        🏆 Best Deals
        <span className={`text-sm font-normal ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          • Updates weekly & monthly ({marketTrends.length} trends)
        </span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Best Deal */}
        {weeklyTrend ? (
          <div className={`p-4 rounded-lg border-2 ${
            isDark 
              ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-600/50' 
              : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDark ? 'bg-green-700 text-green-100' : 'bg-green-200 text-green-800'
              }`}>
                THIS WEEK
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {weeklyTrend.periodStart?.toDate().toLocaleDateString()} - {weeklyTrend.periodEnd?.toDate().toLocaleDateString()}
              </div>
            </div>
            
            <h3 className={`text-lg font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {weeklyTrend.bestDeal.packName}
            </h3>
            
            <div className="flex items-center gap-4 mb-3">
              <div className={`px-3 py-1 rounded-lg font-bold text-lg ${
                weeklyTrend.bestDeal.grade === 'S' ? 'bg-purple-600 text-white' :
                weeklyTrend.bestDeal.grade === 'A' ? 'bg-green-600 text-white' :
                weeklyTrend.bestDeal.grade === 'B' ? 'bg-blue-600 text-white' :
                weeklyTrend.bestDeal.grade === 'C' ? 'bg-yellow-600 text-white' :
                weeklyTrend.bestDeal.grade === 'D' ? 'bg-orange-600 text-white' :
                'bg-red-600 text-white'
              }`}>
                Grade {weeklyTrend.bestDeal.grade}
              </div>
              
              <div className={`text-sm ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                ${weeklyTrend.bestDeal.price?.toFixed(2) || 'N/A'}
              </div>
            </div>

            {/* Pack Contents */}
            {weeklyTrend.bestDeal.items && weeklyTrend.bestDeal.items.length > 0 && (
              <div className={`mb-3 p-3 rounded-lg ${
                isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'
              }`}>
                <div className={`text-sm font-semibold mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Pack Contents:
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {weeklyTrend.bestDeal.items.map((item: any, idx: number) => (
                    <div key={idx} className={`text-xs flex justify-between ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <span>{item.itemName || item.itemTypeId?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                      <span>×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              From {weeklyTrend.totalPacksAnalyzed} packs analyzed this week
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-lg border-2 border-dashed ${
            isDark ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-100/30'
          }`}>
            <div className={`text-center ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="text-2xl mb-2">📅</div>
              <div className="text-sm">No weekly data available</div>
            </div>
          </div>
        )}

        {/* Monthly Best Deal */}
        {monthlyTrend ? (
          <div className={`p-4 rounded-lg border-2 ${
            isDark 
              ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-600/50' 
              : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDark ? 'bg-blue-700 text-blue-100' : 'bg-blue-200 text-blue-800'
              }`}>
                THIS MONTH
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {monthlyTrend.periodStart?.toDate().toLocaleDateString()} - {monthlyTrend.periodEnd?.toDate().toLocaleDateString()}
              </div>
            </div>
            
            <h3 className={`text-lg font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {monthlyTrend.bestDeal.packName}
            </h3>
            
            <div className="flex items-center gap-4 mb-3">
              <div className={`px-3 py-1 rounded-lg font-bold text-lg ${
                monthlyTrend.bestDeal.grade === 'S' ? 'bg-purple-600 text-white' :
                monthlyTrend.bestDeal.grade === 'A' ? 'bg-green-600 text-white' :
                monthlyTrend.bestDeal.grade === 'B' ? 'bg-blue-600 text-white' :
                monthlyTrend.bestDeal.grade === 'C' ? 'bg-yellow-600 text-white' :
                monthlyTrend.bestDeal.grade === 'D' ? 'bg-orange-600 text-white' :
                'bg-red-600 text-white'
              }`}>
                Grade {monthlyTrend.bestDeal.grade}
              </div>
              
              <div className={`text-sm ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                ${monthlyTrend.bestDeal.price?.toFixed(2) || 'N/A'}
              </div>
            </div>

            {/* Pack Contents */}
            {monthlyTrend.bestDeal.items && monthlyTrend.bestDeal.items.length > 0 && (
              <div className={`mb-3 p-3 rounded-lg ${
                isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'
              }`}>
                <div className={`text-sm font-semibold mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Pack Contents:
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {monthlyTrend.bestDeal.items.map((item: any, idx: number) => (
                    <div key={idx} className={`text-xs flex justify-between ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <span>{item.itemName || item.itemTypeId?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                      <span>×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              From {monthlyTrend.totalPacksAnalyzed} packs analyzed this month
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-lg border-2 border-dashed ${
            isDark ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-100/30'
          }`}>
            <div className={`text-center ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="text-2xl mb-2">📅</div>
              <div className="text-sm">No monthly data available</div>
            </div>
          </div>
        )}
      </div>

      {/* Market Trends Summary */}
      {(weeklyTrend || monthlyTrend) && (
        <div className={`mt-4 p-3 rounded-lg ${
          isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'
        }`}>
          <div className="text-xs space-y-1">
            {weeklyTrend && (
              <div className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                📈 Weekly trend: {weeklyTrend.trendDirection} (avg grade: {weeklyTrend.averageGrade})
              </div>
            )}
            {monthlyTrend && (
              <div className={`${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                📊 Monthly trend: {monthlyTrend.trendDirection} (avg grade: {monthlyTrend.averageGrade})
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
