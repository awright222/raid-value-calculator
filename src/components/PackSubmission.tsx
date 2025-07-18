import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { submitPendingPack } from '../firebase/pendingPacks';

interface PackSubmissionProps {
  onSubmissionComplete?: (success: boolean, message: string) => void;
}

interface PackFormData {
  name: string;
  price: number;
  energyPots: number;
  rawEnergy: number;
  items: Array<{
    itemTypeId: string;
    quantity: number;
  }>;
}

const ITEM_TYPES = [
  { id: 'silver', name: 'Silver' },
  { id: 'xp_brew', name: 'XP Brew' },
  { id: 'mystery_shard', name: 'Mystery Shard' },
  { id: 'ancient_shard', name: 'Ancient Shard' },
  { id: 'void_shard', name: 'Void Shard' },
  { id: 'sacred_shard', name: 'Sacred Shard' },
  { id: 'chicken', name: 'Chicken (Food)' },
  { id: 'gem', name: 'Gems' },
  { id: 'potion', name: 'Ascension Potion' },
  { id: 'book', name: 'Skill Book' }
];

export function PackSubmission({ onSubmissionComplete }: PackSubmissionProps) {
  const [formData, setFormData] = useState<PackFormData>({
    name: '',
    price: 0,
    energyPots: 0,
    rawEnergy: 0,
    items: []
  });
  
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Calculate totals
  const totalEnergy = formData.energyPots * 130 + formData.rawEnergy;
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
    
    if (!formData.name.trim()) {
      setSubmitMessage({ type: 'error', text: 'Pack name is required' });
      return;
    }

    if (formData.price <= 0) {
      setSubmitMessage({ type: 'error', text: 'Pack price must be greater than 0' });
      return;
    }

    if (totalEnergy === 0 && formData.items.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Pack must contain at least some energy or items' });
      return;
    }

    // Validate items
    const invalidItems = formData.items.filter(item => !item.itemTypeId || item.quantity <= 0);
    if (invalidItems.length > 0) {
      setSubmitMessage({ type: 'error', text: 'All items must have a type and positive quantity' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a simple user ID (in a real app, this would come from auth)
      const userId = submitterEmail || `user_${Date.now()}`;

      const packData = {
        name: formData.name.trim(),
        price: formData.price,
        energy_pots: formData.energyPots,
        raw_energy: formData.rawEnergy,
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        items: formData.items.length > 0 ? formData.items : undefined,
        submitter_id: userId
      };

      const result = await submitPendingPack(packData, userId, submitterEmail || undefined);

      if (result.success) {
        setSubmitMessage({ 
          type: result.duplicateFound ? 'warning' : 'success', 
          text: result.message 
        });
        
        if (!result.duplicateFound) {
          // Reset form on successful new submission
          setFormData({
            name: '',
            price: 0,
            energyPots: 0,
            rawEnergy: 0,
            items: []
          });
        }
      } else {
        setSubmitMessage({ type: 'error', text: result.message });
      }

      onSubmissionComplete?.(result.success, result.message);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitMessage({ type: 'error', text: 'Failed to submit pack. Please try again.' });
      onSubmissionComplete?.(false, 'Failed to submit pack');
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
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
          Submit a Pack
        </h2>
        <p className="text-secondary-600">
          Help the community by submitting pack data. Packs need 3 confirmations to be approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Submitter Email */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Your Email (Optional)
          </label>
          <input
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
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Pack Name *
          </label>
          <input
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
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Price (USD) *
          </label>
          <input
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

        {/* Energy Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Energy Pots
            </label>
            <input
              type="number"
              min="0"
              value={formData.energyPots || ''}
              onChange={(e) => handleInputChange('energyPots', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="0"
            />
            <p className="text-xs text-secondary-500 mt-1">Each pot = 130 energy</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Raw Energy
            </label>
            <input
              type="number"
              min="0"
              value={formData.rawEnergy || ''}
              onChange={(e) => handleInputChange('rawEnergy', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="0"
            />
          </div>
        </div>

        {/* Additional Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-secondary-700">
              Additional Items
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              + Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 bg-gray-50 rounded-xl"
            >
              <select
                value={item.itemTypeId}
                onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select item type</option>
                {ITEM_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={item.quantity || ''}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                placeholder="Quantity"
                className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />

              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </div>

        {/* Pack Summary */}
        {(totalEnergy > 0 || formData.items.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
          >
            <h3 className="text-lg font-semibold text-secondary-700 mb-3">Pack Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-secondary-500">Total Energy:</span>
                <div className="font-semibold text-secondary-700">{totalEnergy.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-secondary-500">Cost per Energy:</span>
                <div className="font-semibold text-secondary-700">
                  ${costPerEnergy.toFixed(4)}
                </div>
              </div>
              <div>
                <span className="text-secondary-500">Energy Pots:</span>
                <div className="font-semibold text-secondary-700">{formData.energyPots}</div>
              </div>
              <div>
                <span className="text-secondary-500">Raw Energy:</span>
                <div className="font-semibold text-secondary-700">{formData.rawEnergy}</div>
              </div>
            </div>
            {formData.items.length > 0 && (
              <div className="mt-3">
                <span className="text-secondary-500">Additional Items:</span>
                <div className="mt-1">
                  {formData.items.map((item, index) => (
                    <span key={index} className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1 text-xs">
                      {ITEM_TYPES.find(t => t.id === item.itemTypeId)?.name || item.itemTypeId}: {item.quantity}
                    </span>
                  ))}
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
