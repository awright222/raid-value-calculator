import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ITEM_CATEGORIES, getItemTypes, type ItemType } from '../types/itemTypes';
import { 
  getUserUtilityPreferences, 
  updateItemUtilityScore, 
  resetUtilityPreferences,
  getCustomizedItemCount 
} from '../utils/personalUtility';

interface PersonalRankingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersonalRankings: React.FC<PersonalRankingsProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState(getUserUtilityPreferences());
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreferences(getUserUtilityPreferences());
      loadItemTypes();
    }
  }, [isOpen]);

  const loadItemTypes = async () => {
    setLoading(true);
    try {
      const types = await getItemTypes();
      setItemTypes(types);
    } catch (error) {
      console.error('Failed to load item types:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemTypesByCategory = (category: string): ItemType[] => {
    return itemTypes.filter(item => item.category === category);
  };

  const handleScoreChange = (itemId: string, score: number) => {
    const newPrefs = { ...preferences, [itemId]: score };
    setPreferences(newPrefs);
    updateItemUtilityScore(itemId, score);
  };

  const handleReset = () => {
    resetUtilityPreferences();
    setPreferences({});
  };

  const getDisplayScore = (item: ItemType): number => {
    return preferences[item.id] ?? item.utilityScore ?? 5;
  };

  const getScoreColor = (score: number): string => {
    if (score <= 3) return 'text-red-600';
    if (score <= 6) return 'text-yellow-600';
    if (score <= 8) return 'text-blue-600';
    return 'text-green-600';
  };

  const getScoreDescription = (score: number): string => {
    if (score <= 2) return 'Very Low Value';
    if (score <= 4) return 'Low Value';
    if (score <= 6) return 'Medium Value';
    if (score <= 8) return 'High Value';
    return 'Very High Value';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Customize Item Values</h2>
                <p className="text-primary-100 mt-1">
                  Adjust how much you value each item type • {getCustomizedItemCount()} items customized
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-primary-100 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="border-b border-gray-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">?</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2">How to Use Utility Adjustments</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Rating 5 = Market Value</strong> - You value this item exactly at its market price</p>
                  <p><strong>Higher than 5</strong> - You value this item MORE than the market (great for your gameplay style)</p>
                  <p><strong>Lower than 5</strong> - You value this item LESS than the market (not useful for your goals)</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">1-2: Essentially Worthless</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">3-4: Low Value</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">5: Market Value</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">6-8: High Value</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">9-10: Extremely Valuable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading item types...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
              {Object.values(ITEM_CATEGORIES).map((category) => {
                const items = getItemTypesByCategory(category);
                if (items.length === 0) return null;

                return (
                  <div key={category} className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      {category}
                      <span className="text-sm font-normal text-gray-500">
                        ({items.length} items)
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {items.map((item) => {
                        const currentScore = getDisplayScore(item);
                        const isCustomized = preferences[item.id] !== undefined;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`bg-white rounded-lg p-4 border-2 transition-all ${
                              isCustomized ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-800">{item.name}</h4>
                                  {isCustomized && (
                                    <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
                                      Custom
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Value Rating</span>
                                <span className={`text-lg font-bold ${getScoreColor(currentScore)}`}>
                                  {currentScore}/10
                                </span>
                              </div>
                              
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={currentScore}
                                onChange={(e) => handleScoreChange(item.id, parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #3b82f6 50%, #10b981 75%, #10b981 100%)`
                                }}
                              />
                              
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Low</span>
                                <span className={`font-medium ${getScoreColor(currentScore)}`}>
                                  {getScoreDescription(currentScore)}
                                </span>
                                <span>High</span>
                              </div>
                              
                              {item.utilityReasoning && (
                                <p className="text-xs text-gray-600 italic bg-gray-100 p-2 rounded">
                                  Default reasoning: {item.utilityReasoning}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              🔄 Reset All to Defaults
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium shadow-lg"
              >
                ✅ Save & Apply
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
