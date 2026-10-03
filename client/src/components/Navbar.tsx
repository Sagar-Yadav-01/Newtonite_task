import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, Users, LogOut, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Work Items', path: '/work-items', icon: CheckSquare },
    { label: 'Teams', path: '/teams', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Main Nav */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-neutral-900 text-white rounded flex items-center justify-center font-bold text-sm tracking-wider">
                N
              </div>
              <span className="font-semibold text-base tracking-tight text-neutral-900">
                NEWTONITE <span className="text-xs font-normal text-neutral-500 ml-1">OPS</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-900 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2 text-neutral-500" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-neutral-700">
                <span className="font-medium">{user.name}</span>
                {user.role === 'ADMIN' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white uppercase tracking-wider">
                    <Shield className="w-3 h-3 mr-0.5" />
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden border-t border-neutral-100 px-4 py-2 flex justify-around bg-neutral-50/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 text-xs font-medium ${
                isActive ? 'text-neutral-900 font-semibold' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};
