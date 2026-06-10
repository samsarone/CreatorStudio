import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa6';
import { useColorMode } from '../../contexts/ColorMode.jsx';

export const PURCHASE_CREDITS_ROUTE = '/create_payment?tab=purchaseCredits';
export const PURCHASE_CREDITS_PROMPT_STORAGE_KEY = 'samsarShowPurchaseCreditsPrompt';
const GALLERY_URL = 'https://gallery.samsar.one';

export default function PurchaseCreditsPromptDialog({
  onClose,
  onPurchaseCredits,
}) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const shellClasses = isDark
    ? 'border-[#1f2a3d] bg-[#0b1021] text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.36)]'
    : 'border-[#cbd6e6] bg-[#f3f7fb] text-slate-950 shadow-[0_24px_56px_rgba(15,23,42,0.14)]';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const subtleText = 'text-slate-500';
  const primaryButtonClasses = isDark
    ? 'bg-[#39d881] text-[#041420] hover:bg-[#55e8a2] focus:ring-[#72f1b0]'
    : 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-300';
  const quietButtonClasses = isDark
    ? 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  const pricingLinkClasses = isDark
    ? 'text-slate-300 hover:text-white'
    : 'text-slate-700 hover:text-slate-950';
  const galleryLinkClasses = isDark
    ? 'text-[#89dcff] hover:text-[#d7ffeb]'
    : 'text-sky-700 hover:text-sky-600';

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
          Add credits
        </h2>
        <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
          Top up for video renders, image edits, and agent generation.
        </p>
        <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${subtleText}`}>
          100 credits = $1 · Stripe checkout
        </p>
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
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md px-2 py-1 transition ${quietButtonClasses}`}
          >
            Not now
          </button>
          <a
            href={GALLERY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md px-2 py-1 font-medium underline-offset-4 transition hover:underline ${galleryLinkClasses}`}
          >
            See what's possible
          </a>
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
