import fs from 'fs';
import os from 'os';
import path from 'path';
import { MerchantPaymentLink, NearVeilInvoice, PrivatePayrollBatch } from './types';

export interface LedgerData {
  invoices: NearVeilInvoice[];
  payrollBatches: PrivatePayrollBatch[];
  merchantLinks: MerchantPaymentLink[];
  stealthClaimedBalanceUsdc: number;
}

// In-memory fallback for serverless/ephemeral environments (e.g. Vercel)
let inMemoryLedger: LedgerData | null = null;

function isDirWritable(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function getStorageDir(): string {
  const cwd = path.resolve(process.cwd());
  if (!process.env.VERCEL && isDirWritable(cwd)) {
    return cwd;
  }
  return os.tmpdir();
}

function getSafeLedgerFilePath(): string {
  const baseDir = getStorageDir();
  const fileName = path.basename('.nearveil-ledger.json');
  const resolved = path.resolve(baseDir, fileName);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid ledger file path boundary');
  }
  return resolved;
}

function getSafeBackupFilePath(): string {
  const baseDir = getStorageDir();
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
    // Check if a backup exists in writable dir
    if (fs.existsSync(backupPath)) {
      try {
        const bakData = fs.readFileSync(backupPath, 'utf8');
        try {
          fs.writeFileSync(filePath, bakData, { mode: 0o600 });
        } catch {
          // ignore write error
        }
        const parsed = JSON.parse(bakData) as Partial<LedgerData>;
        const data: LedgerData = {
          invoices: parsed.invoices || [],
          payrollBatches: parsed.payrollBatches || [],
          merchantLinks: parsed.merchantLinks || [],
          stealthClaimedBalanceUsdc: parsed.stealthClaimedBalanceUsdc ?? 0,
        };
        inMemoryLedger = data;
        return data;
      } catch {
        // fallback
      }
    }

    if (inMemoryLedger) {
      return inMemoryLedger;
    }

    const initial = createInitialSeedData();
    inMemoryLedger = initial;
    try {
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), { mode: 0o600 });
    } catch {
      // Safe no-op if filesystem is read-only
    }
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
          const restored: LedgerData = {
            invoices: bakParsed.invoices || [],
            payrollBatches: bakParsed.payrollBatches || [],
            merchantLinks: bakParsed.merchantLinks || [],
            stealthClaimedBalanceUsdc: bakParsed.stealthClaimedBalanceUsdc ?? 0,
          };
          inMemoryLedger = restored;
          return restored;
        }
      } catch {
        // fallback
      }
    }

    const data: LedgerData = {
      invoices,
      payrollBatches,
      merchantLinks,
      stealthClaimedBalanceUsdc: parsed.stealthClaimedBalanceUsdc ?? 0,
    };
    inMemoryLedger = data;
    return data;
  } catch {
    if (inMemoryLedger) {
      return inMemoryLedger;
    }
    const initial = createInitialSeedData();
    inMemoryLedger = initial;
    try {
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), { mode: 0o600 });
    } catch {
      // ignore
    }
    return initial;
  }
}

export function writeLedger(data: LedgerData): void {
  inMemoryLedger = data;
  const filePath = getSafeLedgerFilePath();
  const backupPath = getSafeBackupFilePath();

  try {
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(existing) as Partial<LedgerData>;
      if (
        (parsed.invoices && parsed.invoices.length > 0) ||
        (parsed.merchantLinks && parsed.merchantLinks.length > 0) ||
        (parsed.payrollBatches && parsed.payrollBatches.length > 0)
      ) {
        fs.writeFileSync(backupPath, existing, { mode: 0o600 });
      }
    }
  } catch {
    // ignore backup write errors
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  } catch {
    // Safe fallback to in-memory ledger on read-only filesystems
  }
}
