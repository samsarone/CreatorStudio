import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa6';
import { useColorMode } from '../../contexts/ColorMode.jsx';

export const PURCHASE_CREDITS_ROUTE = '/create_payment?tab=purchaseCredits';
export const PURCHASE_CREDITS_PROMPT_STORAGE_KEY = 'samsarShowPurchaseCreditsPrompt';

export default function PurchaseCreditsPromptDialog({
  onClose,
  onPurchaseCredits,
}) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const shellClasses = isDark
    ? 'border-slate-800 bg-slate-950 text-slate-100 shadow-2xl'
    : 'border-slate-200 bg-white text-slate-950 shadow-2xl';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const subtlePanel = isDark
    ? 'border-slate-800 bg-slate-900/70 text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`relative w-full max-w-md rounded-2xl border p-6 text-left ${shellClasses}`}>
      <button
        type="button"
        className={`absolute right-4 top-4 rounded-full p-2 transition ${
          isDark ? 'text-slate-500 hover:bg-slate-900 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
        onClick={onClose}
        aria-label="Close purchase credits dialog"
      >
        <FaTimes className="text-sm" />
      </button>

      <div className="pr-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">
          Purchase credits
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-normal">
          Add credits to start generating
        </h2>
        <p className={`mt-3 text-sm leading-6 ${mutedText}`}>
          Purchase credits to generate images and videos in Studio and Agent.
        </p>
      </div>

      <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${subtlePanel}`}>
        Credits work across VidGenie, Studio, and your agent workflows.
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onPurchaseCredits}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          Purchase credits
          <FaArrowRight className="text-xs" />
        </button>
        <a
          href="https://docs.samsar.one/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-center text-sm font-medium underline-offset-4 hover:underline ${
            isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-600'
          }`}
        >
          View pricing
        </a>
      </div>
    </div>
  );
}
