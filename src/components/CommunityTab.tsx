import { useState } from 'react';
import { motion } from 'framer-motion';
import PackSubmission from './PackSubmission';
import PendingPacks from './PendingPacks';

console.log('📁 CommunityTab.tsx file loaded');

interface CommunityTabProps {
  userEmail?: string;
}

export function CommunityTab({ userEmail }: CommunityTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'submit' | 'pending'>('pending');
  console.log('🏷️ CommunityTab activeSubTab:', activeSubTab);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmissionComplete = (success: boolean, message: string) => {
    setNotification({ type: success ? 'success' : 'error', text: message });
    
    // Auto-clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
    
    // If successful, switch to pending tab to see the submission
    if (success) {
      setTimeout(() => setActiveSubTab('pending'), 1000);
    }
  };

  const subTabs = [
    { id: 'pending', label: 'Review Packs', icon: '👥', description: 'Help confirm pack submissions' },
    { id: 'submit', label: 'Submit Pack', icon: '📤', description: 'Add new pack data' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Global Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-xl ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{notification.text}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100 ml-4"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex justify-center">
        <div className="glass-effect rounded-2xl p-2 shadow-xl">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                console.log('🔄 Switching to tab:', tab.id);
                setActiveSubTab(tab.id);
              }}
              className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeSubTab === tab.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                  : 'text-secondary-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </div>
              {activeSubTab === tab.id && (
                <motion.div
                  layoutId="activeSubTab"
                  className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Content */}
      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeSubTab === 'submit' && (
          <PackSubmission 
            onSubmissionComplete={handleSubmissionComplete}
          />
        )}
        {activeSubTab === 'pending' && (
          <PendingPacks userEmail={userEmail} />
        )}
      </motion.div>

      {/* Community Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-effect dark:bg-gray-800/30 rounded-2xl p-6 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700"
      >
        <h3 className="text-lg font-semibold text-secondary-700 dark:text-gray-200 mb-3 flex items-center">
          <span className="mr-2">🏘️</span>
          How Community Submissions Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-secondary-600 dark:text-gray-300">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xs flex-shrink-0">
              1
            </div>
            <div>
              <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Submit Pack Data</div>
              <div>Users submit pack information including price, energy, and additional items.</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xs flex-shrink-0">
              2
            </div>
            <div>
              <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Community Review</div>
              <div>Other users confirm the pack data. Duplicates are automatically detected and merged.</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xs flex-shrink-0">
              3
            </div>
            <div>
              <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Auto-Approval</div>
              <div>Packs with 3+ confirmations are automatically added to the main database.</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg border border-gray-200/50 dark:border-gray-600/50">
          <div className="text-xs text-secondary-500 dark:text-gray-400 flex items-center">
            <span className="mr-2">🛡️</span>
            <strong className="mr-1 text-secondary-700 dark:text-gray-300">Quality Control:</strong> 
            Suspicious data is flagged, duplicates are merged, and packs expire if not confirmed within 7 days.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CommunityTab;
