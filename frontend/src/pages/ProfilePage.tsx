import React from 'react';
import PreferencesPage from '../components/Preferences/PreferencesPage';

const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your recognition preferences and experience.</p>
      </header>

      <PreferencesPage />
    </div>
  );
};

export default ProfilePage;
