import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConsentContextType {
  consent: 'none' | 'essential' | 'all';
  setConsent: (consent: 'none' | 'essential' | 'all') => void;
  hasConsent: (type: 'essential' | 'analytics' | 'advertising') => boolean;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
};

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsentState] = useState<'none' | 'essential' | 'all'>('none');

  useEffect(() => {
    // Load consent from localStorage on mount
    const savedConsent = localStorage.getItem('user-consent');
    if (savedConsent && ['essential', 'all'].includes(savedConsent)) {
      setConsentState(savedConsent as 'essential' | 'all');
    }
  }, []);

  const setConsent = (newConsent: 'none' | 'essential' | 'all') => {
    setConsentState(newConsent);
    localStorage.setItem('user-consent', newConsent);
    localStorage.setItem('consent-timestamp', new Date().toISOString());
  };

  const hasConsent = (type: 'essential' | 'analytics' | 'advertising') => {
    switch (type) {
      case 'essential':
        return true; // Essential is always allowed
      case 'analytics':
        return consent === 'all';
      case 'advertising':
        return consent === 'all';
      default:
        return false;
    }
  };

  return (
    <ConsentContext.Provider value={{ consent, setConsent, hasConsent }}>
      {children}
    </ConsentContext.Provider>
  );
};
