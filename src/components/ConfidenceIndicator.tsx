import { motion } from 'framer-motion';

interface ConfidenceIndicatorProps {
  totalQuantity: number;
  packCount: number;
  className?: string;
}

export function ConfidenceIndicator({ totalQuantity, packCount, className = '' }: ConfidenceIndicatorProps) {
  // Calculate confidence score (0-100)
  const calculateConfidence = () => {
    // Factors that influence confidence:
    // 1. Number of packs (more packs = more reliable)
    // 2. Total quantity (higher quantities = more data points)
    // 3. Diminishing returns (exponential decay for very high values)
    
    const packScore = Math.min(packCount * 15, 70); // Max 70 points from pack count
    const quantityScore = Math.min(Math.log10(totalQuantity + 1) * 15, 30); // Max 30 points from quantity
    
    return Math.min(Math.round(packScore + quantityScore), 100);
  };

  const confidence = calculateConfidence();

  const getConfidenceLevel = () => {
    if (confidence >= 85) return { level: 'Excellent', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    if (confidence >= 70) return { level: 'High', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    if (confidence >= 50) return { level: 'Good', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    if (confidence >= 30) return { level: 'Fair', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
    return { level: 'Low', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' };
  };

  const { level, color, bgColor, textColor } = getConfidenceLevel();

  return (
    <div className={`group relative ${className}`}>
      {/* Confidence Indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {/* Confidence bars */}
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => {
              const threshold = (i + 1) * 20;
              const isActive = confidence >= threshold;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-1.5 h-4 rounded-full ${
                    isActive 
                      ? color === 'green' ? 'bg-green-500' :
                        color === 'blue' ? 'bg-blue-500' :
                        color === 'yellow' ? 'bg-yellow-500' :
                        color === 'orange' ? 'bg-orange-500' :
                        'bg-red-500'
                      : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
          
          {/* Confidence badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
            {level}
          </span>
        </div>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          <div className="font-semibold mb-1">Confidence: {confidence}%</div>
          <div>{totalQuantity.toLocaleString()} total items</div>
          <div>{packCount} pack{packCount !== 1 ? 's' : ''}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

export default ConfidenceIndicator;
