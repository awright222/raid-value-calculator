import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { trackVideoEvent } from '../firebase/videoAnalytics';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Track when modal is opened (video view)
  useEffect(() => {
    if (isOpen) {
      trackVideoEvent('view');
    }
  }, [isOpen]);

  // Track when modal is closed
  const handleClose = () => {
    const video = videoRef.current;
    if (video && !video.paused) {
      trackVideoEvent('close', video.currentTime, video.duration);
    }
    onClose();
  };

  // Video event handlers
  const handleVideoPlay = () => {
    const video = videoRef.current;
    if (video) {
      trackVideoEvent('play', video.currentTime, video.duration);
    }
  };

  const handleVideoPause = () => {
    const video = videoRef.current;
    if (video) {
      trackVideoEvent('pause', video.currentTime, video.duration);
    }
  };

  const handleVideoSeek = () => {
    const video = videoRef.current;
    if (video) {
      trackVideoEvent('seek', video.currentTime, video.duration);
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (video) {
      trackVideoEvent('ended', video.currentTime, video.duration);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 pb-8 overflow-y-auto"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative rounded-2xl shadow-2xl max-w-6xl w-full my-8 overflow-hidden z-[60] ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    🎬 App Demo Video
                  </h2>
                  <p className="text-primary-100 mt-1">
                    See how to analyze pack values and find the best deals
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-primary-100 hover:text-white transition-colors text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Close demo"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Video Content */}
            <div className="p-6" onClick={(e) => e.stopPropagation()}>
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  controls
                  className="w-full max-h-[50vh] object-contain block"
                  poster="/RaidShadowLegendsBanner.jpg"
                  preload="auto"
                  crossOrigin="anonymous"
                  playsInline
                  style={{
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 1000
                  }}
                  onLoadStart={() => console.log('Video loading started')}
                  onLoadedData={() => console.log('Video data loaded')}
                  onError={(e) => console.error('Video error:', e)}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onSeeked={handleVideoSeek}
                  onEnded={handleVideoEnded}
                >
                  <source src="/RaidPackValueCalcDemo.mov" type="video/mp4" />
                  <source src="/RaidPackValueCalcDemo.mp4" type="video/mp4" />
                  Your browser doesn't support video playback.
                </video>
              </div>

              {/* Demo Features List */}
              <div className={`mt-6 p-4 rounded-xl ${
                isDark ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>📋 What you'll see in this demo:</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="text-green-500">✓</span>
                    Pack analysis and grading system
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="text-green-500">✓</span>
                    Market trends and price tracking
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="text-green-500">✓</span>
                    Item value calculations
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="text-green-500">✓</span>
                    Community pack submissions
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 flex justify-center items-center border-t ${
              isDark 
                ? 'border-gray-700 bg-gray-700/30' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              } mr-4`}>
                💡 Tip: Share this site link with your guild or friends!
              </div>
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium shadow-lg text-sm"
              >
                ✅ Got it!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoModal;
