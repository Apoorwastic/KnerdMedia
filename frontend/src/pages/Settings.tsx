import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import api from '../lib/api';

export default function Settings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#162032] rounded-lg flex items-center justify-center">
            <KeyRound size={16} className="text-[#00d4c8]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Change Password</p>
            <p className="text-xs text-[#4a6278]">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-2">
              <Check size={15} /> Password changed successfully
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Current Password</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              required
              placeholder="••••••••"
              className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-4 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">New Password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              required
              placeholder="••••••••"
              className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-4 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
              placeholder="••••••••"
              className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-4 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
