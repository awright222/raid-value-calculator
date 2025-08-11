import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById } from '../types/itemTypes';
import { useAnalytics } from '../services/analytics';
import RateLimitInfo from './RateLimitInfo';
import ItemAutocomplete from './ItemAutocomplete';

interface PackSubmissionProps {
  onSubmissionComplete?: (success: boolean, message: string) => void;
}

interface PackFormData {
  name: string;
  price: number;
  items: Array<{
    itemTypeId: string;
    quantity: number;
  }>;
}

export function PackSubmission({ onSubmissionComplete }: PackSubmissionProps) {
  const [formData, setFormData] = useState<PackFormData>({
    name: '',
    price: 0,
    items: []
  });
  
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [useAutocomplete, setUseAutocomplete] = useState(true); // Default to autocomplete
  const analytics = useAnalytics();

  // Calculate totals from items
  const energyPots = formData.items.find(item => item.itemTypeId === 'energy_pot')?.quantity || 0;
  const rawEnergy = formData.items.find(item => item.itemTypeId === 'raw_energy')?.quantity || 0;
  const totalEnergy = energyPots * 130 + rawEnergy;
  const costPerEnergy = totalEnergy > 0 ? formData.price / totalEnergy : 0;

  const handleInputChange = (field: keyof PackFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitMessage(null); // Clear any previous messages
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { itemTypeId: '', quantity: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: 'itemTypeId' | 'quantity', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show immediate feedback
    setSubmitMessage({ type: 'success', text: 'Submitting pack...' });
    
    if (!formData.name.trim()) {
      setSubmitMessage({ type: 'error', text: 'Pack name is required' });
      return;
    }

    if (formData.price <= 0) {
      setSubmitMessage({ type: 'error', text: 'Pack price must be greater than 0' });
      return;
    }

    if (formData.items.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Pack must contain at least one item' });
      return;
    }

    // Validate items
    const invalidItems = formData.items.filter(item => !item.itemTypeId || item.quantity <= 0);
    if (invalidItems.length > 0) {
      setSubmitMessage({ type: 'error', text: 'All items must have a type and positive quantity' });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage({ type: 'success', text: 'Submitting pack...' });
      
      // Use proper submission function that handles validation and signatures
      const { submitPendingPack } = await import('../firebase/pendingPacks');
      
      const userId = submitterEmail || `user_${Date.now()}`;
      
      const packData = {
        name: formData.name.trim(),
        price: formData.price,
        energy_pots: energyPots,
        raw_energy: rawEnergy,
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        items: formData.items.filter(item => item.itemTypeId && item.quantity > 0),
        submitter_id: userId,
        submitter_email: submitterEmail || ''
      };
      
      const result = await submitPendingPack(packData, userId, submitterEmail || '');
      
      // Track pack submission analytics
      analytics.trackConversion('pack_submit', {
        packName: formData.name.trim(),
        priceRange: formData.price < 5 ? '$0-5' : 
                   formData.price < 10 ? '$5-10' :
                   formData.price < 25 ? '$10-25' :
                   formData.price < 50 ? '$25-50' :
                   formData.price < 100 ? '$50-100' : '$100+',
        energyRange: totalEnergy < 500 ? '0-500' :
                    totalEnergy < 1000 ? '500-1K' :
                    totalEnergy < 2500 ? '1K-2.5K' :
                    totalEnergy < 5000 ? '2.5K-5K' : '5K+',
        itemCount: formData.items.length,
        hasEnergyPots: energyPots > 0,
        hasRawEnergy: rawEnergy > 0,
        costPerEnergy: costPerEnergy,
        submissionResult: result.success ? 'success' : 'failed'
      });
      
      if (result.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `✅ ${result.message}` 
        });
        
        // Reset form
        setFormData({
          name: '',
          price: 0,
          items: []
        });
        setSubmitterEmail('');
        
        onSubmissionComplete?.(true, result.message);
      } else {
        setSubmitMessage({ 
          type: result.duplicateFound ? 'warning' : 'error',
          text: result.message 
        });
        onSubmissionComplete?.(false, result.message);
      }

    } catch (error) {
      let errorMessage = 'Failed to submit pack. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Failed to submit pack: ${error.message}`;
        
        // Check for specific Firebase errors
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. Please check your connection and try again.';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('invalid-argument')) {
          errorMessage = 'Invalid pack data. Please check all fields and try again.';
        }
      }
      
      setSubmitMessage({ 
        type: 'error', 
        text: errorMessage
      });
      
      onSubmissionComplete?.(false, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Submit a Pack
          </h2>
          <RateLimitInfo />
        </div>
        <p className="text-secondary-600">
          Help the community by submitting pack data. Packs need 3 confirmations to be approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Submitter Email */}
        <div>
          <label htmlFor="submitter-email" className="block text-sm font-medium text-secondary-700 mb-2">
            Your Email (Optional)
          </label>
          <input
            id="submitter-email"
            name="submitter-email"
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-secondary-500 mt-1">
            Optional: Used for duplicate detection and community reputation
          </p>
        </div>

        {/* Pack Name */}
        <div>
          <label htmlFor="pack-name" className="block text-sm font-medium text-secondary-700 mb-2">
            Pack Name *
          </label>
          <input
            id="pack-name"
            name="pack-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="e.g., Energy Mega Pack, Starter Bundle"
            required
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="pack-price" className="block text-sm font-medium text-secondary-700 mb-2">
            Price (USD) *
          </label>
          <input
            id="pack-price"
            name="pack-price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price || ''}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="9.99"
            required
          />
        </div>

        {/* Pack Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label id="pack-items-label" className="block text-sm font-medium text-secondary-700">
              Pack Items
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
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                aria-describedby="pack-items-label"
              >
                + Add Item
              </button>
            </div>
          </div>

          {formData.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 bg-gray-50 rounded-xl"
            >
              <div>
                <label htmlFor={`item-type-${index}`} className="sr-only">
                  Item Type
                </label>
                {useAutocomplete ? (
                  <ItemAutocomplete
                    value={item.itemTypeId}
                    onChange={(itemId) => handleItemChange(index, 'itemTypeId', itemId)}
                    placeholder="Search for item type..."
                    className="w-full"
                  />
                ) : (
                  <select
                    id={`item-type-${index}`}
                    name={`item-type-${index}`}
                    value={item.itemTypeId}
                    onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                  >
                    <option value="">Select item type</option>
                    {Object.entries(ITEM_CATEGORIES).map(([categoryKey, categoryName]) => (
                      <optgroup key={categoryKey} label={categoryName}>
                        {getItemTypesByCategory(categoryName).map(itemType => (
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
                <label htmlFor={`item-quantity-${index}`} className="sr-only">
                  Quantity
                </label>
                <input
                  id={`item-quantity-${index}`}
                  name={`item-quantity-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity || ''}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Quantity"
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                aria-label={`Remove item ${index + 1}`}
              >
                Remove
              </button>
            </motion.div>
          ))}
        </div>

        {/* Pack Summary */}
        {(formData.price > 0 || formData.items.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
          >
            <h3 className="text-lg font-semibold text-secondary-700 mb-3">Pack Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-secondary-500">Pack Cost:</span>
                <div className="font-semibold text-secondary-700">
                  ${(formData.price && isFinite(formData.price)) ? formData.price.toFixed(2) : '0.00'}
                </div>
              </div>
              {energyPots > 0 && (
                <div>
                  <span className="text-secondary-500">Energy Pots:</span>
                  <div className="font-semibold text-secondary-700">{energyPots}</div>
                </div>
              )}
              {rawEnergy > 0 && (
                <div>
                  <span className="text-secondary-500">Raw Energy:</span>
                  <div className="font-semibold text-secondary-700">{rawEnergy.toLocaleString()}</div>
                </div>
              )}
            </div>
            {formData.items.length > 0 && (
              <div className="mt-3">
                <span className="text-secondary-500">Pack Items:</span>
                <div className="mt-1">
                  {formData.items.map((item, index) => {
                    const itemType = getItemTypeById(item.itemTypeId);
                    return (
                      <span key={index} className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1 text-xs">
                        {itemType?.name || item.itemTypeId}: {item.quantity}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Submit Message */}
        {submitMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${
              submitMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              submitMessage.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {submitMessage.text}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            'Submit Pack for Review'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default PackSubmission;
