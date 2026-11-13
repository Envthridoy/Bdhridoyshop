import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface WhatsAppWidgetProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  storeName: string;
  whatsappNumber: string;
}

export function WhatsAppWidget({
  isOpen,
  onToggle,
  storeName,
  whatsappNumber,
}: WhatsAppWidgetProps) {
  const [message, setMessage] = useState(`Assalamu Alaikum! I need help with an order on ${storeName}.`);

  const digits = whatsappNumber.replace(/[^0-9]/g, '');
  const waIntl = digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : `880${digits}`;
  const waUrl = `https://wa.me/${waIntl}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="bg-[#16A34A] text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{storeName} Support</p>
                <p className="text-[11px] text-emerald-100 font-mono-tabular">
                  WhatsApp: {whatsappNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(false)}
                aria-label="Close WhatsApp support"
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ask us about Dhaka 24h express delivery, Cash on Delivery, or product warranty.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Check Dhaka delivery time',
                  'Bulk order discount',
                  'Product warranty info',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMessage(`Hi ${storeName}, I'd like to ask about: ${preset}`)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#16A34A]"
              />
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Start WhatsApp Chat</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        aria-label={isOpen ? 'Close WhatsApp chat' : 'Chat on WhatsApp'}
        title="Chat on WhatsApp"
        className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#16A34A] text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      >
        {isOpen ? (
          <X className="w-5 h-5" aria-hidden="true" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 fill-current"
            aria-hidden="true"
          >
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m5.81 13.97c-.24.69-1.41 1.32-1.95 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.93-4.37-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.27-.29.58-.36.77-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2.02.9 2.17.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.28 2.3 1.42.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.14.48.22.55.34.07.12.07.7-.17 1.39" />
          </svg>
        )}
      </button>
    </div>
  );
}
