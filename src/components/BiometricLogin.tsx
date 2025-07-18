import React, { useState, useEffect } from 'react';
import { BiometricAuth } from '../utils/biometricAuth';

interface BiometricLoginProps {
  onSuccess: () => void;
  onFallbackToPassword: () => void;
}

export const BiometricLogin: React.FC<BiometricLoginProps> = ({ 
  onSuccess, 
  onFallbackToPassword 
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await BiometricAuth.isAvailable();
    setIsAvailable(available);
    setIsSetup(BiometricAuth.isSetup());
  };

  const handleSetupBiometric = async () => {
    setIsAuthenticating(true);
    setError('');
    
    const result = await BiometricAuth.register();
    
    if (result.success) {
      setIsSetup(true);
      onSuccess();
    } else {
      setError(result.error || 'Setup failed');
    }
    
    setIsAuthenticating(false);
  };

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    setError('');
    
    const result = await BiometricAuth.authenticate();
    
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Authentication failed');
    }
    
    setIsAuthenticating(false);
  };

  if (!isAvailable) {
    return (
      <div className="text-center p-6 bg-gray-900/50 rounded-lg border border-gray-700">
        <p className="text-gray-300 mb-4">
          Biometric authentication not available on this device
        </p>
        <button
          onClick={onFallbackToPassword}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Use Password Instead
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          {/* Touch ID / Face ID Icon */}
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm0 2c4.96 0 9 4.04 9 9 0 1.42-.33 2.76-.92 3.96-.15-.44-.4-.84-.74-1.18-.34-.34-.74-.59-1.18-.74C19.76 14.76 20 13.42 20 12c0-4.41-3.59-8-8-8s-8 3.59-8 8c0 1.42.24 2.76.84 3.96-.44.15-.84.4-1.18.74-.34.34-.59.74-.74 1.18C4.33 14.76 4 13.42 4 12c0-4.96 4.04-9 9-9z"/>
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">Admin Authentication</h2>
        <p className="text-gray-300">
          {isSetup 
            ? 'Use Touch ID or Face ID to authenticate' 
            : 'Set up biometric authentication for secure admin access'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {isSetup ? (
          <button
            onClick={handleBiometricAuth}
            disabled={isAuthenticating}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm0 2c4.96 0 9 4.04 9 9 0 1.42-.33 2.76-.92 3.96-.15-.44-.4-.84-.74-1.18-.34-.34-.74-.59-1.18-.74C19.76 14.76 20 13.42 20 12c0-4.41-3.59-8-8-8s-8 3.59-8 8c0 1.42.24 2.76.84 3.96-.44.15-.84.4-1.18.74-.34.34-.59.74-.74 1.18C4.33 14.76 4 13.42 4 12c0-4.96 4.04-9 9-9z"/>
                </svg>
                Authenticate with Biometrics
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSetupBiometric}
            disabled={isAuthenticating}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Setting up...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Set Up Biometric Authentication
              </>
            )}
          </button>
        )}

        <button
          onClick={onFallbackToPassword}
          className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors border border-gray-600 rounded-lg hover:border-gray-500"
        >
          Use Password Instead
        </button>
      </div>
    </div>
  );
};
