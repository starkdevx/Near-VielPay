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
  Users,
  FileText,
  Sparkles,
  Copy,
  Check,
  Terminal,
  AlertCircle,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  Wallet,
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
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [testnetInfo, setTestnetInfo] = useState<TestnetInfo | null>(null);
  const [invoices, setInvoices] = useState<NearVeilInvoice[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<PrivatePayrollBatch[]>([]);
  const [tokens, setTokens] = useState<OneClickTokenOption[]>([]);
  const [faucetBalance, setFaucetBalance] = useState<number>(25000);
  const [stealthClaimedBalance, setStealthClaimedBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
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
      description: 'Product Design & Frontend Architecture',
      quantity: 15,
      unitPriceUsd: 110,
    },
    {
      id: 'item-2',
      description: 'Payment Flow Setup & QA',
      quantity: 1,
      unitPriceUsd: 550,
    },
  ]);

  // Private Batch Payroll Form State
  const [companyName, setCompanyName] = useState<string>('NearVeil Labs');
  const [payPeriodLabel, setPayPeriodLabel] = useState<string>(
    'Nov 2026 · Bi-Weekly'
  );
  const [payrollOriginChain, setPayrollOriginChain] =
    useState<string>('NEAR Testnet');
  const [payrollOriginAsset, setPayrollOriginAsset] =
    useState<string>('USDC (NEAR Testnet)');
  const [payrollRecipients, setPayrollRecipients] = useState<
    PayrollRecipientInput[]
  >([
    {
      id: 'rec-1',
      contractorName: 'Elena Vance',
      roleOrDepartment: 'Core Engineering',
      referenceCode: 'EMP-101',
      amountUsdc: 3800,
    },
    {
      id: 'rec-2',
      contractorName: 'Marcus Chen',
      roleOrDepartment: 'Product Design',
      referenceCode: 'EMP-102',
      amountUsdc: 2600,
    },
    {
      id: 'rec-3',
      contractorName: 'Priya Nair',
      roleOrDepartment: 'Security & Audit',
      referenceCode: 'EMP-103',
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
      setToast({
        type: 'error',
        message: 'Could not connect to NEAR Testnet backend.',
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

  const arInvoices = invoices.filter((i) => i.recordType === 'AR_INVOICE');
  const paidInvoicesTotal = arInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.totalAmountUsdc, 0);
  const pendingInvoicesTotal = arInvoices
    .filter((i) => i.status === 'PENDING')
    .reduce((sum, i) => sum + i.totalAmountUsdc, 0);
  const payrollRecords = invoices.filter((i) => i.recordType === 'AP_PAYROLL');

  const handleCopyInvoiceLink = (invoiceId: string) => {
    const url = `${window.location.origin}/invoice/${encodeURIComponent(invoiceId)}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(invoiceId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Additional Deliverable',
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
    setToast(null);
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
      setShowCreateModal(false);
      setToast({
        type: 'success',
        message: `Invoice ${data.invoice.invoiceId} ($${data.invoice.totalAmountUsdc.toFixed(2)}) created with $0.00 gas!`,
        txUrl: data.invoice.creationTxUrl,
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickPayInvoice = async (inv: NearVeilInvoice) => {
    setBusyKey(`pay_${inv.invoiceId}`);
    setToast(null);
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
      setToast({
        type: 'success',
        message: `${inv.invoiceId} paid! $${inv.totalAmountUsdc.toFixed(2)} USDC settled on NEAR Testnet.`,
        txUrl: data.invoice.settlementTxUrl,
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickStealthClaim = async (inv: NearVeilInvoice) => {
    setBusyKey(`claim_${inv.invoiceId}`);
    setToast(null);
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
      setToast({
        type: 'success',
        message: `Claimed $${inv.totalAmountUsdc.toFixed(2)} USDC privately to your one-time wallet with $0.00 gas.`,
        txUrl: data.invoice.stealthClaimTxUrl,
      });
    } catch (err) {
      setToast({
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
    setToast(null);
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
      setToast({
        type: 'success',
        message: `Paid ${data.batch.recipientCount} team members ($${data.batch.totalAmountUsdc.toFixed(2)} USDC) privately in one transaction!`,
        txUrl: data.batch.fundingTxUrl,
      });
    } catch (err) {
      setToast({
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
      setToast({
        type: 'info',
        message: 'Added +$10,000.00 free Testnet USDC to your demo balance.',
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
      setRelayerTestLog(`HTTP ${res.status}\n${JSON.stringify(data, null, 2)}`);
    } finally {
      setBusyKey(null);
    }
  };

  const navItems = [
    { id: 'invoices' as const, label: 'Invoices', icon: FileText },
    { id: 'payroll' as const, label: 'Private Payroll', icon: Users },
    { id: 'accounting' as const, label: 'Bookkeeper & CSV', icon: FileSpreadsheet },
    { id: 'security' as const, label: 'Testnet & Security', icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0b] text-[#f4f1ea] flex flex-col lg:flex-row">
      {/* Left Sidebar — Warm Obsidian */}
      <aside className="lg:w-68 bg-[#121210] border-b lg:border-b-0 lg:border-r border-[#272622] flex flex-col justify-between shrink-0">
        <div className="p-5">
          {/* Brand */}
          <div className="flex items-center justify-between lg:justify-start gap-3 mb-7">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#d4b06a]/15 border border-[#d4b06a]/40 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#d4b06a]" />
              </div>
              <div>
                <div className="font-semibold text-base tracking-[-0.02em] text-[#f4f1ea] leading-none">
                  NearVeil
                </div>
                <div className="text-[11px] text-[#9c988c] mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#77b28c] inline-block" />
                  NEAR Testnet
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#1e1d1a] text-[#f4f1ea] font-medium border border-[#32302a]'
                      : 'text-[#9c988c] hover:bg-[#181815] hover:text-[#f4f1ea] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#d4b06a]' : 'text-[#736f65]'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Testnet Vault Card */}
        <div className="hidden lg:block p-4 m-4 rounded-xl bg-[#161614] border border-[#272622] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9c988c]">Demo USDC</span>
            <button
              type="button"
              onClick={handleMintFaucet}
              disabled={busyKey === 'faucet'}
              className="text-[#d4b06a] hover:text-[#e2c17d] font-medium cursor-pointer"
            >
              + Add $10k
            </button>
          </div>
          <div className="text-xl font-semibold text-[#f4f1ea] tabular-nums tracking-[-0.02em]">
            ${faucetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="pt-2.5 border-t border-[#272622] flex items-center justify-between text-xs">
            <span className="text-[#9c988c]">Private Claimed</span>
            <span className="font-medium text-[#77b28c] tabular-nums">
              ${stealthClaimedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-[#736f65] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#77b28c] shrink-0" />
            Gas fees sponsored ($0.00)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`mb-6 px-4 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                toast.type === 'success'
                  ? 'bg-[#141c17] border-[#2c4435] text-[#cde5d6]'
                  : toast.type === 'error'
                    ? 'bg-[#1f1414] border-[#4b2725] text-[#f0c7c3]'
                    : 'bg-[#1b1914] border-[#3b3423] text-[#eadbb8]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{toast.message}</span>
              </div>
              <div className="flex items-center gap-3">
                {toast.txUrl && (
                  <a
                    href={toast.txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#d4b06a] underline hover:opacity-80"
                  >
                    View Receipt
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="text-[#9c988c] hover:text-[#f4f1ea] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#f4f1ea]">
                    Invoices
                  </h1>
                  <p className="text-sm text-[#9c988c] mt-0.5">
                    Create an invoice and share the link. Clients pay in any token; you receive USDC with zero gas fees.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] font-semibold text-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Invoice
                </button>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#151513] rounded-xl border border-[#272622] p-5">
                  <div className="text-xs text-[#9c988c]">Collected (USDC)</div>
                  <div className="text-2xl font-semibold text-[#f4f1ea] mt-1.5 tabular-nums tracking-[-0.02em]">
                    ${paidInvoicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#77b28c] mt-1.5">
                    Settled 1:1 in USD
                  </div>
                </div>

                <div className="bg-[#151513] rounded-xl border border-[#272622] p-5">
                  <div className="text-xs text-[#9c988c]">Awaiting Payment</div>
                  <div className="text-2xl font-semibold text-[#f4f1ea] mt-1.5 tabular-nums tracking-[-0.02em]">
                    ${pendingInvoicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#d9a05b] mt-1.5">
                    {arInvoices.filter((i) => i.status === 'PENDING').length} open invoice(s)
                  </div>
                </div>

                <div className="bg-[#151513] rounded-xl border border-[#272622] p-5">
                  <div className="text-xs text-[#9c988c]">Gas Fees You Paid</div>
                  <div className="text-2xl font-semibold text-[#d4b06a] mt-1.5 tabular-nums tracking-[-0.02em]">
                    $0.00
                  </div>
                  <div className="text-xs text-[#736f65] mt-1.5">
                    Sponsored by NearVeil Relayer
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-[#151513] rounded-xl border border-[#272622] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#272622] flex items-center justify-between">
                  <h2 className="font-medium text-sm text-[#f4f1ea]">
                    Recent Invoices ({arInvoices.length})
                  </h2>
                  <span className="text-xs text-[#736f65]">
                    Click any invoice to preview client checkout
                  </span>
                </div>

                {loading ? (
                  <div className="p-10 text-center text-sm text-[#736f65]">
                    Loading invoices...
                  </div>
                ) : arInvoices.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm text-[#9c988c] mb-3">
                      No invoices yet. Create your first gasless invoice in seconds.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 rounded-lg bg-[#d4b06a] text-[#0c0c0b] text-sm font-semibold cursor-pointer"
                    >
                      + Create Invoice
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#22211d]">
                    {arInvoices.map((inv) => (
                      <div
                        key={inv.invoiceId}
                        className="p-5 hover:bg-[#1a1a17] transition flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Link
                              href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                              className="font-medium text-[#f4f1ea] hover:text-[#d4b06a] transition"
                            >
                              {inv.clientName}
                            </Link>
                            <span className="text-xs font-mono text-[#736f65]">
                              {inv.invoiceId}
                            </span>
                            {inv.status === 'PAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#17261d] text-[#77b28c] border border-[#2a4534] text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            )}
                            {inv.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#261f14] text-[#d9a05b] border border-[#42341d] text-xs font-medium">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                            {inv.status === 'REFUNDED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#281817] text-[#d97b73] border border-[#492826] text-xs font-medium">
                                <RefreshCcw className="w-3 h-3" />
                                Refunded
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#9c988c] flex flex-wrap items-center gap-2.5">
                            <span>Due {inv.dueDateUtc}</span>
                            <span className="text-[#4a4842]">·</span>
                            <span className="truncate max-w-md">
                              {inv.lineItems.map((l) => l.description).join(', ')}
                            </span>
                            {inv.settlementTxUrl && (
                              <>
                                <span className="text-[#4a4842]">·</span>
                                <a
                                  href={inv.settlementTxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#d4b06a] hover:underline"
                                >
                                  Receipt
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="text-right mr-2">
                            <div className="text-base font-semibold text-[#f4f1ea] tabular-nums">
                              ${inv.totalAmountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-[#736f65]">USDC</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyInvoiceLink(inv.invoiceId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2c2b26] bg-[#1c1c19] hover:bg-[#24231f] text-[#d5d0c5] text-xs font-medium transition cursor-pointer"
                          >
                            {copiedId === inv.invoiceId ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#77b28c]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#736f65]" />
                                Copy Link
                              </>
                            )}
                          </button>

                          <Link
                            href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#2c2b26] bg-[#1c1c19] hover:bg-[#24231f] text-[#d5d0c5] text-xs font-medium transition"
                          >
                            Open
                            <ArrowRight className="w-3.5 h-3.5 text-[#736f65]" />
                          </Link>

                          {inv.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={busyKey === `pay_${inv.invoiceId}`}
                              onClick={() => handleQuickPayInvoice(inv)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] text-xs font-semibold transition cursor-pointer"
                            >
                              {busyKey === `pay_${inv.invoiceId}`
                                ? 'Paying...'
                                : 'Test Pay'}
                            </button>
                          )}

                          {inv.status === 'PAID' && !inv.claimedToStealthWallet && (
                            <button
                              type="button"
                              disabled={busyKey === `claim_${inv.invoiceId}`}
                              onClick={() => handleQuickStealthClaim(inv)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#f4f1ea] hover:bg-white text-[#0c0c0b] text-xs font-semibold transition cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              {busyKey === `claim_${inv.invoiceId}`
                                ? 'Claiming...'
                                : 'Claim Privately'}
                            </button>
                          )}

                          {inv.claimedToStealthWallet && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1c19] border border-[#272622] text-[#9c988c] text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#77b28c]" />
                              Claimed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRIVATE PAYROLL */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#f4f1ea]">
                  Private Payroll
                </h1>
                <p className="text-sm text-[#9c988c] mt-0.5">
                  Pay your team in one click. Public blockchain observers only see one lump-sum deposit—individual salaries and wallets stay private.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleRunPrivatePayroll}
                  className="lg:col-span-7 bg-[#151513] rounded-xl border border-[#272622] p-6 space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#9c988c] mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea] focus:outline-none focus:border-[#d4b06a]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9c988c] mb-1.5">
                        Pay Period
                      </label>
                      <input
                        type="text"
                        required
                        value={payPeriodLabel}
                        onChange={(e) => setPayPeriodLabel(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea] focus:outline-none focus:border-[#d4b06a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9c988c] mb-1.5">
                      Funding Currency
                    </label>
                    <select
                      value={`${payrollOriginAsset}|${payrollOriginChain}`}
                      onChange={(e) => {
                        const [sym, ch] = e.target.value.split('|');
                        setPayrollOriginAsset(sym);
                        setPayrollOriginChain(ch);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea] focus:outline-none focus:border-[#d4b06a]"
                    >
                      {tokens.map((t) => (
                        <option key={t.assetId} value={`${t.symbol}|${t.chain}`}>
                          {t.symbol} ({t.chain})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9c988c]">
                        Team Members ({payrollRecipients.length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPayrollRecipients((prev) => [
                            ...prev,
                            {
                              id: `rec-${Date.now()}`,
                              contractorName: `Team Member #${prev.length + 1}`,
                              roleOrDepartment: 'Engineering',
                              referenceCode: `EMP-10${prev.length + 1}`,
                              amountUsdc: 2500,
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#d4b06a] hover:text-[#e2c17d] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Person
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {payrollRecipients.map((rec, idx) => (
                        <div
                          key={rec.id}
                          className="p-3 rounded-lg bg-[#11110f] border border-[#272622] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                        >
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
                            placeholder="Full Name"
                            className="sm:col-span-5 px-3 py-2 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-sm text-[#f4f1ea]"
                          />
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
                            placeholder="Role"
                            className="sm:col-span-4 px-3 py-2 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-sm text-[#9c988c]"
                          />
                          <div className="sm:col-span-3 relative">
                            <span className="absolute left-3 top-2 text-sm text-[#736f65]">
                              $
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
                              className="w-full pl-7 pr-3 py-2 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-sm font-semibold text-[#f4f1ea] tabular-nums"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#272622] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#9c988c]">Total Payroll Run</div>
                      <div className="text-2xl font-semibold text-[#f4f1ea] tabular-nums tracking-[-0.02em]">
                        ${payrollTotalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-sm font-normal text-[#9c988c]">USDC</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busyKey === 'run_payroll'}
                      className="px-6 py-3 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      {busyKey === 'run_payroll'
                        ? 'Processing Private Run...'
                        : 'Pay Team Privately'}
                    </button>
                  </div>
                </form>

                {/* Completed Payroll Runs & Employee Claim Cards */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#151513] rounded-xl border border-[#272622] p-5 space-y-3">
                    <h2 className="font-medium text-sm text-[#f4f1ea]">
                      Recent Payroll Runs ({payrollBatches.length})
                    </h2>

                    {payrollBatches.length === 0 ? (
                      <p className="text-xs text-[#736f65] py-4">
                        No payroll runs yet. Click &ldquo;Pay Team Privately&rdquo; to execute your first confidential payroll batch on NEAR Testnet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {payrollBatches.map((batch) => (
                          <div
                            key={batch.batchId}
                            className="p-3.5 rounded-lg bg-[#11110f] border border-[#272622] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-[#f4f1ea]">
                                {batch.payPeriodLabel}
                              </span>
                              <span className="font-semibold text-sm text-[#d4b06a] tabular-nums">
                                ${batch.totalAmountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[#9c988c]">
                              <span>{batch.recipientCount} team members shielded</span>
                              <a
                                href={batch.fundingTxUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#d4b06a] hover:underline"
                              >
                                Receipt
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {payrollRecords.length > 0 && (
                    <div className="bg-[#151513] rounded-xl border border-[#272622] p-5 space-y-3">
                      <h3 className="font-medium text-sm text-[#f4f1ea]">
                        Employee Private Claims ({payrollRecords.length})
                      </h3>
                      <div className="space-y-2.5">
                        {payrollRecords.map((slip) => (
                          <div
                            key={slip.invoiceId}
                            className="p-3 rounded-lg bg-[#11110f] border border-[#272622] flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-medium text-sm text-[#f4f1ea]">
                                {slip.clientName}
                              </div>
                              <div className="text-xs text-[#9c988c] tabular-nums">
                                ${slip.totalAmountUsdc.toFixed(2)} USDC
                              </div>
                            </div>

                            {slip.claimedToStealthWallet ? (
                              <a
                                href={slip.stealthClaimTxUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#17261d] text-[#77b28c] text-xs font-medium"
                              >
                                Claimed
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled={busyKey === `claim_${slip.invoiceId}`}
                                onClick={() => handleQuickStealthClaim(slip)}
                                className="px-3 py-1.5 rounded-md bg-[#f4f1ea] hover:bg-white text-[#0c0c0b] text-xs font-semibold cursor-pointer"
                              >
                                {busyKey === `claim_${slip.invoiceId}`
                                  ? 'Claiming...'
                                  : 'Claim (0 Gas)'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BOOKKEEPER & CSV */}
          {activeTab === 'accounting' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#f4f1ea]">
                    Bookkeeper &amp; Tax Exports
                  </h1>
                  <p className="text-sm text-[#9c988c] mt-0.5">
                    Clean spreadsheets your accountant can import into QuickBooks or Xero without asking a single question.
                  </p>
                </div>

                <a
                  href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(
                    viewingKeyInput || testnetInfo?.defaultViewingKey || ''
                  )}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] font-semibold text-sm transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download Accountant CSV
                </a>
              </div>

              <div className="bg-[#151513] rounded-xl border border-[#272622] p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-[#9c988c]">
                    Bookkeeper Viewing Key:
                  </span>
                  <input
                    type="text"
                    value={viewingKeyInput}
                    onChange={(e) => setViewingKeyInput(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] font-mono text-xs text-[#d4b06a] w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBookkeeperDecryptedMode(!bookkeeperDecryptedMode)
                  }
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    bookkeeperDecryptedMode
                      ? 'bg-[#17261d] border-[#2a4534] text-[#77b28c]'
                      : 'bg-[#1c1c19] border-[#2c2b26] text-[#9c988c]'
                  }`}
                >
                  {bookkeeperDecryptedMode ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Accountant View (Decrypted)
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Public Blockchain View (Encrypted)
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#151513] rounded-xl border border-[#272622] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#11110f] text-[#9c988c] border-b border-[#272622]">
                      <tr>
                        <th className="py-3.5 px-4 font-medium">ID</th>
                        <th className="py-3.5 px-4 font-medium">Category</th>
                        <th className="py-3.5 px-4 font-medium">Status</th>
                        <th className="py-3.5 px-4 font-medium">Client / Recipient</th>
                        <th className="py-3.5 px-4 font-medium text-right">Amount (USD)</th>
                        <th className="py-3.5 px-4 font-medium text-right">Gas Paid</th>
                        <th className="py-3.5 px-4 font-medium">GL Account</th>
                        <th className="py-3.5 px-4 font-medium">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22211d]">
                      {invoices.map((rec) => (
                        <tr key={rec.invoiceId} className="hover:bg-[#1a1a17]">
                          <td className="py-3.5 px-4 font-mono font-medium text-[#f4f1ea]">
                            <Link
                              href={`/invoice/${encodeURIComponent(rec.invoiceId)}`}
                              className="hover:text-[#d4b06a] underline"
                            >
                              {rec.invoiceId}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-[#9c988c]">
                            {rec.recordType === 'AR_INVOICE' ? 'Invoice Income' : 'Private Payroll'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium ${
                                rec.status === 'PAID'
                                  ? 'bg-[#17261d] text-[#77b28c]'
                                  : rec.status === 'REFUNDED'
                                    ? 'bg-[#281817] text-[#d97b73]'
                                    : 'bg-[#261f14] text-[#d9a05b]'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {bookkeeperDecryptedMode ? (
                              <span className="font-medium text-[#f4f1ea]">
                                {rec.clientName}
                              </span>
                            ) : (
                              <span className="font-mono text-[#736f65]">
                                [Encrypted: {rec.encryptedViewingNote.slice(0, 18)}...]
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#f4f1ea] tabular-nums">
                            ${rec.totalAmountUsdc.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#77b28c] tabular-nums">
                            $0.00
                          </td>
                          <td className="py-3.5 px-4 text-[#9c988c]">
                            {rec.recordType === 'AR_INVOICE'
                              ? '1010 Cash / 4000 Revenue'
                              : '6100 Payroll / 1010 Cash'}
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={rec.settlementTxUrl || rec.creationTxUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#d4b06a] hover:underline"
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

          {/* TAB 4: TESTNET & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#f4f1ea]">
                  NEAR Testnet &amp; Relayer Security
                </h1>
                <p className="text-sm text-[#9c988c] mt-0.5">
                  Technical verification tools for judges: inspect live Testnet contracts, test our strict Relayer allowlist, and view the PingPay x402 endpoint.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#151513] rounded-xl border border-[#272622] p-6 space-y-4">
                  <h2 className="font-medium text-base text-[#f4f1ea] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#d4b06a]" />
                    Gasless Meta-Transaction Relayer Guard
                  </h2>
                  <p className="text-xs text-[#9c988c] leading-relaxed">
                    Our relayer sponsors gas <strong className="text-[#f4f1ea]">only</strong> for whitelisted calls to our own NearVeil contract. Any attempt to call another contract is rejected with HTTP 403.
                  </p>

                  <div className="p-3.5 rounded-lg bg-[#0e0e0d] border border-[#272622] text-xs font-mono space-y-1.5">
                    <div>
                      <span className="text-[#736f65]">Vault Contract: </span>
                      <a
                        href={`${testnetInfo?.explorerBaseUrl}/address/${testnetInfo?.contractAccountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#d4b06a] hover:underline"
                      >
                        {testnetInfo?.contractAccountId}
                      </a>
                    </div>
                    <div>
                      <span className="text-[#736f65]">Relayer Account: </span>
                      <a
                        href={`${testnetInfo?.explorerBaseUrl}/address/${testnetInfo?.relayerAccountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#77b28c] hover:underline"
                      >
                        {testnetInfo?.relayerAccountId}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => handleTestRelayerPolicy('authorized')}
                      className="py-2.5 px-3 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] font-semibold text-xs transition cursor-pointer"
                    >
                      Test Allowed Contract (200 OK)
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => handleTestRelayerPolicy('unauthorized')}
                      className="py-2.5 px-3 rounded-lg bg-[#281817] hover:bg-[#341f1e] border border-[#492826] text-[#d97b73] font-semibold text-xs transition cursor-pointer"
                    >
                      Test Foreign Contract (403)
                    </button>
                  </div>

                  {relayerTestLog && (
                    <pre className="p-3.5 rounded-lg bg-[#0c0c0b] border border-[#272622] text-[#d4b06a] text-xs font-mono overflow-x-auto">
                      {relayerTestLog}
                    </pre>
                  )}
                </div>

                <div className="bg-[#151513] rounded-xl border border-[#272622] p-6 space-y-4">
                  <h2 className="font-medium text-base text-[#f4f1ea] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#d4b06a]" />
                    PingPay x402 Agent Paywall
                  </h2>
                  <p className="text-xs text-[#9c988c] leading-relaxed">
                    Every invoice exposes an <code className="font-mono text-[#d4b06a]">HTTP 402</code> endpoint so AI agents can pay in USDC on Base via PingPay and settle on NEAR.
                  </p>
                  {invoices[0] && (
                    <div className="p-4 rounded-lg bg-[#0e0e0d] border border-[#272622] text-xs space-y-2">
                      <div className="text-[#9c988c]">
                        Live x402 Endpoint for {invoices[0].invoiceId}:
                      </div>
                      <a
                        href={`/api/x402/${encodeURIComponent(invoices[0].invoiceId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#d4b06a] hover:underline font-mono font-medium"
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
        </div>
      </div>

      {/* Modal for Creating a New Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151513] rounded-xl border border-[#2c2b26] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#272622] flex items-center justify-between sticky top-0 bg-[#151513]">
              <div>
                <h2 className="font-semibold text-lg text-[#f4f1ea]">New Invoice</h2>
                <p className="text-xs text-[#9c988c]">
                  Sent with $0.00 gas fees · Paid in USDC
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-[#9c988c] hover:text-[#f4f1ea] hover:bg-[#1e1d1a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGaslessInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-[#9c988c] mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c988c] mb-1">
                    PO / Reference #
                  </label>
                  <input
                    type="text"
                    value={clientReference}
                    onChange={(e) => setClientReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs text-[#9c988c] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDateUtc}
                    onChange={(e) => setDueDateUtc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-xs text-[#f4f1ea]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c988c] mb-1">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-sm text-[#f4f1ea]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c988c] mb-1">
                    Your Name / ID
                  </label>
                  <input
                    type="text"
                    value={freelancerAccount}
                    onChange={(e) => setFreelancerAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0e0d] border border-[#2c2b26] text-xs text-[#f4f1ea]"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#9c988c]">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#d4b06a] hover:text-[#e2c17d] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#11110f] border border-[#272622] space-y-2"
                  >
                    <div className="flex items-center gap-2">
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
                        placeholder="Item description"
                        className="w-full px-2.5 py-1.5 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-xs text-[#f4f1ea]"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-[#736f65] hover:text-[#d97b73] p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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
                        placeholder="Qty"
                        className="px-2.5 py-1.5 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-xs text-[#f4f1ea]"
                      />
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
                        placeholder="Price ($)"
                        className="px-2.5 py-1.5 rounded-md bg-[#1a1a17] border border-[#2c2b26] text-xs text-[#f4f1ea]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#272622] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9c988c]">Invoice Total</div>
                  <div className="text-xl font-semibold text-[#f4f1ea] tabular-nums">
                    ${invoiceTotal.toFixed(2)} USDC
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyKey === 'create_invoice'}
                  className="px-5 py-2.5 rounded-lg bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0c0c0b] font-semibold text-sm transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {busyKey === 'create_invoice'
                    ? 'Creating...'
                    : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
