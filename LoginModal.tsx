import { useState } from 'react';
import { User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface LoginModalProps {
  isOpen: boolean;
  loggedInCustomerName: string | null;
  onClose: () => void;
  onCustomerLogin: (name: string) => void;
  onCustomerLogout: () => void;
}

export function LoginModal({
  isOpen,
  loggedInCustomerName,
  onClose,
  onCustomerLogin,
  onCustomerLogout,
}: LoginModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName =
      name.trim() || phoneOrEmail.split('@')[0] || 'Valued Customer';
    onCustomerLogin(displayName);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account Access"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#133475] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#5CC8F5]" aria-hidden="true" />
              <h2 className="text-base font-bold">BdHridoyShop Account</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close account modal"
              className="p-1.5 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {loggedInCustomerName ? (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-slate-600">
                  Signed in as{' '}
                  <span className="font-bold text-[#133475]">{loggedInCustomerName}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onCustomerLogout();
                    onClose();
                  }}
                  className="w-full h-10 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                      tab === 'login' ? 'bg-white text-[#133475] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Customer Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                      tab === 'register' ? 'bg-white text-[#133475] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {tab === 'register' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tariqul Islam"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#133475]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mobile Number or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={phoneOrEmail}
                      onChange={(e) => setPhoneOrEmail(e.target.value)}
                      placeholder="01711-223344 or you@example.com"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#133475]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#133475]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-10 bg-[#E11D2E] hover:bg-[#C41423] text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {tab === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
              </>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
