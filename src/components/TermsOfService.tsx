import React from 'react';
import { motion } from 'framer-motion';

interface TermsOfServiceProps {
  onClose: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onClose }) => {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms of Service</h2>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">About This Service</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Raid Value Calculator is a community-driven tool for analyzing energy pack values in Raid: Shadow Legends. 
                This service is provided free of charge to help players make informed purchasing decisions.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Use of the Service</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">By using this calculator, you agree to:</p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Use the service for personal, non-commercial purposes</li>
                <li>Provide accurate information when submitting pack data</li>
                <li>Not attempt to manipulate or spam the system</li>
                <li>Respect the community-driven nature of the platform</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Accuracy and Disclaimers</h3>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  ⚠️ Important: Pack values are estimates based on community data and algorithmic analysis.
                </p>
              </div>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Values may not reflect actual market worth or game balance</li>
                <li>Plarium may change pack contents or pricing at any time</li>
                <li>Use this tool as guidance, not as investment advice</li>
                <li>Always make your own informed decisions about purchases</li>
                <li>We are not affiliated with Plarium Games Ltd.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Community Contributions</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                When you submit pack data to our community database:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Your submissions help improve accuracy for all users</li>
                <li>Data becomes part of the community knowledge base</li>
                <li>We may moderate submissions to maintain quality</li>
                <li>False or spam submissions may be removed</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Intellectual Property</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>"Raid: Shadow Legends" is a trademark of Plarium Games Ltd.</li>
                <li>This calculator is an independent fan-made tool</li>
                <li>Community-submitted data is shared for collective benefit</li>
                <li>Calculator algorithms and code are proprietary</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Limitation of Liability</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                This service is provided "as is" without warranties. We are not responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Purchasing decisions made based on our calculations</li>
                <li>Changes in game mechanics or pack values</li>
                <li>Service interruptions or data inaccuracies</li>
                <li>Any financial losses related to game purchases</li>
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Service Availability</h3>
              <p className="text-gray-700 dark:text-gray-300">
                We strive to keep the service available but make no guarantees about uptime. 
                The service may be updated, modified, or discontinued at any time.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact and Updates</h3>
              <p className="text-gray-700 dark:text-gray-300">
                These terms may be updated periodically. Continued use of the service constitutes 
                acceptance of any changes. Check back occasionally for updates.
              </p>
            </section>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Community First:</strong> This tool exists to help Raid players make better decisions. 
                We're committed to transparency, accuracy, and putting the community's interests first.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
