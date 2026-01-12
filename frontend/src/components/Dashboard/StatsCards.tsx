import React from 'react';
import { Link } from 'react-router-dom';

interface User {
  points_balance: number;
  total_points_earned: number;
  recognition_count: number;
}

interface StatsCardsProps {
  user: User | null;
  rewardsCount: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ user, rewardsCount }) => {
  const stats = [
    {
      title: 'Available Points',
      value: `${(user?.points_balance || 0).toLocaleString()} pts`,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      link: '/points'
    },
    {
      title: 'Total Earned',
      value: `${(user?.total_points_earned || 0).toLocaleString()} pts`,
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Available Rewards',
      value: rewardsCount.toString(),
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      bgColor: 'bg-green-100'
    },
    {
      title: 'Recognitions',
      value: (user?.recognition_count || 0).toString(),
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const cardContent = (
          <div className="flex items-center">
            <div className={`${stat.bgColor} rounded-full p-3`}>
              {stat.icon}
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-600 text-sm">{stat.title}</p>
            </div>
          </div>
        );

        const cardClassName =
          'bg-white p-6 rounded-lg shadow-sm border border-gray-200 transition-shadow hover:shadow-md';

        return stat.link ? (
          <Link key={index} to={stat.link} className={cardClassName}>
            {cardContent}
          </Link>
        ) : (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {cardContent}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
