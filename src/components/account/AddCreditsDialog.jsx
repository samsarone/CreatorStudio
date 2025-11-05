import React, { useMemo, useState } from 'react';
import CommonButton from '../common/CommonButton.tsx';
import SecondaryButton from '../common/SecondaryButton.tsx';
import { FaChevronDown, FaChevronUp, FaArrowRight } from 'react-icons/fa6';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { toast } from 'react-toastify';

const creditOptions = [
  { value: 10, label: '$10', caption: 'Quick top-up' },
  { value: 25, label: '$25', caption: 'Starter pack' },
  { value: 50, label: '$50', caption: 'Most popular', badge: 'Popular' },
  { value: 100, label: '$100', caption: 'Studio teams' },
  { value: 500, label: '$500', caption: 'Agency bundle' },
  { value: 1000, label: '$1000', caption: 'Enterprise scale' },
];

export default function AddCreditsDialog(props) {
  const { purchaseCreditsForUser, requestApplyCreditsCoupon } = props;
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const defaultOption = creditOptions[2] || creditOptions[0];
  const [selectedOption, setSelectedOption] = useState(defaultOption);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const cardBaseClasses = isDark
    ? 'bg-gray-900 text-neutral-100 border border-neutral-800 shadow-2xl'
    : 'bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-2xl';

  const inactiveOptionClasses = isDark
    ? 'border-neutral-700 hover:border-indigo-400/60 hover:bg-indigo-500/10'
    : 'border-neutral-200 hover:border-indigo-400 hover:bg-indigo-50';

  const activeOptionClasses = isDark
    ? 'border-indigo-400 bg-gradient-to-br from-indigo-500/30 via-indigo-500/15 to-transparent shadow-[0_18px_40px_-24px_rgba(79,70,229,0.8)]'
    : 'border-indigo-500 bg-gradient-to-br from-indigo-500/10 via-indigo-400/5 to-white shadow-[0_18px_40px_-20px_rgba(79,70,229,0.65)]';

  const handlePurchase = () => {
    if (!selectedOption) {
      toast.error('Select a credit pack to continue.', { position: 'bottom-center' });
      return;
    }

    if (typeof purchaseCreditsForUser === 'function') {
      purchaseCreditsForUser(selectedOption.value);
    } else {
      console.error('purchaseCreditsForUser handler is not provided');
    }
  };

  const handleApplyCoupon = () => {
    const trimmedCode = couponCode.trim();

    if (!trimmedCode) {
      toast.error('Enter a coupon code to apply.', { position: 'bottom-center' });
      return;
    }

    if (typeof requestApplyCreditsCoupon === 'function') {
      requestApplyCreditsCoupon(trimmedCode);
    } else {
      console.error('requestApplyCreditsCoupon handler is not provided');
    }
  };

  return (
    <div className={`max-w-xl w-full rounded-2xl overflow-hidden ${cardBaseClasses}`}>
      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">
            Purchase Credits
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold mt-2">
            Top up instantly and keep creating without limits
          </h2>
          <p className={isDark ? 'text-sm text-neutral-400 mt-2' : 'text-sm text-neutral-600 mt-2'}>
            Choose a pack that fits your workload. You’ll be redirected to secure Stripe checkout and credits apply immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {creditOptions.map((option) => {
            const isSelected = option.value === selectedOption?.value;
            const creditsLabel = `${numberFormatter.format(option.value * 100)} credits`;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => setSelectedOption(option)}
                className={`relative flex flex-col items-start rounded-xl border px-4 py-4 text-left transition-all duration-150 ${
                  isSelected ? activeOptionClasses : inactiveOptionClasses
                }`}
              >
                {option.badge ? (
                  <span className="absolute top-3 right-4 text-[11px] font-semibold uppercase tracking-widest text-indigo-200">
                    {option.badge}
                  </span>
                ) : null}
                <span className="text-lg font-semibold">{option.label}</span>
                <span className="text-xs uppercase tracking-wide text-indigo-300/80 mt-1">
                  {creditsLabel}
                </span>
                <span className={isDark ? 'text-xs text-neutral-400 mt-3' : 'text-xs text-neutral-500 mt-3'}>
                  {option.caption}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`rounded-xl border px-4 py-4 transition ${
            isDark
              ? 'border-neutral-800 bg-neutral-900/70'
              : 'border-neutral-200 bg-neutral-100/60'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsCouponOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-semibold"
          >
            <span>Have a credits coupon?</span>
            {isCouponOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {isCouponOpen && (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500'
                    : 'border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
              <SecondaryButton onClick={handleApplyCoupon}>
                Apply coupon
              </SecondaryButton>
            </div>
          )}
        </div>

        <CommonButton
          onClick={handlePurchase}
          isDisabled={!selectedOption}
          extraClasses="flex w-full items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs"
        >
          Purchase credits <FaArrowRight className="text-[11px]" />
        </CommonButton>

        <p className={isDark ? 'text-[11px] text-neutral-500 text-center' : 'text-[11px] text-neutral-500 text-center'}>
          Secure checkout powered by Stripe. Credits are applied to your account as soon as payment completes.
        </p>
      </div>
    </div>
  );
}
