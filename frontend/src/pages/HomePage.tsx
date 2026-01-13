import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegionCurrencySelector from '../components/Common/RegionCurrencySelector';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide">RewardHub</span>
          <RegionCurrencySelector label="Region" align="right" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-semibold">
              Recognize great work. Redeem meaningful rewards.
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
              A simple way to celebrate teams and deliver rewards that matter.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/setup')}
              className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-md font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Set up organization
            </button>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden />
              Recognition
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden />
              Points
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden />
              Rewards
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-gray-500">
          © RewardHub
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
