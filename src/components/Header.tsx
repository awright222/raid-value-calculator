import { motion } from 'framer-motion';

interface HeaderProps {
  isAdminAuthenticated: boolean;
  onLogout: () => void;
}

export default function Header({ isAdminAuthenticated, onLogout }: HeaderProps) {
  const appTitle = isAdminAuthenticated ? 'Raid Value Calculator - Admin' : 'Raid Value Calculator';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect border-b border-white/20 backdrop-blur-xl"
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
                className="text-4xl font-bold bg-gradient-to-r from-secondary-900 via-primary-700 to-accent-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {appTitle}
              </motion.h1>
              <motion.p 
                className="text-lg text-secondary-600 mt-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Pack value analysis for Raid Shadow Legends
                {isAdminAuthenticated && <span className="ml-2 text-accent-600 font-semibold">(Admin Mode)</span>}
              </motion.p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
