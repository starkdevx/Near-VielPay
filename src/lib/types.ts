export type RecordStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceUsd: number;
}

export interface NearVeilInvoice {
  invoiceId: string;
  recordType: 'AR_INVOICE' | 'AP_PAYROLL';
  freelancerAccount: string;
  clientName: string;
  clientReference: string;
  issueDateUtc: string;
  dueDateUtc: string;
  paidTimestampUtc: string | null;
  refundedTimestampUtc: string | null;
  lineItems: InvoiceLineItem[];
  subtotalUsd: number;
  taxRatePercent: number;
  taxAmountUsd: number;
  totalAmountUsdc: number;
  status: RecordStatus;
  // Stealth & Privacy fields
  privacyEnabled: boolean;
  stealthImplicitAccount: string; // 64-char hex NEAR Implicit Account
  stealthMetaAddress?: string; // Optional employee/recipient stealth meta-address (nv_meta_...)
  autoDisbursed?: boolean; // True when payroll auto-disburses to stealth address with zero claim step
  ephemeralPubKeyHex: string;
  viewTag: string; // 2-hex-char (1 byte) fast filter tag
  stealthCommitmentHash: string; // sha256(claimSecret + invoiceId)
  encryptedViewingNote: string; // AES-256-GCM ciphertext decryptable by Bookkeeper Viewing Key
  claimSecretHint?: string; // Available to the creator/recipient link
  claimedToStealthWallet: boolean;
  claimedDestinationAccount: string | null;
  // Cross-chain 1Click & On-chain NEAR Testnet verification links
  selectedOriginAsset: string;
  selectedOriginChain: string;
  oneClickQuoteId: string | null;
  oneClickDepositAddress: string | null;
  originInputAmount: string | null;
  creationTxHash: string;
  creationTxUrl: string;
  settlementTxHash: string | null;
  settlementTxUrl: string | null;
  refundTxHash: string | null;
  refundTxUrl: string | null;
  stealthClaimTxHash: string | null;
  stealthClaimTxUrl: string | null;
  relayerSponsoredGasNear: string;
}

export interface PayrollRecipientInput {
  id: string;
  contractorName: string;
  roleOrDepartment: string;
  referenceCode: string;
  amountUsdc: number;
  stealthMetaAddress?: string;
}

export interface PrivatePayrollBatch {
  batchId: string;
  companyName: string;
  employerAccountId?: string;
  payPeriodLabel: string;
  createdAtUtc: string;
  fundingOriginChain: string;
  fundingOriginAsset: string;
  totalAmountUsdc: number;
  recipientCount: number;
  fundingTxHash: string;
  fundingTxUrl: string;
  invoiceIds: string[]; // Each payroll slip is also stored as an AP_PAYROLL record for unified CSV/claiming
}

export interface OneClickTokenOption {
  assetId: string;
  symbol: string;
  name: string;
  chain: string;
  decimals: number;
  priceUsd: number;
}

export interface OneClickQuoteResponse {
  quoteId: string;
  originAsset: string;
  originSymbol: string;
  originChain: string;
  destinationAsset: string;
  destinationChain: string;
  amountInFormatted: string;
  amountOutUsdc: string;
  depositAddress: string;
  recipientStealthAccount: string;
  expiresAtUtc: string;
  solverMode: 'NEAR_TESTNET_SOLVER';
}

