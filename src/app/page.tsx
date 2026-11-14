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
  AlertCircle,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  Wallet,
  Coins,
  Zap,
  ArrowUpRight,
  LogOut,
  Building2,
  UserCheck,
} from 'lucide-react';
import { NearVeilLogo, ChainDot } from '@/components/BrandMark';
import { useNearWallet } from '@/components/WalletProvider';
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
  const {
    accountId,
    stealthMetaAddress,
    isConnected,
    connect,
    disconnect,
    deriveClientStealthMeta,
  } = useNearWallet();

  const [viewRole, setViewRole] = useState<'employer' | 'employee'>('employer');
  const [activeTab, setActiveTab] = useState<
    'invoices' | 'payroll' | 'accounting'
  >('invoices');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [newlyCreatedInvoice, setNewlyCreatedInvoice] = useState<NearVeilInvoice | null>(null);
  const [myCreatedInvoiceIds, setMyCreatedInvoiceIds] = useState<string[]>([]);
  const [showAllInvoices, setShowAllInvoices] = useState<boolean>(false);
  const [showAllEmployeeSlips, setShowAllEmployeeSlips] = useState<boolean>(true);
  const [guestEmployeeId, setGuestEmployeeId] = useState<string>('EMP-101');
  const [guestMetaAddress, setGuestMetaAddress] = useState<string>('');

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nearveil_my_invoices');
      if (saved) {
        setMyCreatedInvoiceIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

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
      setViewingKeyInput((prev) => prev || data.testnetInfo?.defaultViewingKey || '');
    } catch {
      setToast({
        type: 'error',
        message: 'Could not connect to NEAR Testnet backend.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (accountId) {
      setFreelancerAccount(accountId);
    }
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    deriveClientStealthMeta(guestEmployeeId || 'EMP-101').then((meta) => {
      if (!cancelled) setGuestMetaAddress(meta);
    });
    return () => {
      cancelled = true;
    };
  }, [guestEmployeeId, deriveClientStealthMeta]);

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
  const userInvoices = arInvoices.filter((inv) => {
    if (myCreatedInvoiceIds.includes(inv.invoiceId)) return true;
    if (accountId && inv.freelancerAccount?.toLowerCase() === accountId.toLowerCase()) return true;
    return false;
  });
  const displayedInvoices = showAllInvoices ? arInvoices : userInvoices;

  const paidInvoicesTotal = displayedInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.totalAmountUsdc, 0);
  const pendingInvoicesTotal = displayedInvoices
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
      const createdInv = data.invoice;
      const updatedIds = [
        createdInv.invoiceId,
        ...myCreatedInvoiceIds.filter((id) => id !== createdInv.invoiceId),
      ];
      setMyCreatedInvoiceIds(updatedIds);
      try {
        localStorage.setItem('nearveil_my_invoices', JSON.stringify(updatedIds));
      } catch {
        // ignore
      }
      setNewlyCreatedInvoice(createdInv);
      setShowShareModal(true);
      setToast({
        type: 'success',
        message: `Invoice ${createdInv.invoiceId} ($${createdInv.totalAmountUsdc.toFixed(2)}) created with $0.00 gas!`,
        txUrl: createdInv.creationTxUrl,
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
          employerAccountId: accountId || undefined,
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

  const navItems = [
    { id: 'invoices' as const, label: 'Invoices', icon: FileText },
    { id: 'payroll' as const, label: 'Private Payroll', icon: Users },
    { id: 'accounting' as const, label: 'Bookkeeper & CSV', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="lg:w-60 bg-[#11110f]/95 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-[#272622] flex flex-col justify-between shrink-0">
        <div className="p-4 lg:p-5">
          <div className="mb-6 lg:mb-7">
            <NearVeilLogo />
          </div>

          {viewRole === 'employer' ? (
            <>
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#6d695f] mb-2 px-3 hidden lg:block">
                Employer Workspace
              </div>

              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#1d1c18] text-[#f5f2eb] font-medium border border-[#d4b06a]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                          : 'text-[#8e8a7f] hover:bg-[#171714] hover:text-[#f5f2eb] border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-[#d4b06a]' : 'text-[#6d695f]'
                        }`}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </>
          ) : (
            <div className="px-3 py-3 rounded-xl bg-[#151714] border border-[#77b28c]/25 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#77b28c]">
                Employee Portal
              </div>
              <p className="text-xs text-[#8e8a7f] leading-relaxed">
                Share your Stealth Meta-Address once during onboarding. Paychecks arrive automatically—no claim step needed.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Testnet Vault Card */}
        <div className="hidden lg:block p-3.5 m-3.5 rounded-2xl vault-card-glow-gold space-y-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/50 to-transparent" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a39f93] flex items-center gap-1.5 font-medium">
              <Coins className="w-3.5 h-3.5 text-[#d4b06a]" />
              Testnet USDC
            </span>
            <button
              type="button"
              onClick={handleMintFaucet}
              disabled={busyKey === 'faucet'}
              className="px-2 py-0.5 rounded-lg bg-[#d4b06a]/15 border border-[#d4b06a]/30 text-[#e2c17d] hover:bg-[#d4b06a]/25 text-[11px] font-mono tracking-wider cursor-pointer transition"
            >
              + Mint $10k
            </button>
          </div>
          <div className="text-2xl font-serif text-gradient-gold tabular-nums tracking-tight">
            ${faucetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="pt-2.5 border-t border-[#2e2b24] flex items-center justify-between text-xs">
            <span className="text-[#8e8a7f]">Private Claimed</span>
            <span className="font-semibold text-gradient-emerald tabular-nums">
              ${stealthClaimedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-[#8e8a7f] flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#d4b06a] shrink-0" />
            Gas fees sponsored ($0.00)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar: Role Switcher & Wallet Adapter */}
        <header className="sticky top-0 z-30 border-b border-[#2e2c26] bg-[#0c0c0a]/92 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
            {/* Role Switcher: Employer vs Employee View */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-[#141412] border border-[#2c2b24] flex items-center gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewRole('employer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewRole === 'employer'
                      ? 'bg-[#221f17] text-[#f5ecd5] border border-[#d4b06a]/50 shadow-[0_0_15px_rgba(212,176,106,0.25)]'
                      : 'text-[#8e8a7f] hover:text-[#f5f2eb] border border-transparent'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#d4b06a]" />
                  Employer View
                </button>
                <button
                  type="button"
                  onClick={() => setViewRole('employee')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewRole === 'employee'
                      ? 'bg-[#132219] text-[#e4f7eb] border border-[#34d399]/50 shadow-[0_0_15px_rgba(52,211,153,0.25)]'
                      : 'text-[#8e8a7f] hover:text-[#f5f2eb] border border-transparent'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#34d399]" />
                  Employee View
                </button>
              </div>
            </div>

            {/* Right: NEAR Testnet Badge + Wallet Connect */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141411] border border-[#2d2c25] text-[11px] font-mono text-[#a39f93] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                NEAR Testnet
              </span>

              {isConnected && accountId ? (
                <div className="pl-3 pr-1.5 py-1 rounded-xl bg-[#171612] border border-[#d4b06a]/40 shadow-[0_0_18px_-3px_rgba(212,176,106,0.25)] flex items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                    <span className="text-xs font-mono text-[#f5f2eb] max-w-[160px] truncate">
                      {accountId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={disconnect}
                    title="Disconnect Wallet"
                    className="p-1.5 rounded-lg text-[#8e8a7f] hover:text-[#f87171] hover:bg-[#2a1717] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f5dfa8] via-[#d4b06a] to-[#a87d2a] hover:from-[#fae8b8] hover:to-[#be913b] text-[#0a0a09] text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(212,176,106,0.35)] hover:shadow-[0_0_26px_rgba(212,176,106,0.5)] transition-all cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Connect NEAR Wallet
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 lg:py-9">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`mb-6 px-4 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm ${
                toast.type === 'success'
                  ? 'bg-[#141e18]/90 border-[#2c4435] text-[#cde5d6]'
                  : toast.type === 'error'
                    ? 'bg-[#211515]/90 border-[#4b2725] text-[#f0c7c3]'
                    : 'bg-[#1c1a14]/90 border-[#3b3423] text-[#eadbb8]'
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
                  className="text-[#8e8a7f] hover:text-[#f5f2eb] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: INVOICES */}
          {viewRole === 'employer' && activeTab === 'invoices' && (
            <div className="space-y-7">
              {/* Editorial Header */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="badge-gold-glow px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.16em] inline-flex items-center gap-1.5 mb-2">
                    <Shield className="w-3.5 h-3.5 text-[#d4b06a]" />
                    Accounts Receivable · Gasless
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-gradient-gold">
                    Client Invoices
                  </h1>
                  <p className="text-sm text-[#9c978b] mt-1.5 max-w-xl">
                    Clients pay from any chain; you receive exact USDC on NEAR with zero gas fees.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f3d99d] via-[#d4b06a] to-[#b38531] hover:from-[#fae8b8] hover:to-[#c6973f] text-[#0a0a09] font-bold text-sm shadow-[0_0_22px_rgba(212,176,106,0.3)] hover:shadow-[0_0_28px_rgba(212,176,106,0.5)] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Invoice
                </button>
              </div>

              {/* 3 Visual KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="vault-card-glow-emerald rounded-2xl p-5 flex items-start justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#34d399]/60 to-transparent" />
                  <div>
                    <div className="text-xs text-[#a39f93] uppercase tracking-wider font-mono">Collected (USDC)</div>
                    <div className="text-3xl sm:text-4xl font-serif text-gradient-emerald mt-2 tabular-nums">
                      ${paidInvoicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-[#34d399] mt-2.5 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Settled 1:1 in USD
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-[#14261c] border border-[#2d523c] flex items-center justify-center text-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>

                <div className="vault-card-glow-gold rounded-2xl p-5 flex items-start justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
                  <div>
                    <div className="text-xs text-[#a39f93] uppercase tracking-wider font-mono">Awaiting Payment</div>
                    <div className="text-3xl sm:text-4xl font-serif text-gradient-amber mt-2 tabular-nums">
                      ${pendingInvoicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-[#fbbf24] mt-2.5 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {arInvoices.filter((i) => i.status === 'PENDING').length} open invoice(s)
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-[#282114] border border-[#524122] flex items-center justify-center text-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>

                <div className="vault-card-glow-indigo rounded-2xl p-5 flex items-start justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#818cf8]/60 to-transparent" />
                  <div>
                    <div className="text-xs text-[#a39f93] uppercase tracking-wider font-mono">Gas Fees You Paid</div>
                    <div className="text-3xl sm:text-4xl font-serif text-gradient-purple mt-2 tabular-nums">
                      $0.00
                    </div>
                    <div className="text-xs text-[#c084fc] mt-2.5 flex items-center gap-1.5 font-medium">
                      <Zap className="w-3.5 h-3.5 text-[#c084fc]" />
                      Sponsored by Relayer
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-[#1c182b] border border-[#3b325c] flex items-center justify-center text-[#c084fc] shadow-[0_0_12px_rgba(192,132,252,0.2)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Clean 3-Step Visual Strip */}
              <div className="vault-card-subtle rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#9c978b] border border-[#272620]">
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-[#1e1d17] border border-[#d4b06a]/40 text-[#f5dfa8] font-mono text-[11px] font-semibold flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <span>Create &amp; share invoice link</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5e5b51] hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-[#1e1d17] border border-[#d4b06a]/40 text-[#f5dfa8] font-mono text-[11px] font-semibold flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <span>Client pays in SOL, Base, ETH, or NEAR</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#5e5b51] hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-[#16241b] border border-[#34d399]/40 text-[#a7f3d0] font-mono text-[11px] font-semibold flex items-center justify-center shadow-sm">
                    3
                  </span>
                  <span>Sweep USDC privately with $0 gas</span>
                </div>
              </div>

              {/* Invoices List */}
              <div className="vault-card rounded-2xl overflow-hidden border border-[#2e2c26] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]">
                <div className="px-6 py-4 border-b border-[#262520] bg-gradient-to-r from-[#171614] via-[#141412] to-[#171614] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-sm text-gradient-gold">
                      My Invoices ({displayedInvoices.length})
                    </h2>
                    {arInvoices.length > userInvoices.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllInvoices(!showAllInvoices)}
                        className="text-[11px] text-[#a39f93] hover:text-[#f5f2eb] underline cursor-pointer"
                      >
                        {showAllInvoices
                          ? 'Show Only My Invoices'
                          : `Show Demo Invoices (${arInvoices.length})`}
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-[#8e8a7f] font-mono">
                    Share invoice link with client to receive payment
                  </span>
                </div>

                {loading ? (
                  <div className="p-10 text-center text-sm text-[#6d695f]">
                    Loading invoices...
                  </div>
                ) : displayedInvoices.length === 0 ? (
                  <div className="p-12 text-center max-w-md mx-auto space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#1c1a14] border border-[#3b3423] text-[#d4b06a] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,176,106,0.15)]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-[#f5f2eb]">
                        No Invoices Created Yet
                      </h3>
                      <p className="text-xs text-[#8e8a7f] mt-1.5 leading-relaxed">
                        Create an invoice and send the link to your client. They can open it to pay you directly from their wallet on any chain with zero gas fees.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f3d99d] via-[#d4b06a] to-[#b38531] text-[#0a0a09] text-xs font-bold shadow-[0_0_18px_rgba(212,176,106,0.3)] transition cursor-pointer"
                      >
                        + Create First Invoice
                      </button>
                      {arInvoices.length > 0 && !showAllInvoices && (
                        <button
                          type="button"
                          onClick={() => setShowAllInvoices(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#1a1a17] hover:bg-[#22211d] border border-[#2e2c26] text-[#d5d0c5] text-xs font-medium transition cursor-pointer"
                        >
                          View Demo Invoices ({arInvoices.length})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#22211d]">
                    {displayedInvoices.map((inv) => (
                      <div
                        key={inv.invoiceId}
                        className="p-5 hover:bg-[#1a1a17]/80 transition-colors flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Link
                              href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                              className="font-semibold text-[#f5f2eb] hover:text-[#d4b06a] transition inline-flex items-center gap-1"
                            >
                              {inv.clientName}
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#6d695f]" />
                            </Link>
                            <span className="text-[11px] font-mono text-[#736f65] bg-[#1a1a17] px-2 py-0.5 rounded border border-[#272622]">
                              {inv.invoiceId}
                            </span>
                            {inv.status === 'PAID' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#17261d] text-[#77b28c] border border-[#2a4534] text-xs font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#77b28c]" />
                                Paid &amp; Settled
                              </span>
                            )}
                            {inv.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#261f14] text-[#d9a05b] border border-[#42341d] text-xs font-medium">
                                <Clock className="w-3 h-3 text-[#d9a05b]" />
                                Awaiting Client Payment
                              </span>
                            )}
                            {inv.status === 'REFUNDED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#281817] text-[#d97b73] border border-[#492826] text-xs font-medium">
                                <RefreshCcw className="w-3 h-3" />
                                Refunded
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#8e8a7f] flex flex-wrap items-center gap-2.5">
                            <span>Due {inv.dueDateUtc}</span>
                            <span className="text-[#3e3c36]">·</span>
                            <span className="truncate max-w-md">
                              {inv.lineItems.map((l) => l.description).join(', ')}
                            </span>
                            {inv.settlementTxUrl && (
                              <>
                                <span className="text-[#3e3c36]">·</span>
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
                            <div className="text-lg font-serif text-[#f5f2eb] tabular-nums">
                              ${inv.totalAmountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6d695f]">
                              USDC
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyInvoiceLink(inv.invoiceId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2c2b26] bg-[#1a1a17] hover:bg-[#23221e] text-[#d5d0c5] text-xs font-medium transition cursor-pointer"
                          >
                            {copiedId === inv.invoiceId ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#77b28c]" />
                                Copied Link
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#736f65]" />
                                Share Link
                              </>
                            )}
                          </button>

                          <Link
                            href={`/invoice/${encodeURIComponent(inv.invoiceId)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#2c2b26] bg-[#1a1a17] hover:bg-[#23221e] text-[#d5d0c5] text-xs font-medium transition"
                          >
                            Open
                            <ArrowRight className="w-3.5 h-3.5 text-[#736f65]" />
                          </Link>

                          {inv.status === 'PAID' && !inv.claimedToStealthWallet && (
                            <button
                              type="button"
                              disabled={busyKey === `claim_${inv.invoiceId}`}
                              onClick={() => handleQuickStealthClaim(inv)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#f5f2eb] hover:bg-white text-[#0a0a09] text-xs font-semibold transition cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              {busyKey === `claim_${inv.invoiceId}`
                                ? 'Claiming...'
                                : 'Sweep Privately ($0 Gas)'}
                            </button>
                          )}

                          {inv.claimedToStealthWallet && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a1a17] border border-[#272622] text-[#8e8a7f] text-xs">
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
          {viewRole === 'employer' && activeTab === 'payroll' && (
            <div className="space-y-6">
              <div>
                <div className="badge-gold-glow px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.16em] inline-flex items-center gap-1.5 mb-2">
                  <Lock className="w-3.5 h-3.5 text-[#d4b06a]" />
                  Confidential Settlement · Auto-Disburse
                </div>
                <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-gradient-gold">
                  Private Payroll
                </h1>
                <p className="text-sm text-[#9c978b] mt-1.5 max-w-xl">
                  Pay your team in one pooled deposit. Individual salaries and wallets stay hidden from public block explorers with zero claim steps.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleRunPrivatePayroll}
                  className="lg:col-span-7 vault-card-glow-gold rounded-2xl p-6 space-y-5 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#a39f93] mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d0c] border border-[#2e2d27] text-sm text-[#f5f2eb] focus:outline-none focus:border-[#d4b06a] focus:ring-1 focus:ring-[#d4b06a]/30 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a39f93] mb-1.5">
                        Pay Period
                      </label>
                      <input
                        type="text"
                        required
                        value={payPeriodLabel}
                        onChange={(e) => setPayPeriodLabel(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d0c] border border-[#2e2d27] text-sm text-[#f5f2eb] focus:outline-none focus:border-[#d4b06a] focus:ring-1 focus:ring-[#d4b06a]/30 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a39f93] mb-1.5">
                      Funding Currency
                    </label>
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0d0d0c] border border-[#2e2d27] text-sm text-[#f5f2eb]">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#34d399] ring-4 ring-[#34d399]/25" />
                        <span className="font-semibold">USDC</span>
                        <span className="text-xs text-[#8e8a7f]">(NEAR Testnet)</span>
                      </div>
                      <span className="text-xs text-[#34d399] font-mono font-medium">1:1 USD</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a39f93]">
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
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e2c17d] hover:text-[#fae8b8] transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Person
                      </button>
                    </div>

                    <div className="space-y-3">
                      {payrollRecipients.map((rec, idx) => (
                        <div
                          key={rec.id}
                          className="p-3.5 rounded-xl bg-[#11110f] border border-[#2c2b24] hover:border-[#d4b06a]/40 space-y-2.5 transition shadow-sm"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
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
                              className="sm:col-span-5 px-3 py-2 rounded-lg bg-[#181815] border border-[#2c2b26] text-sm text-[#f5f2eb] focus:outline-none focus:border-[#d4b06a]"
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
                              className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#181815] border border-[#2c2b26] text-sm text-[#8e8a7f] focus:outline-none focus:border-[#d4b06a]"
                            />
                            <div className="sm:col-span-3 flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-2 text-sm text-[#6d695f]">
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
                                  className="w-full pl-7 pr-2.5 py-2 rounded-lg bg-[#181815] border border-[#2c2b26] text-sm font-semibold text-[#f5f2eb] tabular-nums focus:outline-none focus:border-[#d4b06a]"
                                />
                              </div>
                              {payrollRecipients.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPayrollRecipients((prev) =>
                                      prev.filter((r) => r.id !== rec.id)
                                    )
                                  }
                                  title="Remove member"
                                  className="p-2 rounded-lg text-[#6d695f] hover:text-[#f87171] hover:bg-[#2b1717] transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={rec.stealthMetaAddress || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPayrollRecipients((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, stealthMetaAddress: val } : r
                                  )
                                );
                              }}
                              placeholder="Employee Stealth Meta-Address (nv_meta_... — optional, auto-derived if blank)"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d0d0c] border border-[#262520] text-xs font-mono text-[#e2c17d] placeholder:text-[#57544c] focus:outline-none focus:border-[#d4b06a]"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const meta = await deriveClientStealthMeta(
                                  rec.referenceCode || rec.contractorName || rec.id
                                );
                                setPayrollRecipients((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, stealthMetaAddress: meta } : r
                                  )
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#1c1b16] hover:bg-[#27251e] border border-[#d4b06a]/30 text-[11px] font-mono text-[#f5dfa8] cursor-pointer shrink-0 transition"
                            >
                              Auto-Fill
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#2a2822] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#8e8a7f] uppercase tracking-wider font-mono">Total Payroll Run</div>
                      <div className="text-4xl font-serif text-gradient-gold tabular-nums mt-1">
                        ${payrollTotalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-sm font-sans text-[#8e8a7f] font-normal">USDC</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busyKey === 'run_payroll'}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f3d99d] via-[#d4b06a] to-[#b38531] hover:from-[#fae8b8] hover:to-[#c6973f] text-[#0a0a09] font-bold text-sm shadow-[0_0_24px_rgba(212,176,106,0.35)] hover:shadow-[0_0_30px_rgba(212,176,106,0.5)] transition flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      {busyKey === 'run_payroll'
                        ? 'Auto-Disbursing Payroll...'
                        : 'Pay Team Privately (Auto-Disburse)'}
                    </button>
                  </div>
                </form>

                {/* Completed Payroll Runs & Employee Claim Cards */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="vault-card rounded-2xl p-5 space-y-3 border border-[#2e2d26]">
                    <h2 className="font-semibold text-sm text-gradient-gold">
                      Recent Payroll Runs ({payrollBatches.length})
                    </h2>

                    {payrollBatches.length === 0 ? (
                      <p className="text-xs text-[#6d695f] py-4">
                        No payroll runs yet. Click &ldquo;Pay Team Privately&rdquo; to execute your first confidential payroll batch on NEAR Testnet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {payrollBatches.map((batch) => (
                          <div
                            key={batch.batchId}
                            className="p-3.5 rounded-xl bg-[#11110e] border border-[#272622] hover:border-[#d4b06a]/40 space-y-1.5 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-[#f5f2eb]">
                                {batch.payPeriodLabel}
                              </span>
                              <span className="font-serif text-base text-gradient-gold tabular-nums font-semibold">
                                ${batch.totalAmountUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[#8e8a7f]">
                              <span className="flex items-center gap-1.5">
                                <ChainDot chain={batch.fundingOriginChain} />
                                {batch.recipientCount} team members shielded
                              </span>
                              <a
                                href={batch.fundingTxUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#e2c17d] hover:text-[#fae8b8] hover:underline"
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
                    <div className="vault-card-glow-emerald rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-gradient-emerald">
                          Auto-Disbursed Payouts ({payrollRecords.length})
                        </h3>
                        <span className="badge-emerald-glow px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider">
                          Zero Claim Needed
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {payrollRecords.map((slip) => (
                          <div
                            key={slip.invoiceId}
                            className="p-3 rounded-xl bg-[#101512] border border-[#1e3325] hover:border-[#34d399]/40 flex items-center justify-between gap-2 transition"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-[#f5f2eb]">
                                {slip.clientName}
                              </div>
                              <div className="text-xs text-[#8e8a7f] tabular-nums">
                                ${slip.totalAmountUsdc.toFixed(2)} USDC ·{' '}
                                <span className="font-mono text-[#52b788]">
                                  {slip.stealthImplicitAccount.slice(0, 10)}...
                                </span>
                              </div>
                            </div>

                            {slip.claimedToStealthWallet ? (
                              <a
                                href={slip.stealthClaimTxUrl || slip.settlementTxUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14261c] border border-[#2d523c] text-[#34d399] text-xs font-medium shrink-0 hover:bg-[#1a3325] transition"
                              >
                                Auto-Disbursed
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled={busyKey === `claim_${slip.invoiceId}`}
                                onClick={() => handleQuickStealthClaim(slip)}
                                className="px-3 py-1.5 rounded-lg bg-[#f5f2eb] hover:bg-white text-[#0a0a09] text-xs font-semibold cursor-pointer shrink-0 transition"
                              >
                                {busyKey === `claim_${slip.invoiceId}`
                                  ? 'Sending...'
                                  : 'Disburse (0 Gas)'}
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
          {viewRole === 'employer' && activeTab === 'accounting' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="badge-purple-glow px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.16em] inline-flex items-center gap-1.5 mb-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#c084fc]" />
                    Zero-Question Reconciliation · Audit Ready
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-gradient-purple">
                    Bookkeeper &amp; Tax Exports
                  </h1>
                  <p className="text-sm text-[#9c978b] mt-1.5 max-w-xl">
                    Clean spreadsheets your accountant can import into QuickBooks or Xero without asking a single question.
                  </p>
                </div>

                <a
                  href={`/api/invoices?format=csv&viewingKey=${encodeURIComponent(
                    viewingKeyInput || testnetInfo?.defaultViewingKey || ''
                  )}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e9d5ff] via-[#c084fc] to-[#9333ea] hover:from-[#f3e8ff] hover:to-[#a855f7] text-[#0a0a09] font-bold text-sm shadow-[0_0_22px_rgba(192,132,252,0.35)] transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0a0a09]" />
                  Download Accountant CSV
                </a>
              </div>

              <div className="vault-card-glow-indigo rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#818cf8]/50 to-transparent" />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#a5b4fc]">
                    Bookkeeper Viewing Key:
                  </span>
                  <input
                    type="text"
                    value={viewingKeyInput}
                    onChange={(e) => setViewingKeyInput(e.target.value)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0d0d12] border border-[#3b3a54] font-mono text-xs text-[#e0e7ff] focus:outline-none focus:border-[#818cf8] w-64 shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBookkeeperDecryptedMode(!bookkeeperDecryptedMode)
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    bookkeeperDecryptedMode
                      ? 'bg-[#15281e] border-[#34d399]/40 text-[#a7f3d0] shadow-[0_0_15px_rgba(52,211,153,0.18)]'
                      : 'bg-[#181815] border-[#2c2b26] text-[#8e8a7f]'
                  }`}
                >
                  {bookkeeperDecryptedMode ? (
                    <>
                      <Eye className="w-4 h-4 text-[#34d399]" />
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

              <div className="vault-card rounded-2xl overflow-hidden border border-[#2e2d26] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gradient-to-r from-[#171614] via-[#141412] to-[#171614] text-[#a39f93] border-b border-[#262520]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">ID</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">Category</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">Status</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">Client / Recipient</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono text-right">Amount (USD)</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono text-right">Gas Paid</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">GL Account</th>
                        <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] font-mono">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22211d]">
                      {invoices.map((rec) => (
                        <tr key={rec.invoiceId} className="hover:bg-[#1a1916] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-[#f5f2eb]">
                            <Link
                              href={`/invoice/${encodeURIComponent(rec.invoiceId)}`}
                              className="text-[#f5dfa8] hover:text-[#d4b06a] hover:underline"
                            >
                              {rec.invoiceId}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-[#8e8a7f]">
                            {rec.recordType === 'AR_INVOICE' ? 'Invoice Income' : 'Private Payroll'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] inline-flex items-center gap-1 ${
                                rec.status === 'PAID'
                                  ? 'bg-[#14261c] border border-[#2d523c] text-[#34d399]'
                                  : rec.status === 'REFUNDED'
                                    ? 'bg-[#2b1617] border border-[#52292b] text-[#f87171]'
                                    : 'bg-[#292013] border border-[#543e1f] text-[#fbbf24]'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {bookkeeperDecryptedMode ? (
                              <span className="font-medium text-[#f5f2eb]">
                                {rec.clientName}
                              </span>
                            ) : (
                              <span className="font-mono text-[#736f65]">
                                [Encrypted: {rec.encryptedViewingNote.slice(0, 18)}...]
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#f5f2eb] tabular-nums">
                            ${rec.totalAmountUsdc.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#34d399] font-medium tabular-nums">
                            $0.00
                          </td>
                          <td className="py-3.5 px-4 text-[#8e8a7f] font-mono text-[11px]">
                            {rec.recordType === 'AR_INVOICE'
                              ? '1010 Cash / 4000 Revenue'
                              : '6100 Payroll / 1010 Cash'}
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={rec.settlementTxUrl || rec.creationTxUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#e2c17d] hover:text-[#fae8b8] hover:underline"
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

          {/* EMPLOYEE PORTAL VIEW */}
          {viewRole === 'employee' && (() => {
            const activeEmployeeMeta =
              (isConnected && stealthMetaAddress) || guestMetaAddress;
            const matchingSlips = payrollRecords.filter(
              (slip) =>
                slip.stealthMetaAddress &&
                activeEmployeeMeta &&
                slip.stealthMetaAddress.toLowerCase() ===
                  activeEmployeeMeta.toLowerCase()
            );
            const displayedSlips = showAllEmployeeSlips
              ? payrollRecords
              : matchingSlips;
            const employeeTotalUsdc = displayedSlips.reduce(
              (sum, s) => sum + s.totalAmountUsdc,
              0
            );

            return (
              <div className="space-y-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="badge-emerald-glow px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.16em] inline-flex items-center gap-1.5 mb-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#34d399]" />
                      Employee Portal · Zero-Claim Auto-Deposit
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-gradient-emerald">
                      My Private Paychecks
                    </h1>
                    <p className="text-sm text-[#9c978b] mt-1.5 max-w-xl">
                      Give your employer your Stealth Meta-Address once during setup. Salaries auto-disburse to fresh unlinked stealth addresses—no claim step needed.
                    </p>
                  </div>

                  {!isConnected && (
                    <button
                      type="button"
                      onClick={connect}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6ee7b7] via-[#34d399] to-[#059669] hover:from-[#a7f3d0] hover:to-[#10b981] text-[#0a0a09] font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                      Connect NEAR Wallet
                    </button>
                  )}
                </div>

                {/* Employee Onboarding Stealth Meta-Address Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 vault-card-glow-emerald rounded-2xl p-6 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#34d399]/60 to-transparent" />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#34d399]" />
                        <h2 className="font-semibold text-base text-[#e4f7eb]">
                          My Onboarding Stealth Meta-Address
                        </h2>
                      </div>
                      <span className="badge-emerald-glow px-3 py-0.5 rounded-full text-[11px] font-mono">
                        {isConnected && accountId ? accountId : 'Guest Preview'}
                      </span>
                    </div>

                    {!isConnected && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[#8e8a7f]">
                          Or preview by Employee ID:
                        </span>
                        <input
                          type="text"
                          value={guestEmployeeId}
                          onChange={(e) => setGuestEmployeeId(e.target.value)}
                          placeholder="EMP-101"
                          className="px-2.5 py-1 rounded-lg bg-[#0d0d0c] border border-[#2c2b26] text-xs font-mono text-[#f5f2eb] w-36 focus:outline-none focus:border-[#34d399]"
                        />
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-[#0d1410] border border-[#1e3827] flex items-center justify-between gap-3 shadow-inner">
                      <code className="text-xs font-mono text-[#a7f3d0] break-all">
                        {activeEmployeeMeta || 'Generating stealth meta-address...'}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeEmployeeMeta) return;
                          navigator.clipboard?.writeText(activeEmployeeMeta);
                          setCopiedId('emp_meta');
                          setTimeout(() => setCopiedId(null), 1800);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#18281e] hover:bg-[#203628] border border-[#34d399]/40 text-xs font-semibold text-[#a7f3d0] flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.15)] transition"
                      >
                        {copiedId === 'emp_meta' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#34d399]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#34d399]" />
                            Copy for HR
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-[#8e8a7f]">
                      Paste this address into the Employer&apos;s Private Payroll setup. Each payday generates a brand-new 64-char stealth account only your key controls.
                    </p>
                  </div>

                  <div className="lg:col-span-4 vault-card-glow-emerald rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#34d399]/60 to-transparent" />
                    <div>
                      <div className="text-xs text-[#8e8a7f] uppercase tracking-wider font-mono">
                        Total Auto-Received
                      </div>
                      <div className="text-4xl font-serif text-gradient-emerald tabular-nums mt-2">
                        $
                        {employeeTotalUsdc.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                        <span className="text-sm font-sans text-[#8e8a7f] ml-1.5 font-normal">
                          USDC
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[#1e3325] flex items-center justify-between text-xs mt-4">
                      <span className="text-[#8e8a7f]">Payout Mode</span>
                      <span className="text-[#34d399] font-mono font-medium">
                        Direct Stealth Auto-Pay
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-Disbursed Paychecks Table */}
                <div className="vault-card rounded-2xl overflow-hidden border border-[#1f3627] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]">
                  <div className="px-6 py-4 border-b border-[#1f3627] bg-gradient-to-r from-[#121c15] via-[#0f1712] to-[#121c15] flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-sm text-gradient-emerald">
                      Paychecks ({displayedSlips.length})
                    </h2>
                    <div className="p-1 rounded-lg bg-[#0b120d] border border-[#1d3324] flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowAllEmployeeSlips(false)}
                        className={`px-3 py-1 rounded-md cursor-pointer transition ${
                          !showAllEmployeeSlips
                            ? 'bg-[#18281e] text-[#34d399] font-semibold shadow-sm'
                            : 'text-[#8e8a7f] hover:text-[#f5f2eb]'
                        }`}
                      >
                        My Meta Only ({matchingSlips.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllEmployeeSlips(true)}
                        className={`px-3 py-1 rounded-md cursor-pointer transition ${
                          showAllEmployeeSlips
                            ? 'bg-[#1f1e16] text-[#e2c17d] font-semibold shadow-sm'
                            : 'text-[#8e8a7f] hover:text-[#f5f2eb]'
                        }`}
                      >
                        All Testnet Paychecks ({payrollRecords.length})
                      </button>
                    </div>
                  </div>

                  {displayedSlips.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[#8e8a7f]">
                      No paychecks matched your Stealth Meta-Address yet. Copy your Meta-Address above and run a batch in Employer View, or switch to &ldquo;All Testnet Paychecks&rdquo;.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#18281d]">
                      {displayedSlips.map((slip) => (
                        <div
                          key={slip.invoiceId}
                          className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#121a14] transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="font-semibold text-sm text-[#f5f2eb]">
                                {slip.clientName}
                              </span>
                              <span className="text-xs font-mono text-[#736f65] bg-[#141d16] px-2 py-0.5 rounded border border-[#213527]">
                                {slip.invoiceId}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#14261c] border border-[#2d523c] text-[#34d399] text-[11px] font-medium shadow-sm">
                                <CheckCircle2 className="w-3 h-3" />
                                Auto-Disbursed
                              </span>
                            </div>
                            <div className="text-xs text-[#8e8a7f] flex flex-wrap items-center gap-2">
                              <span>{slip.lineItems[0]?.description}</span>
                              <span>·</span>
                              <span className="font-mono text-[#52b788]">
                                Stealth: {slip.stealthImplicitAccount.slice(0, 14)}...
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-serif text-2xl text-gradient-emerald tabular-nums">
                                ${slip.totalAmountUsdc.toFixed(2)}
                              </div>
                              <div className="text-[11px] text-[#34d399] font-medium">
                                $0.00 Gas · Ready
                              </div>
                            </div>
                            <a
                              href={
                                slip.stealthClaimTxUrl ||
                                slip.settlementTxUrl ||
                                '#'
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-lg bg-[#162019] hover:bg-[#202e24] border border-[#2d4734] text-xs text-[#e2c17d] hover:text-[#fae8b8] inline-flex items-center gap-1.5 transition"
                            >
                              Explorer
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal for Creating a New Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="vault-card-glow-gold rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
            <div className="px-6 py-4 border-b border-[#2a2922] flex items-center justify-between sticky top-0 bg-[#141310] z-10">
              <div>
                <h2 className="font-serif text-2xl text-gradient-gold">New Invoice</h2>
                <p className="text-xs text-[#9c978b]">
                  Sent with $0.00 gas fees · Settled 1:1 in USDC
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-[#8e8a7f] hover:text-[#f5f2eb] hover:bg-[#201f1b] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGaslessInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-[#8e8a7f] mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0d0c] border border-[#2c2b26] text-sm text-[#f5f2eb]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e8a7f] mb-1">
                    PO / Reference #
                  </label>
                  <input
                    type="text"
                    value={clientReference}
                    onChange={(e) => setClientReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0d0c] border border-[#2c2b26] text-sm text-[#f5f2eb]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs text-[#8e8a7f] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDateUtc}
                    onChange={(e) => setDueDateUtc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0d0c] border border-[#2c2b26] text-xs text-[#f5f2eb]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e8a7f] mb-1">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0d0c] border border-[#2c2b26] text-sm text-[#f5f2eb]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e8a7f] mb-1">
                    Your Name / ID
                  </label>
                  <input
                    type="text"
                    value={freelancerAccount}
                    onChange={(e) => setFreelancerAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0d0c] border border-[#2c2b26] text-xs text-[#f5f2eb]"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#8e8a7f]">
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
                    className="p-3 rounded-xl bg-[#10100e] border border-[#272622] space-y-2"
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#2c2b26] text-xs text-[#f5f2eb]"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-[#6d695f] hover:text-[#d97b73] p-1 cursor-pointer"
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#2c2b26] text-xs text-[#f5f2eb]"
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#2c2b26] text-xs text-[#f5f2eb]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#24231f] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#8e8a7f]">Invoice Total</div>
                  <div className="text-2xl font-serif text-[#f5f2eb] tabular-nums">
                    ${invoiceTotal.toFixed(2)} USDC
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyKey === 'create_invoice'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e2c17d] to-[#c9a358] hover:from-[#ebd094] hover:to-[#d4b06a] text-[#0a0a09] font-semibold text-sm transition inline-flex items-center gap-2 cursor-pointer"
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

      {/* Modal for Sharing Created Invoice */}
      {showShareModal && newlyCreatedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="vault-card-glow-gold rounded-2xl w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e5be70]/60 to-transparent" />
            <div className="px-6 py-4 border-b border-[#2a2922] flex items-center justify-between bg-[#141310]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#14261c] border border-[#2d523c] flex items-center justify-center text-[#34d399]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-gradient-gold">Invoice Created!</h2>
                  <p className="text-xs text-[#9c978b]">
                    {newlyCreatedInvoice.invoiceId} · ${newlyCreatedInvoice.totalAmountUsdc.toFixed(2)} USDC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-[#8e8a7f] hover:text-[#f5f2eb] hover:bg-[#201f1b] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#a39f93] leading-relaxed">
                Send this private payment link to <strong className="text-[#f5f2eb]">{newlyCreatedInvoice.clientName}</strong>. They can open it to pay you directly from their wallet on any chain:
              </p>

              <div className="p-3.5 rounded-xl bg-[#0c0c0b] border border-[#2d2b24] space-y-2">
                <span className="text-[10px] font-mono text-[#8e8a7f] uppercase tracking-wider block">
                  Client Payment Link
                </span>
                <div className="flex items-center justify-between gap-2 bg-[#141411] px-3 py-2 rounded-lg border border-[#24231e]">
                  <span className="font-mono text-xs text-[#e2c17d] truncate">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/invoice/${newlyCreatedInvoice.invoiceId}`
                      : `/invoice/${newlyCreatedInvoice.invoiceId}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/invoice/${newlyCreatedInvoice.invoiceId}`;
                      navigator.clipboard?.writeText(url);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0a0a09] font-bold text-xs shrink-0 cursor-pointer transition"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/invoice/${encodeURIComponent(newlyCreatedInvoice.invoiceId)}`}
                  target="_blank"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1d1b16] hover:bg-[#26241e] border border-[#383427] text-[#f5f2eb] text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
                >
                  Preview Invoice
                  <ExternalLink className="w-3.5 h-3.5 text-[#8e8a7f]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="py-2.5 px-5 rounded-xl bg-[#d4b06a] hover:bg-[#e2c17d] text-[#0a0a09] text-xs font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
