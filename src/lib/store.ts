import fs from 'fs';
import path from 'path';
import { NearVeilInvoice, PrivatePayrollBatch } from './types';
import { getTestnetConfig } from './near-testnet';
import { generateStealthBundle } from './umbra-stealth';

export interface LedgerData {
  invoices: NearVeilInvoice[];
  payrollBatches: PrivatePayrollBatch[];
  faucetUsdcBalance: number;
  stealthClaimedBalanceUsdc: number;
}

function getSafeLedgerFilePath(): string {
  const baseDir = path.resolve(process.cwd());
  const fileName = path.basename('.nearveil-ledger.json');
  const resolved = path.resolve(baseDir, fileName);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid ledger file path boundary');
  }
  return resolved;
}

function createInitialSeedData(): LedgerData {
  const config = getTestnetConfig();
  const viewingKey = config.defaultViewingKey;
  const deployTx = config.deployTxHash || 'efKDfAn76gMi5C9RLk1AyJs1LDtcdM8pRVP43L5T6R4';

  const seedInvoiceId = 'INV-2026-1001';
  const seedBundle = generateStealthBundle(
    seedInvoiceId,
    {
      recordId: seedInvoiceId,
      recordType: 'AR_INVOICE',
      counterpartyName: 'Northstar Labs Inc.',
      referenceCode: 'PO-2026-441',
      lineItemsSummary:
        'NEAR Smart Contract Security Audit (20 x $95.00); Gasless Relayer Integration (1 x $600.00)',
      subtotalUsd: 2500,
      taxAmountUsd: 0,
      totalUsdc: 2500,
      issuedAtUtc: '2026-11-13',
    },
    viewingKey
  );

  const seedInvoice: NearVeilInvoice = {
    invoiceId: seedInvoiceId,
    recordType: 'AR_INVOICE',
    freelancerAccount: 'freelancer-studio.testnet',
    clientName: 'Northstar Labs Inc.',
    clientReference: 'PO-2026-441',
    issueDateUtc: '2026-11-13',
    dueDateUtc: '2026-11-27',
    paidTimestampUtc: null,
    refundedTimestampUtc: null,
    lineItems: [
      {
        id: 'li-1',
        description: 'NEAR Smart Contract Security Audit',
        quantity: 20,
        unitPriceUsd: 95,
      },
      {
        id: 'li-2',
        description: 'Gasless Relayer Integration',
        quantity: 1,
        unitPriceUsd: 600,
      },
    ],
    subtotalUsd: 2500,
    taxRatePercent: 0,
    taxAmountUsd: 0,
    totalAmountUsdc: 2500,
    status: 'PENDING',
    privacyEnabled: true,
    stealthImplicitAccount: seedBundle.stealthImplicitAccount,
    ephemeralPubKeyHex: seedBundle.ephemeralPubKeyHex,
    viewTag: seedBundle.viewTag,
    stealthCommitmentHash: seedBundle.stealthCommitmentHash,
    encryptedViewingNote: seedBundle.encryptedViewingNote,
    claimSecretHint: seedBundle.claimSecret,
    claimedToStealthWallet: false,
    claimedDestinationAccount: null,
    selectedOriginAsset: 'SOL',
    selectedOriginChain: 'Solana',
    oneClickQuoteId: null,
    oneClickDepositAddress: null,
    originInputAmount: null,
    creationTxHash: deployTx,
    creationTxUrl: `${config.explorerBaseUrl}/txns/${deployTx}`,
    settlementTxHash: null,
    settlementTxUrl: null,
    refundTxHash: null,
    refundTxUrl: null,
    stealthClaimTxHash: null,
    stealthClaimTxUrl: null,
    relayerSponsoredGasNear: '0.00034 NEAR ($0.00 to Freelancer)',
  };

  return {
    invoices: [seedInvoice],
    payrollBatches: [],
    faucetUsdcBalance: 25000,
    stealthClaimedBalanceUsdc: 0,
  };
}

export function readLedger(): LedgerData {
  const filePath = getSafeLedgerFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = createInitialSeedData();
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), { mode: 0o600 });
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LedgerData;
    return parsed;
  } catch {
    const initial = createInitialSeedData();
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), { mode: 0o600 });
    return initial;
  }
}

export function writeLedger(data: LedgerData): void {
  const filePath = getSafeLedgerFilePath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

