import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCcw } from 'react-icons/fi';
import { ITEM_CATEGORIES, getItemTypes, getItemTypeById, type PackItem, type ItemType } from '../types/itemTypes';
import { addPack } from '../firebase/database';
import { getPendingPacks, approvePendingPack, deletePendingPack, cleanupExpiredPacks } from '../firebase/pendingPacks';
import { getContactInquiries, updateInquiryStatus, deleteInquiry, getInquiryStats, type ContactInquiry } from '../firebase/contact';
import { updateMultipleItemTypeUtilityScores, checkItemTypesExistInFirebase, initializeItemTypesInFirebase } from '../firebase/itemTypes';
import { testFirebaseConnection } from '../firebase/connectionTest';
import { createFirebaseDebugger } from '../utils/firebaseDebugger';
import { diagnosePricingServiceIssue } from '../utils/itemValuesDiagnostic';
import { PackIntelligence } from './PackIntelligence';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { MarketTrackingPanel } from './MarketTrackingPanel';
import VideoAnalytics from './VideoAnalytics';
import ItemAutocomplete from './ItemAutocomplete';
import type { PendingPack } from '../utils/duplicateDetection';

interface AdminPanelProps {
  onPackAdded: () => void;
}

function AdminPanel({ onPackAdded }: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'single' | 'bulk' | 'moderate' | 'maintenance' | 'intelligence' | 'analytics' | 'tracking' | 'video' | 'debug' | 'utility' | 'contact'>('moderate');
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

  // Contact inquiries state
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactStats, setContactStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recentCount: number;
  }>({ total: 0, byStatus: {}, byType: {}, recentCount: 0 });
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved' | 'closed'>('all');

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

  // Debug state
  const [debugResults, setDebugResults] = useState<any>(null);
  const [debugRunning, setDebugRunning] = useState(false);
  const [itemValuesDebugResults, setItemValuesDebugResults] = useState<any>(null);
  const [itemValuesDebugRunning, setItemValuesDebugRunning] = useState(false);

  // Utility management state
  const [utilityEdits, setUtilityEdits] = useState<{[itemId: string]: number}>({});
  const [utilitySaving, setUtilitySaving] = useState(false);
  const [adminItemTypes, setAdminItemTypes] = useState<ItemType[]>([]);
  const [adminItemTypesLoading, setAdminItemTypesLoading] = useState(false);

  // Load item types from Firebase for admin panel
  const loadAdminItemTypes = async () => {
    setAdminItemTypesLoading(true);
    try {
      const types = await getItemTypes();
      setAdminItemTypes(types);
    } catch (error) {
      console.error('Failed to load admin item types:', error);
    } finally {
      setAdminItemTypesLoading(false);
    }
  };

  // Filter item types by category (Firebase-aware)
  const getAdminItemTypesByCategory = (category: string): ItemType[] => {
    return adminItemTypes.filter(item => item.category === category);
  };

  // Track user activity to pause notifications during active work
  const [lastUserActivity, setLastUserActivity] = useState<Date>(new Date());

  // Update last activity timestamp when user interacts with the page
  useEffect(() => {
    const updateActivity = () => setLastUserActivity(new Date());
    
    // Listen for user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Get count of new contact inquiries
  const getNewInquiryCount = (): number => {
    return contactInquiries.filter(inquiry => inquiry.status === 'new').length;
  };

  // Load admin item types when utility tab is accessed
  useEffect(() => {
    if (activeAdminTab === 'utility') {
      loadAdminItemTypes();
    }
  }, [activeAdminTab]);

  const adminTabs = [
    { id: 'moderate', label: 'Moderate', icon: '🛡️', description: 'Review pending submissions' },
    { id: 'debug', label: 'Debug', icon: '🔧', description: 'Firebase diagnostics' },
    { id: 'analytics', label: 'Analytics', icon: '📈', description: 'User engagement & traffic stats' },
    { id: 'video', label: 'Video Analytics', icon: '🎬', description: 'Demo video views & engagement' },
    { id: 'tracking', label: 'Price Tracking', icon: '📊', description: 'Long-term market analysis' },
    { id: 'intelligence', label: 'Pack Intelligence', icon: '🧠', description: 'Market analysis & pack evolution' },
    { id: 'utility', label: 'Item Values', icon: '⚖️', description: 'Manage item utility scores' },
    { id: 'contact', label: 'Contact Inquiries', icon: '📧', description: 'Manage user feedback & bug reports' },
    { id: 'single', label: 'Quick Add', icon: '➕', description: 'Add single pack' },
    { id: 'bulk', label: 'Bulk Import', icon: '📁', description: 'Import multiple packs' },
    { id: 'maintenance', label: 'Maintenance', icon: '🧹', description: 'System cleanup' }
  ] as const;

  // Load pending packs for moderation
  useEffect(() => {
    if (activeAdminTab === 'moderate') {
      loadPendingPacks();
    }
  }, [activeAdminTab]);

  // Load contact inquiries immediately on mount and when contact tab is active
  useEffect(() => {
    // Always load contact inquiries on mount for notification badge
    loadContactInquiries();
    loadContactStats();

    // Set up periodic refresh for new inquiry notifications
    // Only refresh when component is mounted (admin is authenticated)
    const interval = setInterval(() => {
      // Only refresh if not currently loading to avoid overlapping requests
      // AND user hasn't been active recently (to avoid interrupting active work)
      const timeSinceLastActivity = Date.now() - lastUserActivity.getTime();
      const isUserIdle = timeSinceLastActivity > 10000; // 10 seconds of inactivity
      
      if (!contactLoading && isUserIdle) {
        loadContactInquiries();
        loadContactStats();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []); // Run once on mount

  // Refresh contact inquiries when contact tab is active or filter changes
  useEffect(() => {
    if (activeAdminTab === 'contact') {
      loadContactInquiries();
      loadContactStats();
    }
  }, [activeAdminTab, inquiryFilter]);

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

  // Contact inquiry functions
  const loadContactInquiries = async () => {
    setContactLoading(true);
    try {
      let inquiries;
      if (inquiryFilter === 'all') {
        inquiries = await getContactInquiries();
      } else {
        // Filter would be done client-side for now
        const allInquiries = await getContactInquiries();
        inquiries = allInquiries.filter(inquiry => inquiry.status === inquiryFilter);
      }
      setContactInquiries(inquiries);
    } catch (error) {
      console.error('Failed to load contact inquiries:', error);
    } finally {
      setContactLoading(false);
    }
  };

  const loadContactStats = async () => {
    try {
      const stats = await getInquiryStats();
      setContactStats(stats);
    } catch (error) {
      console.error('Failed to load contact stats:', error);
    }
  };

  const handleInquiryStatusUpdate = async (inquiryId: string, newStatus: ContactInquiry['status'], adminNotes?: string) => {
    try {
      const success = await updateInquiryStatus(inquiryId, newStatus, adminNotes);
      if (success) {
        await loadContactInquiries();
        await loadContactStats();
      }
    } catch (error) {
      console.error('Failed to update inquiry status:', error);
    }
  };

  const handleInquiryDelete = async (inquiryId: string) => {
    if (window.confirm('Are you sure you want to delete this inquiry?')) {
      try {
        const success = await deleteInquiry(inquiryId);
        if (success) {
          await loadContactInquiries();
          await loadContactStats();
        }
      } catch (error) {
        console.error('Failed to delete inquiry:', error);
      }
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

  // Debug functions
  const handleFullDiagnostic = async () => {
    setDebugRunning(true);
    setError('');
    setSuccess('');
    
    try {
      const firebaseDebugger = createFirebaseDebugger();
      const results = await firebaseDebugger.runFullDiagnostic();
      console.log('🔍 Full diagnostic results:', results);
      
      // Ensure results are safe to render
      const safeResults = {
        summary: {
          totalTests: Number(results.summary.totalTests) || 0,
          passed: Number(results.summary.passed) || 0,
          failed: Number(results.summary.failed) || 0,
          criticalFailures: Array.isArray(results.summary.criticalFailures) ? results.summary.criticalFailures : []
        },
        results: Array.isArray(results.results) ? results.results.map((result: any) => ({
          operation: String(result.operation),
          success: Boolean(result.success),
          error: result.error || null,
          details: result.details ? JSON.parse(JSON.stringify(result.details)) : null,
          timestamp: result.timestamp || new Date()
        })) : [],
        recommendations: Array.isArray(results.recommendations) ? results.recommendations : []
      };
      
      setDebugResults(safeResults);
      
      if (safeResults.summary.failed > 0) {
        setError(`Diagnostic completed: ${safeResults.summary.failed}/${safeResults.summary.totalTests} tests failed. Check details below.`);
      } else {
        setSuccess(`✅ All diagnostic tests passed (${safeResults.summary.passed}/${safeResults.summary.totalTests})`);
      }
    } catch (error) {
      console.error('❌ Full diagnostic failed:', error);
      setError(`Diagnostic failed: ${error}`);
      setDebugResults(null);
    } finally {
      setDebugRunning(false);
    }
  };

  const handleItemValuesDebug = async () => {
    setItemValuesDebugRunning(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('🔍 Starting Item Values diagnostic...');
      const results = await diagnosePricingServiceIssue();
      console.log('🔍 Diagnostic results:', results);
      
      // Ensure results are serializable before setting state
      const safeResults = {
        success: Boolean(results.success),
        details: {
          getAllPacksResult: {
            success: Boolean(results.details.getAllPacksResult.success),
            packsCount: Number(results.details.getAllPacksResult.packsCount) || 0,
            error: results.details.getAllPacksResult.error || null,
            samplePack: results.details.getAllPacksResult.samplePack || null
          },
          pricingServiceResult: {
            success: Boolean(results.details.pricingServiceResult.success),
            itemCount: Number(results.details.pricingServiceResult.itemCount) || 0,
            error: results.details.pricingServiceResult.error || null,
            sampleItem: results.details.pricingServiceResult.sampleItem ? {
              itemId: String(results.details.pricingServiceResult.sampleItem.itemId),
              price: Number(results.details.pricingServiceResult.sampleItem.price) || 0
            } : null
          }
        },
        recommendations: Array.isArray(results.recommendations) ? results.recommendations : []
      };
      
      setItemValuesDebugResults(safeResults);
      
      if (safeResults.success) {
        setSuccess('✅ Item Values functionality is working correctly');
      } else {
        setError('❌ Item Values functionality has issues - check details below');
      }
    } catch (error) {
      console.error('❌ Item Values diagnostic failed:', error);
      setError(`Item Values diagnostic failed: ${error}`);
      setItemValuesDebugResults(null);
    } finally {
      setItemValuesDebugRunning(false);
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
                  <div className="relative">
                    <span className="text-lg">{tab.icon}</span>
                    {/* New inquiry notification dot */}
                    {tab.id === 'contact' && getNewInquiryCount() > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {getNewInquiryCount()}
                      </div>
                    )}
                  </div>
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
                    <div>
                      <ItemAutocomplete
                        value={item.itemTypeId}
                        onChange={(itemId) => updateItem(index, 'itemTypeId', itemId)}
                        placeholder="Search for item type..."
                        className="w-full"
                      />
                    </div>

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

        {/* Price Tracking Tab */}
        {activeAdminTab === 'tracking' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Market Price Tracking
              </h2>
              <p className="text-secondary-600">
                Long-term price history and market trend analysis for year-end insights
              </p>
            </div>
            
            <MarketTrackingPanel isDark={false} />
          </div>
        )}

        {/* Video Analytics Tab */}
        {activeAdminTab === 'video' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <VideoAnalytics />
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

        {/* Utility Management Tab */}
        {activeAdminTab === 'utility' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Item Utility Management
              </h2>
              <p className="text-secondary-600">
                Adjust utility scores for items to control pack value calculations
              </p>
            </div>

            {adminItemTypesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading item types...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
              {Object.values(ITEM_CATEGORIES).map((category) => {
                const items = getAdminItemTypesByCategory(category);
                if (items.length === 0) return null;

                return (
                  <div key={category} className="bg-white/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-gray-800">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-700">
                                Utility Score (1-10)
                              </label>
                              <span className="text-xs text-gray-500">
                                Current: {item.utilityScore || 5}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={utilityEdits[item.id] ?? item.utilityScore ?? 5}
                              onChange={(e) => setUtilityEdits({
                                ...utilityEdits,
                                [item.id]: parseInt(e.target.value)
                              })}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Low Value</span>
                              <span className="font-medium">
                                {utilityEdits[item.id] ?? item.utilityScore ?? 5}
                              </span>
                              <span>High Value</span>
                            </div>
                            {item.utilityReasoning && (
                              <p className="text-xs text-gray-600 italic">
                                Reasoning: {item.utilityReasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-center pt-6">
                <motion.button
                  onClick={async () => {
                    setUtilitySaving(true);
                    try {
                      console.log('Starting utility score save process...');
                      console.log('Utility edits to save:', utilityEdits);
                      
                      // Check if item types exist in Firebase, if not, initialize them
                      const itemTypesExist = await checkItemTypesExistInFirebase();
                      console.log('Item types exist:', itemTypesExist);
                      
                      if (!itemTypesExist) {
                        console.log('Initializing item types in Firebase...');
                        // Initialize item types in Firebase with current static data
                        const { ITEM_TYPES } = await import('../types/itemTypes');
                        await initializeItemTypesInFirebase(ITEM_TYPES);
                        console.log('Item types initialized successfully');
                      }
                      
                      // Save utility score changes to Firebase
                      console.log('Saving utility scores...');
                      await updateMultipleItemTypeUtilityScores(utilityEdits);
                      console.log('Utility scores saved successfully');
                      
                      // Invalidate cache so changes are visible immediately
                      const { invalidateItemTypesCache } = await import('../types/itemTypes');
                      invalidateItemTypesCache();
                      
                      setSuccess('Utility scores updated successfully in Firebase!');
                      setUtilityEdits({}); // Clear the edits after successful save
                      setTimeout(() => setSuccess(''), 3000);
                    } catch (error) {
                      console.error('Error saving utility scores:', error);
                      let errorMessage = 'Failed to save utility scores to Firebase';
                      
                      if (error instanceof Error) {
                        if (error.message.includes('permission')) {
                          errorMessage = 'Permission denied - check Firebase security rules';
                        } else if (error.message.includes('network')) {
                          errorMessage = 'Network error - please check your connection';
                        } else {
                          errorMessage = `Firebase error: ${error.message}`;
                        }
                      }
                      
                      setError(errorMessage);
                      setTimeout(() => setError(''), 5000);
                    } finally {
                      setUtilitySaving(false);
                    }
                  }}
                  disabled={utilitySaving || Object.keys(utilityEdits).length === 0}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    Object.keys(utilityEdits).length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {utilitySaving ? 'Saving...' : `Save Changes (${Object.keys(utilityEdits).length})`}
                </motion.button>
              </div>
            </div>
            )}
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

        {/* Debug Tab */}
        {activeAdminTab === 'debug' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Firebase Debug Diagnostics
              </h2>
              <p className="text-secondary-600">
                Comprehensive Firebase connection and query testing to identify 400 errors
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🚀</span>
                  Quick Diagnostics
                </h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handleFullDiagnostic}
                    disabled={debugRunning}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      debugRunning
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {debugRunning ? 'Running Diagnostics...' : 'Run Full Firebase Diagnostic'}
                  </button>

                  <button
                    onClick={handleItemValuesDebug}
                    disabled={itemValuesDebugRunning}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      itemValuesDebugRunning
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {itemValuesDebugRunning ? 'Testing Item Values...' : 'Debug Item Values 400 Error'}
                  </button>

                  <p className="text-xs text-secondary-500">
                    Tests connection, read/write permissions, query patterns, and indexes
                  </p>
                </div>
              </div>

              {/* Browser Console Info */}
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-yellow-800">
                  <span className="mr-2">💡</span>
                  Debug Instructions
                </h3>
                
                <div className="space-y-3 text-sm text-yellow-700">
                  <p>
                    <strong>To see detailed Firebase logs:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Open Developer Tools (F12)</li>
                    <li>Go to Console tab</li>
                    <li>Look for 🔥 Firebase Database logs</li>
                    <li>Check for red error messages</li>
                  </ol>
                  <p className="text-xs mt-3">
                    The diagnostic will show detailed Firebase operation results both here and in the console.
                  </p>
                </div>
              </div>
            </div>

            {/* Item Values Diagnostic Results */}
            {itemValuesDebugResults && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center">
                  <span className="mr-2">🎯</span>
                  Item Values Diagnostic Results
                </h3>

                {/* Overall Status */}
                <div className={`p-4 rounded-lg mb-6 ${
                  itemValuesDebugResults.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      itemValuesDebugResults.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {itemValuesDebugResults.success ? '✅ Working' : '❌ Issues Found'}
                    </div>
                    <div className="text-sm mt-1">Item Values Tab Status</div>
                  </div>
                </div>

                {/* Test Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* getAllPacks Result */}
                  <div className={`p-4 rounded-lg border ${
                    itemValuesDebugResults.details.getAllPacksResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className="font-semibold mb-2">
                      {itemValuesDebugResults.details.getAllPacksResult.success ? '✅' : '❌'} 
                      getAllPacks() Test
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>Packs Found: <strong>{itemValuesDebugResults.details.getAllPacksResult.packsCount}</strong></div>
                      
                      {itemValuesDebugResults.details.getAllPacksResult.samplePack && (
                        <div className="text-xs text-gray-600 mt-2">
                          Sample Pack: {itemValuesDebugResults.details.getAllPacksResult.samplePack.name} 
                          (${itemValuesDebugResults.details.getAllPacksResult.samplePack.price})
                        </div>
                      )}
                      
                      {itemValuesDebugResults.details.getAllPacksResult.error && (
                        <div className="text-xs text-red-600 mt-2">
                          <strong>Error:</strong> {itemValuesDebugResults.details.getAllPacksResult.error.code} - 
                          {itemValuesDebugResults.details.getAllPacksResult.error.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing Service Result */}
                  <div className={`p-4 rounded-lg border ${
                    itemValuesDebugResults.details.pricingServiceResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className="font-semibold mb-2">
                      {itemValuesDebugResults.details.pricingServiceResult.success ? '✅' : '❌'} 
                      Pricing Service Test
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>Items Priced: <strong>{itemValuesDebugResults.details.pricingServiceResult.itemCount}</strong></div>
                      
                      {itemValuesDebugResults.details.pricingServiceResult.sampleItem && (
                        <div className="text-xs text-gray-600 mt-2">
                          Sample: {itemValuesDebugResults.details.pricingServiceResult.sampleItem.itemId} = 
                          ${typeof itemValuesDebugResults.details.pricingServiceResult.sampleItem.price === 'number' 
                            ? itemValuesDebugResults.details.pricingServiceResult.sampleItem.price.toFixed(4)
                            : 'N/A'}
                        </div>
                      )}
                      
                      {itemValuesDebugResults.details.pricingServiceResult.error && (
                        <div className="text-xs text-red-600 mt-2">
                          <strong>Error:</strong> {itemValuesDebugResults.details.pricingServiceResult.error.code} - 
                          {itemValuesDebugResults.details.pricingServiceResult.error.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {itemValuesDebugResults.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Diagnostic Results */}
            {debugResults && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-6 flex items-center">
                  <span className="mr-2">📋</span>
                  Diagnostic Results
                </h3>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-800">{debugResults.summary.totalTests}</div>
                    <div className="text-sm text-gray-600">Total Tests</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{debugResults.summary.passed}</div>
                    <div className="text-sm text-green-700">Passed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{debugResults.summary.failed}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((debugResults.summary.passed / debugResults.summary.totalTests) * 100)}%
                    </div>
                    <div className="text-sm text-blue-700">Success Rate</div>
                  </div>
                </div>

                {/* Critical Failures */}
                {debugResults.summary.criticalFailures.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">❌ Critical Failures:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {debugResults.summary.criticalFailures.map((failure: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{failure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {debugResults.recommendations.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {debugResults.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Results */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Detailed Test Results:</h4>
                  {debugResults.results.map((result: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {result.success ? '✅' : '❌'} {result.operation}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {result.error && (
                        <div className="mt-2 text-sm text-red-700">
                          <strong>Error:</strong> {result.error.code} - {result.error.message}
                        </div>
                      )}
                      
                      {result.details && (
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>Details:</strong> 
                          <pre className="whitespace-pre-wrap text-xs mt-1 bg-gray-100 p-2 rounded">
                            {typeof result.details === 'object' 
                              ? JSON.stringify(result.details, null, 2) 
                              : String(result.details)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Inquiries Management Tab */}
        {activeAdminTab === 'contact' && (
          <div className="glass-effect rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                Contact Inquiries
              </h2>
              <p className="text-secondary-600">
                Manage user feedback, bug reports, and business inquiries
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Inquiries</p>
                    <p className="text-2xl font-bold">{contactStats.total}</p>
                  </div>
                  <div className="text-3xl opacity-80">📧</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">New/Unread</p>
                    <p className="text-2xl font-bold">{getNewInquiryCount()}</p>
                  </div>
                  <div className="text-3xl opacity-80">🔴</div>
                </div>
                {getNewInquiryCount() > 0 && (
                  <div className="absolute -top-2 -right-2 bg-white text-red-600 text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-bold shadow-lg">
                    !
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Bug Reports</p>
                    <p className="text-2xl font-bold">{contactStats.byType.bug_report || 0}</p>
                  </div>
                  <div className="text-3xl opacity-80">🐛</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">General/Ideas</p>
                    <p className="text-2xl font-bold">{(contactStats.byType.comment || 0) + (contactStats.byType.recommendation || 0)}</p>
                  </div>
                  <div className="text-3xl opacity-80">💡</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Business</p>
                    <p className="text-2xl font-bold">{(contactStats.byType.advertising || 0) + (contactStats.byType.partnership || 0)}</p>
                  </div>
                  <div className="text-3xl opacity-80">💼</div>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select
                  value={inquiryFilter}
                  onChange={(e) => setInquiryFilter(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Inquiries</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <button
                onClick={() => {
                  loadContactInquiries();
                  loadContactStats();
                }}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                disabled={contactLoading}
              >
                <FiRefreshCcw className={`mr-2 ${contactLoading ? 'animate-spin' : ''}`} />
                {contactLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Inquiries List */}
            {contactLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-primary-600 bg-white transition ease-in-out duration-150">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading inquiries...
                </div>
              </div>
            ) : contactInquiries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No inquiries yet</h3>
                <p className="text-gray-600">Contact inquiries will appear here once users start submitting them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contactInquiries.filter(inquiry => inquiry.id).map((inquiry, index) => {
                  const getTypeIcon = (type: string) => {
                    switch (type) {
                      case 'comment': return '💬';
                      case 'recommendation': return '💡';
                      case 'advertising': return '📢';
                      case 'partnership': return '🤝';
                      case 'bug_report': return '🐛';
                      default: return '📧';
                    }
                  };

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'new': return 'bg-blue-100 text-blue-800';
                      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
                      case 'resolved': return 'bg-green-100 text-green-800';
                      case 'closed': return 'bg-gray-100 text-gray-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  const getTypeColor = (type: string) => {
                    switch (type) {
                      case 'comment': return 'bg-purple-100 text-purple-800';
                      case 'recommendation': return 'bg-green-100 text-green-800';
                      case 'advertising': return 'bg-orange-100 text-orange-800';
                      case 'partnership': return 'bg-blue-100 text-blue-800';
                      case 'bug_report': return 'bg-red-100 text-red-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  const getTypeLabel = (type: string) => {
                    switch (type) {
                      case 'comment': return 'General';
                      case 'recommendation': return 'Recommendation';
                      case 'advertising': return 'Advertising';
                      case 'partnership': return 'Partnership';
                      case 'bug_report': return 'Bug Report';
                      default: return type.replace('_', ' ');
                    }
                  };

                  return (
                    <motion.div
                      key={inquiry.id || `inquiry-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                        inquiry.status === 'new' 
                          ? 'border-red-200 shadow-red-100 shadow-lg ring-1 ring-red-100' 
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{getTypeIcon(inquiry.type)}</div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">{inquiry.subject}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(inquiry.type)}`}>
                                {getTypeLabel(inquiry.type)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>{inquiry.timestamp.toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{inquiry.timestamp.toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inquiry.status)}`}>
                            {inquiry.status.replace('_', ' ')}
                          </span>
                          {inquiry.status === 'new' && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
                      </div>

                      {/* Contact Info */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center text-sm text-blue-700">
                          <span className="font-medium mr-2">Contact Email:</span>
                          <a href={`mailto:${inquiry.contactEmail}`} className="underline hover:text-blue-800">
                            {inquiry.contactEmail}
                          </a>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      {inquiry.adminNotes && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="text-sm text-yellow-800">
                            <span className="font-medium">Admin Notes:</span>
                            <p className="mt-1">{inquiry.adminNotes}</p>
                            {inquiry.adminResponseDate && (
                              <p className="text-xs text-yellow-600 mt-2">
                                Updated: {inquiry.adminResponseDate.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <select
                            value={inquiry.status}
                            onChange={(e) => handleInquiryStatusUpdate(inquiry.id!, e.target.value as ContactInquiry['status'])}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          
                          <button
                            onClick={() => {
                              const notes = prompt('Add admin notes (optional):');
                              if (notes !== null) {
                                handleInquiryStatusUpdate(inquiry.id!, inquiry.status, notes);
                              }
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                          >
                            Add Notes
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <a
                            href={`mailto:${inquiry.contactEmail}?subject=Re: ${inquiry.subject}`}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            Reply
                          </a>
                          
                          <button
                            onClick={() => handleInquiryDelete(inquiry.id!)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AdminPanel;
