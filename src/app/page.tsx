'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Store,
  FileSpreadsheet,
  ArrowRight,
  Zap,
  Sparkles,
  CheckCircle2,
  EyeOff,
  Wallet,
  ExternalLink,
  KeyRound,
  Layers,
  UserCheck,
  Building2,
  Receipt,
  Coins,
} from 'lucide-react';
import { NearVeilLogo } from '@/components/BrandMark';

type FlowMode = 'payroll' | 'invoice' | 'merchant';

const FLOW_MODES: Record<
  FlowMode,
  {
    label: string;
    badge: string;
    sourceTitle: string;
    sourceSub: string;
    sourceAmount: string;
    vaultSub: string;
    outputs: { title: string; sub: string; badge: string }[];
  }
> = {
  payroll: {
    label: 'Private Payroll',
    badge: 'ECDH Stealth · Auto-Deposit',
    sourceTitle: 'Employer Treasury',
    sourceSub: '1 Pooled Deposit (USDC / NEAR)',
    sourceAmount: '$12,500.00',
    vaultSub: 'Splits pool into unlinkable stealth outputs',
    outputs: [
      {
        title: 'Employee #1 · Stealth',
        sub: '0x7a9e...3f1b (Zero-Claim)',
        badge: 'Hidden Amount',
      },
      {
        title: 'Employee #2 · Stealth',
        sub: '0x4c2d...8e9a (Zero-Claim)',
        badge: 'Hidden Amount',
      },
    ],
  },
  invoice: {
    label: 'Gasless Invoices',
    badge: '$0.00 Creation Gas · Relayer',
    sourceTitle: 'Freelancer / Agency',
    sourceSub: 'Itemized /invoice/[id] Link',
    sourceAmount: '$2,400.00',
    vaultSub: 'Sponsored relayer mints & settles on-chain',
    outputs: [
      {
        title: 'Client Payment',
        sub: 'Circle Native USDC or NEAR',
        badge: '1-Click Settle',
      },
      {
        title: 'Encrypted Audit Note',
        sub: 'AES-256-GCM Viewing Key',
        badge: 'CSV Ready',
      },
    ],
  },
  merchant: {
    label: 'Merchant POS',
    badge: 'Reusable & One-Time Links',
    sourceTitle: 'Customer Checkout',
    sourceSub: 'Shareable /pay/[id] Storefront',
    sourceAmount: '$49.00',
    vaultSub: 'Verifies payment & mints instant receipt',
    outputs: [
      {
        title: 'Instant Settlement',
        sub: 'Direct to Merchant Wallet',
        badge: '0% Platform Fee',
      },
      {
        title: 'Receipt · RCPT-8F2A',
        sub: 'Live Revenue & Sales Counter',
        badge: 'Confirmed',
      },
    ],
  },
};

