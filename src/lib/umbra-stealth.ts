import crypto from 'crypto';
import { KeyPair } from 'near-api-js';

export interface StealthBundle {
  stealthImplicitAccount: string;
  stealthSecretKey: string;
  ephemeralPubKeyHex: string;
  viewTag: string;
  claimSecret: string;
  stealthCommitmentHash: string;
  encryptedViewingNote: string;
}

export interface ViewingNotePayload {
  recordId: string;
  recordType: 'AR_INVOICE' | 'AP_PAYROLL';
  counterpartyName: string;
  referenceCode: string;
  lineItemsSummary: string;
  subtotalUsd: number;
  taxAmountUsd: number;
  totalUsdc: number;
  stealthImplicitAccount: string;
  issuedAtUtc: string;
}

/**
 * Derives a deterministic 32-byte AES-256 key from a Bookkeeper Viewing Key string.
 */
function deriveAesKeyFromViewingKey(viewingKey: string): Buffer {
  return crypto.createHash('sha256').update(`nearveil_vk_v1:${viewingKey.trim()}`).digest();
}

/**
 * Encrypts sensitive invoice/payroll metadata using AES-256-GCM so public blockchain
 * observers only see ciphertext, while a bookkeeper with the Viewing Key can decrypt it.
 */
export function encryptViewingNote(payload: ViewingNotePayload, viewingKey: string): string {
  const key = deriveAesKeyFromViewingKey(viewingKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `nv1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted viewing note using the Bookkeeper Viewing Key.
 */
export function decryptViewingNote(ciphertext: string, viewingKey: string): ViewingNotePayload | null {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'nv1') {
      return null;
    }
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    const key = deriveAesKeyFromViewingKey(viewingKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as ViewingNotePayload;
  } catch {
    return null;
  }
}

/**
 * Generates an Umbra-style one-time NEAR Stealth Implicit Account (64-char hex ed25519 pubkey),
 * ephemeral public key, 1-byte view tag, SHA-256 commitment hash, and AES-GCM encrypted note.
 */
export function generateStealthBundle(
  recordId: string,
  notePayload: Omit<ViewingNotePayload, 'stealthImplicitAccount'>,
  viewingKey: string
): StealthBundle {
  // 1. Generate a fresh one-time ed25519 keypair for the NEAR Stealth Implicit Account
  const stealthKeyPair = KeyPair.fromRandom('ed25519');
  const stealthPubKeyBytes = stealthKeyPair.getPublicKey().data;
  const stealthImplicitAccount = Buffer.from(stealthPubKeyBytes).toString('hex');

  // 2. Generate ephemeral keypair R for the Umbra stealth announcement
  const ephemeralKeyPair = KeyPair.fromRandom('ed25519');
  const ephemeralPubKeyHex = Buffer.from(ephemeralKeyPair.getPublicKey().data).toString('hex');

  // 3. Generate one-time claim secret & SHA-256 commitment hash
  const claimSecret = `nv_secret_${crypto.randomBytes(16).toString('hex')}`;
  const stealthCommitmentHash = crypto
    .createHash('sha256')
    .update(`${claimSecret}:${recordId}`)
    .digest('hex');

  // 4. Compute 1-byte View Tag for fast client-side scanning of announcements
  const viewTag = crypto
    .createHash('sha256')
    .update(`${ephemeralPubKeyHex}:${viewingKey}`)
    .digest('hex')
    .slice(0, 2);

  // 5. Encrypt the Bookkeeper Viewing Note with AES-256-GCM
  const fullPayload: ViewingNotePayload = {
    ...notePayload,
    stealthImplicitAccount,
  };
  const encryptedViewingNote = encryptViewingNote(fullPayload, viewingKey);

  return {
    stealthImplicitAccount,
    stealthSecretKey: stealthKeyPair.toString(),
    ephemeralPubKeyHex,
    viewTag,
    claimSecret,
    stealthCommitmentHash,
    encryptedViewingNote,
  };
}

/**
 * Verifies a claim secret against the on-chain SHA-256 commitment hash.
 */
export function verifyClaimCommitment(
  claimSecret: string,
  recordId: string,
  expectedCommitmentHash: string
): boolean {
  const computed = crypto
    .createHash('sha256')
    .update(`${claimSecret.trim()}:${recordId}`)
    .digest('hex');
  return computed === expectedCommitmentHash;
}

