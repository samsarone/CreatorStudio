import React from 'react';
import { FaCoins, FaTimes } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa6';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import './PurchaseCreditsPromptDialog.css';

export const PURCHASE_CREDITS_ROUTE = '/account/billing';
export const PURCHASE_CREDITS_PROMPT_STORAGE_KEY = 'samsarShowPurchaseCreditsPrompt';
export const PURCHASE_CREDITS_PROMPT_DISMISSED_STORAGE_KEY = 'samsarDismissedPurchaseCreditsPrompt';

export default function PurchaseCreditsPromptDialog({
  onClose,
  onPurchaseCredits,
}) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const shellClasses = isDark
    ? 'border-[#233149] bg-[#0b1021] text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.42)]'
    : 'border-[#d8e0ed] bg-white text-slate-950 shadow-[0_24px_56px_rgba(15,23,42,0.14)]';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const subtleText = isDark ? 'text-slate-500' : 'text-slate-500';
  const primaryButtonClasses = isDark
    ? 'bg-[#39d881] text-[#041420] hover:bg-[#55e8a2] focus:ring-[#72f1b0]'
    : 'bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-300';
  const quietButtonClasses = isDark
    ? 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  const motionTrackClasses = isDark
    ? 'border-[#1f2a3d] bg-[#0f1629]'
    : 'border-slate-200 bg-slate-50';
  const motionIconClasses = isDark
    ? 'bg-[#39d881] text-[#041420] shadow-[0_10px_24px_rgba(57,216,129,0.28)]'
    : 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]';

  return (
    <div className={`purchase-credits-prompt relative w-full max-w-[360px] rounded-2xl border p-5 text-left ${shellClasses}`}>
      <button
        type="button"
        className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
          isDark ? 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
        onClick={onClose}
        aria-label="Close purchase credits dialog"
      >
        <FaTimes className="text-sm" />
      </button>

      <div className={`purchase-credits-prompt__motion mb-5 flex h-14 items-center rounded-full border px-3 ${motionTrackClasses}`}>
        <span className={`purchase-credits-prompt__coin inline-flex h-10 w-10 items-center justify-center rounded-full ${motionIconClasses}`}>
          <FaCoins className="text-base" aria-hidden="true" />
        </span>
        <span className={`ml-auto pr-2 text-xs font-semibold uppercase tracking-[0.18em] ${subtleText}`}>
          Low balance
        </span>
      </div>

      <div className="pr-7">
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${subtleText}`}>
          VidGenie credits
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-normal">
          Add credits to generate
        </h2>
        <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
          You need at least 100 credits to start a VidGenie generation.
        </p>
        <p className={`mt-3 text-xs font-semibold ${subtleText}`}>
          100 credits = $1. Checkout starts from Billing.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onPurchaseCredits}
          className={`purchase-credits-prompt__cta inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${primaryButtonClasses}`}
        >
          Purchase credits
          <FaArrowRight className="text-xs" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`min-h-[36px] rounded-md px-2 py-1 text-sm transition ${quietButtonClasses}`}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
