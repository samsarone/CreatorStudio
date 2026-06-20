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
import { hasInsufficientGenerationCredits } from "../../utils/defaultRoutes.js";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;
const numberFormatter = new Intl.NumberFormat("en-US");

const DEFAULT_PURCHASE_USD = 50;
const MIN_PURCHASE_USD = 1;
const PRICING_DOCS_URL = "https://docs.samsar.one/pricing/";
const thresholdPresets = [100, 500, 1000];
const rechargeAmountPresets = [10, 25, 50, 100];

const sanitizeWholeDollarInput = (value) =>
  String(value ?? "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");

const normalizeWholeDollarAmount = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_PURCHASE_USD) return MIN_PURCHASE_USD;
  return parsed;
};

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
  const sectionCard = `rounded-lg border ${borderColor} ${cardBgColor}`;
  const summaryCard = `rounded-lg border ${borderColor} ${mutedBg} p-4`;

  const [threshold, setThreshold] = useState(1000);
  const [amountUsd, setAmountUsd] = useState(50);
  const [maxMonthlyUsd, setMaxMonthlyUsd] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [creditPurchaseUsd, setCreditPurchaseUsd] = useState(String(DEFAULT_PURCHASE_USD));
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
  }, [location.search, getUserAPI]);

  const creditsPerCharge = useMemo(
    () => Math.max(0, Math.round(Number(amountUsd || 0) * 100)),
    [amountUsd]
  );
  const purchaseAmountUsd = useMemo(
    () => normalizeWholeDollarAmount(creditPurchaseUsd),
    [creditPurchaseUsd]
  );
  const purchaseCreditCount = useMemo(
    () => purchaseAmountUsd * 100,
    [purchaseAmountUsd]
  );
  const maxMonthlyCredits = useMemo(
    () => Math.max(0, Math.round(Number(maxMonthlyUsd || 0) * 100)),
    [maxMonthlyUsd]
  );
  const hasMonthlyCap = Number(maxMonthlyUsd || 0) > 0;
  const showLowCreditPurchaseCue = hasInsufficientGenerationCredits(user);
  const currentCredits = numberFormatter.format(user?.generationCredits || 0);

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

  const handleCreditPurchaseChange = (event) => {
    setCreditPurchaseUsd(sanitizeWholeDollarInput(event.target.value));
  };

  const handleCreditPurchaseBlur = () => {
    setCreditPurchaseUsd(String(purchaseAmountUsd));
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
    const purchaseAmountRequest = parseInt(amountToPurchase, 10);
    if (Number.isNaN(purchaseAmountRequest) || purchaseAmountRequest <= 0) {
      toast.error("Enter a whole dollar amount first.", { position: "bottom-center" });
      return;
    }

    setIsPurchasing(true);
    let purchaseWindow;
    let navigationHandled = false;
    try {
      purchaseWindow = allowPopupNavigation ? window.open("", "_blank") : null;
      const purchasePayload = {
        amount: purchaseAmountRequest,
      };
      const res = await axios.post(
        `${PROCESSOR_SERVER}/users/purchase_credits`,
        purchasePayload,
        getHeaders()
      );
      const { url } = res.data || {};
      if (url) {
        navigationHandled = openNavigationTarget(purchaseWindow, url);
        toast.success("Redirecting to Stripe checkout...", { position: "bottom-center" });
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
    if (isHistoryLoading) {
      return (
        <div className={`rounded-lg border ${borderColor} ${mutedBg} px-4 py-5 text-sm ${subtleText}`}>
          Loading billing history...
        </div>
      );
    }
    if (!billingHistory.length) {
      return (
        <div className={`rounded-lg border ${borderColor} ${mutedBg} px-4 py-5 text-sm ${subtleText}`}>
          No billing records yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {billingHistory.map((payment) => (
          <div
            key={payment.id || payment.stripeInvoiceId}
            className={`flex flex-col gap-3 rounded-lg border ${borderColor} px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              colorMode === "dark" ? "bg-[#0b1224]" : "bg-slate-50"
            }`}
          >
            <div className="min-w-0">
              {(() => {
                const paymentDate = payment.paymentDate || payment.createdAt || new Date();
                return (
                  <p className={`text-xs ${subtleText}`}>
                    {dayjs(paymentDate).format("MMM D, YYYY")} • {formatPaymentTypeLabel(payment.paymentType)}
                  </p>
                );
              })()}
              <p className="font-semibold">{formatAmount(payment.amountPaidCents, payment.currency)}</p>
              <p className={`truncate text-xs ${subtleText}`}>{payment.billingReason || payment.productSummary || ""}</p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:text-right">
              <p className="text-sm font-semibold">{payment.creditsApplied || 0} credits</p>
              <p className={`rounded-full border px-2 py-1 text-xs ${borderColor} ${mutedBg}`}>
                {payment.paymentStatus || "recorded"}
              </p>
              {payment.receiptAvailable && payment.receiptUrl ? (
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
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

  const planName = user?.isPremiumUser ? "Creators" : "Pay as you go";
  const planStatusLabel = user?.isPremiumUser ? "Active" : "Starter";
  const planDescription = user?.isPremiumUser
    ? "Monthly credits, enhanced storage, and priority queues."
    : "Manual credit purchases with optional auto-recharge.";
  const nextChargeLabel = user?.isPremiumUser
    ? formatDateString(user?.nextCreditRefill)
    : "No upcoming charge";

  return (
    <div className={`mx-auto flex w-full max-w-5xl flex-col gap-5 ${textColor}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Billing</h2>
          <p className={`text-sm ${subtleText}`}>Buy credits, manage auto-recharge, and review receipts.</p>
        </div>
        <div className={`rounded-lg border ${borderColor} ${mutedBg} px-4 py-3 text-right`}>
          <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Current credits</p>
          <p className="text-2xl font-semibold">{currentCredits}</p>
        </div>
      </div>

      <div className={`${sectionCard} p-6`}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <FaCreditCard />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Default action</p>
                <h3 className="text-lg font-semibold">Buy credits</h3>
                <p className={`text-sm ${subtleText}`}>Enter a dollar amount. Credits are added after Stripe checkout.</p>
              </div>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-semibold">Amount to purchase</span>
              <div className={`mt-2 flex min-h-[58px] items-center rounded-lg border ${borderColor} ${
                colorMode === "dark" ? "bg-[#0b1224]" : "bg-white"
              }`}>
                <span className={`px-4 text-xl font-semibold ${subtleText}`}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={creditPurchaseUsd}
                  onChange={handleCreditPurchaseChange}
                  onBlur={handleCreditPurchaseBlur}
                  aria-label="Whole dollar credit purchase amount"
                  className={`min-w-0 flex-1 bg-transparent py-3 text-3xl font-semibold outline-none ${
                    colorMode === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                />
                <span className={`px-4 text-sm font-semibold ${subtleText}`}>USD</span>
              </div>
              <span className={`mt-2 block text-xs ${subtleText}`}>Whole dollar amounts only. $1 = 100 credits.</span>
            </label>

            <div className={`mt-4 rounded-lg border ${borderColor} ${mutedBg} p-4`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Credits for this purchase</p>
                  <p className="text-3xl font-semibold">{numberFormatter.format(purchaseCreditCount)}</p>
                </div>
                <p className={`text-sm ${subtleText}`}>
                  ${numberFormatter.format(purchaseAmountUsd)} x 100 credits
                </p>
              </div>
            </div>

            <a
              href={PRICING_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex text-sm font-semibold underline-offset-4 hover:underline ${
                colorMode === "dark" ? "text-indigo-200" : "text-indigo-600"
              }`}
            >
              See model pricing here
            </a>
          </div>

          <div className={`flex flex-col justify-between rounded-lg border ${borderColor} ${mutedBg} p-4`}>
            <div>
              <p className="text-sm font-semibold">Checkout summary</p>
              <div className={`mt-4 space-y-3 text-sm ${subtleText}`}>
                <div className="flex items-center justify-between gap-3">
                  <span>Amount</span>
                  <span className={textColor}>${numberFormatter.format(purchaseAmountUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Credits</span>
                  <span className={textColor}>{numberFormatter.format(purchaseCreditCount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Current balance</span>
                  <span className={textColor}>{currentCredits}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setIsCouponOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border ${borderColor} px-3 py-2 text-sm font-semibold ${
                  colorMode === "dark" ? "bg-[#0b1224] hover:border-indigo-400/70" : "bg-white hover:border-indigo-400"
                }`}
              >
                <span>Have a credits coupon?</span>
                <span>{isCouponOpen ? "Hide" : "Add"}</span>
              </button>

              {isCouponOpen && (
                <div className="grid gap-3">
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

              <div className="relative pt-7">
                {showLowCreditPurchaseCue ? (
                  <div
                    className={`pointer-events-none absolute right-3 top-0 z-10 rounded-lg border px-3 py-2 text-xs font-semibold shadow-lg animate-bounce motion-reduce:animate-none ${
                      colorMode === "dark"
                        ? "border-white/10 bg-white text-slate-950"
                        : "border-slate-950 bg-slate-950 text-white"
                    }`}
                  >
                    Add credits to generate
                    <span
                      className={`absolute bottom-[-5px] right-6 h-3 w-3 rotate-45 border-b border-r ${
                        colorMode === "dark"
                          ? "border-white/10 bg-white"
                          : "border-slate-950 bg-slate-950"
                      }`}
                    />
                  </div>
                ) : null}
                <button
                  onClick={() => purchaseCreditsForUser(purchaseAmountUsd)}
                  disabled={isPurchasing}
                  className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    colorMode === "dark"
                      ? "bg-white text-slate-950 hover:bg-slate-200"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                  }`}
                >
                  <FaArrowRight />
                  {isPurchasing
                    ? "Opening checkout..."
                    : `Buy ${numberFormatter.format(purchaseCreditCount)} credits`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={summaryCard}>
          <p className={`text-xs uppercase tracking-wide ${subtleText}`}>Plan</p>
          <p className="text-lg font-semibold">{planName}</p>
          <p className={`text-xs ${subtleText}`}>{planDescription}</p>
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
            <div className="flex flex-wrap gap-2">
              {thresholdPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setThreshold(preset)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${borderColor} ${
                    Number(threshold) === preset
                      ? "bg-indigo-600 text-white"
                      : colorMode === "dark"
                        ? "bg-[#0b1224] hover:border-indigo-400/70"
                        : "bg-white hover:border-indigo-400"
                  }`}
                >
                  {numberFormatter.format(preset)}
                </button>
              ))}
            </div>
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
            <div className="flex flex-wrap gap-2">
              {rechargeAmountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUsd(preset)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${borderColor} ${
                    Number(amountUsd) === preset
                      ? "bg-emerald-600 text-white"
                      : colorMode === "dark"
                        ? "bg-[#0b1224] hover:border-emerald-400/70"
                        : "bg-white hover:border-emerald-400"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FaCrown />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Monthly creators plan</h3>
              <p className={`text-sm ${subtleText}`}>
                Enhanced storage and prioritized queue times for creators.
              </p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planBadge}`}>
            {planStatusLabel}
          </span>
        </div>

        <div className={`mt-5 rounded-lg border ${borderColor} ${mutedBg} p-4`}>
          <p className="text-2xl font-semibold">$50/mo</p>
          <p className={`mt-1 text-sm ${subtleText}`}>
            Comes with 5,000 credits refilled every month. Unused credits never expire.
          </p>
        </div>

        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "5,000 credits per month",
            "50GB render storage",
            "Prioritized queue times",
            "Access to all models",
            "Full generative workflow suite",
            "Commercial usage rights",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <FaCheck className="mt-1 shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {upgradeError && <p className="text-sm text-red-500 mt-3">{upgradeError}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpgradePlan}
            disabled={user?.isPremiumUser || isUpgrading}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              colorMode === "dark"
                ? "bg-white text-slate-950 hover:bg-slate-200"
                : "bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            <FaArrowRight />
            {user?.isPremiumUser ? "Creators plan active" : isUpgrading ? "Opening checkout..." : "Subscribe for $50/mo"}
          </button>
          {user?.isPremiumUser && (
            <SecondaryButton onClick={handleCancelMembership} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel membership"}
            </SecondaryButton>
          )}
        </div>
        {!user?.isPremiumUser && (
          <p className={`text-xs ${subtleText} mt-3`}>
            Subscribe when steady monthly generation is more useful than manual top-ups.
          </p>
        )}
      </div>
    </div>
  );
}
