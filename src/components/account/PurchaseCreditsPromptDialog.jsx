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
    ? 'border-[#1f2a3d] bg-[#0b1021] text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.36)]'
    : 'border-slate-200 bg-white text-slate-950 shadow-[0_24px_56px_rgba(15,23,42,0.14)]';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const subtleText = 'text-slate-500';
  const ratePillClasses = isDark
    ? 'border-[#1f2a3d] bg-white/[0.04] text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-600';
  const primaryButtonClasses = isDark
    ? 'bg-[#e8edf7] text-[#041420] hover:bg-white focus:ring-[#89dcff]'
    : 'bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-400';
  const quietButtonClasses = isDark
    ? 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  const pricingLinkClasses = isDark
    ? 'text-slate-300 hover:text-white'
    : 'text-slate-700 hover:text-slate-950';

  return (
    <div className={`purchase-credits-prompt relative w-full max-w-[380px] rounded-2xl border p-5 text-left ${shellClasses}`}>
      <button
        type="button"
        className={`absolute right-3 top-3 rounded-full p-2 transition ${
          isDark ? 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
        onClick={onClose}
        aria-label="Close purchase credits dialog"
      >
        <FaTimes className="text-sm" />
      </button>

      <div className="pr-7">
        <p className={`text-xs font-medium ${subtleText}`}>
          Credits
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-normal">
          Add credits to start generating
        </h2>
        <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
          Your workspace is ready. Credits power image, video, and agent generation across Samsar.
        </p>
      </div>

      <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${ratePillClasses}`}>
        <span className="font-semibold">100 credits / $1</span>
        <span className={`mx-2 ${subtleText}`}>·</span>
        <span>Secure Stripe checkout</span>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onPurchaseCredits}
          className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${primaryButtonClasses}`}
        >
          Add credits
          <FaArrowRight className="text-xs" />
        </button>
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md px-2 py-1 transition ${quietButtonClasses}`}
          >
            Not now
          </button>
          <a
            href="https://docs.samsar.one/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md px-2 py-1 font-medium underline-offset-4 transition hover:underline ${pricingLinkClasses}`}
          >
            Pricing
          </a>
        </div>
      </div>
    </div>
  );
}
