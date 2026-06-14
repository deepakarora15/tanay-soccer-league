import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

type Tab = 'login' | 'join' | 'reset';

export default function AuthPages() {
  const [activeTab, setActiveTab] = useState<Tab>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-green-600 dark:from-green-900 dark:via-blue-900 dark:to-green-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">⚽ Tanay Soccer League 2026</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Predict. Compete. Win.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mx-6">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'login'
                ? 'text-green-600 border-b-2 border-green-600 dark:text-green-400 dark:border-green-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'join'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Join League
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'login' && <LoginForm onForgot={() => setActiveTab('reset')} />}
          {activeTab === 'join' && <JoinForm />}
          {activeTab === 'reset' && <ResetForm onBack={() => setActiveTab('login')} />}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill password when admin email is entered
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value === 'admin@league.com') {
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      await login(email, password);
      // If we get here, login succeeded - navigation happens via route change
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <button type="button" onClick={onForgot} className="w-full mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
        Forgot Password?
      </button>
    </form>
  );
}

function JoinForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, displayName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Request failed');
      }

      // Auto-login: server returns token and user
      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = '/';
        return;
      }

      setSuccess('Account created! You can now sign in.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="GoalMaster99"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          placeholder="Min 6 characters"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Request to Join'}
      </button>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!email.trim() || !displayName.trim() || !newPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSuccess(data.message || 'Password reset! You can now sign in.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Enter your email and display name to verify your identity, then set a new password.</p>
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm">{success}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="you@example.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="Your display name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="Min 6 characters" />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
        ← Back to Sign In
      </button>
    </form>
  );
}
