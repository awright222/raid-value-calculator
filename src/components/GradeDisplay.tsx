import { motion } from 'framer-motion';

interface GradeDisplayProps {
  grade: string;
}

export default function GradeDisplay({ grade }: GradeDisplayProps) {
  const getGradeInfo = (grade: string) => {
    switch (grade) {
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
      default:
        return {
          label: 'Unknown Grade',
          description: 'Unable to determine grade.',
          className: 'grade-c',
          icon: '❓'
        };
    }
  };

  const gradeInfo = getGradeInfo(grade);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.3 }}
      className={`${gradeInfo.className} rounded-xl p-6 text-center`}
    >
      <div className="text-4xl mb-2">{gradeInfo.icon}</div>
      <div className="text-3xl font-bold mb-2">{gradeInfo.label}</div>
      <p className="text-lg opacity-90">{gradeInfo.description}</p>
    </motion.div>
  );
}
