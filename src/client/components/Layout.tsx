import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/predictions', label: 'Predictions', icon: '🎯' },
  { to: '/scores', label: 'Results', icon: '📺' },
  { to: '/schedule', label: 'Schedule', icon: '📅' },
  { to: '/news', label: 'News', icon: '📰' },
  { to: '/feed', label: 'Feed', icon: '⭐' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight truncate">⚽ Tanay Soccer League</h1>
              <p className="text-green-100 text-xs sm:text-sm md:text-lg mt-1 md:mt-3">FIFA World Cup Prediction Challenge 2026</p>
            </div>
            <div className="flex -space-x-2 md:-space-x-4 shrink-0 ml-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg"
                alt="Messi"
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-lg"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg"
                alt="Ronaldo"
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-lg"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2c/Maradona-Mundial_86_con_la_copa.JPG"
                alt="Maradona"
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-lg hidden sm:block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Nav Bar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="text-xl font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
            Tanay Soccer League ⚽
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`
                }
              >
                🛡️ Admin
              </NavLink>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
              {user?.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="hidden lg:inline-flex px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Logout
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle menu"
            >
              <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to="/favorites"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="mr-2">💜</span>
              Favorites
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`
                }
              >
                <span className="mr-2">🛡️</span>
                Admin
              </NavLink>
            )}

            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 safe-bottom">
        <div className="flex justify-around items-center py-2">
          {[
            { to: '/', icon: '📊', label: 'Home' },
            { to: '/predictions', icon: '🎯', label: 'Predict' },
            { to: '/scores', icon: '📺', label: 'Results' },
            { to: '/schedule', icon: '📅', label: 'Schedule' },
            { to: '/leaderboard', icon: '🏆', label: 'Ranks' },
          ].map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 rounded-lg transition-colors ${
                  isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
