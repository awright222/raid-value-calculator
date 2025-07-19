import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (password: string) => void;
  onClose: () => void;
  onBiometricLogin?: () => void;
  error?: string;
}

export default function LoginModal({ isOpen, onLogin, onClose, onBiometricLogin, error }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card p-8 max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-secondary-900 to-accent-600 bg-clip-text text-transparent">
            Admin Access
          </h2>
          <p className="text-secondary-600 mt-2">Enter admin password to manage packs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Add hidden username field for accessibility */}
          <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" />
          
          <div>
            <label htmlFor="admin-password" className="block text-sm font-semibold text-secondary-700 mb-3">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-lg"
                placeholder="Enter admin password"
                autoComplete="current-password"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-4 py-3 rounded-xl"
            >
              {error}
            </motion.div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>

        {onBiometricLogin && (
          <div className="mt-6 pt-6 border-t border-secondary-200/50">
            <p className="text-secondary-600 text-sm text-center mb-3">
              Or use biometric authentication
            </p>
            <button
              onClick={onBiometricLogin}
              className="w-full px-4 py-2 rounded-xl bg-secondary-100/50 hover:bg-secondary-200/50 text-secondary-700 text-sm border border-secondary-200/50 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔐</span>
              Use Fingerprint/Face ID
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
