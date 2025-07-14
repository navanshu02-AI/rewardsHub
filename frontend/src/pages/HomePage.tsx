import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
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
                <span className="text-2xl block mt-2">🇮🇳 Made for India</span>
              </h1>
              <p className="mt-4 text-xl text-gray-500">
                Personalized rewards and recognition platform designed for Indian enterprises. 
                Seamlessly integrates with popular Indian e-commerce platforms and understands 
                local preferences.
              </p>
              <div className="mt-8 flex space-x-4">
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
                  Learn More
                </button>
              </div>
              <div className="mt-6 flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <span className="text-green-500 mr-1">✓</span>
                  INR Currency Support
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-1">✓</span>
                  Indian E-commerce Integration
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-1">✓</span>
                  Local Brand Preferences
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <img
                src="https://images.unsplash.com/photo-1573878411897-35205a33028f"
                alt="Team Recognition in India"
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
              Why Choose RewardHub India?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Built specifically for the Indian market with local insights
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Powered Indian Recommendations</h3>
              <p className="mt-2 text-gray-500">
                Smart suggestions based on Indian preferences, festivals, and cultural context
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Indian E-commerce Integration</h3>
              <p className="mt-2 text-gray-500">
                Seamless integration with Flipkart, Amazon India, Myntra, Nykaa, and more
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
                Celebrate achievements with culturally relevant rewards and recognition
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indian Partners Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Integrated with India's Top Platforms
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Choose from thousands of products across leading Indian e-commerce sites
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-6 gap-8 items-center">
            {['Amazon India', 'Flipkart', 'Myntra', 'Nykaa', 'BigBasket', 'BookMyShow'].map((partner) => (
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
            Join Indian companies already using RewardHub India
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="mt-8 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Your Free Trial
          </button>
          <div className="mt-4 text-blue-200 text-sm">
            No credit card required • Setup in 5 minutes • INR currency support
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;