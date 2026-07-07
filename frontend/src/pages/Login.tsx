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
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      {/* Subtle cyan glow at bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-[#00d4c8] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#00d4c8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={22} className="text-[#0a1628]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Knerd Media</h1>
          <p className="text-sm text-[#8fa3b8] mt-1">Performance first. Scale bigger. Scale faster.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-6 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@knerd.in"
              className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-4 py-2.5 text-sm focus:border-[#00d4c8] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-4 py-2.5 text-sm focus:border-[#00d4c8] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
