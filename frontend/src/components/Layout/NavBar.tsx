import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const initials = React.useMemo(() => {
    if (!user) return '';
    const firstInitial = user.first_name?.charAt(0) || '';
    const lastInitial = user.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/90 text-slate-900 border-b border-slate-200 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold uppercase tracking-tight text-blue-700 shadow-inner"
            aria-hidden
          >
            rh
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-lg font-semibold tracking-tight text-slate-800 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            RewardHub
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <button
                onClick={() => navigate('/recognitions')}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Recognitions
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-inner">
                <svg
                  className="h-4 w-4 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.176 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {user.points_balance.toLocaleString()} pts
              </span>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold uppercase text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`${user.first_name} ${user.last_name}`}
                >
                  {initials || 'U'}
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
                    role="menu"
                    aria-label="User menu"
                  >
                    <div className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {user.first_name} {user.last_name}
                    </div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/preferences');
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                      role="menuitem"
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                      Preferences
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:bg-rose-50 focus-visible:text-rose-700"
                      role="menuitem"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
