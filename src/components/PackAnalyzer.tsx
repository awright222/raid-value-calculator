import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GradeDisplay from './GradeDisplay';
import ConfidenceIndicator from './ConfidenceIndicator';
import RateLimitInfo from './RateLimitInfo';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById, type PackItem } from '../types/itemTypes';
import { savePackAnalysis } from '../firebase/historical';
import { calculateItemPrices, analyzePackValueNew } from '../services/pricingService';
import { useAnalytics } from '../services/analytics';
import { checkRateLimit, showRateLimitWarning } from '../utils/rateLimiter';
import { Timestamp } from 'firebase/firestore';

interface AnalysisResult {
  total_energy: number;
  cost_per_energy: number;
  grade: string;
  similar_packs: any[];
  comparison: {
    better_than_percent: number;
    total_packs_compared: number;
  };
  // New fields for dynamic pricing
  totalValue?: number;
  dollarsPerDollar?: number;
}

interface PackAnalyzerProps {
  // Remove authToken since Firebase handles auth differently
}

export default function PackAnalyzer({}: PackAnalyzerProps) {
  const [price, setPrice] = useState('');
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [itemStats, setItemStats] = useState<Record<string, { totalQuantity: number; packCount: number }>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date>(new Date());
  
  const analytics = useAnalytics();

  useEffect(() => {
    loadItemPrices();
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'SSS': return 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-2xl border-2 border-pink-300';
      case 'S+': return 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white';
      case 'S': return 'bg-gradient-to-r from-green-400 to-green-500 text-white';
      case 'A': return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
      case 'B': return 'bg-gradient-to-r from-purple-400 to-purple-500 text-white';
      case 'C': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 'D': return 'bg-gradient-to-r from-orange-400 to-red-400 text-white';
      case 'F': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const loadItemPrices = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      
      // Use the shared pricing service that has the advanced algorithm
      const { itemPrices, itemStats } = await calculateItemPrices(isRefresh);
      
      setItemPrices(itemPrices);
      
      // Create a simplified stats object for confidence indicators
      const statsForConfidence: Record<string, { totalQuantity: number; packCount: number }> = {};
      Object.entries(itemStats).forEach(([itemTypeId, stats]) => {
        statsForConfidence[itemTypeId] = {
          totalQuantity: stats.totalQuantity,
          packCount: stats.packCount
        };
      });
      setItemStats(statsForConfidence);
      setLastDataUpdate(new Date());
    } catch (error) {
      // Error handled gracefully
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshData = () => {
    loadItemPrices(true);
  };

  const addItem = () => {
    setPackItems([...packItems, { itemTypeId: '', quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setPackItems(packItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PackItem, value: string | number) => {
    const updatedItems = [...packItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setPackItems(updatedItems);
  };

  const calculateTotalEnergy = () => {
    let totalEnergy = 0;
    
    packItems.forEach(item => {
      const itemType = getItemTypeById(item.itemTypeId);
      if (itemType && itemType.baseValue) {
        totalEnergy += item.quantity * itemType.baseValue;
      }
    });
    
    return totalEnergy;
  };

  const getPackValueAnalysis = () => {
    let totalMarketValue = 0;
    const itemBreakdown: Array<{
      itemType: any;
      quantity: number;
      marketValue: number;
      energyEquivalent: number;
      valueGrade: string;
      valueRating: string;
      costPerUnit: number;
      marketPricePerUnit: number;
    }> = [];

    packItems.forEach(item => {
      const itemType = getItemTypeById(item.itemTypeId);
      const marketPricePerUnit = itemPrices[item.itemTypeId] || 0;
      const itemMarketValue = item.quantity * marketPricePerUnit;
      
      totalMarketValue += itemMarketValue;
      
      // Calculate individual item value grade
      const actualPrice = parseFloat(price) || 0;
      const costPerUnit = actualPrice > 0 ? (actualPrice / packItems.reduce((sum, pi) => sum + pi.quantity, 0)) : 0;
      
      let valueGrade = 'C';
      let valueRating = 'Fair Value';
      
      if (marketPricePerUnit > 0 && costPerUnit > 0) {
        const valueRatio = marketPricePerUnit / costPerUnit;
        
        if (valueRatio >= 2.0) {
          valueGrade = 'S+';
          valueRating = 'Exceptional Deal';
        } else if (valueRatio >= 1.5) {
          valueGrade = 'S';
          valueRating = 'Amazing Value';
        } else if (valueRatio >= 1.3) {
          valueGrade = 'A';
          valueRating = 'Great Deal';
        } else if (valueRatio >= 1.1) {
          valueGrade = 'B';
          valueRating = 'Good Value';
        } else if (valueRatio >= 0.9) {
          valueGrade = 'C';
          valueRating = 'Fair Value';
        } else if (valueRatio >= 0.7) {
          valueGrade = 'D';
          valueRating = 'Poor Value';
        } else {
          valueGrade = 'F';
          valueRating = 'Bad Deal';
        }
      }
      
      itemBreakdown.push({
        itemType,
        quantity: item.quantity,
        marketValue: itemMarketValue,
        energyEquivalent: itemType?.baseValue ? item.quantity * itemType.baseValue : 0,
        valueGrade,
        valueRating,
        costPerUnit,
        marketPricePerUnit
      });
    });

    const actualPrice = parseFloat(price) || 0;
    const discountPercent = totalMarketValue > 0 ? ((totalMarketValue - actualPrice) / totalMarketValue) * 100 : 0;

    return {
      totalMarketValue,
      totalEnergyEquivalent: calculateTotalEnergy(),
      costPerEnergyEquivalent: 0,
      itemBreakdown,
      actualPrice,
      valueVsMarket: actualPrice > 0 ? (totalMarketValue / actualPrice) : 0,
      discountPercent
    };
  };

  const handleAnalyze = async () => {
    // Check rate limit first
    if (!checkRateLimit('PACK_ANALYSIS')) {
      showRateLimitWarning('PACK_ANALYSIS');
      return;
    }

    if (!price) {
      setError('Price is required');
      return;
    }

    if (packItems.length === 0) {
      setError('At least one item is required');
      return;
    }

    // Check if we have any valid items
    const validItems = packItems.filter(item => {
      const itemType = getItemTypeById(item.itemTypeId);
      return itemType && item.quantity > 0;
    });

    if (validItems.length === 0) {
      setError('At least one valid item with quantity > 0 is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Calculate total energy from energy items (for legacy display)
      const energyPots = packItems
        .filter(item => item.itemTypeId === 'energy_pot')
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const rawEnergy = packItems
        .filter(item => item.itemTypeId === 'raw_energy')
        .reduce((sum, item) => sum + item.quantity, 0);

      const totalEnergy = (energyPots * 130) + rawEnergy;
      const costPerEnergy = totalEnergy > 0 ? parseFloat(price) / totalEnergy : 0;

      // Use new dynamic pricing analysis
      const packItemsForAnalysis = packItems.map(item => ({
        itemTypeId: item.itemTypeId,
        quantity: item.quantity
      }));
      
      const analysis = await analyzePackValueNew(packItemsForAnalysis, parseFloat(price));
      
      // Get item prices for historical data
      const { itemPrices } = await calculateItemPrices();
      
      const resultData = {
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        grade: analysis.grade,
        similar_packs: analysis.similarPacks,
        comparison: {
          better_than_percent: analysis.comparison.betterThanPercent,
          total_packs_compared: analysis.comparison.totalPacksCompared
        },
        totalValue: analysis.totalValue,
        dollarsPerDollar: analysis.dollarsPerDollar
      };
      
      setResult(resultData);

      // Track pack analysis for analytics
      analytics.trackConversion('calculator_use', {
        packPrice: parseFloat(price),
        grade: resultData.grade,
        totalEnergy: totalEnergy,
        itemCount: packItems.length,
        hasEnergyPots: packItems.some(item => item.itemTypeId === 'energy_pot'),
        hasRawEnergy: packItems.some(item => item.itemTypeId === 'raw_energy')
      });

      // Track pack view for analytics dashboard
      analytics.trackPackView({
        packName: packItems.map(item => {
          const itemType = getItemTypeById(item.itemTypeId);
          return `${item.quantity}x ${itemType?.name || 'Unknown'}`;
        }).join(', '),
        price: parseFloat(price),
        grade: resultData.grade,
        energyValue: totalEnergy
      });
        
      // Save pack analysis to historical data
      try {
        await savePackAnalysis({
          packName: packItems.map(item => {
            const itemType = getItemTypeById(item.itemTypeId);
            return `${item.quantity}x ${itemType?.name || 'Unknown'}`;
          }).join(', '),
          packPrice: parseFloat(price),
          totalEnergy: totalEnergy,
          costPerEnergy: costPerEnergy,
          grade: resultData.grade,
          betterThanPercent: resultData.comparison.better_than_percent,
          totalPacksCompared: resultData.comparison.total_packs_compared,
          itemBreakdown: packItems.map(item => {
            const itemType = getItemTypeById(item.itemTypeId);
            const itemPrice = itemPrices[item.itemTypeId] || 0;
            return {
              itemTypeId: item.itemTypeId,
              itemName: itemType?.name || 'Unknown Item',
              quantity: item.quantity,
              estimatedValue: itemPrice * item.quantity
            };
          }),
          analysisDate: Timestamp.now()
        });
        // Analysis saved successfully
      } catch (error) {
        // Save failed silently
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPrice('');
    setPackItems([]);
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-10 floating-card"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <motion.h2 
                className="text-3xl font-bold bg-gradient-to-r from-secondary-700 to-primary-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Analyze Pack Value
              </motion.h2>
              <RateLimitInfo />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📊 Estimates based on community data - results may vary. Not financial advice.
            </p>
          </div>
          
          <button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="text-sm text-secondary-600 hover:text-primary-600 transition-colors flex items-center space-x-1"
            title="Refresh market data"
          >
            <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span className="text-xs">
              {refreshing ? 'Updating...' : `Data: ${lastDataUpdate.toLocaleTimeString()}`}
            </span>
          </button>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Form */}
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-3">
                Pack Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field text-lg"
                placeholder="9.99"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-secondary-700">
                  Pack Contents
                </label>
                <button
                  onClick={addItem}
                  className="btn-secondary text-sm"
                >
                  + Add Item
                </button>
              </div>

              {packItems.length === 0 && (
                <div className="text-center py-8 text-secondary-500">
                  <p>No items added yet. Click "Add Item" to start building your pack.</p>
                </div>
              )}

              <div className="space-y-4">
                {packItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect p-4 rounded-xl"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-secondary-600 mb-2">
                          Item Type
                        </label>
                        <select
                          value={item.itemTypeId}
                          onChange={(e) => updateItem(index, 'itemTypeId', e.target.value)}
                          className="input-field text-sm"
                        >
                          <option value="">Select item...</option>
                          {Object.values(ITEM_CATEGORIES).map(category => (
                            <optgroup key={category} label={category}>
                              {getItemTypesByCategory(category).map(itemType => (
                                <option key={itemType.id} value={itemType.id}>
                                  {itemType.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary-600 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="input-field text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-secondary-500">
                          {item.itemTypeId && getItemTypeById(item.itemTypeId)?.description}
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {packItems.length > 0 && (
                <div className="mt-4 p-4 bg-primary-50/50 border border-primary-200/50 rounded-xl">
                  {(() => {
                    const valueAnalysis = getPackValueAnalysis();
                    const hasEnergyItems = packItems.some(item => getItemTypeById(item.itemTypeId)?.category === ITEM_CATEGORIES.ENERGY);
                    
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-primary-700">
                              Market Value: ${(valueAnalysis.totalMarketValue && isFinite(valueAnalysis.totalMarketValue)) ? valueAnalysis.totalMarketValue.toFixed(2) : '0.00'}
                            </p>
                            <p className="text-xs text-primary-600">Based on typical market rates</p>
                          </div>
                          <div>
                            <p className="font-medium text-primary-700">
                              Value Ratio: {valueAnalysis.valueVsMarket > 0 ? `${(valueAnalysis.valueVsMarket && isFinite(valueAnalysis.valueVsMarket)) ? valueAnalysis.valueVsMarket.toFixed(2) : '0.00'}x` : 'N/A'}
                            </p>
                            <p className="text-xs text-primary-600">
                              {valueAnalysis.discountPercent > 0 ? `${(valueAnalysis.discountPercent && isFinite(valueAnalysis.discountPercent)) ? valueAnalysis.discountPercent.toFixed(1) : '0.0'}% discount` : 
                               valueAnalysis.discountPercent < 0 ? `${Math.abs(valueAnalysis.discountPercent && isFinite(valueAnalysis.discountPercent) ? valueAnalysis.discountPercent : 0).toFixed(1)}% premium` : 'At market price'}
                            </p>
                          </div>
                        </div>
                        {hasEnergyItems && (
                          <div className="pt-2 border-t border-primary-200/50">
                            <p className="text-sm font-medium text-primary-700">
                              Total Energy: {calculateTotalEnergy().toLocaleString()}
                            </p>
                            <p className="text-xs text-primary-600">
                              Energy Equivalent: {valueAnalysis.totalEnergyEquivalent.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-xl shadow-lg"
              >
                {error}
              </motion.div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : 'Analyze Pack'}
              </button>
              <button
                onClick={handleReset}
                className="btn-secondary text-lg"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-8">
            {result && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="glass-effect rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-secondary-700 dark:text-gray-200 mb-6">Analysis Results</h3>
                  
                  {/* Pack Grade - Prominently displayed at top */}
                  <div className="mb-8">
                    <GradeDisplay grade={result.grade} />
                  </div>
                  
                  {(() => {
                    const valueAnalysis = getPackValueAnalysis();
                    const hasNonEnergyItems = packItems.some(item => {
                      const itemType = getItemTypeById(item.itemTypeId);
                      return itemType && itemType.category !== ITEM_CATEGORIES.ENERGY;
                    });
                    
                    return (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                          <motion.div 
                            className="card p-4 text-center floating-card"
                            whileHover={{ y: -5 }}
                          >
                            <p className="text-xs font-semibold text-secondary-600 mb-2">Pack Price</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                              ${parseFloat(price).toFixed(2)}
                            </p>
                          </motion.div>
                          <motion.div 
                            className="card p-4 text-center floating-card"
                            whileHover={{ y: -5 }}
                          >
                            <p className="text-xs font-semibold text-secondary-600 mb-2">Market Value</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                              ${(valueAnalysis.totalMarketValue && isFinite(valueAnalysis.totalMarketValue)) ? valueAnalysis.totalMarketValue.toFixed(2) : '0.00'}
                            </p>
                          </motion.div>
                          <motion.div 
                            className="card p-4 text-center floating-card"
                            whileHover={{ y: -5 }}
                          >
                            <p className="text-xs font-semibold text-secondary-600 mb-2">Value Ratio</p>
                            <p className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                              valueAnalysis.valueVsMarket > 1.2 ? 'from-green-600 to-green-700' :
                              valueAnalysis.valueVsMarket > 1.0 ? 'from-yellow-600 to-yellow-700' :
                              'from-red-600 to-red-700'
                            }`}>
                              {valueAnalysis.valueVsMarket > 0 ? `${(valueAnalysis.valueVsMarket && isFinite(valueAnalysis.valueVsMarket)) ? valueAnalysis.valueVsMarket.toFixed(2) : '0.00'}x` : 'N/A'}
                            </p>
                          </motion.div>
                          <motion.div 
                            className="card p-4 text-center floating-card"
                            whileHover={{ y: -5 }}
                          >
                            <p className="text-xs font-semibold text-secondary-600 mb-2">
                              {result.total_energy > 0 ? 'Total Energy' : 'Energy Equivalent'}
                            </p>
                            <p className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                              {result.total_energy > 0 ? result.total_energy.toLocaleString() : valueAnalysis.totalEnergyEquivalent.toLocaleString()}
                            </p>
                          </motion.div>
                        </div>

                        {hasNonEnergyItems && (
                          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl">
                            <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-4">📊 Individual Item Analysis</h4>
                            <div className="space-y-4">
                              {valueAnalysis.itemBreakdown.map((item, index) => (
                                <div key={index} className="bg-white/80 dark:bg-gray-800/80 rounded-lg border border-purple-100 dark:border-purple-700/50">
                                  <div className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-secondary-700 dark:text-gray-200">
                                            {item.quantity}x {item.itemType.name}
                                          </span>
                                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-800/60 text-purple-700 dark:text-purple-300 rounded-full">
                                            {item.itemType.category}
                                          </span>
                                        </div>
                                        <div className="text-sm text-secondary-600 dark:text-gray-400">
                                          {item.energyEquivalent.toLocaleString()} energy equivalent
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-lg text-secondary-700 dark:text-gray-200">
                                          ${(item.marketValue && isFinite(item.marketValue)) ? item.marketValue.toFixed(2) : '0.00'}
                                        </div>
                                        <div className="text-xs text-secondary-500 dark:text-gray-400">Market Value</div>
                                      </div>
                                    </div>
                                    
                                    {/* Item Value Analysis */}
                                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-lg p-3 mb-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-secondary-700 dark:text-gray-200">Item Value Rating:</span>
                                        <div className="flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(item.valueGrade)}`}>
                                            {item.valueGrade}
                                          </span>
                                          <span className="text-sm font-medium text-secondary-700 dark:text-gray-200">{item.valueRating}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <span className="text-secondary-500 dark:text-gray-400">Your Cost:</span>
                                          <div className="font-semibold text-secondary-700 dark:text-gray-200">
                                            ${(item.costPerUnit && isFinite(item.costPerUnit)) ? item.costPerUnit.toFixed(3) : '0.000'} each
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-secondary-500 dark:text-gray-400">Market Price:</span>
                                          <div className="font-semibold text-secondary-700 dark:text-gray-200">
                                            ${(item.marketPricePerUnit && isFinite(item.marketPricePerUnit)) ? item.marketPricePerUnit.toFixed(3) : '0.000'} each
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {itemStats[item.itemType.id] && (
                                      <div className="pt-3 border-t border-purple-100 dark:border-purple-700/50">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-secondary-500 dark:text-gray-400">Price Data Confidence:</span>
                                          <ConfidenceIndicator 
                                            totalQuantity={itemStats[item.itemType.id].totalQuantity}
                                            packCount={itemStats[item.itemType.id].packCount}
                                            className="scale-75"
                                          />
                                        </div>
                                        <div className="text-xs text-secondary-400 dark:text-gray-500 mt-1">
                                          Based on {itemStats[item.itemType.id].packCount} pack{itemStats[item.itemType.id].packCount !== 1 ? 's' : ''} 
                                          ({itemStats[item.itemType.id].totalQuantity.toLocaleString()} items)
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {result.total_energy > 0 && (
                    <div className="mt-8 p-6 glass-effect rounded-xl">
                      <p className="text-lg font-semibold text-center">
                        <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                          This pack is better than {result.comparison.better_than_percent}%
                        </span>
                        <span className="text-secondary-700 dark:text-gray-200"> of the {result.comparison.total_packs_compared} packs in our database.</span>
                      </p>
                    </div>
                  )}

                  {/* Analysis Content - continues to similar packs section */}
                </div>
              </motion.div>
            )}

            {!result && (
              <div className="glass-effect rounded-2xl p-12 text-center">
                <motion.div 
                  className="text-8xl mb-6"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  📊
                </motion.div>
                <p className="text-xl font-semibold text-secondary-600">Enter pack details to see the analysis</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
