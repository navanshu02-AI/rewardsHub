import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RegionCurrencySelector from '../Common/RegionCurrencySelector';
import { useAuth, REGION_CONFIG, Region, Currency } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

interface Category {
  value: string;
  label: string;
}

interface RewardType {
  value: string;
  label: string;
}

interface PriceRange {
  min: number;
  max: number;
}

interface PreferencesState {
  categories: string[];
  region: Region;
  currency: Currency;
  price_range: PriceRange;
  budget_ranges: Record<Currency, PriceRange>;
  interests: string[];
  gift_occasions: string[];
  reward_types: string[];
  preferred_brands: string[];
  delivery_preferences: {
    preferred_delivery_time: string;
    address_type: string;
  };
  notification_preferences: Record<string, boolean>;
}

const DEFAULT_BUDGET_RANGES: Record<Currency, PriceRange> = {
  INR: { min: 0, max: 50000 },
  USD: { min: 0, max: 600 },
  EUR: { min: 0, max: 550 }
};

const getCurrencySymbol = (currency: Currency) => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'INR':
    default:
      return '₹';
  }
};

const PreferencesPage: React.FC = () => {
  const { user, updateUserPreferences, region, currency, setRegionCurrency, formatCurrency } = useAuth();

  const [preferences, setPreferences] = useState<PreferencesState>({
    categories: [],
    region,
    currency,
    price_range: DEFAULT_BUDGET_RANGES[currency],
    budget_ranges: DEFAULT_BUDGET_RANGES,
    interests: [],
    gift_occasions: [],
    reward_types: [],
    preferred_brands: [],
    delivery_preferences: {
      preferred_delivery_time: 'business_hours',
      address_type: 'office'
    },
    notification_preferences: {
      email_notifications: true,
      recognition_alerts: true,
      recommendation_updates: true,
      achievement_reminders: true
    }
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchRewardTypes();
  }, []);

  useEffect(() => {
    if (user?.preferences) {
      const userPrefs: any = user.preferences || {};
      const userBudgetRanges = { ...DEFAULT_BUDGET_RANGES, ...(userPrefs.budget_ranges || {}) } as Record<Currency, PriceRange>;
      const derivedRegion = (userPrefs.region as Region) || region;
      const derivedCurrency = (userPrefs.currency as Currency) || REGION_CONFIG[derivedRegion].currency || currency;
      const derivedPriceRange =
        (userPrefs.price_range as PriceRange) || userBudgetRanges[derivedCurrency] || DEFAULT_BUDGET_RANGES[derivedCurrency];

      setPreferences((prev) => ({
        ...prev,
        ...userPrefs,
        region: derivedRegion,
        currency: derivedCurrency,
        budget_ranges: userBudgetRanges,
        price_range: derivedPriceRange
      }));

      if (derivedRegion && REGION_CONFIG[derivedRegion]) {
        setRegionCurrency(derivedRegion, derivedCurrency);
      }
    }
  }, [user, region, currency, setRegionCurrency]);

  useEffect(() => {
    const priceRange = preferences.budget_ranges[currency] || DEFAULT_BUDGET_RANGES[currency];
    setPreferences((prev) => ({ ...prev, region, currency, price_range: priceRange }));
  }, [region, currency]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/preferences/categories`);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRewardTypes = async () => {
    try {
      const response = await axios.get(`${API}/preferences/reward-types`);
      setRewardTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching reward types:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const result = await updateUserPreferences(preferences as any);
    setLoading(false);
    if (result.success) {
      setToastMessage('Preferences updated successfully! 🎉');
    } else {
      alert('Failed to update preferences: ' + result.error);
    }
  };

  const toggleCategory = (value: string) => {
    setPreferences((prev) => ({
      ...prev,
      categories: prev.categories.includes(value) ? prev.categories.filter((c) => c !== value) : [...prev.categories, value]
    }));
  };

  const toggleRewardType = (value: string) => {
    setPreferences((prev) => ({
      ...prev,
      reward_types: prev.reward_types.includes(value) ? prev.reward_types.filter((t) => t !== value) : [...prev.reward_types, value]
    }));
  };

  const addInterest = () => {
    const v = newInterest.trim();
    if (!v || preferences.interests.includes(v)) return;
    setPreferences((prev) => ({ ...prev, interests: [...prev.interests, v] }));
    setNewInterest('');
  };

  const removeInterest = (interest: string) =>
    setPreferences((prev) => ({ ...prev, interests: prev.interests.filter((i) => i !== interest) }));

  const addBrand = () => {
    const v = newBrand.trim();
    if (!v || preferences.preferred_brands.includes(v)) return;
    setPreferences((prev) => ({ ...prev, preferred_brands: [...prev.preferred_brands, v] }));
    setNewBrand('');
  };

  const removeBrand = (brand: string) =>
    setPreferences((prev) => ({ ...prev, preferred_brands: prev.preferred_brands.filter((b) => b !== brand) }));

  const handleRegionChange = (selectedRegion: Region) => {
    const newCurrency = REGION_CONFIG[selectedRegion].currency;
    const newPriceRange = preferences.budget_ranges[newCurrency] || DEFAULT_BUDGET_RANGES[newCurrency];
    setPreferences((prev) => ({ ...prev, region: selectedRegion, currency: newCurrency, price_range: newPriceRange }));
    setRegionCurrency(selectedRegion, newCurrency);
  };

  const handleCurrencyChange = (currencyCode: Currency) => {
    const newRange = preferences.budget_ranges[currencyCode] || DEFAULT_BUDGET_RANGES[currencyCode];
    setPreferences((prev) => ({ ...prev, currency: currencyCode, price_range: newRange }));
    setRegionCurrency(region, currencyCode);
  };

  const updatePriceRange = (key: 'min' | 'max', value: number) => {
    setPreferences((prev) => {
      const updatedRange = { ...prev.price_range, [key]: value };
      return {
        ...prev,
        price_range: updatedRange,
        budget_ranges: { ...prev.budget_ranges, [prev.currency]: updatedRange }
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toastMessage && (
        <div className="notification-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Preferences {REGION_CONFIG[region].flag}</h1>
        <p className="mt-2 text-gray-600">Customize your experience to get localized recommendations, pricing, and rewards.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Region & Currency</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-gray-600">
            Select where your team operates to see rewards priced in your local currency. You can still override the currency below.
          </p>
          <RegionCurrencySelector label="Primary region" onChange={(r) => handleRegionChange(r as Region)} align="right" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={preferences.currency}
            onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {(Object.keys(REGION_CONFIG) as Region[]).map((r) => (
              <option key={r} value={REGION_CONFIG[r].currency}>
                {REGION_CONFIG[r].flag} {REGION_CONFIG[r].currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <label key={category.value} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={preferences.categories.includes(category.value)} onChange={() => toggleCategory(category.value)} className="mr-3" />
              <span className="text-sm font-medium text-gray-700">{category.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Range ({preferences.currency})</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Price ({getCurrencySymbol(preferences.currency)})</label>
            <input type="number" value={preferences.price_range.min} onChange={(e) => updatePriceRange('min', Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Price ({getCurrencySymbol(preferences.currency)})</label>
            <input type="number" value={preferences.price_range.max} onChange={(e) => updatePriceRange('max', Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Current range: {formatCurrency(preferences.price_range.min, preferences.currency)} - {formatCurrency(preferences.price_range.max, preferences.currency)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Reward Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rewardTypes.map((type) => (
            <label key={type.value} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={preferences.reward_types.includes(type.value)} onChange={() => toggleRewardType(type.value)} className="mr-3" />
              <span className="text-sm font-medium text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Interests</h2>
        <div className="flex gap-2 mb-4">
          <input type="text" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="Add an interest" className="flex-1 px-3 py-2 border rounded" onKeyPress={(e) => e.key === 'Enter' && addInterest()} />
          <button onClick={addInterest} className="bg-blue-600 text-white px-4 py-2 rounded">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {preferences.interests.map((i) => (
            <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
              {i}
              <button onClick={() => removeInterest(i)} className="ml-2 text-blue-600">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Brands</h2>
        <div className="flex gap-2 mb-4">
          <input type="text" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Add a preferred brand" className="flex-1 px-3 py-2 border rounded" onKeyPress={(e) => e.key === 'Enter' && addBrand()} />
          <button onClick={addBrand} className="bg-green-600 text-white px-4 py-2 rounded">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {preferences.preferred_brands.map((brand) => (
            <span key={brand} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
              {brand}
              <button onClick={() => removeBrand(brand)} className="ml-2 text-green-600">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Delivery Time</label>
            <select
              value={preferences.delivery_preferences.preferred_delivery_time}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  delivery_preferences: { ...prev.delivery_preferences, preferred_delivery_time: e.target.value }
                }))
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="business_hours">Business Hours (9 AM - 6 PM)</option>
              <option value="evening">Evening (6 PM - 9 PM)</option>
              <option value="weekend">Weekend</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Address Type</label>
            <select
              value={preferences.delivery_preferences.address_type}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  delivery_preferences: { ...prev.delivery_preferences, address_type: e.target.value }
                }))
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="office">Office</option>
              <option value="home">Home</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          {Object.entries(preferences.notification_preferences).map(([key, value]) => (
            <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notification_preferences: {
                      ...prev.notification_preferences,
                      [key]: e.target.checked
                    }
                  }))
                }
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default PreferencesPage;
