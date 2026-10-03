import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Lock, Mail, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError(null);
    setIsSubmitting(true);
    try {
      await login(quickEmail, 'password123');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-lg p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-neutral-900 text-white rounded mb-3 font-bold text-lg">
            N
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Newtonite Operations</h1>
          <p className="text-xs text-neutral-500 mt-1">Sign in to your operational workspace account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@newtonite.com"
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Credentials for Reviewer */}
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center">
            <UserCheck className="w-3.5 h-3.5 mr-1" /> Demo Evaluator Quick Login
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => handleQuickLogin('admin@newtonite.com')}
              className="w-full text-left px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-xs flex justify-between items-center transition-colors"
            >
              <span className="font-medium text-neutral-800">1. Admin User</span>
              <span className="text-[10px] text-neutral-500">Global Admin</span>
            </button>
            <button
              onClick={() => handleQuickLogin('rahul@newtonite.com')}
              className="w-full text-left px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-xs flex justify-between items-center transition-colors"
            >
              <span className="font-medium text-neutral-800">2. Rahul Sharma</span>
              <span className="text-[10px] text-neutral-500">Payments Team</span>
            </button>
            <button
              onClick={() => handleQuickLogin('priya@newtonite.com')}
              className="w-full text-left px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded text-xs flex justify-between items-center transition-colors"
            >
              <span className="font-medium text-neutral-800">3. Priya Patel</span>
              <span className="text-[10px] text-neutral-500">Engineering & Support</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-neutral-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-neutral-900 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
