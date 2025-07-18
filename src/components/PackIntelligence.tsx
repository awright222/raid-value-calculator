import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  getPackEvolution, 
  getPackMarketIntelligence, 
  generatePackMarketIntelligence,
  getAllPackEvolutions,
  type PackNameEvolution,
  type PackMarketIntelligence
} from '../firebase/historical';

interface PackIntelligenceProps {
  packName?: string;
}

export const PackIntelligence: React.FC<PackIntelligenceProps> = ({ packName }) => {
  const [selectedPack, setSelectedPack] = useState<string>(packName || '');
  const [evolution, setEvolution] = useState<PackNameEvolution | null>(null);
  const [intelligence, setIntelligence] = useState<PackMarketIntelligence | null>(null);
  const [allPacks, setAllPacks] = useState<Array<{
    packName: string;
    totalVersions: number;
    latestGrade: string;
    averageValue: number;
    popularityScore: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllPacks();
  }, []);

  useEffect(() => {
    if (selectedPack) {
      loadPackData(selectedPack);
    }
  }, [selectedPack]);

  const loadAllPacks = async () => {
    try {
      const packs = await getAllPackEvolutions();
      setAllPacks(packs);
    } catch (error) {
      console.error('Error loading pack list:', error);
    }
  };

  const loadPackData = async (packName: string) => {
    setLoading(true);
    try {
      const [evolutionData, intelligenceData] = await Promise.all([
        getPackEvolution(packName),
        getPackMarketIntelligence(packName)
      ]);
      
      setEvolution(evolutionData);
      setIntelligence(intelligenceData);
      
      // Generate intelligence if it doesn't exist
      if (!intelligenceData && evolutionData) {
        try {
          await generatePackMarketIntelligence(packName);
          const newIntelligence = await getPackMarketIntelligence(packName);
          setIntelligence(newIntelligence);
        } catch (error) {
          console.warn('Failed to generate market intelligence:', error);
        }
      }
    } catch (error) {
      console.error('Error loading pack data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'strong_buy': return 'text-green-600 bg-green-100';
      case 'buy': return 'text-green-500 bg-green-50';
      case 'hold': return 'text-yellow-600 bg-yellow-100';
      case 'avoid': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pack Market Intelligence</h2>
        
        {/* Pack Selector */}
        <div className="mb-6">
          <label htmlFor="pack-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Pack to Analyze
          </label>
          <select
            id="pack-select"
            value={selectedPack}
            onChange={(e) => setSelectedPack(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a pack...</option>
            {allPacks.map((pack) => (
              <option key={pack.packName} value={pack.packName}>
                {pack.packName} ({pack.totalVersions} versions, Grade: {pack.latestGrade})
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading pack intelligence...</p>
          </div>
        )}

        {selectedPack && !loading && evolution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Pack Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Total Versions</h3>
                <p className="text-2xl font-bold text-blue-600">{evolution.totalVersions}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">Average Value</h3>
                <p className="text-2xl font-bold text-green-600">${evolution.analytics.averageValue.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">Popularity Score</h3>
                <p className="text-2xl font-bold text-purple-600">{evolution.analytics.popularityScore}</p>
              </div>
            </div>

            {/* Market Intelligence */}
            {intelligence && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Market Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Recommendation</h4>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(intelligence.recommendationEngine.buyRecommendation)}`}>
                      {intelligence.recommendationEngine.buyRecommendation.replace('_', ' ').toUpperCase()}
                    </div>
                    <p className={`mt-2 text-sm ${getRiskColor(intelligence.recommendationEngine.riskAssessment)}`}>
                      Risk: {intelligence.recommendationEngine.riskAssessment.toUpperCase()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Competitive Position</h4>
                    <p className="text-sm text-gray-600">
                      Rank: #{intelligence.competitiveAnalysis.rankInCategory} of {intelligence.competitiveAnalysis.totalInCategory}
                    </p>
                    <p className="text-sm text-gray-600">
                      Better than {intelligence.competitiveAnalysis.percentileBetter}% of similar packs
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Analysis Factors</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {intelligence.recommendationEngine.reasoningFactors.map((factor, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Version History */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <h3 className="text-xl font-semibold text-gray-800 p-4 border-b">Version History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Energy Equiv.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {evolution.versions.map((version) => (
                      <tr key={version.versionNumber} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          v{version.versionNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${version.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${version.totalValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            version.grade === 'A' ? 'bg-green-100 text-green-800' :
                            version.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            version.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {version.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {version.contentSummary.energyEquivalent.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {version.contentSummary.itemCount} items
                          {version.contentSummary.hasEnergyPots && (
                            <span className="ml-1 text-blue-500">⚡</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Price Stability</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-blue-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, evolution.analytics.priceStability)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-blue-700">
                    {evolution.analytics.priceStability.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Content Stability</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-green-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, evolution.analytics.contentStability)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    {evolution.analytics.contentStability.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {selectedPack && !loading && !evolution && (
          <div className="text-center py-8 text-gray-500">
            <p>No evolution data found for "{selectedPack}"</p>
            <p className="text-sm mt-2">This pack may not have been tracked yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
