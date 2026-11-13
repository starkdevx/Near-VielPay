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
  Sparkles,
  Wallet,
  Lock,
  Bot,
  FileSpreadsheet,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { NearVeilInvoice, OneClickQuoteResponse, OneClickTokenOption } from '@/lib/types';

export default function InvoiceCheckoutPage() {
  const params = useParams();
  const invoiceId = String(params?.id || '');

  const [invoice, setInvoice] = useState<NearVeilInvoice | null>(null);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [quote, setQuote] = useState<OneClickQuoteResponse | null>(null);
  const [contractAccountId, setContractAccountId] = useState<string>('');
  const [relayerAccountId, setRelayerAccountId] = useState<string>('');
  const [defaultViewingKey, setDefaultViewingKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    txUrl?: string | null;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customStealthDest, setCustomStealthDest] = useState<string>('');

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
      setContractAccountId(data.testnetInfo?.contractAccountId || '');
      setRelayerAccountId(data.testnetInfo?.relayerAccountId || '');
      setDefaultViewingKey(data.testnetInfo?.defaultViewingKey || '');
    } catch {
      setBannerMessage({
        type: 'error',
        text: 'Failed to load invoice details from NEAR Testnet ledger.',
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, selectedAssetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

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
      if (!res.ok) {
        throw new Error(data.error || 'Quote error');
      }
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
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: `1Click Cross-Chain Settlement confirmed on NEAR Testnet! Exact ${data.invoice.totalAmountUsdc.toFixed(2)} USDC locked in Umbra Stealth Vault.`,
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
      if (!res.ok) {
        throw new Error(data.error || 'x402 payment failed');
      }
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: 'Paid autonomously via PingPay x402 Facilitator (USDC on Base -> NEAR Testnet)!',
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
      if (!res.ok) {
        throw new Error(data.error || 'Refund failed');
      }
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'info',
        text: `Invoice ${data.invoice.invoiceId} marked REFUNDED on NEAR Testnet. Funds returned to client origin rail.`,
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
          destinationStealthAccount:
            customStealthDest.trim() || invoice.stealthImplicitAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Stealth claim failed');
      }
      setInvoice(data.invoice);
      setBannerMessage({
        type: 'success',
        text: `Swept ${data.invoice.totalAmountUsdc.toFixed(2)} USDC gaslessly via Relayer to unlinked NEAR Stealth Account!`,
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
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-300">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          Loading NearVeil Invoice on NEAR Testnet...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d16] text-slate-300 p-6">
        <p className="text-lg font-semibold mb-4">Invoice not found: {invoiceId}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to NearVeil Dashboard
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to NearVeil Console
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
              NEAR Testnet Live · Vault: {contractAccountId}
            </span>
            <a
              href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(defaultViewingKey)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export Accountant CSV
            </a>
          </div>
        </div>

        {/* Status Notification Banner */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : bannerMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bannerMessage.text}</span>
            </div>
            {bannerMessage.txUrl && (
              <a
                href={bannerMessage.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold underline hover:opacity-80"
              >
                Verify on NearBlocks Testnet
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Invoice Details, Line Items & Trusted On-Chain Status */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {invoice.recordType === 'AP_PAYROLL'
                        ? 'Private Payroll Slip'
                        : 'Commercial Invoice'}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <Shield className="w-3.5 h-3.5" />
                      Umbra Stealth Protected
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white mt-2">
                    {invoice.invoiceId}
                  </h1>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Billed to <span className="text-slate-200 font-medium">{invoice.clientName}</span>{' '}
                    · Ref: <span className="font-mono text-xs">{invoice.clientReference}</span>
                  </p>
                </div>

                {/* Trusted Status Badge */}
                <div className="text-right">
                  {invoice.status === 'PAID' && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide">
                      <CheckCircle2 className="w-4 h-4" />
                      PAID (VERIFIED ON NEAR)
                    </span>
                  )}
                  {invoice.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide">
                      <Clock className="w-4 h-4" />
                      PENDING PAYMENT
                    </span>
                  )}
                  {invoice.status === 'REFUNDED' && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wide">
                      <RefreshCcw className="w-4 h-4" />
                      REFUNDED TO CLIENT
                    </span>
                  )}
                  <div className="text-xs text-slate-400 mt-2">
                    Issued: <span className="text-slate-200">{invoice.issueDateUtc}</span> · Due:{' '}
                    <span className="text-amber-300 font-medium">{invoice.dueDateUtc}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Itemized Line Items
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-3 text-right">Qty</th>
                        <th className="py-3 px-3 text-right">Rate (USD)</th>
                        <th className="py-3 px-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {invoice.lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-3.5 px-4 font-medium text-slate-100">
                            {item.description}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-300">
                            ${item.unitPriceUsd.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-white">
                            ${(item.quantity * item.unitPriceUsd).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-4 bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal (USD)</span>
                    <span className="text-slate-200">${invoice.subtotalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({invoice.taxRatePercent}%)</span>
                    <span className="text-slate-200">${invoice.taxAmountUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Freelancer Gas Fee (Sponsored by Relayer)</span>
                    <span className="text-emerald-400 font-medium">
                      $0.00 ({invoice.relayerSponsoredGasNear})
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="font-semibold text-white">
                      Total Receivable on NEAR
                    </span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {invoice.totalAmountUsdc.toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              </div>

              {/* Trusted On-Chain Verification Links */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Trusted On-Chain Audit & Transaction Links (NEAR Testnet)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400 mb-1">
                      1. Gasless Creation Tx (via Relayer)
                    </div>
                    <a
                      href={invoice.creationTxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono break-all"
                    >
                      {invoice.creationTxHash.slice(0, 18)}...
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400 mb-1">
                      2. 1Click Settlement Tx ({invoice.status})
                    </div>
                    {invoice.settlementTxUrl && invoice.settlementTxHash ? (
                      <a
                        href={invoice.settlementTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono break-all"
                      >
                        {invoice.settlementTxHash.slice(0, 18)}...
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-amber-300">Awaiting client payment</span>
                    )}
                  </div>

                  {invoice.refundTxUrl && invoice.refundTxHash && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 sm:col-span-2">
                      <div className="text-rose-300 mb-1">
                        3. Verified Refund Transaction Link
                      </div>
                      <a
                        href={invoice.refundTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-rose-300 hover:underline font-mono break-all"
                      >
                        {invoice.refundTxHash}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Umbra Stealth Privacy & Gasless Claim Box */}
            <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Umbra-Style Stealth Settlement & Gasless Claim
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">
                  View Tag: 0x{invoice.viewTag}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                To prevent exposing the freelancer&apos;s personal wallet or compensation history on public explorers,
                funds settle against cryptographic commitment{' '}
                <code className="text-emerald-300 font-mono">
                  sha256:{invoice.stealthCommitmentHash.slice(0, 16)}...
                </code>
                . The freelancer can sweep the USDC gaslessly via{' '}
                <code className="text-slate-200 font-mono">{relayerAccountId}</code> into their one-time
                64-character hex NEAR Stealth Implicit Account.
              </p>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">One-Time NEAR Stealth Account:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(invoice.stealthImplicitAccount, 'stealth')}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    {invoice.stealthImplicitAccount.slice(0, 14)}...
                    {invoice.stealthImplicitAccount.slice(-10)}
                    {copiedField === 'stealth' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Ephemeral PubKey (R):</span>
                  <span className="font-mono text-slate-300">
                    ed25519:{invoice.ephemeralPubKeyHex.slice(0, 20)}...
                  </span>
                </div>
              </div>

              {invoice.claimedToStealthWallet ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Swept Gaslessly to Unlinked Stealth Account!
                  </div>
                  <div className="text-slate-300 font-mono break-all">
                    Destination: {invoice.claimedDestinationAccount}
                  </div>
                  {invoice.stealthClaimTxUrl && (
                    <a
                      href={invoice.stealthClaimTxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 underline font-semibold mt-1"
                    >
                      View Gasless Stealth Claim Tx on NearBlocks
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Destination NEAR Stealth Account (Defaults to derived one-time 64-char hex implicit account)
                    </label>
                    <input
                      type="text"
                      value={customStealthDest}
                      onChange={(e) => setCustomStealthDest(e.target.value)}
                      placeholder={invoice.stealthImplicitAccount}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={invoice.status !== 'PAID' || busyAction === 'claim'}
                    onClick={handleClaimStealth}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    {busyAction === 'claim'
                      ? 'Relaying Gasless Stealth Claim on NEAR Testnet...'
                      : invoice.status === 'PAID'
                        ? `Sweep ${invoice.totalAmountUsdc.toFixed(2)} USDC to Stealth Wallet (0 NEAR Gas)`
                        : 'Pay Invoice First to Unlock Gasless Stealth Sweep'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Client Payment Widget (1Click API + PingPay x402 + Refund Controls) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">
                    Pay with 1Click API
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
                  Any Chain → NEAR USDC
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-5">
                Pay from whatever chain and token you already hold. The freelancer receives exact{' '}
                <strong className="text-slate-200">{invoice.totalAmountUsdc.toFixed(2)} USDC</strong> on NEAR
                and never buys NEAR for gas.
              </p>

              {/* Step 1: Select Client Origin Token */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    1. Select Token & Chain You Hold
                  </label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => {
                      setSelectedAssetId(e.target.value);
                      handleRequest1ClickQuote(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {tokens.map((t) => (
                      <option key={t.assetId} value={t.assetId}>
                        {t.symbol} — {t.chain} (${t.priceUsd.toFixed(2)} USD)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Quote Breakdown */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>You Send ({chosenToken?.chain})</span>
                    <span className="font-bold text-white text-sm">
                      ~{estimatedOriginAmount} {chosenToken?.symbol.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Freelancer Receives (NEAR Testnet)</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {invoice.totalAmountUsdc.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Routing Engine</span>
                    <span className="text-slate-200 font-mono">
                      NEAR Intents 1Click API (EXACT_OUTPUT)
                    </span>
                  </div>
                  {quote && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="text-slate-400">
                        1Click Quote Deposit Address ({quote.originChain}):
                      </div>
                      <div className="font-mono text-emerald-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                        {quote.depositAddress}
                      </div>
                    </div>
                  )}
                </div>

                {/* Request 1Click Quote + Pay Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleRequest1ClickQuote()}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
                  >
                    {busyAction === 'quote'
                      ? 'Fetching Live 1Click Quote (/v0/quote)...'
                      : 'Generate Fresh 1Click Deposit Quote'}
                  </button>

                  <button
                    type="button"
                    disabled={invoice.status === 'PAID' || busyAction !== null}
                    onClick={handlePayWith1Click}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/10 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    {busyAction === 'pay'
                      ? 'Settling on NEAR Testnet via 1Click Solver...'
                      : invoice.status === 'PAID'
                        ? 'Invoice Paid & Verified on NEAR Testnet'
                        : `Pay ${estimatedOriginAmount} ${chosenToken?.symbol.split(' ')[0]} via 1Click API`}
                  </button>
                </div>

                {/* PingPay x402 Agent Facilitator Option */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-400" />
                      Autonomous Agent Paywall (PingPay x402)
                    </span>
                    <a
                      href={`/api/x402/${encodeURIComponent(invoice.invoiceId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline font-mono"
                    >
                      GET /api/x402/{invoice.invoiceId}
                    </a>
                  </div>
                  <button
                    type="button"
                    disabled={invoice.status === 'PAID' || busyAction !== null}
                    onClick={handlePingPayX402}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 disabled:opacity-40 text-indigo-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    {busyAction === 'x402'
                      ? 'Settling Base USDC -> NEAR via PingPay...'
                      : 'Pay via PingPay Agent Facilitator (Base USDC → NEAR)'}
                  </button>
                </div>

                {/* Refund Control for Testing "paid, pending or refunded" */}
                {invoice.status === 'PAID' && (
                  <div className="pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-400 mb-2">
                      Need to test the <strong className="text-slate-200">Refunded</strong> status flow & on-chain refund receipt?
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={handleRefundInvoice}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      {busyAction === 'refund'
                        ? 'Executing Refund on NEAR Testnet...'
                        : 'Issue Full Refund to Client Origin Rail'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

