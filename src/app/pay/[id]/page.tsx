'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  Wallet,
  Zap,
  ShieldCheck,
  Store,
  ArrowLeft,
  Sparkles,
  Receipt,
  LogOut,
  Repeat,
  Lock,
} from 'lucide-react';
import { NearVeilLogo, ChainDot } from '@/components/BrandMark';
import { useNearWallet } from '@/components/WalletProvider';
import {
  MerchantPaymentLink,
  MerchantReceipt,
  OneClickTokenOption,
} from '@/lib/types';

export default function MerchantCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accountId, isConnected, connect, disconnect } = useNearWallet();

  const [link, setLink] = useState<MerchantPaymentLink | null>(null);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [payMode, setPayMode] = useState<'NEAR_WALLET' | 'ONECLICK'>('NEAR_WALLET');
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [paying, setPaying] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState<MerchantReceipt | null>(null);

  const [walletUsdc, setWalletUsdc] = useState<number>(0);
  const [walletNear, setWalletNear] = useState<number>(0);

  const fetchCheckout = useCallback(async () => {
    try {
      const res = await fetch(`/api/merchant?paymentId=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Checkout link not found.');
        return;
      }
      setLink(data.link);
      setTokens(data.oneClickTokens || []);
    } catch {
      setError('Could not load checkout details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCheckout();
  }, [fetchCheckout]);

  useEffect(() => {
    if (!accountId) {
      setWalletUsdc(0);
      setWalletNear(0);
      return;
    }
    fetch(`/api/wallet/balance?accountId=${encodeURIComponent(accountId)}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setWalletUsdc(d.usdcBalance ?? 0);
          setWalletNear(d.nearBalance ?? 0);
        }
      })
      .catch(() => {});
  }, [accountId]);

  const activeTokenObj =
    tokens.find((t) => t.symbol === selectedToken) || tokens[0];
  const estimatedCrossChainIn =
    link && activeTokenObj && activeTokenObj.priceUsd > 0
      ? (link.amountUsdc / activeTokenObj.priceUsd).toFixed(
          activeTokenObj.symbol.includes('USD') ? 2 : 5
        )
      : null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    if (!isConnected || !accountId) {
      connect();
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      const originAsset =
        payMode === 'NEAR_WALLET' ? 'USDC' : activeTokenObj?.symbol || 'USDC';
      const originChain =
        payMode === 'NEAR_WALLET'
          ? 'NEAR Testnet'
          : activeTokenObj?.chain || 'NEAR';

      const res = await fetch('/api/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_link',
          paymentId: link.paymentId,
          payerAccountId: accountId,
          customerNote,
          originAsset,
          originChain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed.');
      }
      setLink(data.link);
      setConfirmedReceipt(data.receipt);
      setCustomerNote('');
    } catch (err) {
      setPayError((err as Error).message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0a] flex items-center justify-center text-[#8e8a7f] text-sm font-mono">
        Loading merchant checkout...
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-[#0c0c0a] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1b1915] border border-[#2d2b24] flex items-center justify-center">
          <Store className="w-6 h-6 text-[#d4b06a]" />
        </div>
        <h1 className="text-2xl font-serif text-[#f5f2eb]">Checkout Link Unavailable</h1>
        <p className="text-sm text-[#8e8a7f] max-w-md">{error || 'This payment link does not exist.'}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#1c1a15] border border-[#d4b06a]/40 text-xs font-semibold text-[#f5ecd5] hover:bg-[#24211a] transition"
        >
          Back to NearVeil
        </Link>
      </div>
    );
  }

  const latestReceipt =
    confirmedReceipt ||
    (link.linkType === 'ONE_TIME' && link.status === 'PAID'
      ? link.payments[0] || null
      : null);

  return (
    <div className="min-h-screen bg-[#0c0c0a] text-[#f5f2eb] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[#25231d] bg-[#0c0c0a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-90 transition">
              <NearVeilLogo />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#181611] border border-[#d4b06a]/30 text-[11px] font-mono text-[#e5be70]">
              <Store className="w-3 h-3" />
              Merchant Checkout
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isConnected && accountId ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141410] border border-[#2d2c24] text-xs font-mono">
                  <span className="text-[#34d399]">{walletNear.toFixed(2)} NEAR</span>
                  <span className="text-[#3e3b32]">·</span>
                  <span className="text-[#f5dfa8]">${walletUsdc.toFixed(2)} USDC</span>
                </div>
                <div className="pl-3 pr-1.5 py-1 rounded-xl bg-[#171612] border border-[#d4b06a]/40 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                  <span className="text-xs font-mono text-[#f5f2eb] max-w-[140px] truncate">
                    {accountId}
                  </span>
                  <button
                    type="button"
                    onClick={disconnect}
                    title="Disconnect"
                    className="p-1.5 rounded-lg text-[#8e8a7f] hover:text-[#f87171] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={connect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#a87d2a] text-[#0a0a09] text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(212,176,106,0.3)] cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect NEAR Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Checkout Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#8e8a7f] hover:text-[#f5ecd5] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Merchant & Product Summary */}
          <div className="lg:col-span-6 space-y-5">
            <div className="vault-card rounded-2xl p-6 sm:p-7 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4b06a]/50 to-transparent" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1e1b14] border border-[#d4b06a]/40 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-[#e5be70]" />
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[#d4b06a]">
                      {link.businessName}
                    </div>
                    <div className="text-xs font-mono text-[#8e8a7f] mt-0.5">
                      {link.merchantAccountId}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                    link.status === 'ACTIVE'
                      ? 'bg-[#122419] border-[#2d573d] text-[#34d399]'
                      : link.status === 'PAID'
                        ? 'bg-[#1f1b12] border-[#5b4b28] text-[#e5be70]'
                        : 'bg-[#211515] border-[#4b2725] text-[#f0a5a0]'
                  }`}
                >
                  {link.status === 'ACTIVE'
                    ? link.linkType === 'REUSABLE'
                      ? 'Storefront Active'
                      : 'Awaiting Payment'
                    : link.status}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#25231d]">
                <div className="text-[11px] font-mono text-[#6d695f]">
                  Checkout ID · {link.paymentId}
                </div>
                <h1 className="text-3xl font-serif text-[#f5f2eb] tracking-tight">
                  {link.title}
                </h1>
                {link.description && (
                  <p className="text-sm text-[#a39f93] leading-relaxed">
                    {link.description}
                  </p>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-[#13120e] border border-[#2b2820] flex items-baseline justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8e8a7f]">
                  Total Due
                </span>
                <div className="text-4xl font-serif text-gradient-gold tabular-nums font-semibold">
                  ${link.amountUsdc.toFixed(2)}
                  <span className="text-sm font-sans text-[#8e8a7f] font-normal ml-1.5">
                    USDC
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#12120f] border border-[#25231d] flex items-center gap-2 text-[#a39f93]">
                  <Zap className="w-4 h-4 text-[#d4b06a] shrink-0" />
                  <span>$0.00 Gas Fee</span>
                </div>
                <div className="p-3 rounded-xl bg-[#12120f] border border-[#25231d] flex items-center gap-2 text-[#a39f93]">
                  <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />
                  <span>Instant NEAR Receipt</span>
                </div>
              </div>

              {link.linkType === 'REUSABLE' && link.salesCount > 0 && (
                <div className="pt-2 border-t border-[#25231d] flex items-center justify-between text-xs text-[#8e8a7f]">
                  <span className="flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#d4b06a]" />
                    Reusable Merchant Link
                  </span>
                  <span className="font-mono text-[#d4b06a]">
                    {link.salesCount} completed {link.salesCount === 1 ? 'checkout' : 'checkouts'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Payment Action or Digital Receipt */}
          <div className="lg:col-span-6">
            <div className="vault-card-glow-gold rounded-2xl p-6 sm:p-7 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/70 to-transparent" />

              {latestReceipt ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#12261b] border border-[#2f5d42] flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-[#34d399]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-serif text-gradient-gold">
                        Payment Confirmed
                      </h2>
                      <p className="text-xs text-[#8e8a7f]">
                        Settled on NEAR Testnet · Digital Receipt Issued
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#121512] border border-[#27382b] space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2.5 border-b border-[#222c24]">
                      <span className="text-[#8e8a7f] flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[#34d399]" />
                        Receipt ID
                      </span>
                      <span className="font-mono text-[#f5f2eb] font-semibold">
                        {latestReceipt.receiptId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8e8a7f]">Amount Paid</span>
                      <span className="font-mono text-[#f5dfa8] font-semibold">
                        ${latestReceipt.amountUsdc.toFixed(2)} USDC ({latestReceipt.originAsset})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8e8a7f]">Paid By</span>
                      <span className="font-mono text-[#f5f2eb] max-w-[200px] truncate">
                        {latestReceipt.payerAccountId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8e8a7f]">Merchant</span>
                      <span className="font-mono text-[#d4b06a] max-w-[200px] truncate">
                        {link.merchantAccountId}
                      </span>
                    </div>
                    {latestReceipt.customerNote && (
                      <div className="pt-2 border-t border-[#222c24]">
                        <div className="text-[#8e8a7f] mb-1">Order Note</div>
                        <div className="text-[#f5f2eb] bg-[#171b17] p-2.5 rounded-lg border border-[#273028]">
                          {latestReceipt.customerNote}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#222c24] flex items-center justify-between">
                      <span className="text-[#8e8a7f]">On-Chain Proof</span>
                      <a
                        href={latestReceipt.settlementTxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#e5be70] hover:text-[#fae8b8] underline font-mono"
                      >
                        {latestReceipt.settlementTxHash.slice(0, 12)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {link.linkType === 'REUSABLE' && link.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setConfirmedReceipt(null)}
                      className="w-full py-2.5 rounded-xl bg-[#1a1813] hover:bg-[#232019] border border-[#d4b06a]/40 text-xs font-semibold text-[#f5ecd5] transition cursor-pointer"
                    >
                      Make Another Payment
                    </button>
                  )}
                </div>
              ) : link.status === 'ARCHIVED' ? (
                <div className="py-8 text-center space-y-3">
                  <Lock className="w-8 h-8 text-[#8e8a7f] mx-auto" />
                  <h2 className="text-xl font-serif text-[#f5f2eb]">Checkout Paused</h2>
                  <p className="text-xs text-[#8e8a7f]">
                    The merchant has temporarily paused payments for this link.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePay} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-serif text-gradient-gold">
                      Complete Payment
                    </h2>
                    <p className="text-xs text-[#9c978b] mt-1">
                      Pay directly from your connected NEAR wallet or any supported chain.
                    </p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#13120f] border border-[#2a2820]">
                    <button
                      type="button"
                      onClick={() => setPayMode('NEAR_WALLET')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        payMode === 'NEAR_WALLET'
                          ? 'bg-[#221f17] text-[#f5ecd5] border border-[#d4b06a]/50'
                          : 'text-[#8e8a7f] hover:text-[#f5f2eb]'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 text-[#d4b06a]" />
                      NEAR Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMode('ONECLICK')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        payMode === 'ONECLICK'
                          ? 'bg-[#14221a] text-[#e4f7eb] border border-[#34d399]/50'
                          : 'text-[#8e8a7f] hover:text-[#f5f2eb]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
                      Cross-Chain
                    </button>
                  </div>

                  {payMode === 'ONECLICK' && tokens.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-[#8e8a7f]">
                        Select Origin Asset
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {tokens.slice(0, 6).map((tok) => (
                          <button
                            key={tok.assetId}
                            type="button"
                            onClick={() => setSelectedToken(tok.symbol)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              selectedToken === tok.symbol
                                ? 'bg-[#1c1b15] border-[#d4b06a]/60 text-[#f5ecd5]'
                                : 'bg-[#13120f] border-[#26241d] text-[#9c978b] hover:border-[#3e3a2f]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                              <ChainDot chain={tok.chain} />
                              {tok.symbol}
                            </div>
                            <div className="text-[10px] font-mono text-[#7c786e] mt-0.5">
                              {tok.chain}
                            </div>
                          </button>
                        ))}
                      </div>
                      {estimatedCrossChainIn && activeTokenObj && (
                        <div className="text-xs font-mono text-[#a39f93] bg-[#13120f] px-3 py-2 rounded-lg border border-[#25231d]">
                          1Click Quote: ≈{' '}
                          <span className="text-[#f5dfa8] font-semibold">
                            {estimatedCrossChainIn} {activeTokenObj.symbol}
                          </span>{' '}
                          → ${link.amountUsdc.toFixed(2)} USDC
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connected Wallet Info */}
                  {isConnected && accountId ? (
                    <div className="p-3.5 rounded-xl bg-[#13130f] border border-[#29271f] flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[#8e8a7f]">Paying as</div>
                        <div className="font-mono text-[#f5f2eb] font-medium mt-0.5">
                          {accountId}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[#f5dfa8]">${walletUsdc.toFixed(2)} USDC</div>
                        <div className="text-[#34d399] text-[11px]">{walletNear.toFixed(2)} NEAR</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#171510] border border-[#d4b06a]/30 text-xs text-[#d8cfb9] flex items-center justify-between gap-3">
                      <span>Connect your NEAR wallet to complete checkout.</span>
                      <button
                        type="button"
                        onClick={connect}
                        className="px-3 py-1.5 rounded-lg bg-[#d4b06a] text-[#0a0a09] font-bold shrink-0 cursor-pointer"
                      >
                        Connect
                      </button>
                    </div>
                  )}

                  {/* Optional Note */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#8e8a7f]">
                      Order Note / Email / Handle (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="e.g. @alex, alex@studio.io, or Table #4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#12120f] border border-[#2c2a22] focus:border-[#d4b06a]/60 outline-none text-sm text-[#f5f2eb] placeholder-[#5e5b52]"
                    />
                  </div>

                  {payError && (
                    <div className="p-3 rounded-xl bg-[#211515] border border-[#4b2725] text-xs text-[#f0c7c3]">
                      {payError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#b38531] hover:from-[#fae8b8] hover:to-[#c6973f] text-[#0a0a09] font-bold text-sm shadow-[0_0_24px_rgba(212,176,106,0.35)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Lock className="w-4 h-4" />
                    {paying
                      ? 'Settling on NEAR Testnet...'
                      : isConnected
                        ? `Pay $${link.amountUsdc.toFixed(2)} USDC Now`
                        : 'Connect Wallet & Pay'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
