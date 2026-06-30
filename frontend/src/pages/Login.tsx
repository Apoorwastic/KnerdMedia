import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.token);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0eb] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1a4a1a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Knerd Media</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@knerdmedia.com" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-gray-400 transition-colors" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-2">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}
