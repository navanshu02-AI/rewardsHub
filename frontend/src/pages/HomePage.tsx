import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegionCurrencySelector from '../components/Common/RegionCurrencySelector';
import { REGION_CONFIG, useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { region, currency } = useAuth();

  const activeRegion = REGION_CONFIG[region];

  const partners = [
    {
      name: 'Amazon',
      descriptor: 'Global ecommerce coverage',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <path
            fill="#FF9900"
            d="M97 42c-12 7-33 14-48 12-9-1-17-3-23-6a1.2 1.2 0 01.9-2.1c8 2 15 3 24 3 13 0 29-4 40-10a1 1 0 011 1.7z"
          />
          <path
            fill="#111827"
            d="M89 35c-2 2-5 3-7 3s-3-1-3-3c0-5 6-5 10-5v-1c0-2-1-3-3-3a12 12 0 00-6 2l-1-4c2-2 5-3 8-3 6 0 9 3 9 9v8c0 1 0 3 1 4h-6zm-4-5c-2 0-4 0-4 2 0 1 1 2 2 2s2-1 2-2zM43 25c2 0 4 0 5 1v6a10 10 0 00-5-1c-3 0-6 2-6 6s3 5 6 5a11 11 0 005-1v6a29 29 0 01-6 1c-5 0-11-3-11-11 0-7 5-12 12-12zm51 10c0-3 0-6-1-9h6l1 3h1c1-2 3-4 6-4 1 0 2 0 3 1l-2 6c-1-1-2-1-3-1-2 0-3 1-3 4v9h-8zm-75 0c0 3 0 5 2 5s2-2 2-5v-9h7v10c0 7-4 9-9 9-1 0-2 0-3-1v-5c1 1 2 1 3 1s2-1 2-4v-10h-6zm53-12c2 0 4 0 5 1v6a10 10 0 00-5-1c-3 0-6 2-6 6s3 5 6 5a11 11 0 005-1v6a29 29 0 01-6 1c-5 0-11-3-11-11 0-7 5-12 12-12z"
          />
        </svg>
      ),
    },
    {
      name: 'Best Buy',
      descriptor: 'Electronics everywhere',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <rect x="10" y="12" width="90" height="36" rx="8" fill="#FFDD00" />
          <path
            d="M20 22h30v16H20zM56 22h32v6H56zM56 32h32v6H56z"
            fill="#0B1F41"
            opacity="0.95"
          />
          <circle cx="96" cy="30" r="7" fill="#0B1F41" />
        </svg>
      ),
    },
    {
      name: 'Zalando',
      descriptor: 'Fashion-first discovery',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <path
            d="M25 30c0-9 6-14 17-14 15 0 32 8 45 8 5 0 8-1 8-1s-3 5-8 9c-10 8-24 12-37 12-17 0-25-6-25-14z"
            fill="#F46A2B"
          />
        </svg>
      ),
    },
    {
      name: 'Myntra',
      descriptor: 'Local style favorites',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <path d="M45 44L34 18h9l6 16 6-16h9L53 44z" fill="#F0528D" />
          <path d="M58 44l11-26h9L67 44z" fill="#F79E1B" />
          <path d="M49 44L38 18h-8l13 26z" fill="#8C52FF" />
        </svg>
      ),
    },
    {
      name: 'Sephora',
      descriptor: 'Beauty & wellbeing',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <rect x="20" y="10" width="80" height="40" rx="6" fill="#0E0E0E" />
          <path d="M65 14c-7 12-7 20 0 32" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'Tesco',
      descriptor: 'Groceries close by',
      logo: (
        <svg viewBox="0 0 120 60" className="h-8" role="img" aria-hidden>
          <rect x="15" y="15" width="90" height="30" rx="6" fill="#FFFFFF" stroke="#1A3FAA" strokeWidth="3" />
          <g fill="#D6001C">
            <rect x="24" y="20" width="14" height="4" rx="2" />
            <rect x="44" y="20" width="14" height="4" rx="2" />
            <rect x="64" y="20" width="14" height="4" rx="2" />
            <rect x="84" y="20" width="14" height="4" rx="2" />
          </g>
          <g fill="#1A3FAA">
            <rect x="28" y="34" width="10" height="3" rx="1.5" />
            <rect x="48" y="34" width="10" height="3" rx="1.5" />
            <rect x="68" y="34" width="10" height="3" rx="1.5" />
            <rect x="88" y="34" width="10" height="3" rx="1.5" />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-60 pointer-events-none" aria-hidden="true">
          <div className="w-[60%] h-[60%] bg-gradient-to-br from-blue-200/60 via-indigo-100/60 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 relative">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">Now available globally</div>
                <RegionCurrencySelector label="Choose your region & currency" align="right" />
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
                Reward teams everywhere with local care
                <span className="text-2xl block mt-2 text-blue-700">{activeRegion.flag} Built for {activeRegion.label}</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl">
                Global recognition that feels personal—localized rewards, pricing, and cultural nuance for every team member.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Start free
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-blue-700 font-semibold flex items-center gap-2 hover:text-blue-800"
                >
                  Book a demo
                  <span aria-hidden>→</span>
                </button>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="flex items-center bg-white/80 backdrop-blur p-3 rounded-lg shadow-sm border border-blue-50">
                  <span className="text-green-500 mr-2">✓</span>
                  Local payouts in {currency}
                </div>
                <div className="flex items-center bg-white/80 backdrop-blur p-3 rounded-lg shadow-sm border border-blue-50">
                  <span className="text-green-500 mr-2">✓</span>
                  Region-tuned reward catalogs
                </div>
                <div className="flex items-center bg-white/80 backdrop-blur p-3 rounded-lg shadow-sm border border-blue-50">
                  <span className="text-green-500 mr-2">✓</span>
                  Culture-smart celebrations
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:w-5/12">
              <img
                src="https://images.unsplash.com/photo-1573497491765-dccce02d84dc"
                alt="Global team celebrating"
                className="w-full rounded-2xl shadow-xl ring-1 ring-indigo-100"
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
      <div className="py-16 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Trusted by teams across regions
            </h2>
            <p className="mt-3 text-base text-gray-500">
              Leading marketplaces and brands your people already love
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 items-stretch">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="group bg-white/70 border border-gray-200/80 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-100"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-full bg-slate-100/80 rounded-lg py-3 flex items-center justify-center transition-colors duration-200 group-hover:bg-white">
                    {partner.logo}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{partner.name}</div>
                  <div className="text-xs text-gray-500 truncate">{partner.descriptor}</div>
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