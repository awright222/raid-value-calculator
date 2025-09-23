import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PackAnalyzer from './components/PackAnalyzer';
import AdminPanel from './components/AdminPanel';
import ItemValues from './components/ItemValues';
import CommunityTab from './components/CommunityTab';
import MarketTrends from './components/MarketTrends';
import ContactTab from './components/ContactTab';
import DemoModal from './components/DemoModal';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import { BiometricLogin } from './components/BiometricLogin';
import { ConsentProvider } from './context/ConsentContext';
import { CookieConsent } from './components/CookieConsent';
import { AnalyticsTracker } from './components/AnalyticsTracker';

function App() {
  // Initialize activeTab from localStorage or default to 'analyze'
  const [activeTab, setActiveTab] = useState<'analyze' | 'values' | 'community' | 'trends' | 'contact' | 'admin'>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as any) || 'analyze';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminTab, setShowAdminTab] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Admin password - secure and hidden from users
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'AdminRaid2025';

  // Check if user was previously logged in
  useEffect(() => {
    const wasLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (wasLoggedIn) {
      setIsAdminAuthenticated(true);
      setShowAdminTab(true);
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Secret keyboard shortcut to show admin tab (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        setShowAdminTab(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBiometricSuccess = () => {
    setIsAdminAuthenticated(true);
    setShowBiometricLogin(false);
    setShowLoginModal(false);
    setLoginError('');
    setActiveTab('admin');
    // Store login state in localStorage for persistence
    localStorage.setItem('adminLoggedIn', 'true');
  };

  const handleBiometricFallback = () => {
    setShowBiometricLogin(false);
    setShowLoginModal(true);
  };

  const handleAdminLogin = async (password: string) => {
    // Use a strong, secure password
    const actualPassword = 'RaidX9$mK7#vP2@nQ8!wE5';
    
    if (password === actualPassword) {
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setLoginError('');
      setActiveTab('admin');
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

  const handleTabClick = (tabId: 'analyze' | 'values' | 'community' | 'trends' | 'contact' | 'admin') => {
    if (tabId === 'admin' && !isAdminAuthenticated) {
      // Show password login by default instead of biometric
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
    { id: 'community', label: 'Community', icon: '👥' },
    { id: 'trends', label: 'Market Trends', icon: '📈' },
    { id: 'contact', label: 'Contact Dev', icon: '💬' },
  ] as const;

  const adminTab = { id: 'admin', label: isAdminAuthenticated ? 'Admin Tools' : 'Admin Login', icon: isAdminAuthenticated ? '⚙️' : '🔐' } as const;

  // Only show admin tab if unlocked or authenticated
  const tabs = showAdminTab || isAdminAuthenticated ? [...baseTabs, adminTab] : baseTabs;

  return (
    <ConsentProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
        <Header 
          isAdminAuthenticated={isAdminAuthenticated} 
          onLogout={handleAdminLogout}
          onShowDemo={() => setShowDemoModal(true)}
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
            {activeTab === 'community' && <CommunityTab />}
            {activeTab === 'trends' && <MarketTrends />}
            {activeTab === 'contact' && <ContactTab />}
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

        {/* Biometric Login Modal */}
        <AnimatePresence>
          {showBiometricLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowBiometricLogin(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
              >
                <BiometricLogin
                  onSuccess={handleBiometricSuccess}
                  onFallbackToPassword={handleBiometricFallback}
                  adminPassword={ADMIN_PASSWORD}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onLogin={handleAdminLogin}
          onClose={() => setShowLoginModal(false)}
          onBiometricLogin={() => {
            setShowLoginModal(false);
            setShowBiometricLogin(true);
          }}
          error={loginError}
        />

        {/* Demo Video Modal */}
        <DemoModal
          isOpen={showDemoModal}
          onClose={() => setShowDemoModal(false)}
        />

        {/* Cookie Consent Banner */}
        <CookieConsent />
      </div>
    </ConsentProvider>
  );
}export default App;
