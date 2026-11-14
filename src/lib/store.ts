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

function getSafeBackupFilePath(): string {
  const baseDir = path.resolve(process.cwd());
  const fileName = path.basename('.nearveil-ledger.bak.json');
  const resolved = path.resolve(baseDir, fileName);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid backup file path boundary');
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
  const backupPath = getSafeBackupFilePath();

  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(backupPath)) {
      try {
        const bakData = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(filePath, bakData, { mode: 0o600 });
        const parsed = JSON.parse(bakData) as Partial<LedgerData>;
        return {
          invoices: parsed.invoices || [],
          payrollBatches: parsed.payrollBatches || [],
          merchantLinks: parsed.merchantLinks || [],
          stealthClaimedBalanceUsdc: parsed.stealthClaimedBalanceUsdc ?? 0,
        };
      } catch {
        // fallback
      }
    }
    const initial = createInitialSeedData();
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), { mode: 0o600 });
    return initial;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LedgerData>;
    const invoices = parsed.invoices || [];
    const payrollBatches = parsed.payrollBatches || [];
    const merchantLinks = parsed.merchantLinks || [];

    // If main ledger is empty but backup has historical records, restore
    if (
      invoices.length === 0 &&
      payrollBatches.length === 0 &&
      merchantLinks.length === 0 &&
      fs.existsSync(backupPath)
    ) {
      try {
        const bakParsed = JSON.parse(fs.readFileSync(backupPath, 'utf8')) as Partial<LedgerData>;
        if (
          (bakParsed.invoices && bakParsed.invoices.length > 0) ||
          (bakParsed.merchantLinks && bakParsed.merchantLinks.length > 0)
        ) {
          return {
            invoices: bakParsed.invoices || [],
            payrollBatches: bakParsed.payrollBatches || [],
            merchantLinks: bakParsed.merchantLinks || [],
            stealthClaimedBalanceUsdc: bakParsed.stealthClaimedBalanceUsdc ?? 0,
          };
        }
      } catch {
        // fallback
      }
    }

    return {
      invoices,
      payrollBatches,
      merchantLinks,
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
  const backupPath = getSafeBackupFilePath();

  // If existing file has meaningful records, make sure backup is kept
  if (fs.existsSync(filePath)) {
    try {
      const existing = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(existing) as Partial<LedgerData>;
      if (
        (parsed.invoices && parsed.invoices.length > 0) ||
        (parsed.merchantLinks && parsed.merchantLinks.length > 0) ||
        (parsed.payrollBatches && parsed.payrollBatches.length > 0)
      ) {
        fs.writeFileSync(backupPath, existing, { mode: 0o600 });
      }
    } catch {
      // ignore backup write errors
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

