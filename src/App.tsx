import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PackAnalyzer from './components/PackAnalyzer';
import AdminPanel from './components/AdminPanel';
import ItemValues from './components/ItemValues';
import BestDeals from './components/BestDeals';
import CommunityTab from './components/CommunityTab';
import MarketTrends from './components/MarketTrends';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import { ConsentProvider } from './context/ConsentContext';
import { CookieConsent } from './components/CookieConsent';
import { AnalyticsTracker } from './components/AnalyticsTracker';

function App() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'values' | 'deals' | 'community' | 'trends' | 'admin'>('analyze');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Simple admin password check (you can set this to whatever you want)
  const ADMIN_PASSWORD = 'admin123'; // Change this to your preferred password

  const handleAdminLogin = async (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setLoginError('');
      setActiveTab('admin');
      // Store login state in localStorage for persistence
      localStorage.setItem('adminLoggedIn', 'true');
    } else {
      setLoginError('Incorrect password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('adminLoggedIn');
    if (activeTab === 'admin') {
      setActiveTab('analyze');
    }
  };

  const handleTabClick = (tabId: 'analyze' | 'values' | 'deals' | 'community' | 'trends' | 'admin') => {
    if (tabId === 'admin' && !isAdminAuthenticated) {
      setShowLoginModal(true);
      setLoginError('');
    } else {
      setActiveTab(tabId);
    }
  };

  // Check if user was previously logged in
  React.useEffect(() => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const baseTabs = [
    { id: 'analyze', label: 'Analyze Pack', icon: '🔍' },
    { id: 'values', label: 'Item Values', icon: '💰' },
    { id: 'deals', label: 'Best Deals', icon: '🏆' },
    { id: 'community', label: 'Community', icon: '👥' },
    { id: 'trends', label: 'Market Trends', icon: '📈' },
  ] as const;

  const adminTab = { id: 'admin', label: isAdminAuthenticated ? 'Admin Tools' : 'Admin Login', icon: isAdminAuthenticated ? '⚙️' : '🔐' } as const;

  const tabs = [...baseTabs, adminTab];

  return (
    <ConsentProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
        <Header 
          isAdminAuthenticated={isAdminAuthenticated} 
          onLogout={handleAdminLogout}
        />
        
        {/* Analytics Tracking */}
        <AnalyticsTracker activeTab={activeTab} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="glass-effect dark:bg-gray-800/30 dark:border-gray-700/50 rounded-2xl p-2 shadow-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl glow-effect'
                    : 'text-secondary-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                <span className="mr-3 text-lg">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl -z-10"
                    initial={false}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'analyze' && <PackAnalyzer />}
            {activeTab === 'values' && <ItemValues />}
            {activeTab === 'deals' && <BestDeals />}
            {activeTab === 'community' && <CommunityTab />}
            {activeTab === 'trends' && <MarketTrends />}
            {activeTab === 'admin' && isAdminAuthenticated && (
              <AdminPanel onPackAdded={() => {}} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Disclaimer Footer */}
      <footer className="mt-12 py-6 px-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2 font-medium">⚠️ Important Disclaimer</p>
            <p className="mb-2">
              This tool is <strong>not affiliated with Plarium Games or Raid: Shadow Legends</strong> in any way. 
              It is an independent community tool designed solely to help players evaluate pack values.
            </p>
            <p className="mb-2">
              <strong>This tool is NOT intended to encourage spending.</strong> All pricing data is estimated and may contain errors. 
              Pack values are calculated based on community-submitted data and algorithmic analysis, which may not reflect true market value.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Use at your own risk. Always make informed decisions about in-game purchases. 
              Raid: Shadow Legends is a trademark of Plarium Games Ltd.
            </p>
          </div>
        </div>
      </footer>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onLogin={handleAdminLogin}
          onClose={() => setShowLoginModal(false)}
          error={loginError}
        />

        {/* Cookie Consent Banner */}
        <CookieConsent />
      </div>
    </ConsentProvider>
  );
}export default App;
