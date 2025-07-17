import { useState } from 'react';
import { motion } from 'framer-motion';
import GradeDisplay from './GradeDisplay';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById, calculatePackValue, type PackItem } from '../types/itemTypes';
import { analyzePackValue } from '../firebase/database';

interface AnalysisResult {
  total_energy: number;
  cost_per_energy: number;
  grade: string;
  similar_packs: any[];
  comparison: {
    better_than_percent: number;
    total_packs_compared: number;
  };
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
    const packValue = calculatePackValue(packItems);
    return {
      ...packValue,
      actualPrice: parseFloat(price) || 0,
      valueVsMarket: parseFloat(price) ? (packValue.totalMarketValue / parseFloat(price)) : 0,
      discountPercent: parseFloat(price) ? ((packValue.totalMarketValue - parseFloat(price)) / packValue.totalMarketValue) * 100 : 0
    };
  };

  const handleAnalyze = async () => {
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
      // Calculate total energy from energy items
      const energyPots = packItems
        .filter(item => item.itemTypeId === 'energy_pot')
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const rawEnergy = packItems
        .filter(item => item.itemTypeId === 'raw_energy')
        .reduce((sum, item) => sum + item.quantity, 0);

      const totalEnergy = (energyPots * 130) + rawEnergy;
      const costPerEnergy = totalEnergy > 0 ? parseFloat(price) / totalEnergy : 0;

      if (totalEnergy > 0) {
        // Use Firebase for analysis
        const analysis = await analyzePackValue(totalEnergy, costPerEnergy);
        
        setResult({
          total_energy: totalEnergy,
          cost_per_energy: costPerEnergy,
          grade: analysis.grade,
          similar_packs: analysis.similar_packs,
          comparison: analysis.comparison
        });
      } else {
        // For non-energy packs, create a basic result
        setResult({
          total_energy: 0,
          cost_per_energy: 0,
          grade: 'NEW',
          similar_packs: [],
          comparison: {
            better_than_percent: 0,
            total_packs_compared: 0
          }
        });
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
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-secondary-900 to-primary-700 bg-clip-text text-transparent mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Analyze Pack Value
        </motion.h2>
        
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
                            <p className="font-medium text-primary-700">Market Value: ${valueAnalysis.totalMarketValue.toFixed(2)}</p>
                            <p className="text-xs text-primary-600">Based on typical market rates</p>
                          </div>
                          <div>
                            <p className="font-medium text-primary-700">
                              Value Ratio: {valueAnalysis.valueVsMarket > 0 ? `${valueAnalysis.valueVsMarket.toFixed(2)}x` : 'N/A'}
                            </p>
                            <p className="text-xs text-primary-600">
                              {valueAnalysis.discountPercent > 0 ? `${valueAnalysis.discountPercent.toFixed(1)}% discount` : 
                               valueAnalysis.discountPercent < 0 ? `${Math.abs(valueAnalysis.discountPercent).toFixed(1)}% premium` : 'At market price'}
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
                  <h3 className="text-2xl font-bold text-secondary-900 mb-6">Analysis Results</h3>
                  
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
                              ${valueAnalysis.totalMarketValue.toFixed(2)}
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
                              {valueAnalysis.valueVsMarket > 0 ? `${valueAnalysis.valueVsMarket.toFixed(2)}x` : 'N/A'}
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
                          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200/50 rounded-xl">
                            <h4 className="text-lg font-bold text-purple-900 mb-4">Item Breakdown</h4>
                            <div className="space-y-3">
                              {valueAnalysis.itemBreakdown.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                                  <div>
                                    <span className="font-medium text-secondary-900">{item.quantity}x {item.itemType.name}</span>
                                    <span className="text-sm text-secondary-600 ml-2">({item.itemType.category})</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-secondary-900">${item.marketValue.toFixed(2)}</div>
                                    <div className="text-xs text-secondary-600">{item.energyEquivalent.toLocaleString()} energy equiv.</div>
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
                    <>
                      <GradeDisplay grade={result.grade} />

                      <div className="mt-8 p-6 glass-effect rounded-xl">
                        <p className="text-lg font-semibold text-center">
                          <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                            This pack is better than {result.comparison.better_than_percent}%
                          </span>
                          <span className="text-secondary-700"> of the {result.comparison.total_packs_compared} packs in our database.</span>
                        </p>
                      </div>
                    </>
                  )}

                  {result.total_energy === 0 && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/50 rounded-xl">
                      <h4 className="text-lg font-bold text-yellow-900 mb-2">New Item Analysis</h4>
                      <p className="text-yellow-800">
                        This pack contains non-energy items. Value analysis is based on estimated market rates. 
                        {(() => {
                          const valueAnalysis = getPackValueAnalysis();
                          return valueAnalysis.discountPercent > 10 ? 
                            ' This looks like a great deal!' :
                            valueAnalysis.discountPercent > 0 ?
                            ' This appears to be a decent value.' :
                            ' Consider if these items align with your current needs.';
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                {result.similar_packs.length > 0 && (
                  <div className="glass-effect rounded-2xl p-8">
                    <h4 className="text-xl font-bold text-secondary-900 mb-6">Similar Value Packs</h4>
                    <div className="space-y-4">
                      {result.similar_packs.map((pack, index) => (
                        <motion.div 
                          key={index} 
                          className="card p-6 flex justify-between items-center floating-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div>
                            <p className="font-semibold text-secondary-900 text-lg">{pack.name}</p>
                            <p className="text-lg font-bold text-primary-600">${pack.price}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-secondary-600">Cost per Energy</p>
                            <p className="font-bold text-xl text-accent-600">${pack.cost_per_energy.toFixed(5)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
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
