import React from 'react';
import { FaCoins, FaTimes } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa6';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import './PurchaseCreditsPromptDialog.css';

export const PURCHASE_CREDITS_ROUTE = '/account/billing';
export const PURCHASE_CREDITS_PROMPT_STORAGE_KEY = 'samsarShowPurchaseCreditsPrompt';
export const PURCHASE_CREDITS_PROMPT_DISMISSED_STORAGE_KEY = 'samsarDismissedPurchaseCreditsPrompt';

export default function PurchaseCreditsPromptDialog({
  onClose,
  onPurchaseCredits,
}) {
  const { closeAlertDialog } = useAlertDialog();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const handleClose = typeof onClose === 'function' ? onClose : closeAlertDialog;
  const handlePurchaseCredits = typeof onPurchaseCredits === 'function' ? onPurchaseCredits : handleClose;

  const shellClasses = isDark
    ? 'border-[#1f2a3d] bg-[#0f1629] text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.36)]'
    : 'border-[#d7deef] bg-white text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.12)]';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const subtleText = isDark ? 'text-slate-500' : 'text-slate-500';
  const primaryButtonClasses = isDark
    ? 'border border-[#2a4e70] bg-[#16213a] text-slate-100 hover:bg-[#1b2b49] focus:ring-cyan-700/40'
    : 'border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-300';
  const quietButtonClasses = isDark
    ? 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  const motionTrackClasses = isDark
    ? 'border-[#1f2a3d] bg-[#0f1629]'
    : 'border-slate-200 bg-slate-50';
  const motionIconClasses = isDark
    ? 'bg-[#16213a] text-slate-100 shadow-[0_10px_24px_rgba(42,78,112,0.24)]'
    : 'bg-slate-100 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)]';

  return (
    <div className={`purchase-credits-prompt relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[380px] overflow-y-auto rounded-xl border p-5 text-left ${shellClasses}`}>
      <button
        type="button"
        className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 ${
          isDark
            ? 'text-slate-400 hover:bg-[#16213a] hover:text-slate-100 focus:ring-cyan-400/40'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300'
        }`}
        onClick={handleClose}
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
          onClick={handlePurchaseCredits}
          className={`purchase-credits-prompt__cta inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${primaryButtonClasses}`}
        >
          Purchase credits
          <FaArrowRight className="text-xs" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className={`min-h-[36px] rounded-md px-2 py-1 text-sm transition ${quietButtonClasses}`}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
