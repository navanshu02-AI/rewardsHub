import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUserPreferences = async (preferences) => {
    try {
      const response = await axios.put(`${API}/users/me/preferences`, preferences);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateUserPreferences,
      loading,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate('/dashboard')}>
          RewardHub
        </h1>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <button
                onClick={() => navigate('/preferences')}
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
              >
                Preferences
              </button>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {user.points_balance} pts
              </span>
              <span>Hi, {user.first_name}!</span>
              <button onClick={logout} className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                Recognize & Reward
                <span className="text-blue-600"> Excellence</span>
              </h1>
              <p className="mt-4 text-xl text-gray-500">
                Personalized rewards and recognition platform that understands your preferences 
                and integrates seamlessly with any e-commerce system.
              </p>
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <img
                src="https://images.unsplash.com/photo-1573878411897-35205a33028f"
                alt="Team Recognition"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Choose RewardHub?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Advanced personalization meets seamless integration
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Personalized Recommendations</h3>
              <p className="mt-2 text-gray-500">
                AI-powered suggestions based on your preferences, history, and behavior
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">E-commerce Integration</h3>
              <p className="mt-2 text-gray-500">
                Seamless API integration with any e-commerce platform
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Team Recognition</h3>
              <p className="mt-2 text-gray-500">
                Foster a culture of appreciation with peer-to-peer recognition
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to Transform Your Recognition Program?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join thousands of companies already using RewardHub
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="mt-8 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Your Free Trial
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department: '',
    company: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      } else {
        const result = await register(formData);
        if (result.success) {
          setIsLogin(true);
          setError('');
          alert('Registration successful! Please login.');
        } else {
          setError(result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-b-md' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Password"
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <input
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <input
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <input
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Department (optional)"
                  />
                </div>
                <div>
                  <input
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Company (optional)"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [partners, setPartners] = useState([]);
  const [users, setUsers] = useState([]);
  const [recognitions, setRecognitions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecognitionForm, setShowRecognitionForm] = useState(false);
  const [showGiftForm, setShowGiftForm] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    fetchRewards();
    fetchPartners();
    fetchUsers();
    fetchRecognitions();
    fetchRedemptions();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API}/recommendations`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/rewards`);
      setRewards(response.data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await axios.get(`${API}/ecommerce/partners`);
      setPartners(response.data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRecognitions = async () => {
    try {
      const response = await axios.get(`${API}/recognition/received`);
      setRecognitions(response.data);
    } catch (error) {
      console.error('Error fetching recognitions:', error);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const response = await axios.get(`${API}/redemptions`);
      setRedemptions(response.data);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    }
  };

  const seedRewards = async () => {
    try {
      await axios.post(`${API}/admin/seed-rewards`);
      fetchRewards();
      alert('Indian market rewards added successfully!');
    } catch (error) {
      console.error('Error seeding rewards:', error);
    }
  };

  const assignPoints = async (userId, points) => {
    try {
      await axios.post(`${API}/admin/assign-points/${userId}`, null, {
        params: { points }
      });
      fetchUsers();
      alert(`Successfully assigned ${points} points!`);
    } catch (error) {
      console.error('Error assigning points:', error);
      alert('Error assigning points');
    }
  };

  const redeemReward = async (rewardId) => {
    try {
      const response = await axios.post(`${API}/redeem`, { reward_id: rewardId });
      alert(`Reward redeemed successfully! ${response.data.message}`);
      fetchRedemptions();
      // Refresh user data to update points
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error redeeming reward');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Your personalized rewards and recognition dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{user?.points_balance || 0}</p>
              <p className="text-gray-600">Available Points</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{user?.total_points_earned || 0}</p>
              <p className="text-gray-600">Total Earned</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{rewards.length}</p>
              <p className="text-gray-600">Available Rewards</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{user?.recognition_count || 0}</p>
              <p className="text-gray-600">Recognitions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowRecognitionForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Give Recognition
          </button>
          <button
            onClick={() => setShowGiftForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Recommend Gift
          </button>
          <button
            onClick={() => window.location.href = '/preferences'}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Update Preferences
          </button>
        </div>
      </div>

      {/* Admin Controls */}
      {user?.role === 'hr_admin' && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <button
              onClick={seedRewards}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-4"
            >
              Seed Indian Market Rewards
            </button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Assign Points to Users:</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-white p-3 rounded">
                  <span className="text-sm">
                    {user.first_name} {user.last_name} ({user.email}) - {user.points_balance} pts
                  </span>
                  <button
                    onClick={() => assignPoints(user.id, 1000)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    +1000 Points
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* E-commerce Partners */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Shop with Our Indian Partners</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <div key={partner.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="w-full h-40 object-cover rounded-t-lg"
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{partner.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{partner.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {partner.categories.map((category) => (
                    <span key={category} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {category}
                    </span>
                  ))}
                </div>
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Visit Store
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.rewards && recommendations.rewards.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">{recommendations.reason}</p>
              <p className="text-xs text-gray-500">Confidence: {Math.round(recommendations.confidence_score * 100)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.rewards.slice(0, 3).map((reward) => (
              <div key={reward.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <img
                  src={reward.image_url || 'https://images.unsplash.com/photo-1543465077-db45d34aa2ab'}
                  alt={reward.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                    {reward.brand && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {reward.brand}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                  {reward.original_price_inr && reward.original_price_inr > reward.price_inr && (
                    <p className="text-xs text-red-600 mt-1">
                      Save ₹{(reward.original_price_inr - reward.price_inr).toLocaleString('en-IN')}
                    </p>
                  )}
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">{reward.points_required} pts</span>
                    <span className="text-sm text-gray-500">₹{reward.price_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    onClick={() => redeemReward(reward.id)}
                    disabled={user?.points_balance < reward.points_required}
                    className="w-full mt-3 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {user?.points_balance >= reward.points_required ? 'Redeem Now' : 'Insufficient Points'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Rewards */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Rewards Catalog</h2>
        </div>
        {rewards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <img
                  src={reward.image_url || 'https://images.unsplash.com/photo-1543465077-db45d34aa2ab'}
                  alt={reward.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                    <div className="flex flex-col items-end">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                        {reward.category.replace('_', ' ')}
                      </span>
                      {reward.brand && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {reward.brand}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                  {reward.rating && (
                    <div className="flex items-center mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < Math.floor(reward.rating) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500 ml-2">({reward.review_count})</span>
                    </div>
                  )}
                  {reward.original_price_inr && reward.original_price_inr > reward.price_inr && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 line-through">₹{reward.original_price_inr.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-red-600 ml-2">
                        Save ₹{(reward.original_price_inr - reward.price_inr).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">{reward.points_required} pts</span>
                    <span className="text-sm text-gray-500">₹{reward.price_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Delivery: {reward.delivery_time || '3-5 business days'}
                  </div>
                  <button
                    onClick={() => redeemReward(reward.id)}
                    disabled={user?.points_balance < reward.points_required || reward.availability <= 0}
                    className="w-full mt-3 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {reward.availability <= 0 ? 'Out of Stock' : 
                     user?.points_balance >= reward.points_required ? 'Redeem Now' : 'Insufficient Points'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No rewards available yet. Add some Indian market rewards to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PreferencesPage = () => {
  const { user, updateUserPreferences } = useAuth();
  const [preferences, setPreferences] = useState({
    categories: [],
    price_range: { min: 0, max: 50000 },
    interests: [],
    gift_occasions: [],
    reward_types: [],
    preferred_brands: [],
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
  const [categories, setCategories] = useState([]);
  const [rewardTypes, setRewardTypes] = useState([]);
  const [loading, setLoading] = useState(false);

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
      alert('Preferences updated successfully!');
    } else {
      alert('Failed to update preferences: ' + result.error);
    }
  };

  const handleCategoryChange = (categoryValue) => {
    const newCategories = preferences.categories.includes(categoryValue)
      ? preferences.categories.filter(c => c !== categoryValue)
      : [...preferences.categories, categoryValue];
    setPreferences({ ...preferences, categories: newCategories });
  };

  const handleRewardTypeChange = (typeValue) => {
    const newTypes = preferences.reward_types.includes(typeValue)
      ? preferences.reward_types.filter(t => t !== typeValue)
      : [...preferences.reward_types, typeValue];
    setPreferences({ ...preferences, reward_types: newTypes });
  };

  const handleInterestAdd = (interest) => {
    if (interest.trim() && !preferences.interests.includes(interest.trim())) {
      setPreferences({
        ...preferences,
        interests: [...preferences.interests, interest.trim()]
      });
    }
  };

  const handleInterestRemove = (interest) => {
    setPreferences({
      ...preferences,
      interests: preferences.interests.filter(i => i !== interest)
    });
  };

  const handleBrandAdd = (brand) => {
    if (brand.trim() && !preferences.preferred_brands.includes(brand.trim())) {
      setPreferences({
        ...preferences,
        preferred_brands: [...preferences.preferred_brands, brand.trim()]
      });
    }
  };

  const handleBrandRemove = (brand) => {
    setPreferences({
      ...preferences,
      preferred_brands: preferences.preferred_brands.filter(b => b !== brand)
    });
  };
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
        <p className="mt-2 text-gray-600">
          Customize your experience to get personalized Indian market recommendations
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <label key={category.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.categories.includes(category.value)}
                  onChange={() => handleCategoryChange(category.value)}
                  className="mr-2"
                />
                {category.label}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Reward Types */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Reward Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rewardTypes.map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.reward_types.includes(type.value)}
                  onChange={() => handleRewardTypeChange(type.value)}
                  className="mr-2"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Interests</h2>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Add an interest (press Enter)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleInterestAdd(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.interests.map((interest) => (
              <span
                key={interest}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {interest}
                <button
                  onClick={() => handleInterestRemove(interest)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Brands */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Brands</h2>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Add a preferred brand (press Enter)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleBrandAdd(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.preferred_brands.map((brand) => (
              <span
                key={brand}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {brand}
                <button
                  onClick={() => handleBrandRemove(brand)}
                  className="ml-2 text-green-600 hover:text-green-800"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label key={key} className="flex items-center">
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
                  className="mr-3"
                />
                <span className="capitalize">
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
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <NavBar />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/preferences"
              element={
                <ProtectedRoute>
                  <NavBar />
                  <PreferencesPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;