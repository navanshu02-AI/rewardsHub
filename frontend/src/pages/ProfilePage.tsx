import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, REGION_CONFIG } from '../contexts/AuthContext';
import PreferencesPage from '../components/Preferences/PreferencesPage';

type ProfileTab = 'profile' | 'preferences' | 'security';

const TAB_LABELS: Record<ProfileTab, string> = {
  profile: 'Profile',
  preferences: 'Preferences',
  security: 'Security'
};

const ProfilePage: React.FC = () => {
  const { user, region, currency } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ProfileTab | null;
  const [activeTab, setActiveTab] = React.useState<ProfileTab>(
    tabParam && Object.keys(TAB_LABELS).includes(tabParam) ? tabParam : 'profile'
  );

  React.useEffect(() => {
    if (tabParam && Object.keys(TAB_LABELS).includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('profile');
    }
  }, [tabParam]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const profileDetails = [
    { label: 'Name', value: user ? `${user.first_name} ${user.last_name}` : '—' },
    { label: 'Email', value: user?.email ?? '—' },
    { label: 'Role', value: user?.role ? user.role.replace('_', ' ') : '—' },
    { label: 'Region', value: `${REGION_CONFIG[region].label} ${REGION_CONFIG[region].flag}` },
    { label: 'Currency', value: currency }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-2 text-gray-600">Manage your profile, preferences, and account security in one place.</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex flex-wrap gap-4" aria-label="Profile tabs">
          {(Object.keys(TAB_LABELS) as ProfileTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Your details</h2>
            <p className="mt-2 text-sm text-gray-600">Keep your information up to date so teammates can recognize you.</p>
            <dl className="mt-6 space-y-4">
              {profileDetails.map((detail) => (
                <div key={detail.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-sm font-medium text-gray-500">{detail.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-6 text-sm text-blue-900">
            <h3 className="text-base font-semibold">Profile tips</h3>
            <ul className="mt-3 space-y-2">
              <li>Update your preferences to tailor reward recommendations.</li>
              <li>Visit the security tab to review password and sign-in settings.</li>
              <li>Check your region to ensure rewards are priced correctly.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && <PreferencesPage />}

      {activeTab === 'security' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage your password and review recent account activity to keep your account secure.
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Password</h3>
              <p className="mt-1 text-sm text-gray-600">Reset your password from the login screen if you need to change it.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Session reminders</h3>
              <p className="mt-1 text-sm text-gray-600">Remember to log out on shared devices to keep your account safe.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
