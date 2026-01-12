import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const adminMenuRef = React.useRef<HTMLDivElement>(null);

  const isAdminUser = user?.role === 'hr_admin' || user?.role === 'executive' || user?.role === 'c_level';

  const initials = React.useMemo(() => {
    if (!user) return '';
    const firstInitial = user.first_name?.charAt(0) || '';
    const lastInitial = user.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const menuClicked = menuRef.current && menuRef.current.contains(targetNode);
      const adminClicked = adminMenuRef.current && adminMenuRef.current.contains(targetNode);
      if (!menuClicked) {
        setIsMenuOpen(false);
      }
      if (!adminClicked) {
        setIsAdminMenuOpen(false);
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
                onClick={() => navigate('/dashboard')}
                data-testid="nav-dashboard"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/recognitions')}
                data-testid="nav-recognitions"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Recognitions
              </button>
              <button
                onClick={() => navigate('/feed')}
                data-testid="nav-feed"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Feed
              </button>
              <button
                onClick={() => navigate('/redemptions')}
                data-testid="nav-redemptions"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Redemptions
              </button>
              {isAdminUser && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setIsAdminMenuOpen((open) => !open)}
                    data-testid="nav-admin-menu"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    aria-haspopup="menu"
                    aria-expanded={isAdminMenuOpen}
                  >
                    Admin
                  </button>

                  {isAdminMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                      role="menu"
                      aria-label="Admin menu"
                    >
                      <button
                        onClick={() => {
                          setIsAdminMenuOpen(false);
                          navigate('/admin/users');
                        }}
                        data-testid="nav-admin-users"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                        role="menuitem"
                      >
                        Manage users
                      </button>
                      <button
                        onClick={() => {
                          setIsAdminMenuOpen(false);
                          navigate('/admin/rewards');
                        }}
                        data-testid="nav-admin-rewards"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                        role="menuitem"
                      >
                        Manage rewards
                      </button>
                      <button
                        onClick={() => {
                          setIsAdminMenuOpen(false);
                          navigate('/admin/redemptions');
                        }}
                        data-testid="nav-all-redemptions"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                        role="menuitem"
                      >
                        All redemptions
                      </button>
                      {user.role === 'hr_admin' && (
                        <>
                          <button
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              navigate('/approvals');
                            }}
                            data-testid="nav-approvals"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                            role="menuitem"
                          >
                            Approvals
                          </button>
                          <button
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              navigate('/org-chart');
                            }}
                            data-testid="nav-org-chart"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
                            role="menuitem"
                          >
                            Org chart
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen((open) => !open)}
                  data-testid="nav-user-menu"
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
                        navigate('/profile');
                      }}
                      data-testid="nav-profile"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700"
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
                          d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z"
                        />
                      </svg>
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      data-testid="nav-logout"
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
