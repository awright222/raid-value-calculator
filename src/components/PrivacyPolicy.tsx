import React from 'react';
import { motion } from 'framer-motion';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Information We Collect</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Raid Value Calculator is designed with privacy in mind. We collect minimal data to provide and improve our service:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li><strong>Anonymous Usage Data:</strong> Which packs you view, when you visit, general geographic region (country/state level)</li>
                <li><strong>Technical Information:</strong> Browser type, screen resolution, device type (mobile/desktop)</li>
                <li><strong>Session Data:</strong> Temporary session identifiers that cannot be linked to your identity</li>
                <li><strong>Pack Submissions:</strong> Community-submitted pack data for our database (anonymous)</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">What We DON'T Collect</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Personal information (names, emails, addresses)</li>
                <li>Precise location data or IP addresses</li>
                <li>Financial information or payment details</li>
                <li>Cross-site tracking or fingerprinting</li>
                <li>Any data that can identify you personally</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">How We Use Information</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li><strong>Service Improvement:</strong> Understanding which features are popular to improve the calculator</li>
                <li><strong>Analytics:</strong> Anonymous statistics like "1,000 unique visitors this month"</li>
                <li><strong>Pack Intelligence:</strong> Tracking pack popularity and value trends for market analysis</li>
                <li><strong>Advertising (if enabled):</strong> Behavioral targeting for relevant game-related ads</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Your Choices</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You have full control over data collection:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li><strong>Essential Only:</strong> Use the calculator with zero tracking</li>
                <li><strong>Accept All:</strong> Help us improve with anonymous analytics</li>
                <li><strong>Change Anytime:</strong> Clear your browser data to reset preferences</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Data Security</h3>
              <p className="text-gray-700 dark:text-gray-300">
                All data is stored securely using industry-standard practices. Since we don't collect personal information, 
                there's minimal risk to your privacy. Data is anonymized and aggregated before any analysis.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Legal Compliance</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This service complies with GDPR, CCPA, and other privacy regulations. Our minimal data collection 
                approach means we often exceed privacy requirements rather than just meet them.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Questions about privacy? The calculator is designed to be transparent. All data collection 
                is clearly explained and optional. You can always choose "Essential Only" for a fully private experience.
              </p>
            </section>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Bottom Line:</strong> We built this calculator for Raid players, by Raid players. 
                Your privacy matters more to us than data collection. Use "Essential Only" if you prefer 
                zero tracking - the calculator works perfectly either way.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
