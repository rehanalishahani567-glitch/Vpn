import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Globe,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../data/vpnData';
import { BillingCycle, PlanTier, SubscriptionPlan } from '../types/vpn';

export interface BillingReceipt {
  planName: string;
  transactionId: string;
  methodSummary: string;
  totalFormatted: string;
}

interface UpgradePanelProps {
  activePlan: PlanTier;
  billingCycle: BillingCycle;
  promptServerName?: string | null;
  verifiedReceipt?: BillingReceipt | null;
  checkoutNotice?: string | null;
  onChangeBillingCycle: (cycle: BillingCycle) => void;
  onActivatePlan: (plan: PlanTier) => void;
  onClearPrompt?: () => void;
  onDismissReceipt?: () => void;
  onDismissNotice?: () => void;
}

type PaymentMethod = 'credit-card' | 'debit-card' | 'wallet';

interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  decimals: number;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', rateFromUsd: 1, decimals: 2 },
  { code: 'EUR', symbol: '€', rateFromUsd: 0.92, decimals: 2 },
  { code: 'GBP', symbol: '£', rateFromUsd: 0.79, decimals: 2 },
  { code: 'AED', symbol: 'AED ', rateFromUsd: 3.67, decimals: 2 },
  { code: 'PKR', symbol: '₨', rateFromUsd: 278, decimals: 0 },
];

