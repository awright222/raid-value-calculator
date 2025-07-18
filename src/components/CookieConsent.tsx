import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConsent } from '../context/ConsentContext';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';

export const CookieConsent: React.FC = () => {
  const { consent, setConsent } = useConsent();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  // Don't show if user has already made a choice
  if (consent !== 'none') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 glass-effect dark:bg-gray-800/95 dark:border-gray-700/50 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50 transition-colors duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20"></div>
        <div className="relative max-w-6xl mx-auto p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <span className="text-lg mr-2">🍪</span>
                Your Privacy Matters
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                We use cookies to understand how you use our Raid calculator and improve your experience. 
                We collect anonymous usage data like which packs you view and when you visit. 
                <strong className="text-gray-900 dark:text-gray-100"> No personal information is stored or shared.</strong>
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <span className="text-green-500 mr-1">✅</span>
                  <span>Essential: Site functionality</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-500 mr-1">📊</span>
                  <span>Analytics: Usage statistics</span>
                </div>
                <div className="flex items-center">
                  <span className="text-purple-500 mr-1">🎯</span>
                  <span>Advertising: Behavioral data</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
              <button
                onClick={() => setConsent('essential')}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md transition-all duration-200"
              >
                <span className="flex items-center">
                  <span className="mr-2">🔒</span>
                  Essential Only
                </span>
              </button>
              <button
                onClick={() => setConsent('all')}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <span className="flex items-center">
                  <span className="mr-2">🚀</span>
                  Accept All Cookies
                </span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <p className="flex flex-wrap items-center justify-center lg:justify-start gap-1">
              <span>By continuing to use this site, you agree to our</span>
              <button 
                onClick={() => setShowPrivacyPolicy(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Privacy Policy
              </button>
              <span>and</span>
              <button 
                onClick={() => setShowTermsOfService(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Terms of Service
              </button>
              <span className="hidden sm:inline">•</span>
              <span className="text-gray-400 dark:text-gray-500">You can change preferences anytime</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyPolicy && (
          <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTermsOfService && (
          <TermsOfService onClose={() => setShowTermsOfService(false)} />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
