'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCcw,
  Shield,
  Wallet,
  Lock,
  Bot,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NearVeilInvoice, OneClickQuoteResponse, OneClickTokenOption } from '@/lib/types';

export default function InvoiceCheckoutPage() {
  const params = useParams();
  const invoiceId = String(params?.id || '');

  const [invoice, setInvoice] = useState<NearVeilInvoice | null>(null);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [quote, setQuote] = useState<OneClickQuoteResponse | null>(null);
  const [defaultViewingKey, setDefaultViewingKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    txUrl?: string | null;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices', { cache: 'no-store' });
      const data = await res.json();
      const found = (data.invoices || []).find(
        (i: NearVeilInvoice) => i.invoiceId === invoiceId
      );
      setInvoice(found || null);
      const tokenList: OneClickTokenOption[] = data.oneClickTokens || [];
      setTokens(tokenList);
      if (!selectedAssetId && tokenList.length > 0) {
        setSelectedAssetId(tokenList[2]?.assetId || tokenList[0].assetId);
      }
      setDefaultViewingKey(data.testnetInfo?.defaultViewingKey || '');
    } catch {
      setBannerMessage({
        type: 'error',
        text: 'Failed to load invoice details.',
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, selectedAssetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequest1ClickQuote = async (assetIdToUse?: string) => {
    if (!invoice) return;
    const targetAsset = assetIdToUse || selectedAssetId;
    setBusyAction('quote');
    setBannerMessage(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quote_1click',
          invoiceId: invoice.invoiceId,
          originAssetId: targetAsset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quote error');
      setQuote(data.quote);
      setInvoice(data.invoice);
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePayWith1Click = async () => {
    if (!invoice) return;
    setBusyAction('pay');
    setBannerMessage(null);
    const chosenToken =
      tokens.find((t) => t.assetId === selectedAssetId) || tokens[0];
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice_1click',
          invoiceId: invoice.invoiceId,
          originAssetSymbol: chosenToken?.symbol || 'SOL',
          originChain: chosenToken?.chain || 'Solana',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: `Payment complete! $${data.invoice.totalAmountUsdc.toFixed(2)} USDC settled on NEAR Testnet.`,
        txUrl: data.invoice.settlementTxUrl,
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePingPayX402 = async () => {
    if (!invoice) return;
    setBusyAction('x402');
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/x402/${encodeURIComponent(invoice.invoiceId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': 'pingpay_x402_base_usdc_testnet_proof',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'x402 payment failed');
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: 'Paid via PingPay x402 Agent Facilitator (Base USDC → NEAR)!',
        txUrl: data.invoice.settlementTxUrl,
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefundInvoice = async () => {
    if (!invoice) return;
    setBusyAction('refund');
    setBannerMessage(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund_invoice',
          invoiceId: invoice.invoiceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'info',
        text: `Invoice ${data.invoice.invoiceId} refunded to client.`,
        txUrl: data.invoice.refundTxUrl,
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleClaimStealth = async () => {
    if (!invoice) return;
    setBusyAction('claim');
    setBannerMessage(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_stealth',
          invoiceId: invoice.invoiceId,
          claimSecret: invoice.claimSecretHint,
          destinationStealthAccount: invoice.stealthImplicitAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Stealth claim failed');
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: `Swept $${data.invoice.totalAmountUsdc.toFixed(2)} USDC privately to your one-time wallet with $0.00 gas!`,
        txUrl: data.invoice.stealthClaimTxUrl,
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-2.5 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-6">
        <p className="text-lg font-semibold mb-4">Invoice not found: {invoiceId}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to NearVeil
        </Link>
      </div>
    );
  }

  const chosenToken =
    tokens.find((t) => t.assetId === selectedAssetId) || tokens[0];
  const estimatedOriginAmount = chosenToken
    ? (invoice.totalAmountUsdc / chosenToken.priceUsd).toFixed(
        chosenToken.priceUsd === 1 ? 2 : 4
      )
    : invoice.totalAmountUsdc.toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
              NEAR Testnet
            </span>
            <a
              href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(defaultViewingKey)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export CSV
            </a>
          </div>
        </div>

        {/* Status Notification */}
        {bannerMessage && (
          <div
            className={`mb-6 px-4 py-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : bannerMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bannerMessage.text}</span>
            </div>
            {bannerMessage.txUrl && (
              <a
                href={bannerMessage.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold underline hover:opacity-80"
              >
                View Receipt
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Stripe-Style Clean Paper Invoice */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
              {/* Invoice Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    NearVeil Protected Invoice
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {invoice.invoiceId}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Billed to <strong className="text-slate-900">{invoice.clientName}</strong>
                    {invoice.clientReference ? ` · Ref: ${invoice.clientReference}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  {invoice.status === 'PAID' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </span>
                  )}
                  {invoice.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  )}
                  {invoice.status === 'REFUNDED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Refunded
                    </span>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    Issued {invoice.issueDateUtc} · Due{' '}
                    <span className="font-medium text-slate-900">{invoice.dueDateUtc}</span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="py-6">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium text-right">Qty</th>
                      <th className="pb-3 font-medium text-right">Rate</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 font-medium text-slate-900">
                          {item.description}
                        </td>
                        <td className="py-3.5 text-right text-slate-600 tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-right text-slate-600 tabular-nums">
                          ${item.unitPriceUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                          ${(item.quantity * item.unitPriceUsd).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="text-slate-900 tabular-nums">
                      ${invoice.subtotalUsd.toFixed(2)}
                    </span>
                  </div>
                  {invoice.taxAmountUsd > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax ({invoice.taxRatePercent}%)</span>
                      <span className="text-slate-900 tabular-nums">
                        ${invoice.taxAmountUsd.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Network Gas Fee (Freelancer)</span>
                    <span className="text-emerald-600 font-medium">$0.00 (Sponsored)</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="font-semibold text-slate-900">Amount Due</span>
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">
                      ${invoice.totalAmountUsdc.toFixed(2)}{' '}
                      <span className="text-sm font-medium text-slate-500">USDC</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Freelancer Private Claim Section (shown neatly once paid) */}
              {invoice.status === 'PAID' && (
                <div className="pt-5 border-t border-slate-100">
                  {invoice.claimedToStealthWallet ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Claimed privately to one-time NEAR stealth wallet ($0 gas)
                      </div>
                      {invoice.stealthClaimTxUrl && (
                        <a
                          href={invoice.stealthClaimTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold underline"
                        >
                          View Sweep Receipt
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-900 block">
                          Freelancer: Ready to Claim Privately
                        </strong>
                        Sweep funds to a fresh unlinked wallet with zero gas fees.
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === 'claim'}
                        onClick={handleClaimStealth}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {busyAction === 'claim' ? 'Claiming...' : 'Claim Privately ($0 Gas)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible On-Chain Verification Links */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center justify-between w-full text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <span>On-Chain Receipts &amp; Privacy Details</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Created (Gasless Relayer):</span>
                      <a
                        href={invoice.creationTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline font-mono inline-flex items-center gap-1"
                      >
                        {invoice.creationTxHash.slice(0, 14)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {invoice.settlementTxUrl && invoice.settlementTxHash && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Settlement Receipt:</span>
                        <a
                          href={invoice.settlementTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline font-mono inline-flex items-center gap-1"
                        >
                          {invoice.settlementTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {invoice.refundTxUrl && invoice.refundTxHash && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Refund Receipt:</span>
                        <a
                          href={invoice.refundTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rose-600 hover:underline font-mono inline-flex items-center gap-1"
                        >
                          {invoice.refundTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">One-Time Stealth Account:</span>
                      <span className="font-mono text-slate-700">
                        {invoice.stealthImplicitAccount.slice(0, 14)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Clean Client Payment Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pay Invoice</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose any token you already hold. Powered by NEAR Intents 1Click API.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Pay With
                </label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    handleRequest1ClickQuote(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {tokens.map((t) => (
                    <option key={t.assetId} value={t.assetId}>
                      {t.symbol} ({t.chain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>You Pay ({chosenToken?.chain})</span>
                  <span className="font-bold text-slate-900 text-sm tabular-nums">
                    ~{estimatedOriginAmount} {chosenToken?.symbol.split(' ')[0]}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Recipient Receives</span>
                  <span className="font-bold text-emerald-600 text-sm tabular-nums">
                    ${invoice.totalAmountUsdc.toFixed(2)} USDC
                  </span>
                </div>
                {quote && (
                  <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    1Click Deposit Address:{' '}
                    <span className="font-mono text-slate-700 break-all">
                      {quote.depositAddress}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={invoice.status === 'PAID' || busyAction !== null}
                  onClick={handlePayWith1Click}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  {busyAction === 'pay'
                    ? 'Processing Payment...'
                    : invoice.status === 'PAID'
                      ? 'Invoice Paid'
                      : `Pay $${invoice.totalAmountUsdc.toFixed(2)} Now`}
                </button>

                {invoice.status !== 'PAID' && (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={handlePingPayX402}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Bot className="w-4 h-4 text-indigo-600" />
                    {busyAction === 'x402'
                      ? 'Settling via PingPay...'
                      : 'Pay via AI Agent (PingPay x402)'}
                  </button>
                )}

                {invoice.status === 'PAID' && (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={handleRefundInvoice}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    {busyAction === 'refund'
                      ? 'Refunding...'
                      : 'Issue Full Refund'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
