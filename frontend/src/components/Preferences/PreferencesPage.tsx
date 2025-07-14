import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

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

const PreferencesPage: React.FC = () => {
  const { user, updateUserPreferences } = useAuth();
  const [preferences, setPreferences] = useState({
    categories: [] as string[],
    price_range: { min: 0, max: 50000 },
    interests: [] as string[],
    gift_occasions: [] as string[],
    reward_types: [] as string[],
    preferred_brands: [] as string[],
    delivery_preferences: {
      preferred_delivery_time: "business_hours",
      address_type: "office"
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

  useEffect(() => {
    fetchCategories();
    fetchRewardTypes();
    if (user?.preferences) {
      setPreferences({ ...preferences, ...user.preferences });
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/preferences/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRewardTypes = async () => {
    try {
      const response = await axios.get(`${API}/preferences/reward-types`);
      setRewardTypes(response.data);
    } catch (error) {
      console.error('Error fetching reward types:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const result = await updateUserPreferences(preferences);
    setLoading(false);
    
    if (result.success) {
      alert('Preferences updated successfully! 🎉');
    } else {
      alert('Failed to update preferences: ' + result.error);
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    const newCategories = preferences.categories.includes(categoryValue)
      ? preferences.categories.filter(c => c !== categoryValue)
      : [...preferences.categories, categoryValue];
    setPreferences({ ...preferences, categories: newCategories });
  };

  const handleRewardTypeChange = (typeValue: string) => {
    const newTypes = preferences.reward_types.includes(typeValue)
      ? preferences.reward_types.filter(t => t !== typeValue)
      : [...preferences.reward_types, typeValue];
    setPreferences({ ...preferences, reward_types: newTypes });
  };

  const addInterest = () => {
    if (newInterest.trim() && !preferences.interests.includes(newInterest.trim())) {
      setPreferences({
        ...preferences,
        interests: [...preferences.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setPreferences({
      ...preferences,
      interests: preferences.interests.filter(i => i !== interest)
    });
  };

  const addBrand = () => {
    if (newBrand.trim() && !preferences.preferred_brands.includes(newBrand.trim())) {
      setPreferences({
        ...preferences,
        preferred_brands: [...preferences.preferred_brands, newBrand.trim()]
      });
      setNewBrand('');
    }
  };

  const removeBrand = (brand: string) => {
    setPreferences({
      ...preferences,
      preferred_brands: preferences.preferred_brands.filter(b => b !== brand)
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Preferences 🇮🇳</h1>
        <p className="mt-2 text-gray-600">
          Customize your experience to get personalized Indian market recommendations
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <label key={category.value} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.categories.includes(category.value)}
                  onChange={() => handleCategoryChange(category.value)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{category.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Range (INR)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Price (₹)
              </label>
              <input
                type="number"
                value={preferences.price_range.min}
                onChange={(e) => setPreferences({
                  ...preferences,
                  price_range: { ...preferences.price_range, min: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Price (₹)
              </label>
              <input
                type="number"
                value={preferences.price_range.max}
                onChange={(e) => setPreferences({
                  ...preferences,
                  price_range: { ...preferences.price_range, max: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Current range: ₹{preferences.price_range.min.toLocaleString('en-IN')} - ₹{preferences.price_range.max.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Reward Types */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Reward Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rewardTypes.map((type) => (
              <label key={type.value} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.reward_types.includes(type.value)}
                  onChange={() => handleRewardTypeChange(type.value)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Interests</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add an interest"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
            />
            <button
              onClick={addInterest}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.interests.map((interest) => (
              <span
                key={interest}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Brands */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Indian Brands</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Add a preferred brand (e.g., Tanishq, Myntra, Flipkart)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addBrand()}
            />
            <button
              onClick={addBrand}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.preferred_brands.map((brand) => (
              <span
                key={brand}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {brand}
                <button
                  onClick={() => removeBrand(brand)}
                  className="ml-2 text-green-600 hover:text-green-800 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Delivery Preferences */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Delivery Time
              </label>
              <select
                value={preferences.delivery_preferences.preferred_delivery_time}
                onChange={(e) => setPreferences({
                  ...preferences,
                  delivery_preferences: {
                    ...preferences.delivery_preferences,
                    preferred_delivery_time: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="business_hours">Business Hours (9 AM - 6 PM)</option>
                <option value="evening">Evening (6 PM - 9 PM)</option>
                <option value="weekend">Weekend</option>
                <option value="anytime">Anytime</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Address Type
              </label>
              <select
                value={preferences.delivery_preferences.address_type}
                onChange={(e) => setPreferences({
                  ...preferences,
                  delivery_preferences: {
                    ...preferences.delivery_preferences,
                    address_type: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="office">Office</option>
                <option value="home">Home</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            {Object.entries(preferences.notification_preferences).map(([key, value]) => (
              <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    notification_preferences: {
                      ...preferences.notification_preferences,
                      [key]: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;