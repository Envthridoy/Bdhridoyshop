import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginProps {
  onSuccess: (token: string, username: string) => void;
  onBackToStore: () => void;
}

export function AdminLogin({ onSuccess, onBackToStore }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg(
          'Backend API (/api) is not active on this host. Re-deploy the full project (with netlify.toml & netlify/functions) instead of static dist-only files.',
        );
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
      } else {
        onSuccess(data.token, data.username);
      }
    } catch {
      setErrorMsg('Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141413] flex flex-col justify-between px-4 py-8">
      <div className="max-w-7xl w-full mx-auto">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#5C5B57] hover:text-[#141413] transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to BdHridoyShop Storefront</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto bg-white border border-[#141413]/12 rounded-2xl p-8"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#0F523E]/10 text-[#0F523E] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#141413] leading-none">
              BdHridoyShop Admin
            </h1>
            <p className="text-xs text-[#5C5B57] mt-1">Banani Operations & Store Console</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-xs font-medium text-[#5C5B57] mb-1.5">
              Admin Email or Username
            </label>
            <input
              id="admin-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter authorized admin email"
              className="w-full h-11 px-3.5 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-[#5C5B57] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full h-11 pl-3.5 pr-11 bg-[#FAFAF8] border border-[#141413]/15 rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#0F523E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#5C5B57] hover:text-[#141413]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#0F523E] hover:bg-[#0B3F30] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Verifying...' : 'Sign In to Admin Panel'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#141413]/10 text-xs text-[#5C5B57] space-y-1">
          <p className="font-medium text-[#141413]">Restricted Owner Access</p>
          <p>
            Public admin registration and sign-up are disabled. Only the authorized store owner can sign in.
          </p>
        </div>
      </motion.div>

      <div className="max-w-7xl w-full mx-auto text-center text-xs text-[#5C5B57]">
        BdHridoyShop Protected Administration · Banani, Dhaka
      </div>
    </div>
  );
}
