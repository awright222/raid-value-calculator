import { useState } from 'react';
import { motion } from 'framer-motion';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById, calculatePackValue, type PackItem } from '../types/itemTypes';
import { addPack } from '../firebase/database';

interface AdminPanelProps {
  onPackAdded: () => void;
  // Remove authToken since Firebase handles auth differently
}

export default function AdminPanel({ onPackAdded }: AdminPanelProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      setError('Name and price are required');
      return;
    }

    if (packItems.length === 0) {
      setError('At least one item is required');
      return;
    }

    // Validate all items have valid types and quantities
    const validItems = packItems.filter(item => item.itemTypeId && item.quantity > 0);
    if (validItems.length === 0) {
      setError('At least one item with valid type and quantity > 0 is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Calculate energy values for backward compatibility
      const energyPots = packItems
        .filter(item => item.itemTypeId === 'energy_pot')
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const rawEnergy = packItems
        .filter(item => item.itemTypeId === 'raw_energy')
        .reduce((sum, item) => sum + item.quantity, 0);

      const totalEnergy = (energyPots * 130) + rawEnergy;
      const costPerEnergy = totalEnergy > 0 ? parseFloat(formData.price) / totalEnergy : 0;

      // Add pack to Firebase
      await addPack({
        name: formData.name,
        price: parseFloat(formData.price),
        energy_pots: energyPots,
        raw_energy: rawEnergy,
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        items: packItems.filter(item => item.itemTypeId && item.quantity > 0)
      });

      setSuccess('Pack added successfully!');
      setFormData({ name: '', price: '' });
      setPackItems([]);
      onPackAdded();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const calculatePreview = () => {
    const valueAnalysis = calculatePackValue(packItems);
    const price = parseFloat(formData.price) || 0;
    
    return {
      totalEnergyEquivalent: valueAnalysis.totalEnergyEquivalent,
      totalMarketValue: valueAnalysis.totalMarketValue,
      valueVsMarket: price > 0 ? valueAnalysis.totalMarketValue / price : 0,
      discountPercent: price > 0 ? ((valueAnalysis.totalMarketValue - price) / valueAnalysis.totalMarketValue) * 100 : 0
    };
  };

  const preview = calculatePreview();

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Pack</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pack Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleInputChange('name')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="e.g., Premium Energy Bundle"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange('price')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="9.99"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Pack Contents *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  + Add Item
                </button>
              </div>

              {packItems.length === 0 && (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <p>No items added yet. Click "Add Item" to start building your pack.</p>
                </div>
              )}

              <div className="space-y-3">
                {packItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Item Type
                        </label>
                        <select
                          value={item.itemTypeId}
                          onChange={(e) => updateItem(index, 'itemTypeId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
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
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 flex-1 mr-2">
                          {item.itemTypeId && getItemTypeById(item.itemTypeId)?.description}
                        </div>
                        <button
                          type="button"
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
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
              >
                {success}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Pack...' : 'Add Pack'}
            </button>
          </form>

          {/* Preview */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              
              {formData.name && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900">{formData.name}</h4>
                  {formData.price && (
                    <p className="text-lg font-bold text-primary-600">${formData.price}</p>
                  )}
                </div>
              )}

              {packItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
                  <div className="space-y-2">
                    {packItems.map((item, index) => {
                      const itemType = getItemTypeById(item.itemTypeId);
                      return itemType && item.quantity > 0 ? (
                        <div key={index} className="bg-white rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900">{item.quantity}x {itemType.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({itemType.category})</span>
                          </div>
                          {itemType.marketValue && (
                            <span className="text-sm font-medium text-gray-700">
                              ${(item.quantity * itemType.marketValue).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Market Value</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${preview.totalMarketValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Value Ratio</p>
                  <p className={`text-xl font-bold ${
                    preview.valueVsMarket > 1.2 ? 'text-green-600' :
                    preview.valueVsMarket > 1.0 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {preview.valueVsMarket > 0 ? `${preview.valueVsMarket.toFixed(2)}x` : '--'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Energy Equivalent</p>
                  <p className="text-xl font-bold text-gray-900">
                    {preview.totalEnergyEquivalent.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Discount</p>
                  <p className={`text-xl font-bold ${
                    preview.discountPercent > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {preview.discountPercent !== 0 ? 
                      `${preview.discountPercent > 0 ? '+' : ''}${preview.discountPercent.toFixed(1)}%` : '--'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Admin Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Add packs that are currently available in the game store</li>
                <li>• Double-check energy pot and raw energy values</li>
                <li>• Use descriptive names for easy identification</li>
                <li>• Added packs will be used as reference for grading new packs</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
