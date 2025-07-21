import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ITEM_CATEGORIES, getItemTypesByCategory, getItemTypeById, type PackItem } from '../types/itemTypes';
import { addPack } from '../firebase/database';
import { getPendingPacks, approvePendingPack, deletePendingPack, cleanupExpiredPacks } from '../firebase/pendingPacks';
import { testFirebaseConnection } from '../firebase/connectionTest';
import { PackIntelligence } from './PackIntelligence';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import type { PendingPack } from '../utils/duplicateDetection';

interface AdminPanelProps {
  onPackAdded: () => void;
}

function AdminPanel({ onPackAdded }: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'single' | 'bulk' | 'moderate' | 'maintenance' | 'intelligence' | 'analytics'>('moderate');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Single pack form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(0); // Force form re-render

  // Bulk import state
  const [bulkData, setBulkData] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);

  // Moderation state
  const [pendingPacks, setPendingPacks] = useState<PendingPack[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);

  // Maintenance state
  const [maintenanceStats, setMaintenanceStats] = useState({
    expiredCleaned: 0,
    lastCleanup: null as Date | null
  });
  const [connectionTest, setConnectionTest] = useState<{
    testing: boolean;
    result: any;
  }>({
    testing: false,
    result: null
  });

  const adminTabs = [
    { id: 'moderate', label: 'Moderate', icon: '🛡️', description: 'Review pending submissions' },
    { id: 'analytics', label: 'Analytics', icon: '📈', description: 'User engagement & traffic stats' },
    { id: 'intelligence', label: 'Pack Intelligence', icon: '📊', description: 'Market analysis & pack evolution' },
    { id: 'single', label: 'Quick Add', icon: '➕', description: 'Add single pack' },
    { id: 'bulk', label: 'Bulk Import', icon: '📁', description: 'Import multiple packs' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧', description: 'System cleanup' }
  ] as const;

  // Load pending packs for moderation
  useEffect(() => {
    if (activeAdminTab === 'moderate') {
      loadPendingPacks();
    }
  }, [activeAdminTab]);

  const loadPendingPacks = async () => {
    setModerationLoading(true);
    try {
      const packs = await getPendingPacks();
      setPendingPacks(packs);
    } catch (error) {
      setError('Failed to load pending packs');
    } finally {
      setModerationLoading(false);
    }
  };

  // Single pack functions
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

  const handleSinglePackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      setError('Name and price are required');
      return;
    }

    if (packItems.length === 0) {
      setError('At least one item is required');
      return;
    }

    const validItems = packItems.filter(item => item.itemTypeId && item.quantity > 0);
    if (validItems.length === 0) {
      setError('At least one item must have a valid type and quantity > 0');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setValidationWarnings([]);

    try {
      // Calculate energy from items
      let energyPots = 0;
      let rawEnergy = 0;
      
      validItems.forEach(item => {
        const itemType = getItemTypeById(item.itemTypeId);
        if (itemType?.id === 'energy_pot') {
          energyPots += item.quantity;
        } else if (itemType?.id === 'raw_energy') {
          rawEnergy += item.quantity;
        }
      });
      
      const totalEnergy = energyPots * 130 + rawEnergy;
      const costPerEnergy = totalEnergy > 0 ? parseFloat(formData.price) / totalEnergy : 0;
      
      // Use direct addPack function to avoid validation overhead in admin quick add
      await addPack({
        name: formData.name,
        price: parseFloat(formData.price),
        energy_pots: energyPots,
        raw_energy: rawEnergy,
        total_energy: totalEnergy,
        cost_per_energy: costPerEnergy,
        items: validItems.map(item => ({
          itemTypeId: item.itemTypeId,
          quantity: item.quantity,
        })),
      });

      setSuccess(`Pack "${formData.name}" added successfully!`);
      setValidationWarnings([]); // Clear any previous warnings
      
      // Reset form on success
      setFormData({ name: '', price: '' });
      setPackItems([]);
      setFormKey(prev => prev + 1); // Force form re-render
      onPackAdded();
      
    } catch (error: any) {
      let errorMessage = 'Failed to add pack. Please try again.';
      
      if (error?.code) {
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'Permission denied. Check Firestore security rules for packs collection.';
            break;
          case 'unavailable':
            errorMessage = 'Service temporarily unavailable. Try again in a moment.';
            break;
          case 'invalid-argument':
            errorMessage = 'Invalid pack data. Check all fields.';
            break;
          case 'unauthenticated':
            errorMessage = 'Authentication required. Refresh the page.';
            break;
          default:
            errorMessage = `Database error: ${error.code} - ${error.message}`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(`Failed to add pack: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Bulk import functions
  const handleBulkPreview = () => {
    try {
      const lines = bulkData.trim().split('\n');
      const preview = lines.map((line, index) => {
        const [name, price, ...itemData] = line.split(',').map(s => s.trim());
        const items = [];
        
        for (let i = 0; i < itemData.length; i += 2) {
          if (itemData[i] && itemData[i + 1]) {
            items.push({
              itemTypeId: itemData[i],
              quantity: parseInt(itemData[i + 1]) || 0
            });
          }
        }

        return {
          line: index + 1,
          name,
          price: parseFloat(price) || 0,
          items,
          isValid: name && price && items.length > 0
        };
      });

      setBulkPreview(preview);
    } catch (error) {
      setError('Invalid CSV format');
    }
  };

  const handleBulkImport = async () => {
    if (bulkPreview.length === 0) {
      setError('Please preview data first');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const pack of bulkPreview) {
      if (!pack.isValid) {
        errorCount++;
        continue;
      }

      try {
        // Calculate energy from items
        let energyPots = 0;
        let rawEnergy = 0;
        
        pack.items.forEach((item: any) => {
          const itemType = getItemTypeById(item.itemTypeId);
          if (itemType?.id === 'energy_pot') {
            energyPots += item.quantity;
          } else if (itemType?.id === 'raw_energy') {
            rawEnergy += item.quantity;
          }
        });
        
        const totalEnergy = energyPots * 130 + rawEnergy;
        const costPerEnergy = totalEnergy > 0 ? pack.price / totalEnergy : 0;
        
        await addPack({
          name: pack.name,
          price: pack.price,
          energy_pots: energyPots,
          raw_energy: rawEnergy,
          total_energy: totalEnergy,
          cost_per_energy: costPerEnergy,
          items: pack.items,
        });

        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setLoading(false);
    setSuccess(`Import complete: ${successCount} successful, ${errorCount} failed`);
    setBulkData('');
    setBulkPreview([]);
    onPackAdded();
  };

  // Moderation functions
  const handleApprovePack = async (packId: string) => {
    try {
      const success = await approvePendingPack(packId);
      if (success) {
        setSuccess('Pack approved successfully!');
        await loadPendingPacks();
        onPackAdded();
      } else {
        setError('Failed to approve pack');
      }
    } catch (error) {
      setError('Failed to approve pack');
    }
  };

  const handleDeletePack = async (packId: string, packName: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the pack "${packName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await deletePendingPack(packId);
      if (success) {
        setSuccess('Pack deleted successfully!');
        await loadPendingPacks();
      } else {
        setError('Failed to delete pack');
      }
    } catch (error) {
      setError('Failed to delete pack');
    }
  };

  // Maintenance functions
  const handleCleanupExpired = async () => {
    setLoading(true);
    try {
      const cleanedCount = await cleanupExpiredPacks();
      setMaintenanceStats({
        expiredCleaned: cleanedCount,
        lastCleanup: new Date()
      });
      setSuccess(`Cleaned up ${cleanedCount} expired packs`);
    } catch (error) {
      setError('Failed to cleanup expired packs');
    } finally {
      setLoading(false);
    }
  };

  // Firebase connection test
  const handleConnectionTest = async () => {
    setConnectionTest({ testing: true, result: null });
    setError('');
    setSuccess('');
    
    try {
      const result = await testFirebaseConnection();
      setConnectionTest({ testing: false, result });
      
      if (result.success) {
        setSuccess(`✅ ${result.message} (${result.packsCount} packs found)`);
      } else {
        setError(`❌ Connection failed: ${result.message} (Code: ${result.code})`);
      }
    } catch (error) {
      setConnectionTest({ testing: false, result: { success: false, error } });
      setError(`❌ Connection test error: ${error}`);
    }
  };

  // Helper function to calculate value grade
  const getValueGrade = (costPerEnergy: number): { grade: string; color: string } => {
    if (costPerEnergy <= 0.005) return { grade: 'S+', color: 'bg-purple-500 text-white' };
    if (costPerEnergy <= 0.007) return { grade: 'S', color: 'bg-blue-500 text-white' };
    if (costPerEnergy <= 0.009) return { grade: 'A', color: 'bg-green-500 text-white' };
    if (costPerEnergy <= 0.012) return { grade: 'B', color: 'bg-yellow-500 text-white' };
    if (costPerEnergy <= 0.015) return { grade: 'C', color: 'bg-orange-500 text-white' };
    return { grade: 'D', color: 'bg-red-500 text-white' };
  };

  return (
    <div className="space-y-6">
      {/* Global Messages */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl ${
              success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{success || error}</span>
              <button
                onClick={() => { setSuccess(''); setError(''); }}
                className="text-current opacity-70 hover:opacity-100 ml-4"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-blue-50 text-blue-800 border border-blue-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold mb-2">ℹ️ Automatic Pack Versioning</h4>
                <ul className="text-sm space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs font-medium">
                    🎯 <strong>No action needed!</strong> The pack has been saved with the exact name you entered. 
                    Our system automatically handles duplicate pack names behind the scenes while keeping 
                    your data clean and accurate.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setValidationWarnings([]); }}
                className="text-current opacity-70 hover:opacity-100 ml-4"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Tab Navigation */}
      <div className="flex justify-center">
        <div className="glass-effect rounded-2xl p-2 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id)}
                className={`relative px-4 py-3 rounded-xl font-medium transition-all duration-300 text-center ${
                  activeAdminTab === tab.id
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-secondary-600 hover:bg-white/50 hover:text-primary-600'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg">{tab.icon}</span>
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
                {activeAdminTab === tab.id && (
                  <motion.div
                    layoutId="activeAdminTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl -z-10"
                    initial={false}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeAdminTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Moderation Tab */}
        {activeAdminTab === 'moderate' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Community Moderation
              </h2>
              <p className="text-secondary-600">
                Review and approve pending pack submissions
              </p>
            </div>

            {moderationLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-secondary-600">Loading pending packs...</p>
              </div>
            ) : pendingPacks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-secondary-700 mb-2">All caught up!</h3>
                <p className="text-secondary-600">No pending packs require moderation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPacks.map((pack) => {
                  const valueGrade = getValueGrade(pack.cost_per_energy);
                  
                  return (
                    <div key={pack.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {/* Pack Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-bold text-secondary-800 dark:text-gray-200">{pack.name}</h3>
                            <span className="text-2xl font-bold text-green-600">${pack.price}</span>
                            {/* Value Grade Badge */}
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${valueGrade.color}`}>
                              {valueGrade.grade}
                            </span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {pack.confirmation_count}/3 confirmations
                          </span>
                        </div>

                        {/* Pack Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-500 dark:text-gray-400">Pack Cost:</span>
                              <div className="font-bold text-lg text-green-700 dark:text-green-300">
                                ${pack.price ? pack.price.toFixed(2) : '0.00'}
                              </div>
                            </div>
                            {pack.energy_pots > 0 && (
                              <div>
                                <span className="text-secondary-500 dark:text-gray-400">Energy Pots:</span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{pack.energy_pots}</div>
                              </div>
                            )}
                            {pack.raw_energy > 0 && (
                              <div>
                                <span className="text-secondary-500 dark:text-gray-400">Raw Energy:</span>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{pack.raw_energy.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pack Items */}
                        {pack.items && pack.items.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-secondary-700 dark:text-gray-300 mb-2">📦 Pack Contents:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {pack.items.map((item, index) => {
                                const itemName = item.itemTypeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                  <div key={index} className="flex justify-between items-center bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{itemName}</span>
                                    <span className="font-bold text-primary-600 dark:text-primary-400">×{item.quantity}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Submission Info */}
                        <div className="flex items-center gap-4 text-xs text-secondary-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-3">
                          <span>📅 Submitted: {pack.submitted_at.toLocaleDateString()}</span>
                          <span>👤 Submitter: {pack.submitter_email || `${pack.submitter_id.substring(0, 8)}...`}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprovePack(pack.id!)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve Now
                        </button>
                        <button
                          onClick={() => handleDeletePack(pack.id!, pack.name)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={loadPendingPacks}
                className="px-6 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Single Pack Tab */}
        {activeAdminTab === 'single' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Quick Add Pack
              </h2>
              <p className="text-secondary-600">
                Instantly add a pack without community confirmation
              </p>
            </div>

            <form onSubmit={handleSinglePackSubmit} className="space-y-6" key={formKey}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Pack Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="e.g., Energy Mega Pack"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="9.99"
                    required
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-secondary-700">
                    Pack Items *
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    + Add Item
                  </button>
                </div>

                {packItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 p-4 bg-gray-50 rounded-xl"
                  >
                    <select
                      value={item.itemTypeId}
                      onChange={(e) => updateItem(index, 'itemTypeId', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Quantity"
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />

                    <div className="text-sm text-secondary-600 flex items-center">
                      {item.itemTypeId && getItemTypeById(item.itemTypeId)?.baseValue && (
                        <span>
                          {item.quantity * (getItemTypeById(item.itemTypeId)?.baseValue || 0)} energy
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </motion.div>
                ))}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? 'Adding Pack...' : 'Add Pack Instantly'}
              </motion.button>
            </form>
          </div>
        )}

        {/* Bulk Import Tab */}
        {activeAdminTab === 'bulk' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Bulk Import
              </h2>
              <p className="text-secondary-600">
                Import multiple packs from CSV data
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  CSV Data
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="Pack Name, Price, ItemType1, Quantity1, ItemType2, Quantity2, ...&#10;Energy Pack, 9.99, energy_pot, 5, raw_energy, 100&#10;Starter Bundle, 4.99, silver, 100000, mystery_shard, 3"
                  className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-mono text-sm"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Format: Pack Name, Price, ItemType1, Quantity1, ItemType2, Quantity2, ...
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleBulkPreview}
                  className="px-6 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
                >
                  Preview
                </button>
                {bulkPreview.length > 0 && (
                  <button
                    onClick={handleBulkImport}
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      loading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {loading ? 'Importing...' : 'Import All'}
                  </button>
                )}
              </div>

              {bulkPreview.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Preview ({bulkPreview.length} packs)</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkPreview.map((pack, index) => (
                      <div key={index} className={`p-3 rounded-lg ${pack.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{pack.name || 'Invalid Name'}</span>
                          <span className={pack.isValid ? 'text-green-600' : 'text-red-600'}>
                            ${pack.price || 0} - {pack.items?.length || 0} items
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeAdminTab === 'analytics' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h2>
              <p className="text-secondary-600">
                Privacy-compliant user engagement and traffic statistics
              </p>
            </div>
            
            <AnalyticsDashboard />
          </div>
        )}

        {/* Pack Intelligence Tab */}
        {activeAdminTab === 'intelligence' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Pack Market Intelligence
              </h2>
              <p className="text-secondary-600">
                Analyze pack evolution, market trends, and competitive positioning
              </p>
            </div>
            
            <PackIntelligence />
          </div>
        )}

        {/* Maintenance Tab */}
        {activeAdminTab === 'maintenance' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                System Maintenance
              </h2>
              <p className="text-secondary-600">
                Database cleanup and system operations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cleanup Operations */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🧹</span>
                  Database Cleanup
                </h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handleCleanupExpired}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      loading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {loading ? 'Cleaning...' : 'Clean Expired Packs'}
                  </button>

                  {maintenanceStats.lastCleanup && (
                    <div className="text-sm text-secondary-600">
                      <p>Last cleanup: {maintenanceStats.lastCleanup.toLocaleString()}</p>
                      <p>Expired packs removed: {maintenanceStats.expiredCleaned}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Firebase Connection Test */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🔥</span>
                  Firebase Connection
                </h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handleConnectionTest}
                    disabled={connectionTest.testing}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      connectionTest.testing
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {connectionTest.testing ? 'Testing...' : 'Test Firebase Connection'}
                  </button>

                  {connectionTest.result && (
                    <div className={`text-sm p-3 rounded-lg ${
                      connectionTest.result.success 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <p className="font-medium">
                        {connectionTest.result.success ? '✅ Connected' : '❌ Failed'}
                      </p>
                      <p className="text-xs mt-1">{connectionTest.result.message}</p>
                      {connectionTest.result.code && (
                        <p className="text-xs mt-1">Code: {connectionTest.result.code}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* System Stats */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  System Statistics
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Pending Packs:</span>
                    <span className="font-semibold">{pendingPacks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Last Data Refresh:</span>
                    <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AdminPanel;
