import fs from 'fs';
import path from 'path';
import { MerchantPaymentLink, NearVeilInvoice, PrivatePayrollBatch } from './types';

export interface LedgerData {
  invoices: NearVeilInvoice[];
  payrollBatches: PrivatePayrollBatch[];
  merchantLinks: MerchantPaymentLink[];
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
  return {
    invoices: [],
    payrollBatches: [],
    merchantLinks: [],
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
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<LedgerData>;
    return {
      invoices: parsed.invoices || [],
      payrollBatches: parsed.payrollBatches || [],
      merchantLinks: parsed.merchantLinks || [],
      stealthClaimedBalanceUsdc: parsed.stealthClaimedBalanceUsdc ?? 0,
    };
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

