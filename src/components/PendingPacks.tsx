import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingPacks, confirmPendingPack } from '../firebase/pendingPacks';
import type { PendingPack } from '../utils/duplicateDetection';

interface PendingPacksProps {
  userEmail?: string;
}

export function PendingPacks({ userEmail }: PendingPacksProps) {
  const [pendingPacks, setPendingPacks] = useState<PendingPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPacks, setConfirmingPacks] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Generate user ID (in a real app, this would come from auth)
  const userId = userEmail || `user_${Date.now()}`;

  const loadPendingPacks = async () => {
    setLoading(true);
    try {
      const packs = await getPendingPacks();
      setPendingPacks(packs);
    } catch (error) {
      console.error('Error loading pending packs:', error);
      setMessage({ type: 'error', text: 'Failed to load pending packs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingPacks();
  }, []);

  const handleConfirmPack = async (packId: string) => {
    if (!packId) return;

    setConfirmingPacks(prev => new Set(prev).add(packId));
    
    try {
      const result = await confirmPendingPack(packId, userId);
      
      if (result.success) {
        setMessage({ 
          type: result.approved ? 'success' : 'info', 
          text: result.message 
        });
        
        // Reload packs to get updated confirmation counts
        await loadPendingPacks();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error confirming pack:', error);
      setMessage({ type: 'error', text: 'Failed to confirm pack' });
    } finally {
      setConfirmingPacks(prev => {
        const next = new Set(prev);
        next.delete(packId);
        return next;
      });
    }
  };

  const canConfirmPack = (pack: PendingPack) => {
    return !pack.confirmations.includes(userId);
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

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Expiring soon';
  };

  if (loading) {
    return (
      <div className="glass-effect rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading pending packs...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
          Pending Packs
        </h2>
        <p className="text-secondary-600">
          Help verify pack data by confirming submissions. Each pack needs 3 confirmations to be approved.
        </p>
      </div>

      {/* Message Display */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              message.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-current opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingPacks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-secondary-700 mb-2">No pending packs!</h3>
          <p className="text-secondary-600">All submitted packs have been reviewed. Check back later for new submissions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingPacks.map((pack) => {
            const valueGrade = getValueGrade(pack.cost_per_energy);
            
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Pack Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-secondary-800 dark:text-gray-200">{pack.name}</h3>
                      <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">${pack.price}</span>
                      {/* Value Grade Badge */}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${valueGrade.color}`}>
                        {valueGrade.grade}
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
                            <div className="font-semibold text-secondary-700 dark:text-gray-200">{pack.energy_pots}</div>
                          </div>
                        )}
                        {pack.raw_energy > 0 && (
                          <div>
                            <span className="text-secondary-500 dark:text-gray-400">Raw Energy:</span>
                            <div className="font-semibold text-secondary-700 dark:text-gray-200">{pack.raw_energy.toLocaleString()}</div>
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

                    {/* Submission Details */}
                    <div className="flex items-center gap-4 text-xs text-secondary-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-3">
                      <span>📅 {pack.submitted_at.toLocaleDateString()}</span>
                      <span>⏰ {getTimeRemaining(pack.expires_at)}</span>
                      <span>👤 {pack.submitter_email || pack.submitter_id.substring(0, 8)}...</span>
                    </div>
                </div>

                {/* Confirmation Status */}
                <div className="flex flex-col items-center lg:items-end gap-3">
                  {/* Confirmation Progress */}
                  <div className="text-center lg:text-right">
                    <div className="text-sm text-secondary-600 dark:text-gray-300 mb-2">
                      Confirmations: {pack.confirmation_count}/3
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < pack.confirmation_count ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirm Button */}
                  {canConfirmPack(pack) ? (
                    <motion.button
                      onClick={() => handleConfirmPack(pack.id!)}
                      disabled={confirmingPacks.has(pack.id!)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        confirmingPacks.has(pack.id!)
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {confirmingPacks.has(pack.id!) ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Confirming...</span>
                        </div>
                      ) : (
                        'Confirm Pack'
                      )}
                    </motion.button>
                  ) : (
                    <div className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                      Already Confirmed
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center mt-8">
        <motion.button
          onClick={loadPendingPacks}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors shadow-md hover:shadow-lg"
        >
          Refresh Packs
        </motion.button>
      </div>
    </motion.div>
  );
}

export default PendingPacks;
