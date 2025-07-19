import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RATE_LIMITS } from '../utils/rateLimiter';

interface RateLimitInfoProps {
  className?: string;
}

export function RateLimitInfo({ className = '' }: RateLimitInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Info Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors text-xs font-medium"
        aria-label="Rate limit information"
        title="Click for rate limit information"
      >
        i
      </button>

      {/* Info Modal/Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 z-50"
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  About Usage Limits
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-primary-600 to-secondary-600 mx-auto"></div>
              </div>

              <div className="space-y-4 text-sm text-gray-600">
                <p className="leading-relaxed">
                  This is a <strong>passion project</strong> that I'm working hard to keep 
                  <strong> completely free</strong> for both you and me! To help manage costs 
                  and prevent abuse, I've implemented some fair usage limits:
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Current Limits (per minute):</h4>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Pack Analysis:</span>
                      <span className="font-medium">{RATE_LIMITS.PACK_ANALYSIS} requests</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pack Submissions:</span>
                      <span className="font-medium">{RATE_LIMITS.PACK_SUBMISSION} submissions</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Requests:</span>
                      <span className="font-medium">{RATE_LIMITS.DATA_FETCH} requests</span>
                    </div>
                  </div>
                </div>

                <p className="leading-relaxed">
                  If this tool becomes popular enough to justify it, I might explore 
                  <strong> optional ads</strong> to help cover costs. This could allow me to 
                  increase limits or remove them entirely.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-xs font-medium">
                    💡 These limits reset every minute and are very generous for normal usage!
                  </p>
                </div>

                <p className="text-center text-xs text-gray-500">
                  Thank you for your understanding and for using the Raid Value Calculator! 🎮
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all font-medium"
              >
                Got it!
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RateLimitInfo;
