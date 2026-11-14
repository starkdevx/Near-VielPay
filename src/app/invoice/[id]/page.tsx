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
import { NearVeilLogo, ChainDot } from '@/components/BrandMark';
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
      <div className="min-h-screen flex items-center justify-center text-[#8e8a7f]">
        <div className="flex items-center gap-2.5 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-[#d4b06a] border-t-transparent animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[#f5f2eb] p-6">
        <p className="text-lg font-serif mb-4">Invoice not found: {invoiceId}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4b06a] text-[#0a0a09] font-semibold text-sm hover:bg-[#e2c17d]"
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-5">
            <NearVeilLogo size="sm" />
            <span className="h-5 w-px bg-[#272622] hidden sm:block" />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8e8a7f] hover:text-[#f5f2eb] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </div>

          <a
            href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(defaultViewingKey)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151513] hover:bg-[#1c1c19] border border-[#272622] text-[#d5d0c5] text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4b06a]" />
            Export CSV
          </a>
        </div>

        {/* Status Notification */}
        {bannerMessage && (
          <div
            className={`mb-6 px-4 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              bannerMessage.type === 'success'
                ? 'bg-[#141e18]/90 border-[#2c4435] text-[#cde5d6]'
                : bannerMessage.type === 'error'
                  ? 'bg-[#211515]/90 border-[#4b2725] text-[#f0c7c3]'
                  : 'bg-[#1c1a14]/90 border-[#3b3423] text-[#eadbb8]'
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
            <div className="vault-card rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#24231f]">
                <div>
                  <div className="flex items-center gap-2 text-[#d4b06a] text-[11px] font-mono uppercase tracking-[0.12em] mb-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Protected Invoice
                  </div>
                  <h1 className="text-3xl font-serif tracking-tight text-[#f5f2eb]">
                    {invoice.invoiceId}
                  </h1>
                  <p className="text-sm text-[#8e8a7f] mt-1">
                    Billed to <strong className="text-[#f5f2eb] font-medium">{invoice.clientName}</strong>
                    {invoice.clientReference ? ` · Ref: ${invoice.clientReference}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  {invoice.status === 'PAID' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17261d] border border-[#2a4534] text-[#77b28c] text-xs font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#77b28c]" />
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
                  <div className="text-xs text-[#8e8a7f] mt-2">
                    Issued {invoice.issueDateUtc} · Due{' '}
                    <span className="font-medium text-[#f5f2eb]">{invoice.dueDateUtc}</span>
                  </div>
                </div>
              </div>

              <div className="py-6">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-wider text-[#6d695f] border-b border-[#22211d]">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium text-right">Qty</th>
                      <th className="pb-3 font-medium text-right">Rate</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22211d]">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 font-medium text-[#f5f2eb]">
                          {item.description}
                        </td>
                        <td className="py-3.5 text-right text-[#8e8a7f] tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-right text-[#8e8a7f] tabular-nums">
                          ${item.unitPriceUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-[#f5f2eb] tabular-nums">
                          ${(item.quantity * item.unitPriceUsd).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 pt-4 border-t border-[#22211d] space-y-2 text-sm">
                  <div className="flex justify-between text-[#8e8a7f]">
                    <span>Subtotal</span>
                    <span className="text-[#f5f2eb] tabular-nums">
                      ${invoice.subtotalUsd.toFixed(2)}
                    </span>
                  </div>
                  {invoice.taxAmountUsd > 0 && (
                    <div className="flex justify-between text-[#8e8a7f]">
                      <span>Tax ({invoice.taxRatePercent}%)</span>
                      <span className="text-[#f5f2eb] tabular-nums">
                        ${invoice.taxAmountUsd.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#8e8a7f]">
                    <span>Network Gas Fee (Freelancer)</span>
                    <span className="text-[#77b28c] font-medium">$0.00 (Sponsored)</span>
                  </div>
                  <div className="pt-3 border-t border-[#22211d] flex justify-between items-baseline">
                    <span className="font-medium text-[#f5f2eb]">Amount Due</span>
                    <span className="text-3xl font-serif text-[#d4b06a] tabular-nums">
                      ${invoice.totalAmountUsdc.toFixed(2)}{' '}
                      <span className="text-sm font-sans text-[#8e8a7f]">USDC</span>
                    </span>
                  </div>
                </div>
              </div>

              {invoice.status === 'PAID' && (
                <div className="pt-5 border-t border-[#22211d]">
                  {invoice.claimedToStealthWallet ? (
                    <div className="p-4 rounded-xl bg-[#141c17] border border-[#2c4435] flex flex-wrap items-center justify-between gap-3 text-xs">
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
                    <div className="p-4 rounded-xl bg-[#10100e] border border-[#272622] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#8e8a7f]">
                        <strong className="text-[#f5f2eb] block">
                          Freelancer: Ready to Claim Privately
                        </strong>
                        Sweep funds to a fresh unlinked wallet with zero gas fees.
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === 'claim'}
                        onClick={handleClaimStealth}
                        className="px-4 py-2 rounded-xl bg-[#f5f2eb] hover:bg-white text-[#0a0a09] text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
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
                  className="flex items-center justify-between w-full text-xs font-medium text-[#8e8a7f] hover:text-[#f5f2eb] cursor-pointer"
                >
                  <span>On-Chain Receipts &amp; Privacy Details</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#10100e] border border-[#272622] text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#6d695f]">Created (Gasless Relayer):</span>
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
                        <span className="text-[#6d695f]">Settlement Receipt:</span>
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
                        <span className="text-[#6d695f]">Refund Receipt:</span>
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
                      <span className="text-[#6d695f]">One-Time Stealth Account:</span>
                      <span className="font-mono text-[#8e8a7f]">
                        {invoice.stealthImplicitAccount.slice(0, 14)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Currency Selector & Pay Card */}
          <div className="lg:col-span-5">
            <div className="vault-card rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-xl font-serif text-[#f5f2eb]">Pay Invoice</h2>
                <p className="text-xs text-[#8e8a7f] mt-0.5">
                  Select any token you already hold. Settled via NEAR Intents 1Click API.
                </p>
              </div>

              {/* Visual Clickable Token Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8e8a7f]">
                  Pay With
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {tokens.map((t) => {
                    const isSelected = t.assetId === selectedAssetId;
                    return (
                      <button
                        key={t.assetId}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(t.assetId);
                          handleRequest1ClickQuote(t.assetId);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1e1c16] border-[#d4b06a]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'bg-[#10100e] border-[#272622] hover:border-[#3c3a32]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChainDot chain={t.chain} />
                          <span className="text-xs font-semibold text-[#f5f2eb] truncate">
                            {t.symbol.split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#736f65] mt-0.5 truncate pl-4">
                          {t.chain}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#10100e] border border-[#272622] space-y-2 text-xs">
                <div className="flex justify-between text-[#8e8a7f]">
                  <span>You Pay ({chosenToken?.chain})</span>
                  <span className="font-semibold text-[#f5f2eb] text-sm tabular-nums">
                    ~{estimatedOriginAmount} {chosenToken?.symbol.split(' ')[0]}
                  </span>
                </div>
                <div className="flex justify-between text-[#8e8a7f]">
                  <span>Recipient Receives</span>
                  <span className="font-semibold text-[#77b28c] text-sm tabular-nums">
                    ${invoice.totalAmountUsdc.toFixed(2)} USDC
                  </span>
                </div>
                {quote && (
                  <div className="pt-2 border-t border-[#22211d] text-[11px] text-[#6d695f]">
                    1Click Deposit Address:{' '}
                    <span className="font-mono text-[#8e8a7f] break-all">
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
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-b from-[#e2c17d] to-[#c9a358] hover:from-[#ebd094] hover:to-[#d4b06a] disabled:from-[#22211d] disabled:to-[#22211d] disabled:text-[#6d695f] text-[#0a0a09] font-semibold text-sm shadow-[0_6px_20px_-4px_rgba(212,176,106,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1a1a17] hover:bg-[#23221e] border border-[#2c2b26] text-[#d5d0c5] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1a1a17] hover:bg-[#281817] border border-[#2c2b26] hover:border-[#492826] text-[#8e8a7f] hover:text-[#d97b73] font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
