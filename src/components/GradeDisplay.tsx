import { motion } from 'framer-motion';

interface GradeDisplayProps {
  grade: string;
}

export default function GradeDisplay({ grade }: GradeDisplayProps) {
  const getGradeInfo = (grade: string) => {
    switch (grade) {
      case 'SSS':
        return {
          label: 'SSS - LEGENDARY DEAL',
          description: '🔥 INSANE VALUE! This pack is an absolute steal - buy immediately! 🔥',
          className: 'grade-sss',
          icon: '👑'
        };
      case 'S':
        return {
          label: 'S - Exceptional Value',
          description: 'Outstanding deal! This pack offers exceptional value compared to others.',
          className: 'grade-s',
          icon: '🏆'
        };
      case 'A':
        return {
          label: 'A - Great Value',
          description: 'Excellent choice! This pack provides great value for money.',
          className: 'grade-a',
          icon: '⭐'
        };
      case 'B':
        return {
          label: 'B - Good Value',
          description: 'Solid option. This pack offers decent value.',
          className: 'grade-b',
          icon: '👍'
        };
      case 'C':
        return {
          label: 'C - Average Value',
          description: 'Average deal. Consider looking for better options.',
          className: 'grade-c',
          icon: '👌'
        };
      case 'D':
        return {
          label: 'D - Poor Value',
          description: 'Not recommended. This pack is overpriced compared to others.',
          className: 'grade-d',
          icon: '👎'
        };
      case 'F':
        return {
          label: 'F - Very Poor Value',
          description: 'Avoid this pack. Much better alternatives are available.',
          className: 'grade-d',
          icon: '💸'
        };
      case 'NEW':
        return {
          label: 'NEW - Analyzing...',
          description: 'New pack type. Building comparison data from community submissions.',
          className: 'grade-c',
          icon: '🆕'
        };
      default:
        return {
          label: 'C - Estimated Value',
          description: 'Limited data available. Grade based on initial analysis.',
          className: 'grade-c',
          icon: '📊'
        };
    }
  };

  const gradeInfo = getGradeInfo(grade);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.3 }}
      className={`${gradeInfo.className} rounded-xl p-6 text-center relative overflow-hidden`}
    >
      {grade === 'SSS' && (
        <>
          {/* Sparkle effects for SSS */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute top-2 left-4 text-yellow-300"
              animate={{ 
                scale: [1, 1.5, 1],
                rotate: [0, 180, 360],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✨
            </motion.div>
            <motion.div
              className="absolute top-4 right-6 text-pink-300"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [360, 180, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              💎
            </motion.div>
            <motion.div
              className="absolute bottom-4 left-6 text-blue-300"
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 360, 720],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="absolute bottom-2 right-4 text-purple-300"
              animate={{ 
                scale: [1, 1.4, 1],
                rotate: [180, 0, -180],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
            >
              🌟
            </motion.div>
          </div>
          
          {/* Pulsing background effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-indigo-400/20 rounded-xl"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </>
      )}
      
      <div className="relative z-10">
        <motion.div 
          className="text-4xl mb-2"
          animate={grade === 'SSS' ? { 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={grade === 'SSS' ? { 
            duration: 1.5, 
            repeat: Infinity 
          } : {}}
        >
          {gradeInfo.icon}
        </motion.div>
        <motion.div 
          className={`text-3xl font-bold mb-2 ${grade === 'SSS' ? 'animate-pulse' : ''}`}
          animate={grade === 'SSS' ? {
            textShadow: [
              "0 0 10px rgba(255,255,255,0.8)",
              "0 0 20px rgba(255,255,255,1)",
              "0 0 10px rgba(255,255,255,0.8)"
            ]
          } : {}}
          transition={grade === 'SSS' ? { duration: 1, repeat: Infinity } : {}}
        >
          {gradeInfo.label}
        </motion.div>
        <p className={`text-lg opacity-90 ${grade === 'SSS' ? 'font-bold text-shadow' : ''}`}>
          {gradeInfo.description}
        </p>
      </div>
    </motion.div>
  );
}
