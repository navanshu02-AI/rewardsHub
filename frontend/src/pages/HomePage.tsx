import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegionCurrencySelector from '../components/Common/RegionCurrencySelector';
import { REGION_CONFIG, useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { region, currency } = useAuth();

  const activeRegion = REGION_CONFIG[region];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">Now available globally</div>
                <RegionCurrencySelector label="Choose your region & currency" align="right" />
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                Recognize & Reward
                <span className="text-blue-600"> Excellence Anywhere</span>
                <span className="text-2xl block mt-2">{activeRegion.flag} Optimized for {activeRegion.label}</span>
              </h1>
              <p className="mt-4 text-xl text-gray-500">
                Personalized rewards and recognition platform for distributed teams. Localized pricing, regional rewards,
                and cultural sensitivity no matter where your people work.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Book a Demo
                </button>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-500 mr-2">✓</span>
                  Multi-currency rewards ({currency})
                </div>
                <div className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-500 mr-2">✓</span>
                  Localized catalogs per region
                </div>
                <div className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-500 mr-2">✓</span>
                  Culture-aware celebrations
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:w-5/12">
              <img
                src="https://images.unsplash.com/photo-1573497491765-dccce02d84dc"
                alt="Global team celebrating"
                className="w-full rounded-lg shadow-xl"
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
              Built for Modern, Global Teams
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Recognition that feels local for every teammate, regardless of timezone
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Powered Local Recommendations</h3>
              <p className="mt-2 text-gray-500">
                Smart suggestions that respect local preferences, holidays, and cultural context
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Regional Catalogs</h3>
              <p className="mt-2 text-gray-500">
                Seamless integration with popular regional marketplaces and local favorites
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Cultural Recognition</h3>
              <p className="mt-2 text-gray-500">
                Celebrate achievements with culturally relevant rewards, messaging, and moments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Trusted by teams across regions
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Choose from thousands of products across leading marketplaces worldwide
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-6 gap-8 items-center">
            {['Amazon', 'Best Buy', 'Zalando', 'Myntra', 'Sephora', 'Tesco'].map((partner) => (
              <div key={partner} className="text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm font-medium text-gray-900">{partner}</div>
                </div>
              </div>
            ))}
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
            Join global companies already using RewardHub
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="mt-8 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Your Free Trial
          </button>
          <div className="mt-4 text-blue-200 text-sm">
            No credit card required • Setup in 5 minutes • Multi-currency support
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;