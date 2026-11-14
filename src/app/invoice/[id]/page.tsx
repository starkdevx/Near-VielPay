'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Wallet,
  Bot,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  LogOut,
  Share2,
  Check,
  User,
  FileText,
} from 'lucide-react';
import { NearVeilLogo, ChainDot } from '@/components/BrandMark';
import { useNearWallet } from '@/components/WalletProvider';
import { NearVeilInvoice, OneClickQuoteResponse, OneClickTokenOption } from '@/lib/types';
import {
  decodePortablePayload,
  encodePortablePayload,
  loadCachedInvoices,
  upsertCachedInvoice,
} from '@/lib/client-cache';

export default function InvoiceCheckoutPage() {
  const params = useParams();
  const invoiceId = String(params?.id || '');

  const { accountId, isConnected, connect, disconnect, sendNearOrUsdcPayment } =
    useNearWallet();

  const [invoice, setInvoice] = useState<NearVeilInvoice | null>(null);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'NEAR'>('USDC');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [quote, setQuote] = useState<OneClickQuoteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    txUrl?: string | null;
  } | null>(null);

  const handleCopyLink = () => {
    const payload = invoice ? encodePortablePayload(invoice) : '';
    const url = payload
      ? `${window.location.origin}/invoice/${encodeURIComponent(invoiceId)}?d=${encodeURIComponent(payload)}`
      : window.location.href;
    navigator.clipboard?.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices', { cache: 'no-store' });
      const data = await res.json();
      let found: NearVeilInvoice | null =
        (data.invoices || []).find(
          (i: NearVeilInvoice) => i.invoiceId === invoiceId
        ) || null;

      if (!found && typeof window !== 'undefined') {
        const cachedMatch =
          loadCachedInvoices().find((i) => i.invoiceId === invoiceId) || null;
        const urlMatch = decodePortablePayload<NearVeilInvoice>(
          new URLSearchParams(window.location.search).get('d')
        );
        const fallback = cachedMatch || (urlMatch?.invoiceId === invoiceId ? urlMatch : null);
        if (fallback) {
          found = fallback;
          upsertCachedInvoice(fallback);
          fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync_invoice', invoice: fallback }),
          }).catch(() => {});
        }
      } else if (found) {
        upsertCachedInvoice(found);
      }

      setInvoice(found || null);
      const tokenList: OneClickTokenOption[] = data.oneClickTokens || [];
      setTokens(tokenList);
      setSelectedAssetId((prev) => prev || tokenList[2]?.assetId || tokenList[0]?.assetId || '');
    } catch {
      const cachedMatch =
        loadCachedInvoices().find((i) => i.invoiceId === invoiceId) || null;
      if (cachedMatch) {
        setInvoice(cachedMatch);
      } else {
        setBannerMessage({
          type: 'error',
          text: 'Failed to load invoice details.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

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

  const savePaidInvoiceId = (id: string) => {
    try {
      const saved = localStorage.getItem('nearveil_my_paid_invoices');
      const ids: string[] = saved ? JSON.parse(saved) : [];
      if (!ids.includes(id)) {
        localStorage.setItem('nearveil_my_paid_invoices', JSON.stringify([id, ...ids]));
      }
    } catch {
      // ignore
    }
  };

  const handlePayWithConnectedWallet = async () => {
    if (!invoice) return;
    if (!isConnected || !accountId) {
      connect();
      return;
    }
    setBusyAction('wallet_pay');
    setBannerMessage(null);
    try {
      const nearTok = tokens.find((t) => t.symbol === 'NEAR');
      const nearPriceUsd = nearTok?.priceUsd || 4.85;
      const receiverId = invoice.freelancerAccount || invoice.stealthImplicitAccount;

      const { txHash } = await sendNearOrUsdcPayment({
        receiverId,
        amountUsd: invoice.totalAmountUsdc,
        tokenSymbol: selectedToken,
        nearPriceUsd,
        memo: invoice.invoiceId,
      });

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice_1click',
          invoiceId: invoice.invoiceId,
          originAssetSymbol: selectedToken,
          originChain: 'NEAR Testnet',
          payerAccountId: accountId,
          settlementTxHash: txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setInvoice(data.invoice);
      upsertCachedInvoice(data.invoice);
      savePaidInvoiceId(data.invoice.invoiceId);
      setBannerMessage({
        type: 'success',
        text: `Payment complete! $${data.invoice.totalAmountUsdc.toFixed(2)} (${selectedToken}) paid on-chain from ${accountId}.`,
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
          payerAccountId: accountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setInvoice(data.invoice);
      savePaidInvoiceId(data.invoice.invoiceId);
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
          ...(accountId ? { 'x-payer-account': accountId } : {}),
        },
        body: JSON.stringify({
          payerAccountId: accountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'x402 payment failed');
      setInvoice(data.invoice);
      savePaidInvoiceId(data.invoice.invoiceId);
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
          href="/app"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4b06a] text-[#0a0a09] font-semibold text-sm hover:bg-[#e2c17d]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to NearPay Veil
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

  const isFreelancer = Boolean(
    (accountId && invoice.freelancerAccount?.toLowerCase() === accountId.toLowerCase()) ||
    (typeof window !== 'undefined' &&
      JSON.parse(localStorage.getItem('nearveil_my_invoices') || '[]').includes(invoice.invoiceId))
  );

  const isPayer = Boolean(
    (accountId && invoice.payerAccountId?.toLowerCase() === accountId.toLowerCase()) ||
    (typeof window !== 'undefined' &&
      JSON.parse(localStorage.getItem('nearveil_my_paid_invoices') || '[]').includes(invoice.invoiceId))
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-5">
            <NearVeilLogo size="sm" />
            <span className="h-5 w-px bg-[#272622] hidden sm:block" />
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8e8a7f] hover:text-[#f5f2eb] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141411] border border-[#2d2c25] text-[11px] font-mono text-[#a39f93]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
              NEAR Testnet
            </span>

            {isConnected && accountId ? (
              <div className="pl-3 pr-2 py-1 rounded-xl bg-[#171612] border border-[#d4b06a]/40 shadow-[0_0_15px_-3px_rgba(212,176,106,0.25)] flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                  <span className="text-xs font-mono text-[#f5f2eb] max-w-[150px] truncate">
                    {accountId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={disconnect}
                  title="Disconnect Wallet"
                  className="p-1 rounded-lg text-[#8e8a7f] hover:text-[#f87171] transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={connect}
                className="px-3.5 py-1.5 rounded-xl bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0a0a09] font-bold text-xs shadow-[0_0_18px_rgba(212,176,106,0.3)] transition cursor-pointer"
              >
                Connect Wallet
              </button>
            )}
          </div>
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

        {/* Dynamic Role & Status Banner */}
        {isFreelancer && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#1c1a14] via-[#171612] to-[#1c1a14] border border-[#d4b06a]/40 shadow-[0_0_20px_rgba(212,176,106,0.15)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#262115] border border-[#524122] flex items-center justify-center text-[#d4b06a] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#f5ecd5] flex items-center gap-2">
                  <span>Invoice Issued by You</span>
                  <span className="badge-gold-glow px-2 py-0.5 rounded-full text-[10px] font-mono">
                    Freelancer View
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8a7f] mt-0.5">
                  Share this payment link with your client. When paid, USDC settles directly into your private stealth account with $0 gas fees.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-[#2a2417] hover:bg-[#382f1d] border border-[#d4b06a]/50 text-xs font-semibold text-[#f5dfa8] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {shareCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#34d399]" />
                  Copied Link!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#d4b06a]" />
                  Copy Client Link
                </>
              )}
            </button>
          </div>
        )}

        {isPayer && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#121c15] via-[#0f1712] to-[#121c15] border border-[#34d399]/40 shadow-[0_0_20px_rgba(52,211,153,0.18)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#16291e] border border-[#2d523c] flex items-center justify-center text-[#34d399] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#cde5d6] flex items-center gap-2">
                  <span>Invoice Paid &amp; Approved by You</span>
                  <span className="badge-emerald-glow px-2 py-0.5 rounded-full text-[10px] font-mono">
                    Payer View
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8a7f] mt-0.5">
                  Settled on NEAR Testnet from {invoice.payerAccountId || accountId || 'your wallet'}. Verified on-chain with zero gas fees.
                </p>
              </div>
            </div>
            {invoice.settlementTxUrl && (
              <a
                href={invoice.settlementTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#14261c] hover:bg-[#1c3627] border border-[#34d399]/50 text-xs font-semibold text-[#a7f3d0] transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                NearBlocks Receipt
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Engraved Obsidian Statement */}
          <div className="lg:col-span-7 space-y-6">
            <div className="vault-card-glow-gold rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#24231f]">
                <div>
                  <div className="badge-gold-glow px-3 py-0.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] mb-2">
                    <Shield className="w-3.5 h-3.5 text-[#d4b06a]" />
                    Protected Invoice
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-gradient-gold">
                    {invoice.invoiceId}
                  </h1>
                  <p className="text-sm text-[#9c978b] mt-1.5">
                    Billed to <strong className="text-[#f5f2eb] font-semibold">{invoice.clientName}</strong>
                    {invoice.clientReference ? ` · Ref: ${invoice.clientReference}` : ''}
                  </p>
                  <p className="text-xs text-[#8e8a7f] mt-1 font-mono">
                    Payable to: <span className="text-[#d4b06a] font-semibold">{invoice.freelancerAccount}</span>
                  </p>
                </div>

                <div className="text-right">
                  {invoice.status === 'PAID' && (
                    <span className="badge-emerald-glow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                      Paid &amp; Settled
                    </span>
                  )}
                  {invoice.status === 'PENDING' && (
                    <span className="badge-gold-glow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#fbbf24]" />
                      Payment Due
                    </span>
                  )}
                  {invoice.status === 'REFUNDED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2b1717] border border-[#5c2d2c] text-[#f87171] text-xs font-semibold">
                      Refunded
                    </span>
                  )}
                  <div className="text-xs text-[#8e8a7f] mt-2 font-mono">
                    Issued {invoice.issueDateUtc} · Due{' '}
                    <span className="font-semibold text-[#f5f2eb]">{invoice.dueDateUtc}</span>
                  </div>
                </div>
              </div>

              <div className="py-6">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-wider text-[#a39f93] border-b border-[#24231f]">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium text-right">Qty</th>
                      <th className="pb-3 font-medium text-right">Rate</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22211d]">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#181714] transition-colors">
                        <td className="py-3.5 font-medium text-[#f5f2eb]">
                          {item.description}
                        </td>
                        <td className="py-3.5 text-right text-[#a39f93] tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-right text-[#a39f93] tabular-nums">
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
                    <span className="text-[#34d399] font-semibold">$0.00 (Sponsored)</span>
                  </div>
                  <div className="pt-3 border-t border-[#262520] flex justify-between items-baseline">
                    <span className="font-semibold text-[#f5f2eb]">Amount Due</span>
                    <span className="text-3xl sm:text-4xl font-serif text-gradient-gold tabular-nums">
                      ${invoice.totalAmountUsdc.toFixed(2)}{' '}
                      <span className="text-sm font-sans font-normal text-[#8e8a7f]">USDC</span>
                    </span>
                  </div>
                </div>
              </div>

              {invoice.status === 'PAID' && (
                <div className="pt-5 border-t border-[#22211d]">
                  <div className="p-4 rounded-xl bg-[#141c17] border border-[#2c4435] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[#cde5d6] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#77b28c] shrink-0" />
                      Payment settled in USDC on NEAR Testnet ($0.00 gas fee)
                    </div>
                    {invoice.settlementTxUrl && (
                      <a
                        href={invoice.settlementTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#d4b06a] font-medium underline"
                      >
                        View On-Chain Receipt
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
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
            <div className="vault-card-glow-gold rounded-2xl p-6 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
              <div>
                <h2 className="text-2xl font-serif text-gradient-gold">
                  {invoice.status === 'PAID' ? 'Payment Completed' : 'Pay Invoice'}
                </h2>
                <p className="text-xs text-[#9c978b] mt-1">
                  {invoice.status === 'PAID'
                    ? 'This invoice has been settled on NEAR Testnet.'
                    : 'Pay directly from your connected NEAR wallet in Circle USDC or NEAR.'}
                </p>
              </div>

              {invoice.status === 'PAID' ? (
                <div className="space-y-4 pt-2">
                  <div className="p-5 rounded-2xl bg-[#121c15] border border-[#2d4d38] space-y-3">
                    <div className="flex items-center gap-2 text-[#4ade80] font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                      Payment Confirmed
                    </div>
                    <div className="text-xs text-[#9c978b] space-y-1.5">
                      <div>Total Settled: <strong className="text-[#f5f2eb] font-semibold">${invoice.totalAmountUsdc.toFixed(2)} USDC</strong></div>
                      <div>Recipient: <span className="font-mono text-[#d4b06a]">{invoice.freelancerAccount}</span></div>
                      {invoice.paidTimestampUtc && (
                        <div>Paid At: <span className="text-[#f5f2eb] font-mono">{invoice.paidTimestampUtc.slice(0, 19).replace('T', ' ')} UTC</span></div>
                      )}
                    </div>
                    {invoice.settlementTxUrl && (
                      <div className="pt-2 border-t border-[#233b2b]">
                        <a
                          href={invoice.settlementTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e2c17d] hover:text-[#fae8b8] underline"
                        >
                          View Receipt on NEARBlocks Explorer
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Direct NEAR Testnet Wallet Pay (Circle USDC or Native NEAR) */}
                  <div className="p-4 rounded-xl bg-[#151410] border border-[#302d24] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#f5ecd5] flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#d4b06a]" />
                        Pay on NEAR Testnet
                      </span>
                      {isConnected && (
                        <span className="text-[10px] font-mono text-[#34d399] bg-[#112419] px-2 py-0.5 rounded border border-[#2b4d37]">
                          Connected
                        </span>
                      )}
                    </div>

                    {/* Token Selector: USDC, NEAR */}
                    <div className="grid grid-cols-2 gap-2">
                      {(['USDC', 'NEAR'] as const).map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setSelectedToken(sym)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            selectedToken === sym
                              ? 'bg-[#221f17] border-[#d4b06a]/70 text-[#f5ecd5] shadow-[0_0_12px_rgba(212,176,106,0.2)]'
                              : 'bg-[#11110e] border-[#272622] text-[#9c978b] hover:border-[#474337]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <ChainDot chain="NEAR Testnet" />
                            {sym === 'USDC' ? 'Circle USDC' : 'Native NEAR'}
                          </div>
                          <div className="text-[10px] font-mono text-[#7c786e] mt-0.5">
                            {sym === 'NEAR' ? 'Testnet Native' : 'Circle Native USDC'}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-[#11110e] border border-[#272622] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#8e8a7f]">
                        <span>Amount to Send</span>
                        <span className="font-mono font-semibold text-[#f5dfa8]">
                          {selectedToken === 'NEAR'
                            ? `${(invoice.totalAmountUsdc / (tokens.find((t) => t.symbol === 'NEAR')?.priceUsd || 4.85)).toFixed(4)} NEAR`
                            : `${invoice.totalAmountUsdc.toFixed(2)} ${selectedToken}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#8e8a7f]">
                        <span>Recipient</span>
                        <span className="font-mono text-[#f5f2eb] max-w-[170px] truncate">
                          {invoice.freelancerAccount || invoice.stealthImplicitAccount}
                        </span>
                      </div>
                    </div>

                    {isConnected && accountId ? (
                      <div className="space-y-2">
                        <div className="text-xs text-[#8e8a7f] flex justify-between">
                          <span>Paying from:</span>
                          <span className="font-mono text-[#f5f2eb] max-w-[170px] truncate">{accountId}</span>
                        </div>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={handlePayWithConnectedWallet}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#f3d99d] via-[#d4b06a] to-[#b38531] hover:from-[#fae8b8] hover:to-[#c6973f] text-[#0a0a09] font-bold text-sm shadow-[0_0_20px_rgba(212,176,106,0.35)] transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Wallet className="w-4 h-4" />
                          {busyAction === 'wallet_pay'
                            ? 'Confirming in Wallet...'
                            : selectedToken === 'NEAR'
                              ? `Pay ${(invoice.totalAmountUsdc / (tokens.find((t) => t.symbol === 'NEAR')?.priceUsd || 4.85)).toFixed(4)} NEAR`
                              : `Pay $${invoice.totalAmountUsdc.toFixed(2)} ${selectedToken}`}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={connect}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#221f17] hover:bg-[#2b271d] border border-[#d4b06a]/40 text-[#f5dfa8] font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-4 h-4 text-[#d4b06a]" />
                        Connect NEAR Wallet to Pay
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={handlePingPayX402}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1a1a17] hover:bg-[#23221e] border border-[#2c2b26] text-[#d5d0c5] font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bot className="w-4 h-4 text-[#d4b06a]" />
                      {busyAction === 'x402'
                        ? 'Settling via PingPay...'
                        : 'Pay via AI Agent (PingPay x402)'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
