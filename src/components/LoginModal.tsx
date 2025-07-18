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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  useEffect(() => {
    if (isOpen) {
      setPassword('');
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
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-3">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-lg"
              placeholder="Enter admin password"
              autoFocus
            />
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
