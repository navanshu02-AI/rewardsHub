import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          RewardHub
        </h1>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <button
                onClick={() => navigate('/preferences')}
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                Preferences
              </button>
              <button
                onClick={() => navigate('/recognitions')}
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                Recognitions
              </button>
              <span className="flex items-center bg-blue-700 px-3 py-1 rounded">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {user.points_balance.toLocaleString()} pts
              </span>
              <span className="text-sm">Hi, {user.first_name}!</span>
              <button 
                onClick={logout} 
                className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;