export const UpgradePanel: React.FC<UpgradePanelProps> = ({
  activePlan,
  billingCycle,
  promptServerName,
  verifiedReceipt,
  checkoutNotice,
  onChangeBillingCycle,
  onActivatePlan,
  onClearPrompt,
  onDismissReceipt,
  onDismissNotice,
}) => {
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit-card');
  const [billingEmail, setBillingEmail] = useState('');

  const [gatewayStatus, setGatewayStatus] = useState<{
    loaded: boolean;
    livePaymentsEnabled: boolean;
    mode: 'live' | 'test' | 'unconfigured';
  }>({ loaded: false, livePaymentsEnabled: false, mode: 'unconfigured' });

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);

  const [restoreEmail, setRestoreEmail] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/billing/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setGatewayStatus({
          loaded: true,
          livePaymentsEnabled: Boolean(data.livePaymentsEnabled),
          mode: data.mode || 'unconfigured',
        });
      })
      .catch(() => {
        if (active) {
          setGatewayStatus({ loaded: true, livePaymentsEnabled: false, mode: 'unconfigured' });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0],
    [currencyCode]
  );

  const currentPlanMeta =
    SUBSCRIPTION_PLANS.find((p) => p.id === activePlan) || SUBSCRIPTION_PLANS[0];

  const getMonthlyUsd = (plan: SubscriptionPlan): number => {
    if (plan.monthlyPriceUsd === 0) return 0;
    return billingCycle === 'yearly' ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
  };

  const formatMoney = (usdAmount: number): string => {
    if (usdAmount === 0) return `${currency.symbol}0`;
    const converted = usdAmount * currency.rateFromUsd;
    if (currency.decimals === 0) {
      return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currency.symbol}${converted.toFixed(currency.decimals)}`;
  };

  const getBilledTotalUsd = (plan: SubscriptionPlan): number => {
    const monthly = getMonthlyUsd(plan);
    return billingCycle === 'yearly' ? monthly * 12 : monthly;
  };

  const getBilledTotalLabel = (plan: SubscriptionPlan): string => {
    if (plan.monthlyPriceUsd === 0) return 'Free forever';
    const total = formatMoney(getBilledTotalUsd(plan));
    return billingCycle === 'yearly' ? `${total} billed annually` : `${total} billed monthly`;
  };

  const handleStartStripeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    setCheckoutError(null);
    setStripeCheckoutUrl(null);

    const emailTrimmed = billingEmail.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setCheckoutError('Please enter a valid email address for your receipt.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlan.id,
          billingCycle,
          currency: currency.code,
          email: emailTrimmed,
          originUrl: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !data.checkoutUrl) {
        setCheckoutError(data.error || 'Could not start Stripe payment session.');
        setIsProcessing(false);
        return;
      }

      setStripeCheckoutUrl(data.checkoutUrl);
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = data.checkoutUrl;
        } else {
          window.location.href = data.checkoutUrl;
        }
      } catch {
        // If iframe blocks top-level programmatic navigation, the direct Secure Checkout button below lets the user proceed in 1 click
      }
    } catch {
      setCheckoutError('Unable to reach payment gateway. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = restoreEmail.trim();
    if (!email) return;
    setIsRestoring(true);
    setRestoreStatus(null);
    try {
      const res = await fetch(`/api/billing/subscription?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.subscription) {
        setRestoreStatus(data.error || 'No active paid plan found for this email.');
      } else {
        onActivatePlan(data.subscription.planId);
        setRestoreStatus(
          `Restored ${data.subscription.planId === 'max' ? 'Meridian Max' : 'Meridian Pro'} subscription.`
        );
      }
    } catch {
      setRestoreStatus('Unable to verify subscription status right now.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-6">
      {/* Contextual Banner when coming from a locked Pro server */}
      {promptServerName && activePlan === 'free' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs text-sky-800 dark:text-sky-200">
          <div className="flex items-center gap-2.5">
            <Crown className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              <strong>{promptServerName}</strong> requires <strong>Meridian Pro</strong> or{' '}
              <strong>Max</strong>. Choose a plan below to unlock all 16 global servers.
            </span>
          </div>
          {onClearPrompt && (
            <button
              type="button"
              onClick={onClearPrompt}
              aria-label="Dismiss notice"
              className="text-sky-600 dark:text-sky-300 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Checkout Notice (e.g., canceled or verification message) */}
      {checkoutNotice && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl border border-amber-500/35 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{checkoutNotice}</span>
          </div>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Close notice"
              className="text-amber-700 dark:text-amber-300 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Verified Payment Receipt Banner */}
      {verifiedReceipt && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                {verifiedReceipt.planName} Activated · {verifiedReceipt.totalFormatted}
              </div>
              <div className="text-[11px] opacity-85 mt-0.5 font-mono break-all">
                Session {verifiedReceipt.transactionId} · Verified via {verifiedReceipt.methodSummary}
              </div>
            </div>
          </div>
          {onDismissReceipt && (
            <button
              type="button"
              onClick={onDismissReceipt}
              aria-label="Dismiss receipt"
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Header, Currency Selector & Billing Switch */}
      <div className="border border-slate-200 dark:border-slate-800/90 rounded-2xl bg-white dark:bg-[#0D1524] p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 sm:gap-5 overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Current Plan · {currentPlanMeta.name}
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Upgrade Your VPN Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentPlanMeta.deviceLimit} device{currentPlanMeta.deviceLimit > 1 ? 's' : ''} ·{' '}
            {currentPlanMeta.bandwidthLabel} · {currentPlanMeta.serverAccessLabel}
          </p>
        </div>

        <div className="w-full sm:w-auto min-w-0 max-w-full flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              aria-label="Billing currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900">
                  {c.code} ({c.symbol.trim()})
                </option>
              ))}
            </select>
          </div>

          <div className="max-w-full min-w-0 flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onChangeBillingCycle('monthly')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onChangeBillingCycle('yearly')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">Yearly (-43%)</span>
              <span className="hidden sm:inline">Yearly · Save 43%</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = activePlan === plan.id;
          const isProHighlighted = Boolean(plan.highlighted);

          return (
            <div
              key={plan.id}
              className={`min-w-0 rounded-2xl border p-6 flex flex-col justify-between transition-colors ${
                isCurrent
                  ? 'border-emerald-500 bg-emerald-50/35 dark:bg-emerald-950/20'
                  : isProHighlighted
                    ? 'border-sky-500/60 bg-white dark:bg-[#0F1725]'
                    : 'border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F1725]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  {isCurrent ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  ) : isProHighlighted ? (
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                      Most Popular
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed min-h-[34px]">
                  {plan.tagline}
                </p>

                <div className="mt-5 pb-5 border-b border-slate-200 dark:border-slate-800/90">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(getMonthlyUsd(plan))}
                    </span>
                    {plan.monthlyPriceUsd > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {getBilledTotalLabel(plan)}
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/70">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default"
                  >
                    Current Active Plan
                  </button>
                ) : plan.id === 'free' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onActivatePlan('free');
                      setCheckoutPlan(null);
                      setStripeCheckoutUrl(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Switch to Free
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutPlan(plan);
                      setCheckoutError(null);
                      setStripeCheckoutUrl(null);
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer ${
                      isProHighlighted
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-sky-600 hover:bg-sky-500'
                    }`}
                  >
                    Upgrade to {plan.name.replace('Meridian ', '')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real Stripe PCI-Compliant Checkout */}
      {checkoutPlan && (
        <form
          onSubmit={handleStartStripeCheckout}
          className="border border-emerald-500/50 rounded-2xl bg-white dark:bg-[#0D1524] p-4 sm:p-6 space-y-5 shadow-md"
        >
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/90">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                Stripe Secure Checkout · Real Payouts
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Upgrade to {checkoutPlan.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutPlan(null)}
              aria-label="Cancel checkout"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {gatewayStatus.loaded && !gatewayStatus.livePaymentsEnabled && (
            <div className="p-4 rounded-xl border border-amber-500/35 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                Stripe Merchant Key Not Configured Yet
              </div>
              <p className="leading-relaxed opacity-90">
                Real card payouts go straight to your linked bank account once{' '}
                <code className="font-mono font-semibold">STRIPE_SECRET_KEY</code> (and{' '}
                <code className="font-mono font-semibold">STRIPE_WEBHOOK_SECRET</code>) are added in
                the AI Studio <strong>Secrets</strong> panel.
              </p>
            </div>
          )}

          {checkoutError && (
            <div className="p-3 rounded-lg border border-rose-500/35 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              {checkoutError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Supported Methods (Processed Securely by Stripe)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'credit-card' as const, label: 'Credit Card', icon: CreditCard },
                    { id: 'debit-card' as const, label: 'Debit Card', icon: CreditCard },
                    { id: 'wallet' as const, label: 'Apple / GPay', icon: Smartphone },
                  ].map((method) => {
                    const Icon = method.icon;
                    const active = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="billing-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Account & Receipt Email
                </label>
                <input
                  id="billing-email"
                  type="email"
                  required
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your Credit Card, Debit Card (Visa, Mastercard, Amex), or Apple/Google Pay details are
                entered directly on Stripe&apos;s encrypted PCI-DSS checkout page and settled into the
                merchant bank account.
              </div>

              {stripeCheckoutUrl && (
                <a
                  href={stripeCheckoutUrl}
                  target="_top"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Continue to Secure Stripe Payment Page
                </a>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col justify-between space-y-5">
              <div className="space-y-3 text-xs">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Order Summary
                </h4>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Plan</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {checkoutPlan.name} ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Servers</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {checkoutPlan.serverAccessLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Devices</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    Up to {checkoutPlan.deviceLimit}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Due</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(getBilledTotalUsd(checkoutPlan))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isProcessing || !gatewayStatus.livePaymentsEnabled}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing
                    ? 'Connecting to Stripe...'
                    : gatewayStatus.livePaymentsEnabled
                      ? `Pay ${formatMoney(getBilledTotalUsd(checkoutPlan))} with Stripe`
                      : 'Stripe Key Required in Secrets'}
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  30-day money-back guarantee · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Restore Paid Subscription by Email */}
      <form
        onSubmit={handleRestoreSubscription}
        className="border border-slate-200 dark:border-slate-800/90 rounded-2xl bg-white dark:bg-[#0D1524] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            Already upgraded?
          </div>
          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
            Restore your verified paid subscription using your billing email.
          </div>
          {restoreStatus && (
            <div className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {restoreStatus}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <input
            type="email"
            value={restoreEmail}
            onChange={(e) => setRestoreEmail(e.target.value)}
            placeholder="Billing email"
            className="min-w-0 flex-1 sm:w-56 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={isRestoring}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {isRestoring ? 'Checking...' : 'Restore'}
          </button>
        </div>
      </form>
    </div>
  );
};
