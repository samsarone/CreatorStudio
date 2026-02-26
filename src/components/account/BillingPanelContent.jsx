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

const formatPaymentTypeLabel = (value) => {
  if (!value || value === "invoice") return "receipt";
  return value;
};

export default function BillingPanelContent() {
  const { colorMode } = useColorMode();
  const { user, getUserAPI } = useUser();
  const location = useLocation();

  const textColor = colorMode === "dark" ? "text-slate-100" : "text-slate-900";
  const cardBgColor = colorMode === "dark" ? "bg-[#0f1629]" : "bg-white";
  const borderColor = colorMode === "dark" ? "border-[#1f2a3d]" : "border-slate-200";
  const subtleText = colorMode === "dark" ? "text-slate-400" : "text-slate-600";
  const mutedBg = colorMode === "dark" ? "bg-[#0b1224]" : "bg-slate-50";
  const headerBg = colorMode === "dark" ? "bg-[#0b1224]" : "bg-slate-50";
  const sectionCard = `rounded-2xl border ${borderColor} ${cardBgColor}`;
  const summaryCard = `rounded-xl border ${borderColor} ${mutedBg} p-4`;

  const [threshold, setThreshold] = useState(1000);
  const [amountUsd, setAmountUsd] = useState(50);
  const [maxMonthlyUsd, setMaxMonthlyUsd] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
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
    const userMaxMonthly = Number(user.autoRechargeMaxMonthlyUsd);

    const nextThreshold =
      Number.isFinite(userThreshold) && userThreshold > 0 ? userThreshold : 1000;
    const nextAmount = Number.isFinite(userAmount) && userAmount > 0 ? userAmount : 50;
    const nextMaxMonthly = Number.isFinite(userMaxMonthly) && userMaxMonthly > 0 ? userMaxMonthly : 0;

    setThreshold(nextThreshold);
    setAmountUsd(nextAmount);
    setMaxMonthlyUsd(nextMaxMonthly);
  }, [user]);

  useEffect(() => {
    if (user) fetchBillingHistory();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("setup") === "success") {
      getUserAPI();
    }
    const couponFromQuery = params.get("couponCode");
    if (couponFromQuery) {
      setCouponCode(couponFromQuery.trim());
      setIsCouponOpen(true);
    }
  }, [location.search, getUserAPI]);

  const creditsPerCharge = useMemo(
    () => Math.max(0, Math.round(Number(amountUsd || 0) * 100)),
    [amountUsd]
  );
  const maxMonthlyCredits = useMemo(
    () => Math.max(0, Math.round(Number(maxMonthlyUsd || 0) * 100)),
    [maxMonthlyUsd]
  );
  const hasMonthlyCap = Number(maxMonthlyUsd || 0) > 0;

  const isAutoEnabled = !!user?.autoRechargeEnabled;
  const hasPaymentMethod = !!user?.autoRechargePaymentMethodId;
  const autoStatusLabel = isAutoEnabled
    ? "Enabled"
    : hasPaymentMethod
      ? "Pending activation (Stripe)"
      : "Not configured";

  const statusBadge = isAutoEnabled
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : colorMode === "dark"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
      : "bg-amber-100 text-amber-700 border-amber-200";

  const lastRunLabel = user?.autoRechargeLastRunAt
    ? dayjs(user.autoRechargeLastRunAt).format("MMM D, YYYY h:mm A")
    : "No auto-recharge yet";

  const planBadge = user?.isPremiumUser
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : colorMode === "dark"
      ? "bg-slate-800 text-slate-300 border-slate-600/50"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const autoRechargeRef = useRef(null);
  const allowPopupNavigation = useMemo(() => {
    if (typeof navigator === "undefined") return true;
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobi/i.test(ua);
    const isIPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return !(isMobileUA || isIPadOS);
  }, []);

  const openNavigationTarget = (targetWindow, url) => {
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url;
      targetWindow.focus?.();
      return true;
    }

    window.location.assign(url);
    return false;
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const normalizedThreshold = Math.max(0, Number(threshold) || 0);
    const normalizedAmount = Math.max(0, Number(amountUsd) || 0);
    const normalizedMaxMonthly = Math.max(0, Number(maxMonthlyUsd) || 0);

    if (normalizedMaxMonthly > 0 && normalizedAmount > normalizedMaxMonthly) {
      toast.error("Max monthly top-up must be greater than or equal to the recharge amount.");
      setIsSaving(false);
      return;
    }

    const shouldOpenSetupWindow = !hasPaymentMethod;
    const setupWindow =
      shouldOpenSetupWindow && allowPopupNavigation ? window.open("", "_blank") : null;
    let navigationHandled = false;

    try {
      const payload = {
        thresholdCredits: normalizedThreshold,
        amountUsd: normalizedAmount,
        maxMonthlyUsd: normalizedMaxMonthly,
        requestSetupSession: !hasPaymentMethod,
      };

      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/auto_recharge/settings`,
        payload,
        getHeaders() || {}
      );

      toast.success("Auto-recharge settings saved");
      if (res.data?.setupSessionUrl) {
        toast.info("Redirecting to Stripe to finish enabling auto-recharge.");
        navigationHandled = openNavigationTarget(setupWindow, res.data.setupSessionUrl);
      }
      await getUserAPI();
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Unable to save auto-recharge settings";
      toast.error(message);
    } finally {
      if (setupWindow && !navigationHandled && !setupWindow.closed) {
        setupWindow.close();
      }
      setIsSaving(false);
    }
  };

  const handleSaveThreshold = async () => {
    const normalizedThreshold = Math.max(0, Number(threshold) || 0);
    setIsSavingThreshold(true);
    try {
      await axios.post(
        `${PROCESSOR_SERVER}/users/auto_recharge/threshold`,
        { thresholdCredits: normalizedThreshold },
        getHeaders() || {}
      );
      toast.success("Auto-recharge threshold updated");
      await getUserAPI();
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Unable to update auto-recharge threshold";
      toast.error(message);
    } finally {
      setIsSavingThreshold(false);
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
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Auto-recharge failed";
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
    let purchaseWindow;
    let navigationHandled = false;
    try {
      purchaseWindow = allowPopupNavigation ? window.open("", "_blank") : null;
      const purchaseAmountRequest = parseInt(amountToPurchase, 10);
      const trimmedCouponCode = couponCode.trim();
      const purchasePayload = {
        amount: purchaseAmountRequest,
      };
      if (trimmedCouponCode.length > 0) {
        purchasePayload.couponCode = trimmedCouponCode;
      }
      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/purchase_credits`,
        purchasePayload,
        getHeaders()
      );
      const { url, couponApplied, discountPercent } = res.data || {};
      if (url) {
        navigationHandled = openNavigationTarget(purchaseWindow, url);
        if (couponApplied && discountPercent) {
          toast.success(`Coupon applied (${discountPercent}% off). Redirecting to Stripe checkout...`, { position: "bottom-center" });
        } else {
          toast.success("Redirecting to Stripe checkout...", { position: "bottom-center" });
        }
      } else {
        toast.error("Failed to generate payment URL", { position: "bottom-center" });
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Payment process failed";
      toast.error(errorMessage, { position: "bottom-center" });
    } finally {
      if (purchaseWindow && !navigationHandled && !purchaseWindow.closed) {
        purchaseWindow.close();
      }
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
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Unable to cancel auto-recharge.";
      toast.error(message);
    } finally {
      setIsCancelingAuto(false);
    }
  };

  const handleUpgradePlan = async () => {
    const upgradeWindow = allowPopupNavigation ? window.open("", "_blank") : null;
    let navigationHandled = false;
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

      if (data?.url) {
        navigationHandled = openNavigationTarget(upgradeWindow, data.url);
      }
    } catch (error) {
      
      setUpgradeError("Failed to upgrade the plan. Please try again.");
      toast.error("Upgrade failed");
      if (upgradeWindow && !upgradeWindow.closed) {
        upgradeWindow.close();
      }
    } finally {
      if (upgradeWindow && !navigationHandled && !upgradeWindow.closed) {
        upgradeWindow.close();
      }
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
              colorMode === "dark" ? "bg-[#0b1224]" : "bg-slate-50"
            }`}
          >
            <div>
              {(() => {
                const paymentDate = payment.paymentDate || payment.createdAt || new Date();
                return (
                  <p className={`text-xs ${subtleText}`}>
                    {dayjs(paymentDate).format("MMM D, YYYY")} • {formatPaymentTypeLabel(payment.paymentType)}
                  </p>
                );
              })()}
              <p className="font-semibold">{formatAmount(payment.amountPaidCents, payment.currency)}</p>
              <p className={`text-xs ${subtleText}`}>{payment.billingReason || payment.productSummary || ""}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{payment.creditsApplied || 0} credits</p>
              <p className={`text-xs ${subtleText}`}>{payment.paymentStatus || ""}</p>
              {payment.receiptAvailable && payment.receiptUrl ? (
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    colorMode === "dark"
                      ? "border-indigo-400/50 text-indigo-200 hover:border-indigo-300"
                      : "border-indigo-200 text-indigo-600 hover:border-indigo-300"
                  }`}
                >
                  Download receipt
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const planName = user?.isPremiumUser ? "Premium" : "Basic";
  const planStatusLabel = user?.isPremiumUser ? "Active" : "Starter";
  const planDescription = user?.isPremiumUser
    ? "Creators plan with monthly credits."
    : "Pay-as-you-go credits for occasional use.";
  const nextChargeLabel = user?.isPremiumUser
    ? formatDateString(user?.nextCreditRefill)
    : "No upcoming charge";

  return (
    <div className={`flex flex-col gap-6 ${textColor}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Billing</h2>
          <p className={`text-sm ${subtleText}`}>Manage credits, auto-recharge, and receipts.</p>
        </div>
        <div className={`flex items-center gap-4 rounded-xl border ${borderColor} ${mutedBg} px-4 py-3`}>
          <div>
            <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Plan</p>
            <p className="text-lg font-semibold">{planName}</p>
            <p className={`text-xs ${subtleText}`}>{planDescription}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planBadge}`}>
            {planStatusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={summaryCard}>
          <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Credits remaining</p>
          <p className="text-lg font-semibold">{user?.generationCredits || 0}</p>
        </div>
        <div className={summaryCard}>
          <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Next charge</p>
          <p className="text-sm font-semibold">{nextChargeLabel}</p>
        </div>
        <div className={summaryCard}>
          <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Auto-recharge</p>
          <p className="text-sm font-semibold">{autoStatusLabel}</p>
        </div>
      </div>

      <div className={`${sectionCard} p-6`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <FaCreditCard />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Purchase credits</h3>
              <p className={`text-sm ${subtleText}`}>Top up instantly and keep creating without limits.</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${borderColor} ${mutedBg}`}>
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
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                    : `${borderColor} ${
                        colorMode === "dark"
                          ? "hover:border-indigo-400/70 hover:bg-[#0b1224]"
                          : "hover:border-indigo-400 hover:bg-slate-50"
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
            className={`flex w-full items-center justify-between rounded-lg border ${borderColor} px-4 py-2 text-sm font-semibold ${
              colorMode === "dark" ? "bg-[#0b1224] hover:border-indigo-400/70" : "bg-white hover:border-indigo-400"
            }`}
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
                    ? "border-[#1f2a3d] bg-[#0b1224] text-slate-100 placeholder:text-slate-500"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
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

      <div ref={autoRechargeRef} className={`${sectionCard} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <FaBolt />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Auto-recharge</h3>
              <p className={`text-sm ${subtleText}`}>
                Automatically top up credits when your balance runs low.
              </p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge}`}>
            {autoStatusLabel}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Threshold (credits)</span>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${borderColor} ${
                colorMode === "dark" ? "bg-[#0b1224] text-slate-100" : "bg-white text-slate-900"
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
                colorMode === "dark" ? "bg-[#0b1224] text-slate-100" : "bg-white text-slate-900"
              }`}
            />
            <span className={`text-xs ${subtleText}`}>
              {`Adds ${numberFormatter.format(creditsPerCharge)} credits (1 USD = 100 credits).`}
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Max monthly top-up (USD)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={maxMonthlyUsd}
              onChange={(e) => setMaxMonthlyUsd(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${borderColor} ${
                colorMode === "dark" ? "bg-[#0b1224] text-slate-100" : "bg-white text-slate-900"
              }`}
            />
            <span className={`text-xs ${subtleText}`}>
              {hasMonthlyCap
                ? `Caps auto-recharge at ${numberFormatter.format(maxMonthlyCredits)} credits per month.`
                : "Optional. Set 0 for no monthly cap."}
            </span>
          </label>

          <div className={`flex flex-col gap-1 rounded-lg border ${borderColor} px-3 py-3 ${mutedBg}`}>
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
            onClick={handleSaveThreshold}
            disabled={isSavingThreshold || !isAutoEnabled}
            className={`flex items-center gap-2 rounded-lg border ${borderColor} px-4 py-2 text-sm font-semibold ${
              colorMode === "dark" ? "bg-[#0b1224] hover:bg-[#0f1629]" : "bg-white hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FaCheck /> {isSavingThreshold ? "Saving threshold..." : "Save threshold"}
          </button>
          <button
            onClick={handleTriggerNow}
            disabled={isTriggering}
            className={`flex items-center gap-2 rounded-lg border ${borderColor} px-4 py-2 text-sm font-semibold ${
              colorMode === "dark" ? "bg-[#0b1224] hover:bg-[#0f1629]" : "bg-white hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FaSync /> {isTriggering ? "Running…" : "Run auto-recharge now"}
          </button>
          {(isAutoEnabled || hasPaymentMethod) && (
            <button
              onClick={handleCancelAutoRecharge}
              disabled={isCancelingAuto}
              className={`flex items-center gap-2 rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-500 ${
                colorMode === "dark" ? "bg-[#0b1224] hover:bg-[#0f1629]" : "bg-red-50 hover:bg-red-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <FaTimes /> {isCancelingAuto ? "Canceling…" : "Cancel auto-recharge"}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className={`rounded-lg border ${borderColor} px-3 py-2 ${mutedBg}`}>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Credits per recharge</p>
            <p className="text-lg font-semibold">{numberFormatter.format(creditsPerCharge)}</p>
          </div>
          <div className={`rounded-lg border ${borderColor} px-3 py-2 ${mutedBg}`}>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Monthly cap</p>
            <p className="text-lg font-semibold">
              {hasMonthlyCap ? formatAmount(Number(maxMonthlyUsd || 0) * 100, "USD") : "No cap"}
            </p>
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

      <div className={`${sectionCard} overflow-hidden`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <FaCreditCard />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Billing history</h3>
              <p className={`text-sm ${subtleText}`}>Recent receipts and credit top-ups.</p>
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
        <div className="p-6">{renderHistory()}</div>
      </div>

      <div className={`${sectionCard} p-6`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <FaCrown />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Premium plan</h3>
            <p className={`text-sm ${subtleText}`}>5,000 credits per month • Enhanced support</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          {[
            "5,000 credits per month",
            "Access to all models",
            "Full generative workflow suite",
            "50GB render storage",
            "Commercial usage rights",
            "Enhanced support",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <FaCheck className="mt-1 text-emerald-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {upgradeError && <p className="text-sm text-red-500 mt-3">{upgradeError}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpgradePlan}
            disabled={user?.isPremiumUser || isUpgrading}
            className={`flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FaArrowRight />
            {user?.isPremiumUser ? "You're on Premium" : isUpgrading ? "Redirecting..." : "Get Premium"}
          </button>
          {user?.isPremiumUser && (
            <SecondaryButton onClick={handleCancelMembership} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel membership"}
            </SecondaryButton>
          )}
        </div>
        {!user?.isPremiumUser && (
          <p className={`text-xs ${subtleText} mt-3`}>
            Upgrade to unlock monthly credits and premium features.
          </p>
        )}
      </div>
    </div>
  );
}
