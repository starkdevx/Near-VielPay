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
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0b] text-[#9c988c]">
        <div className="flex items-center gap-2.5 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-[#d4b06a] border-t-transparent animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0c0b] text-[#f4f1ea] p-6">
        <p className="text-lg font-semibold mb-4">Invoice not found: {invoiceId}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4b06a] text-[#0c0c0b] font-semibold text-sm hover:bg-[#e2c17d]"
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
    <div className="min-h-screen bg-[#0c0c0b] text-[#f4f1ea] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#9c988c] hover:text-[#f4f1ea] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="text-xs px-3 py-1 rounded-full bg-[#17261d] border border-[#2a4534] text-[#77b28c] font-medium">
              NEAR Testnet
            </span>
            <a
              href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(defaultViewingKey)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151513] hover:bg-[#1c1c19] border border-[#272622] text-[#d5d0c5] text-xs font-medium transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4b06a]" />
              Export CSV
            </a>
          </div>
        </div>

        {/* Status Notification */}
        {bannerMessage && (
          <div
            className={`mb-6 px-4 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              bannerMessage.type === 'success'
                ? 'bg-[#141c17] border-[#2c4435] text-[#cde5d6]'
                : bannerMessage.type === 'error'
                  ? 'bg-[#1f1414] border-[#4b2725] text-[#f0c7c3]'
                  : 'bg-[#1b1914] border-[#3b3423] text-[#eadbb8]'
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
                className="inline-flex items-center gap-1 text-xs font-medium text-[#d4b06a] underline hover:opacity-80"
              >
                View Receipt
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Engraved Obsidian Statement */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#151513] rounded-xl border border-[#272622] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#22211d]">
                <div>
                  <div className="flex items-center gap-2 text-[#d4b06a] text-xs font-medium mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    NearVeil Protected Invoice
                  </div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#f4f1ea]">
                    {invoice.invoiceId}
                  </h1>
                  <p className="text-sm text-[#9c988c] mt-1">
                    Billed to <strong className="text-[#f4f1ea]">{invoice.clientName}</strong>
                    {invoice.clientReference ? ` · Ref: ${invoice.clientReference}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  {invoice.status === 'PAID' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17261d] border border-[#2a4534] text-[#77b28c] text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </span>
                  )}
                  {invoice.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#261f14] border border-[#42341d] text-[#d9a05b] text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  )}
                  {invoice.status === 'REFUNDED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#281817] border border-[#492826] text-[#d97b73] text-xs font-medium">
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Refunded
                    </span>
                  )}
                  <div className="text-xs text-[#9c988c] mt-2">
                    Issued {invoice.issueDateUtc} · Due{' '}
                    <span className="font-medium text-[#f4f1ea]">{invoice.dueDateUtc}</span>
                  </div>
                </div>
              </div>

              <div className="py-6">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-[#736f65] border-b border-[#22211d]">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium text-right">Qty</th>
                      <th className="pb-3 font-medium text-right">Rate</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22211d]">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 font-medium text-[#f4f1ea]">
                          {item.description}
                        </td>
                        <td className="py-3.5 text-right text-[#9c988c] tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-right text-[#9c988c] tabular-nums">
                          ${item.unitPriceUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-[#f4f1ea] tabular-nums">
                          ${(item.quantity * item.unitPriceUsd).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 pt-4 border-t border-[#22211d] space-y-2 text-sm">
                  <div className="flex justify-between text-[#9c988c]">
                    <span>Subtotal</span>
                    <span className="text-[#f4f1ea] tabular-nums">
                      ${invoice.subtotalUsd.toFixed(2)}
                    </span>
                  </div>
                  {invoice.taxAmountUsd > 0 && (
                    <div className="flex justify-between text-[#9c988c]">
                      <span>Tax ({invoice.taxRatePercent}%)</span>
                      <span className="text-[#f4f1ea] tabular-nums">
                        ${invoice.taxAmountUsd.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#9c988c]">
                    <span>Network Gas Fee (Freelancer)</span>
                    <span className="text-[#77b28c] font-medium">$0.00 (Sponsored)</span>
                  </div>
                  <div className="pt-3 border-t border-[#22211d] flex justify-between items-baseline">
                    <span className="font-medium text-[#f4f1ea]">Amount Due</span>
                    <span className="text-2xl font-semibold text-[#d4b06a] tabular-nums tracking-[-0.02em]">
                      ${invoice.totalAmountUsdc.toFixed(2)}{' '}
                      <span className="text-sm font-normal text-[#9c988c]">USDC</span>
                    </span>
                  </div>
                </div>
              </div>

              {invoice.status === 'PAID' && (
                <div className="pt-5 border-t border-[#22211d]">
                  {invoice.claimedToStealthWallet ? (
                    <div className="p-4 rounded-lg bg-[#141c17] border border-[#2c4435] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-[#cde5d6] font-medium">
                        <CheckCircle2 className="w-4 h-4 text-[#77b28c] shrink-0" />
                        Claimed privately to one-time NEAR stealth wallet ($0 gas)
                      </div>
                      {invoice.stealthClaimTxUrl && (
                        <a
                          href={invoice.stealthClaimTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#d4b06a] font-medium underline"
                        >
                          View Sweep Receipt
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-[#11110f] border border-[#272622] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#9c988c]">
                        <strong className="text-[#f4f1ea] block">
                          Freelancer: Ready to Claim Privately
                        </strong>
                        Sweep funds to a fresh unlinked wallet with zero gas fees.
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === 'claim'}
                        onClick={handleClaimStealth}
                        className="px-4 py-2 rounded-lg bg-[#f4f1ea] hover:bg-white text-[#0c0c0b] text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {busyAction === 'claim' ? 'Claiming...' : 'Claim Privately ($0 Gas)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-[#22211d]">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center justify-between w-full text-xs font-medium text-[#9c988c] hover:text-[#f4f1ea] cursor-pointer"
                >
                  <span>On-Chain Receipts &amp; Privacy Details</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-3 p-3.5 rounded-lg bg-[#11110f] border border-[#272622] text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#736f65]">Created (Gasless Relayer):</span>
                      <a
                        href={invoice.creationTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#d4b06a] hover:underline font-mono inline-flex items-center gap-1"
                      >
                        {invoice.creationTxHash.slice(0, 14)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {invoice.settlementTxUrl && invoice.settlementTxHash && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#736f65]">Settlement Receipt:</span>
                        <a
                          href={invoice.settlementTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#d4b06a] hover:underline font-mono inline-flex items-center gap-1"
                        >
                          {invoice.settlementTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {invoice.refundTxUrl && invoice.refundTxHash && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#736f65]">Refund Receipt:</span>
                        <a
                          href={invoice.refundTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#d97b73] hover:underline font-mono inline-flex items-center gap-1"
                        >
                          {invoice.refundTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-[#736f65]">One-Time Stealth Account:</span>
                      <span className="font-mono text-[#9c988c]">
                        {invoice.stealthImplicitAccount.slice(0, 14)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Client Payment Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#151513] rounded-xl border border-[#272622] p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#f4f1ea]">Pay Invoice</h2>
                <p className="text-xs text-[#9c988c] mt-0.5">
                  Choose any token you already hold. Powered by NEAR Intents 1Click API.
                </p>
              </div>

              <div>
                <label className="block text-xs text-[#9c988c] mb-1.5">
                  Pay With
                </label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    handleRequest1ClickQuote(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea] focus:outline-none focus:border-[#d4b06a]"
                >
                  {tokens.map((t) => (
                    <option key={t.assetId} value={t.assetId}>
                      {t.symbol} ({t.chain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-[#11110f] border border-[#272622] space-y-2 text-xs">
                <div className="flex justify-between text-[#9c988c]">
                  <span>You Pay ({chosenToken?.chain})</span>
                  <span className="font-semibold text-[#f4f1ea] text-sm tabular-nums">
                    ~{estimatedOriginAmount} {chosenToken?.symbol.split(' ')[0]}
                  </span>
                </div>
                <div className="flex justify-between text-[#9c988c]">
                  <span>Recipient Receives</span>
                  <span className="font-semibold text-[#77b28c] text-sm tabular-nums">
                    ${invoice.totalAmountUsdc.toFixed(2)} USDC
                  </span>
                </div>
                {quote && (
                  <div className="pt-2 border-t border-[#22211d] text-[11px] text-[#736f65]">
                    1Click Deposit Address:{' '}
                    <span className="font-mono text-[#9c988c] break-all">
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
                  className="w-full py-3.5 px-5 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] disabled:bg-[#22211d] disabled:text-[#736f65] text-[#0c0c0b] font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1c1c19] hover:bg-[#24231f] border border-[#2c2b26] text-[#d5d0c5] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Bot className="w-4 h-4 text-[#d4b06a]" />
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
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1c1c19] hover:bg-[#281817] border border-[#2c2b26] hover:border-[#492826] text-[#9c988c] hover:text-[#d97b73] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