export default function LandingPage() {
  const [flowMode, setFlowMode] = useState<FlowMode>('payroll');
  const activeFlow = FLOW_MODES[flowMode];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Ambient Floating Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[480px] h-[480px] rounded-full bg-[#d4b06a]/10 blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full bg-[#34d399]/8 blur-[120px] animate-float-reverse" />
        <div className="absolute bottom-0 left-10 w-[360px] h-[360px] rounded-full bg-[#c084fc]/6 blur-[120px] animate-float-slow" />
      </div>

      {/* Top Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#272621] bg-[#0a0a09]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center hover:opacity-95 transition">
            <NearVeilLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-[#9c978b] bg-[#12120f]/80 border border-[#25241e] rounded-full px-2 py-1">
            <a
              href="#features"
              className="px-3 py-1 rounded-full hover:bg-[#1c1b16] hover:text-[#f5ecd5] transition"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="px-3 py-1 rounded-full hover:bg-[#1c1b16] hover:text-[#f5ecd5] transition"
            >
              How It Works
            </a>
            <a
              href="#architecture"
              className="px-3 py-1 rounded-full hover:bg-[#1c1b16] hover:text-[#f5ecd5] transition"
            >
              Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="btn-shimmer px-4 py-2 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#b38632] hover:from-[#fae8b8] hover:to-[#c8993e] text-[#0a0a09] text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_0_22px_rgba(212,176,106,0.35)] hover:shadow-[0_0_28px_rgba(212,176,106,0.55)] transition-all"
            >
              Launch App
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left: Copy & CTAs */}
            <div className="lg:col-span-6 space-y-6">
              <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full badge-gold-glow text-[11px] font-mono uppercase tracking-[0.15em]">
                <Sparkles className="w-3.5 h-3.5 text-[#e5be70]" />
                Private Treasury Suite · Circle USDC &amp; NEAR
              </div>

              <h1 className="animate-fade-up-delay-1 text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.08] text-gradient-gold">
                Confidential Payroll, Gasless Invoices &amp; Merchant Pay.
              </h1>

              <p className="animate-fade-up-delay-2 text-base sm:text-lg text-[#a39f93] leading-relaxed max-w-xl">
                One unified financial layer on NEAR. Issue <strong className="text-[#f5f2eb] font-medium">$0.00-gas</strong> client invoices, disburse team salaries privately via stealth addresses, and spin up instant storefront checkout links.
              </p>

              <div className="animate-fade-up-delay-3 flex flex-wrap items-center gap-3.5 pt-1">
                <Link
                  href="/app"
                  className="btn-shimmer px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#a87d2a] hover:from-[#fae8b8] hover:to-[#be913b] text-[#0a0a09] text-sm font-bold inline-flex items-center gap-2 shadow-[0_0_28px_rgba(212,176,106,0.4)] hover:shadow-[0_0_36px_rgba(212,176,106,0.6)] transition-all"
                >
                  Launch App
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="px-5 py-3.5 rounded-xl bg-[#151512] hover:bg-[#1c1b17] border border-[#2f2d25] text-[#e8e3d6] text-sm font-medium inline-flex items-center gap-2 transition"
                >
                  How It Works
                </a>
              </div>

              {/* Compact Trust Metrics */}
              <div className="animate-fade-up-delay-3 pt-4 grid grid-cols-3 gap-4 border-t border-[#24231e] max-w-lg">
                <div>
                  <div className="text-xl font-serif text-[#f5ecd5] tabular-nums">$0.00</div>
                  <div className="text-[11px] font-mono text-[#7c786e]">Invoice Gas Fee</div>
                </div>
                <div>
                  <div className="text-xl font-serif text-[#6ee7b7] tabular-nums">ECDH</div>
                  <div className="text-[11px] font-mono text-[#7c786e]">Stealth Payouts</div>
                </div>
                <div>
                  <div className="text-xl font-serif text-[#f5ecd5] tabular-nums">USDC &amp; NEAR</div>
                  <div className="text-[11px] font-mono text-[#7c786e]">On-Chain Native</div>
                </div>
              </div>
            </div>

            {/* Hero Right: Interactive Animated Flow Visualizer */}
            <div className="lg:col-span-6 animate-fade-up-delay-2">
              <div className="vault-card-glow-gold rounded-3xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/70 to-transparent" />

                {/* Interactive Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#26251f]">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e0e0c] border border-[#25241e]">
                    {(Object.keys(FLOW_MODES) as FlowMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFlowMode(mode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          flowMode === mode
                            ? 'bg-[#221f17] text-[#f5ecd5] border border-[#d4b06a]/45 shadow-sm'
                            : 'text-[#8e8a7f] hover:text-[#f5f2eb] border border-transparent'
                        }`}
                      >
                        {FLOW_MODES[mode].label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#132219] border border-[#2d523c] text-[#6ee7b7]">
                    {activeFlow.badge}
                  </span>
                </div>

                {/* Animated Settlement Diagram */}
                <div className="py-6 space-y-4">
                  {/* Source Node */}
                  <div className="p-4 rounded-2xl bg-[#12120f] border border-[#2d2b23] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#221f17] border border-[#d4b06a]/40 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 text-[#e5be70]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#f5f2eb]">
                          {activeFlow.sourceTitle}
                        </div>
                        <div className="text-xs text-[#8e8a7f]">{activeFlow.sourceSub}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-serif font-semibold text-gradient-gold tabular-nums">
                        {activeFlow.sourceAmount}
                      </div>
                      <div className="text-[10px] font-mono text-[#6d695f]">NEAR Testnet</div>
                    </div>
                  </div>

                  {/* Animated SVG Connector Lines */}
                  <div className="flex justify-center py-0.5">
                    <svg width="240" height="34" viewBox="0 0 240 34" className="overflow-visible">
                      <path
                        d="M120 0 L120 34"
                        stroke="rgba(212,176,106,0.55)"
                        strokeWidth="2"
                        fill="none"
                        className="animate-flow-dash"
                      />
                      <circle cx="120" cy="17" r="4" fill="#e5be70">
                        <animate
                          attributeName="opacity"
                          values="0.4;1;0.4"
                          dur="1.6s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </svg>
                  </div>

                  {/* Center Vault Node */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#191813] via-[#1c1a13] to-[#191813] border border-[#d4b06a]/45 shadow-[0_0_24px_rgba(212,176,106,0.12)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#d4b06a]/15 border border-[#d4b06a]/40 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-[#f5dfa8]" />
                      </div>
                      <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-[#e5be70]">
                          NearPay Veil Vault &amp; Relayer
                        </div>
                        <div className="text-xs text-[#b5b0a4] mt-0.5">
                          {activeFlow.vaultSub}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#14261c] border border-[#2d523c] text-[10px] font-mono text-[#34d399] shrink-0">
                      $0.00 Gas
                    </span>
                  </div>

                  {/* Split Animated Connector */}
                  <div className="flex justify-center py-0.5">
                    <svg width="280" height="34" viewBox="0 0 280 34" className="overflow-visible">
                      <path
                        d="M140 0 C140 18, 65 14, 65 34"
                        stroke="rgba(52,211,153,0.55)"
                        strokeWidth="2"
                        fill="none"
                        className="animate-flow-dash"
                      />
                      <path
                        d="M140 0 C140 18, 215 14, 215 34"
                        stroke="rgba(52,211,153,0.55)"
                        strokeWidth="2"
                        fill="none"
                        className="animate-flow-dash"
                      />
                    </svg>
                  </div>

                  {/* Output Nodes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeFlow.outputs.map((out) => (
                      <div
                        key={out.title}
                        className="p-3.5 rounded-2xl bg-[#101613] border border-[#2c4435] space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#e4f7eb]">
                            {out.title}
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
                        </div>
                        <div className="text-[11px] font-mono text-[#88a895] truncate">
                          {out.sub}
                        </div>
                        <div className="inline-block px-2 py-0.5 rounded bg-[#14261c] text-[10px] font-mono text-[#6ee7b7]">
                          {out.badge}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="shimmer-line max-w-6xl mx-auto" />

        {/* 4 CORE PILLARS */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 lg:py-20 space-y-10">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#d4b06a]">
              Complete Financial Suite
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f5f2eb] tracking-tight">
              Everything you need to get paid, pay your team, and stay audit-ready.
            </h2>
            <p className="text-sm text-[#9c978b] leading-relaxed">
              Built for Web3 studios, DAOs, freelancers, and merchants operating natively on NEAR Testnet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1: Gasless Invoices */}
            <div className="vault-card-glow-gold rounded-2xl p-6 space-y-4 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#221f17] border border-[#d4b06a]/40 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#e5be70]" />
                </div>
                <span className="badge-gold-glow px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                  $0.00 Gas Creation
                </span>
              </div>
              <h3 className="text-xl font-serif text-[#f5f2eb]">Gasless Client Invoices</h3>
              <p className="text-sm text-[#9c978b] leading-relaxed">
                Draft itemized invoices in seconds with zero gas via our whitelisted relayer. Share a clean <code className="text-[#f5dfa8] font-mono text-xs">/invoice/[id]</code> checkout link—clients settle in Circle Native USDC or NEAR.
              </p>
              <ul className="space-y-1.5 text-xs text-[#b5b0a4] pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4b06a]" />
                  Real-time invoice status &amp; on-chain explorer links
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4b06a]" />
                  Automated x402 / API payment verification endpoints
                </li>
              </ul>
            </div>

            {/* Pillar 2: Confidential Private Payroll */}
            <div className="vault-card-glow-emerald rounded-2xl p-6 space-y-4 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#132219] border border-[#34d399]/40 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#34d399]" />
                </div>
                <span className="badge-emerald-glow px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                  Employer &amp; Employee Views
                </span>
              </div>
              <h3 className="text-xl font-serif text-[#f5f2eb]">Confidential Private Payroll</h3>
              <p className="text-sm text-[#9c978b] leading-relaxed">
                Fund your entire payroll batch in one pooled deposit. Salaries auto-disburse to fresh ECDH stealth addresses—keeping team compensation hidden from public block explorers.
              </p>
              <ul className="space-y-1.5 text-xs text-[#b5b0a4] pt-1">
                <li className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#34d399]" />
                  <span><strong className="text-[#e4f7eb]">Employer View:</strong> Batch disburse in USDC or NEAR</span>
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#34d399]" />
                  <span><strong className="text-[#e4f7eb]">Employee View:</strong> One-time Stealth Meta-Address &amp; zero claim step</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3: Merchant Checkout & POS */}
            <div className="vault-card rounded-2xl p-6 space-y-4 hover:border-[#d4b06a]/35 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#1d1b16] border border-[#3a3629] flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#e5be70]" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1a1813] border border-[#353126] text-[10px] font-mono text-[#d4b06a]">
                  Instant POS Links
                </span>
              </div>
              <h3 className="text-xl font-serif text-[#f5f2eb]">Merchant Checkout &amp; POS</h3>
              <p className="text-sm text-[#9c978b] leading-relaxed">
                Create shareable <code className="text-[#f5dfa8] font-mono text-xs">/pay/[id]</code> storefront links for products, SaaS plans, or one-time orders. Track total sales, active links, and customer receipts live.
              </p>
              <ul className="space-y-1.5 text-xs text-[#b5b0a4] pt-1">
                <li className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-[#e5be70]" />
                  Reusable storefront or One-Time checkout modes
                </li>
                <li className="flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-[#e5be70]" />
                  Direct wallet-to-wallet settlement in Circle USDC or NEAR
                </li>
              </ul>
            </div>

            {/* Pillar 4: Encrypted Bookkeeper Exports */}
            <div className="vault-card-glow-indigo rounded-2xl p-6 space-y-4 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#181624] border border-[#c084fc]/35 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#c084fc]" />
                </div>
                <span className="badge-purple-glow px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                  AES-256-GCM Viewing Keys
                </span>
              </div>
              <h3 className="text-xl font-serif text-[#f5f2eb]">Encrypted Bookkeeper Exports</h3>
              <p className="text-sm text-[#9c978b] leading-relaxed">
                Privacy shouldn&apos;t break accounting. Every payout stores an encrypted viewing note that only your finance team can unlock to export clean QuickBooks &amp; Xero CSVs.
              </p>
              <ul className="space-y-1.5 text-xs text-[#b5b0a4] pt-1">
                <li className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-[#c084fc]" />
                  Toggle encrypted vs. decrypted ledger preview live
                </li>
                <li className="flex items-center gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-[#c084fc]" />
                  Public observers see zero salary or client details
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#34d399]">
              Three-Step Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f5f2eb]">
              From wallet connect to verifiable settlement
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Connect NEAR Wallet',
                desc: 'Connect MyNearWallet, Meteor, or HOT Wallet. Live balances for Circle Native USDC and NEAR Testnet sync directly from RPC.',
              },
              {
                step: '02',
                title: 'Create or Disburse',
                desc: 'Issue a $0.00-gas invoice, launch a merchant checkout link, or run a pooled private payroll batch for your team.',
              },
              {
                step: '03',
                title: 'Settle & Reconcile',
                desc: 'Payments execute on-chain via NEAR Testnet with instant NearBlocks explorer proofs and encrypted CSV exports for your accountant.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="vault-card-subtle rounded-2xl p-6 space-y-3 relative overflow-hidden"
              >
                <div className="text-3xl font-serif text-gradient-gold opacity-80">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-[#f5f2eb]">{item.title}</h3>
                <p className="text-sm text-[#9c978b] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ARCHITECTURE STRIP */}
        <section id="architecture" className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          <div className="vault-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26251f] pb-5">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-[#d4b06a]" />
                <div>
                  <h2 className="text-xl font-serif text-[#f5f2eb]">
                    Verified Testnet Architecture
                  </h2>
                  <p className="text-xs text-[#8e8a7f]">
                    100% real NEAR Testnet transactions—zero simulated or dummy balances.
                  </p>
                </div>
              </div>
              <a
                href="https://testnet.nearblocks.io/address/nearveil-vault-48eb1e.testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#161511] border border-[#2f2d24] text-xs font-mono text-[#d4b06a] hover:border-[#d4b06a]/50 transition"
              >
                <span>nearveil-vault-48eb1e.testnet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-[#11110e] border border-[#24231d] space-y-1.5">
                <div className="font-mono text-[#e5be70] uppercase tracking-wider text-[10px]">
                  Stealth Cryptography
                </div>
                <div className="font-semibold text-[#f5f2eb]">ECDH One-Time Keys</div>
                <p className="text-[#8e8a7f] leading-relaxed">
                  Ephemeral public keys derive unique stealth addresses per paycheck.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#11110e] border border-[#24231d] space-y-1.5">
                <div className="font-mono text-[#34d399] uppercase tracking-wider text-[10px]">
                  Settlement Assets
                </div>
                <div className="font-semibold text-[#f5f2eb]">Circle USDC &amp; NEAR</div>
                <p className="text-[#8e8a7f] leading-relaxed">
                  NEP-141 Circle Native USDC (<code className="text-[#a39f93]">3e22...b8af</code>) &amp; Native NEAR.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#11110e] border border-[#24231d] space-y-1.5">
                <div className="font-mono text-[#c084fc] uppercase tracking-wider text-[10px]">
                  Audit Encryption
                </div>
                <div className="font-semibold text-[#f5f2eb]">AES-256-GCM Notes</div>
                <p className="text-[#8e8a7f] leading-relaxed">
                  Encrypted accounting metadata unlocked strictly with your Viewing Key.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#11110e] border border-[#24231d] space-y-1.5">
                <div className="font-mono text-[#7dd3fc] uppercase tracking-wider text-[10px]">
                  Gas Sponsorship
                </div>
                <div className="font-semibold text-[#f5f2eb]">Whitelisted Relayer</div>
                <p className="text-[#8e8a7f] leading-relaxed">
                  Sponsors invoice &amp; checkout metadata creation at $0.00 cost to users.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-20">
          <div className="vault-card-glow-gold rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/70 to-transparent" />
            <h2 className="text-3xl sm:text-5xl font-serif text-gradient-gold max-w-2xl mx-auto">
              Ready to run private treasury &amp; payments on NEAR?
            </h2>
            <p className="text-sm sm:text-base text-[#a39f93] max-w-xl mx-auto">
              Launch the workspace to create your first gasless invoice, send a confidential payroll batch, or generate a merchant checkout link.
            </p>
            <div>
              <Link
                href="/app"
                className="btn-shimmer px-8 py-4 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#a87d2a] hover:from-[#fae8b8] hover:to-[#be913b] text-[#0a0a09] text-sm font-bold inline-flex items-center gap-2.5 shadow-[0_0_32px_rgba(212,176,106,0.45)] hover:shadow-[0_0_42px_rgba(212,176,106,0.65)] transition-all"
              >
                Launch App
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#24231e] bg-[#0a0a09]/90 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#7c786e]">
          <div className="flex items-center gap-3">
            <NearVeilLogo size="sm" />
            <span>·</span>
            <span>Private Treasury, Invoicing &amp; Merchant Pay on NEAR Testnet</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <Link href="/app" className="text-[#d4b06a] hover:underline">
              Open App
            </Link>
            <a
              href="https://testnet.nearblocks.io/address/nearveil-vault-48eb1e.testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#f5f2eb] transition inline-flex items-center gap-1"
            >
              Contract Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
