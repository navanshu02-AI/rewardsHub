import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../lib/api';

interface SettingsContextValue {
  aiEnabled: boolean;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await api.get<{ ai_enabled: boolean }>('/settings');
        if (isMounted) {
          setAiEnabled(Boolean(response.data?.ai_enabled));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        if (isMounted) {
          setAiEnabled(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ aiEnabled, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
