'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  RefreshCcw,
  FileSpreadsheet,
  Lock,
  Unlock,
  Users,
  FileText,
  Sparkles,
  Coins,
  ArrowUpRight,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import {
  InvoiceLineItem,
  NearVeilInvoice,
  OneClickTokenOption,
  PayrollRecipientInput,
  PrivatePayrollBatch,
} from '@/lib/types';

interface TestnetInfo {
  networkId: string;
  rpcUrl: string;
  explorerBaseUrl: string;
  contractAccountId: string;
  relayerAccountId: string;
  liveTestnetFunded: boolean;
  deployTxHash: string | null;
  deployTxUrl: string | null;
  defaultViewingKey: string;
  allowedRelayerMethods: string[];
  oneClickLivePricing: boolean;
}

export default function NearVeilHomePage() {
  const [activeTab, setActiveTab] = useState<
    'invoices' | 'payroll' | 'accounting' | 'security'
  >('invoices');

  const [testnetInfo, setTestnetInfo] = useState<TestnetInfo | null>(null);
  const [invoices, setInvoices] = useState<NearVeilInvoice[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<PrivatePayrollBatch[]>([]);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [faucetBalance, setFaucetBalance] = useState<number>(25000);
  const [stealthClaimedBalance, setStealthClaimedBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    txUrl?: string | null;
  } | null>(null);

  // Invoice Creator Form State
  const [clientName, setClientName] = useState<string>('Horizon AI Ventures');
  const [clientReference, setClientReference] = useState<string>('PO-2026-710');
  const [freelancerAccount, setFreelancerAccount] = useState<string>(
    'alex-dev.testnet'
  );
  const [dueDateUtc, setDueDateUtc] = useState<string>('2026-11-28');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: 'item-1',
      description: 'Cross-Chain Payment Architecture (1Click API)',
      quantity: 15,
      unitPriceUsd: 110,
    },
    {
      id: 'item-2',
      description: 'NEAR Meta-Transaction Relayer Integration',
      quantity: 1,
      unitPriceUsd: 550,
    },
  ]);

  // Umbra Private Batch Payroll Form State
  const [companyName, setCompanyName] = useState<string>('NearVeil Labs DAO');
  const [payPeriodLabel, setPayPeriodLabel] = useState<string>(
    'Nov 2026 Cycle B'
  );
  const [payrollOriginChain, setPayrollOriginChain] =
    useState<string>('Solana');
  const [payrollOriginAsset, setPayrollOriginAsset] = useState<string>('SOL');
  const [payrollRecipients, setPayrollRecipients] = useState<
    PayrollRecipientInput[]
  >([
    {
      id: 'rec-1',
      contractorName: 'Elena Vance (Core Rust Eng)',
      roleOrDepartment: 'Protocol Engineering',
      referenceCode: 'CONT-101',
      amountUsdc: 3800,
    },
    {
      id: 'rec-2',
      contractorName: 'Marcus Chen (Product Designer)',
      roleOrDepartment: 'Design Systems',
      referenceCode: 'CONT-102',
      amountUsdc: 2600,
    },
    {
      id: 'rec-3',
      contractorName: 'Priya Nair (Security Researcher)',
      roleOrDepartment: 'Cryptography & Audit',
      referenceCode: 'CONT-103',
      amountUsdc: 4100,
    },
  ]);

  // Bookkeeper Viewing Key State
  const [viewingKeyInput, setViewingKeyInput] = useState<string>('');
  const [bookkeeperDecryptedMode, setBookkeeperDecryptedMode] =
    useState<boolean>(true);

  // Relayer Security Tester State
  const [relayerTestLog, setRelayerTestLog] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices', { cache: 'no-store' });
      const data = await res.json();
      setTestnetInfo(data.testnetInfo || null);
      setInvoices(data.invoices || []);
      setPayrollBatches(data.payrollBatches || []);
      setTokens(data.oneClickTokens || []);
      setFaucetBalance(data.faucetUsdcBalance ?? 25000);
      setStealthClaimedBalance(data.stealthClaimedBalanceUsdc ?? 0);
      if (!viewingKeyInput && data.testnetInfo?.defaultViewingKey) {
        setViewingKeyInput(data.testnetInfo.defaultViewingKey);
      }
    } catch {
      setStatusBanner({
        type: 'error',
        message: 'Unable to load NEAR Testnet state.',
      });
    } finally {
      setLoading(false);
    }
  }, [viewingKeyInput]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const invoiceSubtotal = lineItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPriceUsd,
    0
  );
  const invoiceTax = Number(((invoiceSubtotal * taxRatePercent) / 100).toFixed(2));
  const invoiceTotal = Number((invoiceSubtotal + invoiceTax).toFixed(2));

  const payrollTotalUsdc = payrollRecipients.reduce(
    (acc, r) => acc + Number(r.amountUsdc || 0),
    0
  );

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Additional Milestone Deliverable',
        quantity: 1,
        unitPriceUsd: 250,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCreateGaslessInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('create_invoice');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_invoice',
          clientName,
          clientReference,
          freelancerAccount,
          dueDateUtc,
          taxRatePercent,
          lineItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
      await fetchDashboard();
      setStatusBanner({
        type: 'success',
        message: `Gasless Invoice ${data.invoice.invoiceId} created on NEAR Testnet! Relayer (${testnetInfo?.relayerAccountId}) paid 100% of gas.`,
        txUrl: data.invoice.creationTxUrl,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickPayInvoice = async (inv: NearVeilInvoice) => {
    setBusyKey(`pay_${inv.invoiceId}`);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice_1click',
          invoiceId: inv.invoiceId,
          originAssetSymbol: 'SOL',
          originChain: 'Solana',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      await fetchDashboard();
      setStatusBanner({
        type: 'success',
        message: `Invoice ${inv.invoiceId} settled (${inv.totalAmountUsdc.toFixed(2)} USDC) on NEAR Testnet via 1Click Solver!`,
        txUrl: data.invoice.settlementTxUrl,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickStealthClaim = async (inv: NearVeilInvoice) => {
    setBusyKey(`claim_${inv.invoiceId}`);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_stealth',
          invoiceId: inv.invoiceId,
          claimSecret: inv.claimSecretHint,
          destinationStealthAccount: inv.stealthImplicitAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Stealth claim failed');
      await fetchDashboard();
      setStatusBanner({
        type: 'success',
        message: `Swept ${inv.totalAmountUsdc.toFixed(2)} USDC gaslessly to unlinked NEAR Stealth Account (${inv.stealthImplicitAccount.slice(0, 12)}...)!`,
        txUrl: data.invoice.stealthClaimTxUrl,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRunPrivatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('run_payroll');
    setStatusBanner(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_private_payroll',
          companyName,
          payPeriodLabel,
          fundingOriginChain: payrollOriginChain,
          fundingOriginAsset: payrollOriginAsset,
          recipients: payrollRecipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payroll batch failed');
      await fetchDashboard();
      setStatusBanner({
        type: 'success',
        message: `Umbra Private Payroll Batch ${data.batch.batchId} (${data.batch.recipientCount} recipients, $${data.batch.totalAmountUsdc.toFixed(2)} USDC) committed on NEAR Testnet with zero employee wallets exposed!`,
        txUrl: data.batch.fundingTxUrl,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleMintFaucet = async () => {
    setBusyKey('faucet');
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mint_faucet_usdc' }),
      });
      await fetchDashboard();
      setStatusBanner({
        type: 'info',
        message: 'Minted +10,000.00 Free Testnet USDC to your sandbox payer balance.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleTestRelayerPolicy = async (mode: 'authorized' | 'unauthorized') => {
    setBusyKey(`relay_${mode}`);
    setRelayerTestLog(null);
    try {
      const payload =
        mode === 'authorized'
          ? {
              targetContractId: testnetInfo?.contractAccountId,
              methodName: 'register_stealth_meta',
              args: { stealth_meta: 'ed25519:demo_meta_key' },
            }
          : {
              targetContractId: 'malicious-external-contract.testnet',
              methodName: 'drain_relayer_funds',
              args: {},
            };

      const res = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRelayerTestLog(
        `HTTP ${res.status}\n${JSON.stringify(data, null, 2)}`
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800/90 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  NearVeil
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  NEAR Testnet Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gasless Cross-Chain Invoicing &amp; Umbra-Style Private Payroll on NEAR
              </p>
            </div>
          </div>

          {/* Live Testnet Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Testnet Payer Faucet:</span>
              <span className="font-bold text-white">
                ${faucetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
              </span>
              <button
                type="button"
                onClick={handleMintFaucet}
                disabled={busyKey === 'faucet'}
                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold transition cursor-pointer"
              >
                +10k Free
              </button>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Swept Stealth Balance:</span>
              <span className="font-bold text-emerald-400">
                ${stealthClaimedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
              </span>
            </div>

            <a
              href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(
                viewingKeyInput || testnetInfo?.defaultViewingKey || ''
              )}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-md shadow-emerald-500/10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Accountant CSV
            </a>
          </div>
        </div>

        {/* Sub-bar showing live NEAR Testnet Vault & Relayer accounts */}
        {testnetInfo && (
          <div className="bg-slate-900/70 border-t border-slate-800/70 px-4 sm:px-6 lg:px-8 py-2 text-xs">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Vault Contract:{' '}
                  <a
                    href={`${testnetInfo.explorerBaseUrl}/address/${testnetInfo.contractAccountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-mono"
                  >
                    {testnetInfo.contractAccountId}
                  </a>
                </span>
                <span>
                  Gasless Relayer:{' '}
                  <a
                    href={`${testnetInfo.explorerBaseUrl}/address/${testnetInfo.relayerAccountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline font-mono"
                  >
                    {testnetInfo.relayerAccountId}
                  </a>
                </span>
                <span>
                  Freelancer Gas Cost:{' '}
                  <strong className="text-emerald-300">$0.00 (Sponsored)</strong>
                </span>
              </div>

              {testnetInfo.deployTxUrl && (
                <a
                  href={testnetInfo.deployTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 font-mono"
                >
                  Contract Deploy Tx: {testnetInfo.deployTxHash?.slice(0, 12)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Banner */}
        {statusBanner && (
          <div
            className={`mb-6 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : statusBanner.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusBanner.message}</span>
            </div>
            {statusBanner.txUrl && (
              <a
                href={statusBanner.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold underline hover:opacity-80"
              >
                View Live Transaction on NearBlocks Testnet
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Gasless Freelancer Invoicing (1Click API)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Umbra-Style Private Batch Payroll
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounting')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'accounting'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            3. Bookkeeper Viewing Key &amp; CSV Audit
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            4. Relayer Whitelist &amp; x402 Inspector
          </button>
        </div>

        {/* TAB 1: GASLESS FREELANCER INVOICING */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Create Invoice Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleCreateGaslessInvoice}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Create Freelancer Invoice
                    </h2>
                    <p className="text-xs text-slate-400">
                      Zero NEAR needed for gas · Settled in USDC via 1Click API
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    0 Gas Relayer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Client / Company Name
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      PO / Reference Code
                    </label>
                    <input
                      type="text"
                      value={clientReference}
                      onChange={(e) => setClientReference(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDateUtc}
                      onChange={(e) => setDueDateUtc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">
                      Tax / VAT (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">
                      Freelancer ID
                    </label>
                    <input
                      type="text"
                      value={freelancerAccount}
                      onChange={(e) => setFreelancerAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Billable Line Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>

                  {lineItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItems((prev) =>
                              prev.map((li, i) =>
                                i === idx ? { ...li, description: val } : li
                              )
                            );
                          }}
                          placeholder="Service description"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400">
                            Hours / Qty
                          </span>
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setLineItems((prev) =>
                                prev.map((li, i) =>
                                  i === idx ? { ...li, quantity: val } : li
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white mt-0.5"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400">
                            Rate (USD)
                          </span>
                          <input
                            type="number"
                            min={1}
                            step="any"
                            required
                            value={item.unitPriceUsd}
                            onChange={(e) => {
                              const val = Math.max(0.01, Number(e.target.value));
                              setLineItems((prev) =>
                                prev.map((li, i) =>
                                  i === idx ? { ...li, unitPriceUsd: val } : li
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Billed to Client</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {invoiceTotal.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Umbra Privacy Mode</span>
                    <span className="text-slate-200">
                      One-Time Stealth Implicit Account + Viewing Key
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyKey === 'create_invoice'}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/15 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {busyKey === 'create_invoice'
                    ? 'Relaying Gasless Transaction on NEAR Testnet...'
                    : `Create Invoice for ${invoiceTotal.toFixed(2)} USDC (0 Gas)`}
                </button>
              </form>
            </div>

            {/* Right: Live Invoices List & One-Click Testnet Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Active Invoices &amp; Payroll Records ({invoices.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any invoice to open the dedicated Client 1Click Checkout Page or trigger instant Testnet settlement.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-sm text-slate-400">
                  Loading invoices from NEAR Testnet...
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div
                      key={inv.invoiceId}
                      className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 transition shadow-lg"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                              className="text-base font-bold text-white hover:text-emerald-400 inline-flex items-center gap-1"
                            >
                              {inv.invoiceId}
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {inv.recordType}
                            </span>
                            {inv.status === 'PAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                PAID
                              </span>
                            )}
                            {inv.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                PENDING
                              </span>
                            )}
                            {inv.status === 'REFUNDED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                                <RefreshCcw className="w-3.5 h-3.5" />
                                REFUNDED
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-300 mt-1">
                            Counterparty: <strong className="text-white">{inv.clientName}</strong> · Due:{' '}
                            <span className="text-slate-200">{inv.dueDateUtc}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {inv.lineItems.map((l) => l.description).join(' + ')}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400">
                            {inv.totalAmountUsdc.toFixed(2)} USDC
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Stealth: {inv.stealthImplicitAccount.slice(0, 10)}...
                          </div>
                        </div>
                      </div>

                      {/* Transaction Verification Links & Action Buttons */}
                      <div className="mt-4 pt-3.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            href={inv.creationTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 font-mono"
                          >
                            Creation Tx: {inv.creationTxHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {inv.settlementTxUrl && inv.settlementTxHash && (
                            <a
                              href={inv.settlementTxUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono font-medium"
                            >
                              Settlement Tx: {inv.settlementTxHash.slice(0, 10)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {inv.stealthClaimTxUrl && inv.stealthClaimTxHash && (
                            <a
                              href={inv.stealthClaimTxUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-400 hover:underline font-mono font-medium"
                            >
                              Stealth Sweep Tx: {inv.stealthClaimTxHash.slice(0, 10)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
                          >
                            Open Invoice Page
                          </Link>

                          {inv.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={busyKey === `pay_${inv.invoiceId}`}
                              onClick={() => handleQuickPayInvoice(inv)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer"
                            >
                              {busyKey === `pay_${inv.invoiceId}`
                                ? 'Settling...'
                                : '1Click Pay (Testnet)'}
                            </button>
                          )}

                          {inv.status === 'PAID' && !inv.claimedToStealthWallet && (
                            <button
                              type="button"
                              disabled={busyKey === `claim_${inv.invoiceId}`}
                              onClick={() => handleQuickStealthClaim(inv)}
                              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition cursor-pointer"
                            >
                              {busyKey === `claim_${inv.invoiceId}`
                                ? 'Sweeping...'
                                : 'Sweep to Stealth (0 Gas)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UMBRA-STYLE PRIVATE BATCH PAYROLL */}
        {activeTab === 'payroll' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <form
                onSubmit={handleRunPrivatePayroll}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-emerald-400" />
                      Umbra-Style Private Batch Payroll
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fund multiple salaries in one pooled transaction. Zero employee wallets or individual salaries are exposed publicly on NearBlocks.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Organization / Employer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Pay Period Label
                    </label>
                    <input
                      type="text"
                      required
                      value={payPeriodLabel}
                      onChange={(e) => setPayPeriodLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Treasury Funding Source (via 1Click API or Direct NEAR Testnet)
                  </label>
                  <select
                    value={`${payrollOriginAsset}|${payrollOriginChain}`}
                    onChange={(e) => {
                      const [sym, ch] = e.target.value.split('|');
                      setPayrollOriginAsset(sym);
                      setPayrollOriginChain(ch);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    {tokens.map((t) => (
                      <option key={t.assetId} value={`${t.symbol}|${t.chain}`}>
                        Fund Batch with {t.symbol} ({t.chain}) → Pooled NEAR USDC Vault
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recipients List */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Confidential Payroll Roster ({payrollRecipients.length} Contractors)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPayrollRecipients((prev) => [
                          ...prev,
                          {
                            id: `rec-${Date.now()}`,
                            contractorName: `Contractor #${prev.length + 1}`,
                            roleOrDepartment: 'Engineering',
                            referenceCode: `CONT-10${prev.length + 1}`,
                            amountUsdc: 2000,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Recipient
                    </button>
                  </div>

                  {payrollRecipients.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-5">
                        <span className="text-[10px] text-slate-400 block">
                          Name (Encrypted On-Chain)
                        </span>
                        <input
                          type="text"
                          value={rec.contractorName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPayrollRecipients((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, contractorName: val } : r
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <span className="text-[10px] text-slate-400 block">
                          Department / Role
                        </span>
                        <input
                          type="text"
                          value={rec.roleOrDepartment}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPayrollRecipients((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, roleOrDepartment: val } : r
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-slate-400 block">
                          Salary (USDC)
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={rec.amountUsdc}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            setPayrollRecipients((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, amountUsdc: val } : r
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pooled Batch Deposit Total:</span>
                    <span className="text-base font-bold text-emerald-400">
                      ${payrollTotalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                    </span>
                  </div>
                  <div className="text-slate-400">
                    On-Chain Footprint: Only <strong className="text-slate-200">{payrollRecipients.length} SHA-256 Commitments + Ephemeral PubKeys</strong> are logged to <code className="text-emerald-300">{testnetInfo?.contractAccountId}</code>.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyKey === 'run_payroll'}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  {busyKey === 'run_payroll'
                    ? 'Committing Shielded Batch Payroll on NEAR Testnet...'
                    : `Execute Private Payroll Batch ($${payrollTotalUsdc.toLocaleString()} USDC)`}
                </button>
              </form>
            </div>

            {/* Right: Executed Private Payroll Batches & Individual Stealth Slips */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-lg font-bold text-white">
                Shielded Payroll Batches &amp; Unlinkable Employee Claims
              </h2>
              <p className="text-xs text-slate-400">
                Each employee receives an individual claim slip backed by a one-time commitment hash. Claiming routes through the Gasless Relayer to a fresh 64-character hex NEAR Stealth Implicit Account.
              </p>

              {payrollBatches.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-sm text-slate-400">
                  No payroll batches executed yet. Click &ldquo;Execute Private Payroll Batch&rdquo; on the left to test!
                </div>
              ) : (
                <div className="space-y-4">
                  {payrollBatches.map((batch) => (
                    <div
                      key={batch.batchId}
                      className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {batch.batchId}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">
                            {batch.companyName} — {batch.payPeriodLabel}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">
                            ${batch.totalAmountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                          </div>
                          <div className="text-xs text-slate-400">
                            {batch.recipientCount} Shielded Commitments
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Funded via: {batch.fundingOriginAsset} ({batch.fundingOriginChain})
                        </span>
                        <a
                          href={batch.fundingTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono"
                        >
                          Batch Tx: {batch.fundingTxHash.slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual Payroll Slips ready for Gasless Stealth Sweep */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Employee Stealth Claim Slips ({invoices.filter((i) => i.recordType === 'AP_PAYROLL').length})
                </h3>
                {invoices
                  .filter((i) => i.recordType === 'AP_PAYROLL')
                  .map((slip) => (
                    <div
                      key={slip.invoiceId}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-sm">
                          {slip.invoiceId} · {slip.clientName}
                        </div>
                        <div className="text-slate-400 font-mono mt-0.5">
                          Commitment: sha256:{slip.stealthCommitmentHash.slice(0, 16)}... · Stealth:{' '}
                          {slip.stealthImplicitAccount.slice(0, 10)}...
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-400 text-sm">
                          ${slip.totalAmountUsdc.toFixed(2)} USDC
                        </span>
                        {slip.claimedToStealthWallet ? (
                          <a
                            href={slip.stealthClaimTxUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold"
                          >
                            Swept (Tx)
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled={busyKey === `claim_${slip.invoiceId}`}
                            onClick={() => handleQuickStealthClaim(slip)}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer"
                          >
                            {busyKey === `claim_${slip.invoiceId}`
                              ? 'Sweeping...'
                              : 'Claim to Stealth (0 Gas)'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKKEEPER VIEWING KEY & ZERO-QUESTION CSV EXPORT */}
        {activeTab === 'accounting' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    Bookkeeper Viewing Key &amp; General Ledger Export
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Toggle between what the public sees on-chain (encrypted ciphertext &amp; commitment hashes) vs. what your accountant sees with the read-only Viewing Key.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBookkeeperDecryptedMode(!bookkeeperDecryptedMode)
                    }
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      bookkeeperDecryptedMode
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {bookkeeperDecryptedMode ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        Bookkeeper Viewing Key: ACTIVE (Decrypted)
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Public Explorer View: ENCRYPTED (Privacy Mode)
                      </>
                    )}
                  </button>

                  <a
                    href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(
                      viewingKeyInput || testnetInfo?.defaultViewingKey || ''
                    )}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Download Zero-Question Accountant CSV
                  </a>
                </div>
              </div>

              {/* Viewing Key Input Bar */}
              <div className="py-4 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-slate-400 font-medium">
                  Active Read-Only Bookkeeper Viewing Key:
                </span>
                <input
                  type="text"
                  value={viewingKeyInput}
                  onChange={(e) => setViewingKeyInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-emerald-300 w-72"
                />
                <span className="text-slate-400">
                  (Grants read-only AES-256-GCM decryption for tax/audit reconciliation; cannot spend funds)
                </span>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="py-3 px-3">Record ID</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Counterparty (Viewing Key)</th>
                      <th className="py-3 px-3">Line Items / Memo</th>
                      <th className="py-3 px-3 text-right">Net USDC</th>
                      <th className="py-3 px-3 text-right">User Gas Paid</th>
                      <th className="py-3 px-3">GL Debit / Credit</th>
                      <th className="py-3 px-3">On-Chain Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {invoices.map((rec) => (
                      <tr key={rec.invoiceId} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          <Link
                            href={`/invoice/${encodeURIComponent(rec.invoiceId)}`}
                            className="hover:text-emerald-400 underline"
                          >
                            {rec.invoiceId}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {rec.recordType}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              rec.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : rec.status === 'REFUNDED'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {bookkeeperDecryptedMode ? (
                            <span className="text-white font-medium">
                              {rec.clientName} ({rec.clientReference})
                            </span>
                          ) : (
                            <span className="font-mono text-amber-300/80">
                              [ENCRYPTED: {rec.encryptedViewingNote.slice(0, 22)}...]
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate">
                          {bookkeeperDecryptedMode ? (
                            <span className="text-slate-300">
                              {rec.lineItems.map((l) => l.description).join('; ')}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">
                              Commitment: sha256:{rec.stealthCommitmentHash.slice(0, 16)}...
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          ${rec.totalAmountUsdc.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-300 font-mono">
                          $0.00
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {rec.recordType === 'AR_INVOICE'
                            ? '1010 Cash / 4000 Rev'
                            : '6100 Payroll / 1010 Cash'}
                        </td>
                        <td className="py-3 px-3">
                          <a
                            href={rec.settlementTxUrl || rec.creationTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono"
                          >
                            NearBlocks
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RELAYER WHITELIST & X402 INSPECTOR */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  NEP-366 Gasless Meta-Transaction Relayer Verification
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Track Requirement:{' '}
                  <em className="text-emerald-300">
                    &ldquo;Gasless for the freelancer: route their transactions through a meta transaction relayer that only pays for calls to our own contract.&rdquo;
                  </em>
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                  <div>
                    <span className="text-slate-400">Authorized Contract: </span>
                    <span className="text-emerald-400">
                      {testnetInfo?.contractAccountId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Relayer Signer: </span>
                    <span className="text-sky-400">
                      {testnetInfo?.relayerAccountId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Allowed Methods: </span>
                    <span className="text-slate-200">
                      {testnetInfo?.allowedRelayerMethods.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => handleTestRelayerPolicy('authorized')}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    Test Authorized Call (200 OK on Testnet)
                  </button>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => handleTestRelayerPolicy('unauthorized')}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition cursor-pointer"
                  >
                    Test Foreign Contract Call (403 Rejected)
                  </button>
                </div>

                {relayerTestLog && (
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {relayerTestLog}
                  </pre>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
                <h2 className="text-lg font-bold text-white">
                  PingPay x402 Agent Facilitator Endpoint
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every invoice on NearVeil automatically exposes an{' '}
                  <code className="text-indigo-300 font-mono">HTTP 402 Payment Required</code>{' '}
                  endpoint so AI agents can pay invoices autonomously in USDC on Base via PingPay, settling directly to the freelancer&apos;s NEAR Stealth Account.
                </p>
                {invoices[0] && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="text-slate-400">
                      Live x402 Paywall Route for {invoices[0].invoiceId}:
                    </div>
                    <a
                      href={`/api/x402/${encodeURIComponent(invoices[0].invoiceId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:underline font-mono font-semibold"
                    >
                      GET /api/x402/{invoices[0].invoiceId}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

