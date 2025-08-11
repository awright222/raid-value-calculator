import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GradeDisplay from './GradeDisplay';
import ConfidenceIndicator from './ConfidenceIndicator';
import RateLimitInfo from './RateLimitInfo';
import { PersonalRankings } from './PersonalRankings';
import ItemAutocomplete from './ItemAutocomplete';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById, getUtilityScore, calculateUtilityAdjustedPrice, type PackItem } from '../types/itemTypes';
// TEMPORARILY DISABLED: import { savePackAnalysis } from '../firebase/historical'; // Causing 400 errors
import { calculateItemPrices, analyzePackValueNew } from '../services/pricingService';
// TEMPORARILY DISABLED: import { useAnalytics } from '../services/analytics'; // Causing 400 errors
import { checkRateLimit, showRateLimitWarning } from '../utils/rateLimiter';
// TEMPORARILY DISABLED: import { Timestamp } from 'firebase/firestore'; // Causing 400 errors

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
  const [packName, setPackName] = useState('');
  const [isSubmittingToDatabase, setIsSubmittingToDatabase] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [showAddPackModal, setShowAddPackModal] = useState(false);
  const [useUtilityAdjustment, setUseUtilityAdjustment] = useState(false);
  const [showPersonalRankings, setShowPersonalRankings] = useState(false);
  const [useAutocomplete, setUseAutocomplete] = useState(true); // Default to autocomplete
  // TEMPORARILY DISABLED: const analytics = useAnalytics(); // Causing 400 errors

  // Smart price display for very small values
  const formatSmartPrice = (price: number, itemId?: string): string => {
    if (!price || !isFinite(price)) return '$0.000 each';
    
    // For very small values, show per meaningful unit
    if (price < 0.001 && price > 0) {
      switch (itemId) {
        case 'silver':
          return `$${(price * 1000).toFixed(3)} per 1K`;
        case 'xp_brew':
        case 'xp_barrel':
          return `$${(price * 10).toFixed(3)} per 10`;
        default:
          if (price < 0.0001) {
            return `$${(price * 10000).toFixed(3)} per 10K`;
          } else {
            return `$${(price * 100).toFixed(3)} per 100`;
          }
      }
    }
    
    return `$${price.toFixed(3)} each`;
  };

  useEffect(() => {
    loadItemPrices();
    console.log('📦 PackAnalyzer loaded - loadItemPrices() re-enabled');
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

  const getPackValueAnalysis = () => {
    let totalMarketValue = 0;
    const itemBreakdown: Array<{
      itemType: any;
      quantity: number;
      marketValue: number;
      valueGrade: string;
      valueRating: string;
      costPerUnit: number;
      marketPricePerUnit: number;
    }> = [];

    console.log('🧮 Starting individual item analysis for', packItems.length, 'items');
    const actualPrice = parseFloat(price) || 0;
    console.log('💰 Pack price:', actualPrice);

    // First, calculate total pack market value ONCE
    const totalPackMarketValue = packItems.reduce((sum, pi) => {
      const piItemType = getItemTypeById(pi.itemTypeId);
      let piMarketPrice = itemPrices[pi.itemTypeId] || 0;
      
      // Apply utility adjustment if enabled
      if (useUtilityAdjustment && piItemType) {
        const utilityScore = getUtilityScore(piItemType, useUtilityAdjustment);
        piMarketPrice = calculateUtilityAdjustedPrice(piMarketPrice, utilityScore);
      }
      
      const piTotalValue = piMarketPrice * pi.quantity;
      console.log(`📊 ${piItemType?.name || pi.itemTypeId}: ${pi.quantity} × $${piMarketPrice.toFixed(6)} = $${piTotalValue.toFixed(2)}`);
      
      return sum + piTotalValue;
    }, 0);
    
    console.log('💎 Total pack market value:', totalPackMarketValue);

    packItems.forEach(item => {
      const itemType = getItemTypeById(item.itemTypeId);
      let marketPricePerUnit = itemPrices[item.itemTypeId] || 0;
      
      // Apply utility adjustment if enabled
      if (useUtilityAdjustment && itemType) {
        const utilityScore = getUtilityScore(itemType, useUtilityAdjustment);
        marketPricePerUnit = calculateUtilityAdjustedPrice(marketPricePerUnit, utilityScore);
      }
      
      const itemMarketValue = item.quantity * marketPricePerUnit;
      
      totalMarketValue += itemMarketValue;
      
      // Calculate individual item value grade
      let valueGrade = 'C';
      let valueRating = 'Fair Value';
      
      // Calculate this item's proportional cost from the pack
      const itemMarketValueShare = itemMarketValue;
      const itemProportionalCost = totalPackMarketValue > 0 ? 
        (actualPrice * itemMarketValueShare / totalPackMarketValue) : 0;
      const costPerUnit = item.quantity > 0 ? itemProportionalCost / item.quantity : 0;
      
      console.log(`🔍 ${itemType?.name || item.itemTypeId}:`);
      console.log(`   Market price per unit: $${marketPricePerUnit.toFixed(6)}`);
      console.log(`   Item market value: $${itemMarketValue.toFixed(2)}`);
      console.log(`   Proportional cost: $${itemProportionalCost.toFixed(2)}`);
      console.log(`   Cost per unit: $${costPerUnit.toFixed(6)}`);
      
      if (marketPricePerUnit > 0 && costPerUnit > 0) {
        const valueRatio = marketPricePerUnit / costPerUnit;
        console.log(`   Value ratio: ${valueRatio.toFixed(3)} (${marketPricePerUnit.toFixed(6)} / ${costPerUnit.toFixed(6)})`);
        
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
        
        console.log(`   📋 Final grade: ${valueGrade} (${valueRating})`);
      } else {
        console.log(`   ⚠️ Cannot calculate grade: marketPrice=${marketPricePerUnit}, costPerUnit=${costPerUnit}`);
      }
      
      itemBreakdown.push({
        itemType,
        quantity: item.quantity,
        marketValue: itemMarketValue,
        valueGrade,
        valueRating,
        costPerUnit,
        marketPricePerUnit
      });
    });

    const discountPercent = totalMarketValue > 0 ? ((totalMarketValue - actualPrice) / totalMarketValue) * 100 : 0;

    return {
      totalMarketValue,
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
      // Use new dynamic pricing analysis
      const packItemsForAnalysis = packItems.map(item => ({
        itemTypeId: item.itemTypeId,
        quantity: item.quantity
      }));
      
      const analysis = await analyzePackValueNew(packItemsForAnalysis, parseFloat(price));
      
      // TEMPORARILY DISABLED: Get item prices for historical data (not used)
      // const { itemPrices } = await calculateItemPrices();
      
      const resultData = {
        total_energy: 0, // No longer calculating energy
        cost_per_energy: 0, // No longer relevant
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

      // TEMPORARILY DISABLED: Track pack analysis for analytics (causing 400 error)
      // analytics.trackConversion('calculator_use', {
      //   packPrice: parseFloat(price),
      //   grade: resultData.grade,
      //   totalEnergy: 0, // No longer calculating
      //   itemCount: packItems.length,
      //   hasEnergyPots: packItems.some(item => item.itemTypeId === 'energy_pot'),
      //   hasRawEnergy: packItems.some(item => item.itemTypeId === 'raw_energy')
      // });

      // TEMPORARILY DISABLED: Track pack view for analytics dashboard (causing 400 error)
      // analytics.trackPackView({
      //   packName: packItems.map(item => {
      //     const itemType = getItemTypeById(item.itemTypeId);
      //     return `${item.quantity}x ${itemType?.name || 'Unknown'}`;
      //   }).join(', '),
      //   price: parseFloat(price),
      //   grade: resultData.grade,
      //   energyValue: 0 // No longer calculating
      // });
        
      // TEMPORARILY DISABLED: Save pack analysis to historical data (causing 400 error)
      // try {
      //   await savePackAnalysis({
      //     packName: packItems.map(item => {
      //       const itemType = getItemTypeById(item.itemTypeId);
      //       return `${item.quantity}x ${itemType?.name || 'Unknown'}`;
      //     }).join(', '),
      //     packPrice: parseFloat(price),
      //     totalEnergy: 0, // No longer calculating
      //     costPerEnergy: 0, // No longer calculating
      //     grade: resultData.grade,
      //     betterThanPercent: resultData.comparison.better_than_percent,
      //     totalPacksCompared: resultData.comparison.total_packs_compared,
      //     itemBreakdown: packItems.map(item => {
      //       const itemType = getItemTypeById(item.itemTypeId);
      //       const itemPrice = itemPrices[item.itemTypeId] || 0;
      //       return {
      //         itemTypeId: item.itemTypeId,
      //         itemName: itemType?.name || 'Unknown Item',
      //         quantity: item.quantity,
      //         estimatedValue: itemPrice * item.quantity
      //       };
      //     }),
      //     analysisDate: Timestamp.now()
      //   });
      //   // Analysis saved successfully
      // } catch (error) {
      //   // Save failed silently
      // }
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
    setSubmitMessage(null);
  };

  const handleAddToDatabase = async () => {
    if (!result || !packName.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please enter a pack name before adding to database.' });
      return;
    }

    try {
      setIsSubmittingToDatabase(true);
      setSubmitMessage({ type: 'success', text: 'Adding pack to database...' });

      // Calculate energy values
      const energyPots = packItems.find(item => item.itemTypeId === 'energy_pot')?.quantity || 0;
      const rawEnergy = packItems.find(item => item.itemTypeId === 'raw_energy')?.quantity || 0;
      const totalEnergy = (energyPots * 130) + rawEnergy;
      const costPerEnergy = totalEnergy > 0 ? parseFloat(price) / totalEnergy : 0;

      // Use the same submission logic as PackSubmission
      const { submitPendingPack } = await import('../firebase/pendingPacks');
      
      const userId = `analyzer_user_${Date.now()}`;
      
      const packData = {
        name: packName.trim(),
        price: parseFloat(price),
        energy_pots: energyPots,
        raw_energy: rawEnergy,
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        items: packItems.filter(item => item.itemTypeId && item.quantity > 0),
        submitter_id: userId,
        submitter_email: ''
      };
      
      const submissionResult = await submitPendingPack(packData, userId, '');
      
      if (submissionResult.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `✅ ${submissionResult.message}` 
        });
        
        // Clear the pack name and close modal after successful submission
        setPackName('');
        setTimeout(() => {
          setShowAddPackModal(false);
          setSubmitMessage(null);
        }, 2000);
      } else {
        setSubmitMessage({ 
          type: submissionResult.duplicateFound ? 'warning' : 'error',
          text: submissionResult.message 
        });
      }

    } catch (error) {
      let errorMessage = 'Failed to add pack to database. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Failed to add pack: ${error.message}`;
        
        // Check for specific Firebase errors
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. Please check your connection and try again.';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('invalid-argument')) {
          errorMessage = 'Invalid pack data. Please check all fields and try again.';
        }
      }
      
      setSubmitMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmittingToDatabase(false);
    }
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
          
          <div className="flex items-center justify-between gap-4">
            {/* Utility Adjustment Toggle - Styled Switch */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">⚖️ Utility Adjustments</span>
                <button
                  onClick={() => setUseUtilityAdjustment(!useUtilityAdjustment)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    useUtilityAdjustment 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={useUtilityAdjustment}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform shadow-lg ${
                      useUtilityAdjustment 
                        ? 'translate-x-6 bg-gray-50' 
                        : 'translate-x-1 bg-gray-100'
                    }`}
                  />
                </button>
              </div>
              
              {/* Customize Button - More Prominent */}
              <motion.button
                onClick={() => setShowPersonalRankings(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  useUtilityAdjustment
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-lg border-2 border-gray-400 dark:border-gray-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                }`}
                title="Customize how much you value each item type"
              >
                <span>🎯</span>
                <span>Customize Values</span>
              </motion.button>
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
                <div className="flex items-center space-x-3">
                  {/* Input method toggle */}
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">Input:</span>
                    <button
                      type="button"
                      onClick={() => setUseAutocomplete(!useAutocomplete)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        useAutocomplete
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {useAutocomplete ? '🔍 Search' : '📋 Dropdown'}
                    </button>
                  </div>
                  <button
                    onClick={addItem}
                    className="btn-secondary text-sm"
                  >
                    + Add Item
                  </button>
                </div>
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
                        {useAutocomplete ? (
                          <ItemAutocomplete
                            value={item.itemTypeId}
                            onChange={(itemId) => updateItem(index, 'itemTypeId', itemId)}
                            placeholder="Type to search items..."
                            className="w-full"
                          />
                        ) : (
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
                        )}
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-secondary-700 dark:text-gray-200">Analysis Results</h3>
                    
                    {/* Add to Database Button - Prominent placement */}
                    <motion.button
                      onClick={() => setShowAddPackModal(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                    >
                      <span>🗄️</span>
                      Add to Database
                    </motion.button>
                  </div>
                  
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
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                            {valueAnalysis.valueVsMarket > 0 && (
                              <p className="text-xs text-secondary-500 mt-1">
                                {Math.round((valueAnalysis.valueVsMarket && isFinite(valueAnalysis.valueVsMarket) ? valueAnalysis.valueVsMarket : 0) * 100)}¢ per dollar
                              </p>
                            )}
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
                                            {formatSmartPrice(item.costPerUnit, item.itemType.id)}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-secondary-500 dark:text-gray-400">Market Price:</span>
                                          <div className="font-semibold text-secondary-700 dark:text-gray-200">
                                            {formatSmartPrice(item.marketPricePerUnit, item.itemType.id)}
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

      {/* Add Pack to Database Modal */}
      {showAddPackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-700 dark:text-gray-200 flex items-center gap-2">
                <span>🗄️</span>
                Add Pack to Database
              </h3>
              <button
                onClick={() => {
                  setShowAddPackModal(false);
                  setSubmitMessage(null);
                  setPackName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-secondary-600 dark:text-gray-400 mb-6">
              Share this pack with the community! It will appear in the review queue for approval.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-700 dark:text-gray-300 mb-2">
                Pack Name *
              </label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                placeholder="e.g., Daily Gem Pack, Ascension Bundle"
                className="glass-input w-full rounded-lg px-4 py-3"
                disabled={isSubmittingToDatabase}
                autoFocus
              />
            </div>

            {submitMessage && (
              <div className={`mb-6 p-3 rounded-lg ${
                submitMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                submitMessage.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {submitMessage.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddPackModal(false);
                  setSubmitMessage(null);
                  setPackName('');
                }}
                disabled={isSubmittingToDatabase}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleAddToDatabase}
                disabled={isSubmittingToDatabase || !packName.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  isSubmittingToDatabase || !packName.trim()
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmittingToDatabase ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Adding...
                  </span>
                ) : (
                  'Add to Database'
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Personal Rankings Modal */}
      <PersonalRankings
        isOpen={showPersonalRankings}
        onClose={() => setShowPersonalRankings(false)}
      />
    </div>
  );
}
