import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  isAdminAuthenticated: boolean;
  onLogout: () => void;
  onShowDemo: () => void;
}

export default function Header({ isAdminAuthenticated, onLogout, onShowDemo }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const appTitle = isAdminAuthenticated ? 'Raid Value Calculator - Admin' : 'Raid Value Calculator';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect dark:bg-gray-900/30 border-b border-white/20 dark:border-gray-700/50 backdrop-blur-xl transition-colors duration-300"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {isAdminAuthenticated ? (
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 rounded-2xl flex items-center justify-center shadow-2xl glow-effect"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-3xl font-bold text-white drop-shadow-lg">⚙️</span>
              </motion.div>
            ) : (
              <motion.div 
                className="w-32 h-32"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img 
                  src="/whitebgtitle-removebg.png" 
                  alt="Raid Value Calculator"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </motion.div>
            )}
            <div>
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-secondary-900 via-primary-700 to-accent-600 dark:from-gray-100 dark:via-primary-400 dark:to-accent-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {appTitle}
              </motion.h1>
              <motion.p 
                className="text-lg text-secondary-600 dark:text-gray-300 mt-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Pack value analysis for Raid Shadow Legends
                {isAdminAuthenticated && <span className="ml-2 text-accent-600 dark:text-accent-400 font-semibold">(Admin Mode)</span>}
              </motion.p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Demo Video Button */}
            <motion.button
              onClick={onShowDemo}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white backdrop-blur-sm border border-white/20 transition-all duration-300 group shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Watch app demo video"
            >
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                🎬
              </span>
            </motion.button>
            
            {/* Dark Mode Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-gray-600 hover:bg-white/20 dark:hover:bg-black/30 transition-all duration-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="text-2xl transition-transform duration-300 group-hover:rotate-180">
                {theme === 'light' ? '🌙' : '☀️'}
              </span>
            </motion.button>
            
            {isAdminAuthenticated && (
              <motion.button
                onClick={onLogout}
                className="btn-secondary"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                Logout
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
