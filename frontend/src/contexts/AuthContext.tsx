import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

export type UserRole = 'employee' | 'manager' | 'hr_admin' | 'executive' | 'c_level';

export type Region = 'india' | 'usa' | 'europe';
export type Currency = 'INR' | 'USD' | 'EUR';

export const REGION_CONFIG: Record<Region, { label: string; currency: Currency; locale: string; flag: string }> = {
  india: { label: 'India', currency: 'INR', locale: 'en-IN', flag: '🇮🇳' },
  usa: { label: 'United States', currency: 'USD', locale: 'en-US', flag: '🇺🇸' },
  europe: { label: 'Europe', currency: 'EUR', locale: 'de-DE', flag: '🇪🇺' }
};

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department?: string;
  company?: string;
  employee_id?: string;
  location?: string;
  avatar_url?: string;
  points_balance: number;
  total_points_earned: number;
  recognition_count: number;
  monthly_points_allowance?: number;
  monthly_points_spent?: number;
  preferences: Record<string, any>;
  created_at: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  setAuthSession: (accessToken: string, orgId?: string) => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetToken?: string; message?: string; expiresAt?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  updateUserPreferences: (preferences: any) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  region: Region;
  currency: Currency;
  setRegionCurrency: (region: Region, currency: Currency) => void;
  formatCurrency: (amount: number, currencyOverride?: Currency) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [region, setRegion] = useState<Region>('india');
  const [currency, setCurrency] = useState<Currency>('INR');

  const formatCurrency = React.useCallback(
    (amount: number, currencyOverride?: Currency) => {
      const activeCurrency = currencyOverride || currency;
      const activeRegion = (Object.keys(REGION_CONFIG) as Region[]).find(
        (key) => REGION_CONFIG[key].currency === activeCurrency
      ) as Region | undefined;

      const locale = activeRegion ? REGION_CONFIG[activeRegion].locale : 'en-US';

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: activeCurrency,
        maximumFractionDigits: 0
      }).format(amount);
    },
    [currency]
  );

  const setRegionCurrency = (newRegion: Region, newCurrency: Currency) => {
    setRegion(newRegion);
    setCurrency(newCurrency);
    localStorage.setItem('region', newRegion);
    localStorage.setItem('currency', newCurrency);
  };

  const fetchUserProfile = React.useCallback(async (toggleLoading: boolean = true) => {
    if (toggleLoading) {
      setLoading(true);
    }
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
      const preferenceRegion = response.data?.preferences?.region as Region | undefined;
      const preferenceCurrency = response.data?.preferences?.currency as Currency | undefined;

      if (preferenceRegion && REGION_CONFIG[preferenceRegion]) {
        setRegion(preferenceRegion);
        setCurrency(preferenceCurrency || REGION_CONFIG[preferenceRegion].currency);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      if (toggleLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const storedRegion = localStorage.getItem('region') as Region | null;
    const storedCurrency = localStorage.getItem('currency') as Currency | null;

    if (storedRegion && REGION_CONFIG[storedRegion]) {
      setRegion(storedRegion);
      setCurrency(storedCurrency || REGION_CONFIG[storedRegion].currency);
    }

    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserProfile]);

  const setAuthSession = React.useCallback((accessToken: string, orgId?: string) => {
    localStorage.setItem('token', accessToken);
    if (orgId) {
      localStorage.setItem('orgId', orgId);
    }
    setToken(accessToken);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      setAuthSession(access_token);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return {
        success: true,
        resetToken: response.data?.reset_token,
        message: response.data?.message,
        expiresAt: response.data?.expires_at
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Unable to send reset email' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      return { success: true, message: response.data?.message };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Unable to reset password' };
    }
  };

  const updateUserPreferences = async (preferences: any) => {
    try {
      const response = await api.put('/users/me/preferences', preferences);
      setUser(response.data);
      if (preferences.region && REGION_CONFIG[preferences.region as Region]) {
        const preferredRegion = preferences.region as Region;
        const preferredCurrency = (preferences.currency as Currency) || REGION_CONFIG[preferredRegion].currency;
        setRegionCurrency(preferredRegion, preferredCurrency);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      setAuthSession,
      requestPasswordReset,
      resetPassword,
      logout,
      updateUserPreferences,
      loading,
      isAuthenticated: !!token,
      refreshUser: () => fetchUserProfile(false),
      region,
      currency,
      setRegionCurrency,
      formatCurrency
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
