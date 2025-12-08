// BillingPanelContent.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { FaArrowRight, FaBolt, FaCheck, FaCreditCard, FaCrown, FaSync, FaTimes } from "react-icons/fa";
import { useLocation } from "react-router-dom";

import SecondaryButton from "../common/SecondaryButton.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import { getHeaders } from "../../utils/web.jsx";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;
const numberFormatter = new Intl.NumberFormat("en-US");

const creditOptions = [
  { value: 10, label: "$10", caption: "Quick top-up" },
  { value: 25, label: "$25", caption: "Starter pack" },
  { value: 50, label: "$50", caption: "Most popular", badge: "Popular" },
  { value: 100, label: "$100", caption: "Studio teams" },
  { value: 500, label: "$500", caption: "Agency bundle" },
  { value: 1000, label: "$1000", caption: "Enterprise scale" },
];

const formatAmount = (amountCents = 0, currency = "USD") => {
  const dollars = Math.max(0, Number(amountCents || 0) / 100);
  return `${currency.toUpperCase()} ${dollars.toFixed(2)}`;
};

const formatDateString = (value) => {
  if (!value) return "Not scheduled";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : value;
};

export default function BillingPanelContent() {
  const { colorMode } = useColorMode();
  const { user, getUserAPI } = useUser();
  const location = useLocation();

  const textColor = colorMode === "dark" ? "text-neutral-100" : "text-neutral-900";
  const cardBgColor = colorMode === "dark" ? "bg-neutral-800" : "bg-white";
  const borderColor = colorMode === "dark" ? "border-neutral-700" : "border-neutral-200";
  const subtleText = colorMode === "dark" ? "text-neutral-400" : "text-neutral-500";
  const mutedBg = colorMode === "dark" ? "bg-neutral-900/60" : "bg-neutral-50";

  const [threshold, setThreshold] = useState(1000);
  const [amountUsd, setAmountUsd] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [selectedCreditPack, setSelectedCreditPack] = useState(creditOptions[2] || creditOptions[0]);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelingAuto, setIsCancelingAuto] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userThreshold = Number(user.autoRechargeThreshold);
    const userAmount = Number(user.autoRechargeAmountUsd);

    const nextThreshold =
      Number.isFinite(userThreshold) && userThreshold > 0 ? userThreshold : 1000;
    const nextAmount = Number.isFinite(userAmount) && userAmount > 0 ? userAmount : 50;

    setThreshold(nextThreshold);
    setAmountUsd(nextAmount);
  }, [user]);

  useEffect(() => {
    if (user) fetchBillingHistory();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("setup") === "success") {
      getUserAPI();
    }
  }, [location.search, getUserAPI]);

  const creditsPerCharge = useMemo(
    () => Math.max(0, Math.round(Number(amountUsd || 0) * 100)),
    [amountUsd]
  );

  const isAutoEnabled = !!user?.autoRechargeEnabled;
  const hasPaymentMethod = !!user?.autoRechargePaymentMethodId;
  const autoStatusLabel = isAutoEnabled
    ? "Enabled"
    : hasPaymentMethod
      ? "Pending activation (Stripe)"
      : "Not configured";

  const statusBadge = isAutoEnabled
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-800 border-amber-200";

  const lastRunLabel = user?.autoRechargeLastRunAt
    ? dayjs(user.autoRechargeLastRunAt).format("MMM D, YYYY h:mm A")
    : "No auto-recharge yet";

  const planBadge = user?.isPremiumUser
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-indigo-100 text-indigo-700 border-indigo-200";

  const autoRechargeRef = useRef(null);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        thresholdCredits: Math.max(0, Number(threshold) || 0),
        amountUsd: Math.max(0, Number(amountUsd) || 0),
        requestSetupSession: !hasPaymentMethod,
      };

      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/auto_recharge/settings`,
        payload,
        getHeaders() || {}
      );

      toast.success("Auto-recharge settings saved");
      if (res.data?.setupSessionUrl) {
        toast.info("Open the payment method setup link to finish enabling auto-recharge.");
        window.open(res.data.setupSessionUrl, "_blank");
      }
      await getUserAPI();
    } catch (err) {
      const message = err.response?.data?.error || "Unable to save auto-recharge settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerNow = async () => {
    setIsTriggering(true);
    try {
      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/auto_recharge/trigger`,
        { force: true },
        getHeaders() || {}
      );
      const status = res.data?.status || "queued";
      toast.success(`Auto-recharge ${status}`);
      await getUserAPI();
      fetchBillingHistory();
    } catch (err) {
      const message = err.response?.data?.error || "Auto-recharge failed";
      toast.error(message);
    } finally {
      setIsTriggering(false);
    }
  };

  const fetchBillingHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await axios.get(
        `${PROCESSOR_SERVER}/users/billing/history?limit=10`,
        getHeaders() || {}
      );
      setBillingHistory(res.data?.payments || []);
    } catch (err) {
      
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const purchaseCreditsForUser = async (amountToPurchase) => {
    setIsPurchasing(true);
    try {
      const purchaseAmountRequest = parseInt(amountToPurchase, 10);
      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/purchase_credits`,
        { amount: purchaseAmountRequest },
        getHeaders()
      );
      const { url } = res.data || {};
      if (url) {
        window.open(url, "_blank");
        toast.success("Payment URL generated!", { position: "bottom-center" });
      } else {
        toast.error("Failed to generate payment URL", { position: "bottom-center" });
      }
    } catch (err) {
      
      toast.error("Payment process failed", { position: "bottom-center" });
    } finally {
      setIsPurchasing(false);
    }
  };

  const requestApplyCreditsCoupon = async (code) => {
    setIsApplyingCoupon(true);
    try {
      await axios.post(
        `${PROCESSOR_SERVER}/users/apply_credits_coupon`,
        { couponCode: code },
        getHeaders()
      );
      toast.success("Coupon applied!", { position: "bottom-center" });
      await getUserAPI();
    } catch (err) {
      toast.error("Failed to apply coupon", { position: "bottom-center" });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCancelAutoRecharge = async () => {
    setIsCancelingAuto(true);
    try {
      await axios.post(
        `${PROCESSOR_SERVER}/users/auto_recharge/cancel`,
        {},
        getHeaders() || {}
      );
      toast.success("Auto-recharge disabled.");
      await getUserAPI();
    } catch (err) {
      toast.error("Unable to cancel auto-recharge.");
    } finally {
      setIsCancelingAuto(false);
    }
  };

  const handleUpgradePlan = async () => {
    const upgradeWindow = window.open("", "_blank");
    try {
      if (!user || !user._id) {
        toast.error("User not found");
        if (upgradeWindow && !upgradeWindow.closed) upgradeWindow.close();
        return;
      }

      setIsUpgrading(true);
      setUpgradeError("");
      localStorage.setItem("setShowSetPaymentFlow", "false");

      const payload = { email: user.email, plan: "creator" };
      const headers = getHeaders();
      const { data } = await axios.post(
        `${PROCESSOR_SERVER}/users/upgrade_plan`,
        payload,
        headers
      );

      if (upgradeWindow && !upgradeWindow.closed) {
        upgradeWindow.location.href = data.url;
      }
    } catch (error) {
      
      setUpgradeError("Failed to upgrade the plan. Please try again.");
      toast.error("Upgrade failed");
      if (upgradeWindow && !upgradeWindow.closed) {
        upgradeWindow.close();
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelMembership = async () => {
    setIsCancelling(true);
    try {
      await axios.post(`${PROCESSOR_SERVER}/users/cancel_membership`, {}, getHeaders());
      await getUserAPI();
      toast.success("Membership canceled!", { position: "bottom-center" });
    } catch (err) {
      toast.error("Failed to cancel membership", { position: "bottom-center" });
    } finally {
      setIsCancelling(false);
    }
  };

  const renderHistory = () => {
    if (isHistoryLoading) return <p className={subtleText}>Loading billing history…</p>;
    if (!billingHistory.length) return <p className={subtleText}>No billing records yet.</p>;

    return (
      <div className="space-y-3">
        {billingHistory.map((payment) => (
          <div
            key={payment.id || payment.stripeInvoiceId}
            className={`flex items-center justify-between rounded-lg border ${borderColor} px-4 py-3 ${
              colorMode === "dark" ? "bg-neutral-800/70" : "bg-neutral-50"
            }`}
          >
            <div>
              {(() => {
                const paymentDate = payment.paymentDate || payment.createdAt || new Date();
                return (
                  <p className={`text-xs ${subtleText}`}>
                    {dayjs(paymentDate).format("MMM D, YYYY")} • {payment.paymentType || "invoice"}
                  </p>
                );
              })()}
              <p className="font-semibold">{formatAmount(payment.amountPaidCents, payment.currency)}</p>
              <p className={`text-xs ${subtleText}`}>{payment.billingReason || payment.productSummary || ""}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{payment.creditsApplied || 0} credits</p>
              <p className={`text-xs ${subtleText}`}>{payment.paymentStatus || ""}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const planName = user?.isPremiumUser ? "Premium" : "Basic";
  const nextChargeLabel = user?.isPremiumUser ? formatDateString(user?.nextCreditRefill) : "No upcoming charge";

  return (
    <div className={`space-y-6 ${textColor}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Current plan</p>
              <h3 className="text-xl font-semibold">{planName}</h3>
              <p className={`text-sm ${subtleText}`}>
                {user?.isPremiumUser
                  ? "Creators Plan with monthly credits."
                  : "Basic access with pay-as-you-go credits."}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planBadge}`}>
              {user?.isPremiumUser ? "Active" : "Starter"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className={`rounded-xl border ${borderColor} p-3 ${mutedBg}`}>
              <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Credits remaining</p>
              <p className="text-lg font-semibold">{user?.generationCredits || 0}</p>
            </div>
            <div className={`rounded-xl border ${borderColor} p-3 ${mutedBg}`}>
              <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Next charge</p>
              <p className="text-sm font-semibold">{nextChargeLabel}</p>
            </div>
            <div className={`rounded-xl border ${borderColor} p-3 ${mutedBg}`}>
              <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Auto-recharge</p>
              <p className="text-sm font-semibold">{autoStatusLabel}</p>
            </div>
          </div>

          {user?.isPremiumUser ? (
            <div className="mt-4">
              <SecondaryButton onClick={handleCancelMembership} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel membership"}
              </SecondaryButton>
            </div>
          ) : (
            <p className={`text-xs ${subtleText} mt-4`}>
              Upgrade to unlock monthly credits and premium features.
            </p>
          )}
        </div>

        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500">
              <FaCrown />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Upgrade plan</h3>
              <p className={`text-sm ${subtleText}`}>Creators Plan • $49.99/month</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            {[
              "5,000 credits per month",
              "Access to all models",
              "Full generative workflow suite",
              "50GB render storage",
              "Commercial usage rights",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <FaCheck className="mt-1 text-emerald-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {upgradeError && <p className="text-sm text-red-500 mt-3">{upgradeError}</p>}

          <button
            onClick={handleUpgradePlan}
            disabled={user?.isPremiumUser || isUpgrading}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FaArrowRight />
            {user?.isPremiumUser ? "You're on Premium" : isUpgrading ? "Redirecting..." : "Upgrade now"}
          </button>
        </div>
      </div>

      <div
        ref={autoRechargeRef}
        className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-md`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <FaBolt />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Auto-recharge</h3>
              <p className={`text-sm ${subtleText}`}>
                Automatically top up credits when your balance runs low.
              </p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge}`}>
            {autoStatusLabel}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Threshold (credits)</span>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${borderColor} ${
                colorMode === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900"
              }`}
            />
            <span className={`text-xs ${subtleText}`}>Auto-recharge kicks in below this balance.</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Recharge amount (USD)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${borderColor} ${
                colorMode === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900"
              }`}
            />
            <span className={`text-xs ${subtleText}`}>
              {`Adds ${numberFormatter.format(creditsPerCharge)} credits (1 USD = 100 credits).`}
            </span>
          </label>

          <div className="flex flex-col gap-1 rounded-lg border px-3 py-3">
            <span className="text-sm font-semibold">Status</span>
            <span className="text-sm font-semibold">{autoStatusLabel}</span>
            <span className={`text-xs ${subtleText}`}>
              Status is based on your saved Stripe payment method and webhook confirmation.
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaBolt /> {isSaving ? "Saving..." : "Save settings"}
          </button>
          <button
            onClick={handleTriggerNow}
            disabled={isTriggering}
            className={`flex items-center gap-2 rounded-lg border ${borderColor} px-4 py-2 text-sm font-semibold ${
              colorMode === "dark" ? "hover:bg-neutral-700" : "hover:bg-neutral-100"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FaSync /> {isTriggering ? "Running…" : "Run auto-recharge now"}
          </button>
          {(isAutoEnabled || hasPaymentMethod) && (
            <button
              onClick={handleCancelAutoRecharge}
              disabled={isCancelingAuto}
              className={`flex items-center gap-2 rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-500 ${
                colorMode === "dark" ? "hover:bg-neutral-800" : "hover:bg-red-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <FaTimes /> {isCancelingAuto ? "Canceling…" : "Cancel auto-recharge"}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className={`rounded-lg border ${borderColor} px-3 py-2 ${mutedBg}`}>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Credits per recharge</p>
            <p className="text-lg font-semibold">{numberFormatter.format(creditsPerCharge)}</p>
          </div>
          <div className={`rounded-lg border ${borderColor} px-3 py-2 ${mutedBg}`}>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Payment method</p>
            <p className="text-sm">{user?.autoRechargePaymentMethodId ? "Saved on Stripe" : "Not added"}</p>
          </div>
          <div className={`rounded-lg border ${borderColor} px-3 py-2 ${mutedBg}`}>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Last auto-recharge</p>
            <p className="text-sm">{lastRunLabel}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500">
              <FaCreditCard />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Purchase credits</h3>
              <p className={`text-sm ${subtleText}`}>Top up instantly and keep creating without limits.</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${borderColor}`}>
            1 USD = 100 credits
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {creditOptions.map((option) => {
            const isSelected = option.value === selectedCreditPack?.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => setSelectedCreditPack(option)}
                className={`relative flex flex-col items-start rounded-xl border px-4 py-4 text-left transition-all duration-150 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_18px_40px_-20px_rgba(79,70,229,0.65)]"
                    : `${borderColor} ${
                        colorMode === "dark"
                          ? "hover:border-indigo-400/70 hover:bg-indigo-500/5"
                          : "hover:border-indigo-400 hover:bg-indigo-50"
                      }`
                }`}
              >
                {option.badge ? (
                  <span className="absolute top-3 right-4 text-[11px] font-semibold uppercase tracking-widest text-indigo-400">
                    {option.badge}
                  </span>
                ) : null}
                <span className="text-lg font-semibold">{option.label}</span>
                <span className="text-xs uppercase tracking-wide text-indigo-400 mt-1">
                  {numberFormatter.format(option.value * 100)} credits
                </span>
                <span className={`text-xs mt-2 ${subtleText}`}>{option.caption}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setIsCouponOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border px-4 py-2 text-sm font-semibold hover:border-indigo-400"
          >
            <span>Have a credits coupon?</span>
            <span>{isCouponOpen ? "Hide" : "Add"}</span>
          </button>

          {isCouponOpen && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  colorMode === "dark"
                    ? "border-neutral-700 bg-neutral-900 text-neutral-100 placeholder:text-neutral-500"
                    : "border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400"
                }`}
              />
              <SecondaryButton
                onClick={() => requestApplyCreditsCoupon(couponCode.trim())}
                disabled={!couponCode.trim() || isApplyingCoupon}
              >
                {isApplyingCoupon ? "Applying..." : "Apply coupon"}
              </SecondaryButton>
            </div>
          )}
        </div>

        <button
          onClick={() => purchaseCreditsForUser(selectedCreditPack?.value)}
          disabled={!selectedCreditPack || isPurchasing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaArrowRight />
          {isPurchasing ? "Generating checkout..." : "Purchase credits"}
        </button>
      </div>

      <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-md`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500">
              <FaCreditCard />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Billing history</h3>
              <p className={`text-sm ${subtleText}`}>Recent invoices and credit top-ups.</p>
            </div>
          </div>
          <button
            onClick={fetchBillingHistory}
            className={`text-sm font-semibold ${
              colorMode === "dark" ? "text-indigo-200" : "text-indigo-600"
            } hover:underline`}
          >
            Refresh
          </button>
        </div>
        {renderHistory()}
      </div>
    </div>
  );
}
