import React, { useEffect, useState } from 'react';
import {
  getCookieConsentStatus,
  saveCookieConsentStatus,
  hasAcceptedCookies,
  clearAuthCookies,
} from '../../utils/web';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const status = getCookieConsentStatus();
    if (!status) setVisible(true);
  }, []);

  const handleChoice = (status) => {
    saveCookieConsentStatus(status);
    if (status === 'rejected') clearAuthCookies();
    setVisible(false);
  };

  if (!visible || hasAcceptedCookies()) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[95%] max-w-3xl -translate-x-1/2 rounded-2xl border border-gray-800/70 bg-gray-900/90 p-4 shadow-2xl backdrop-blur transition-all duration-300">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
        <div className="flex-1 text-sm text-gray-100">
          <div className="text-base font-semibold text-white">We use limited cookies</div>
          <p className="mt-1 text-gray-200/90">
            We only set essential cookies for preferences. Login tokens stay in session storage and
            are not written to browser cookies. Choose Reject to clear any legacy cookies.
          </p>
        </div>
        <div className="flex flex-row gap-2 md:flex-col">
          <button
            className="rounded-lg border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:border-gray-500"
            onClick={() => handleChoice('rejected')}
          >
            Reject
          </button>
          <button
            className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg shadow-amber-500/20 transition hover:-translate-y-[1px] hover:shadow-amber-400/30"
            onClick={() => handleChoice('accepted')}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
