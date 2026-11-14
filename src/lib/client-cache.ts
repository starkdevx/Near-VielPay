import {
  MerchantPaymentLink,
  NearVeilInvoice,
  PrivatePayrollBatch,
} from './types';

const KEYS = {
  invoices: 'nearveil_cached_invoices',
  batches: 'nearveil_cached_batches',
  merchantLinks: 'nearveil_cached_merchant_links',
};

function safeRead<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 200)));
  } catch {
    // ignore storage quota errors
  }
}

export function loadCachedInvoices(): NearVeilInvoice[] {
  return safeRead<NearVeilInvoice>(KEYS.invoices);
}

export function saveCachedInvoices(items: NearVeilInvoice[]): void {
  safeWrite(KEYS.invoices, items);
}

export function upsertCachedInvoice(inv: NearVeilInvoice): NearVeilInvoice[] {
  const existing = loadCachedInvoices();
  const idx = existing.findIndex((i) => i.invoiceId === inv.invoiceId);
  const next =
    idx === -1
      ? [inv, ...existing]
      : existing.map((item, i) => (i === idx ? inv : item));
  saveCachedInvoices(next);
  return next;
}

export function loadCachedBatches(): PrivatePayrollBatch[] {
  return safeRead<PrivatePayrollBatch>(KEYS.batches);
}

export function saveCachedBatches(items: PrivatePayrollBatch[]): void {
  safeWrite(KEYS.batches, items);
}

export function upsertCachedBatch(
  batch: PrivatePayrollBatch
): PrivatePayrollBatch[] {
  const existing = loadCachedBatches();
  const idx = existing.findIndex((b) => b.batchId === batch.batchId);
  const next =
    idx === -1
      ? [batch, ...existing]
      : existing.map((item, i) => (i === idx ? batch : item));
  saveCachedBatches(next);
  return next;
}

export function loadCachedMerchantLinks(): MerchantPaymentLink[] {
  return safeRead<MerchantPaymentLink>(KEYS.merchantLinks);
}

export function saveCachedMerchantLinks(items: MerchantPaymentLink[]): void {
  safeWrite(KEYS.merchantLinks, items);
}

export function upsertCachedMerchantLink(
  link: MerchantPaymentLink
): MerchantPaymentLink[] {
  const existing = loadCachedMerchantLinks();
  const idx = existing.findIndex((l) => l.paymentId === link.paymentId);
  const next =
    idx === -1
      ? [link, ...existing]
      : existing.map((item, i) => (i === idx ? link : item));
  saveCachedMerchantLinks(next);
  return next;
}

export function mergeInvoices(
  server: NearVeilInvoice[],
  cached: NearVeilInvoice[]
): NearVeilInvoice[] {
  const map = new Map<string, NearVeilInvoice>();
  for (const inv of cached) {
    if (inv?.invoiceId) map.set(inv.invoiceId, inv);
  }
  for (const inv of server) {
    if (!inv?.invoiceId) continue;
    const prev = map.get(inv.invoiceId);
    if (!prev) {
      map.set(inv.invoiceId, inv);
    } else {
      // Prefer progressed state (PAID/REFUNDED) or stealthClaimTxHash
      const prevScore =
        (prev.status !== 'PENDING' ? 2 : 0) + (prev.stealthClaimTxHash ? 1 : 0);
      const srvScore =
        (inv.status !== 'PENDING' ? 2 : 0) + (inv.stealthClaimTxHash ? 1 : 0);
      map.set(inv.invoiceId, srvScore >= prevScore ? inv : prev);
    }
  }
  return Array.from(map.values());
}

export function mergeBatches(
  server: PrivatePayrollBatch[],
  cached: PrivatePayrollBatch[]
): PrivatePayrollBatch[] {
  const map = new Map<string, PrivatePayrollBatch>();
  for (const b of cached) {
    if (b?.batchId) map.set(b.batchId, b);
  }
  for (const b of server) {
    if (b?.batchId) map.set(b.batchId, b);
  }
  return Array.from(map.values());
}

export function mergeMerchantLinks(
  server: MerchantPaymentLink[],
  cached: MerchantPaymentLink[]
): MerchantPaymentLink[] {
  const map = new Map<string, MerchantPaymentLink>();
  for (const l of cached) {
    if (l?.paymentId) map.set(l.paymentId, l);
  }
  for (const l of server) {
    if (!l?.paymentId) continue;
    const prev = map.get(l.paymentId);
    if (!prev) {
      map.set(l.paymentId, l);
    } else {
      map.set(
        l.paymentId,
        l.salesCount >= prev.salesCount ? l : prev
      );
    }
  }
  return Array.from(map.values());
}

export function encodePortablePayload(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodePortablePayload<T>(encoded: string | null): T | null {
  if (!encoded) return null;
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
