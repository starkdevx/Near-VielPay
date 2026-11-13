import { NearVeilInvoice } from './types';
import { decryptViewingNote } from './umbra-stealth';

/**
 * Escapes a CSV cell strictly so commas, quotes, or formula prefixes (=, +, -, @)
 * are safe when opened in Excel, Google Sheets, QuickBooks, or Xero.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  // Prevent CSV formula injection
  const sanitized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Generates a "Zero-Question Accountant CSV" designed for a bookkeeper or CPA.
 * Every column maps cleanly to standard double-entry accounting without requiring
 * the accountant to understand blockchain mechanics or gas tokens.
 */
export function generateAccountantCsv(
  records: NearVeilInvoice[],
  viewingKey: string
): string {
  const headers = [
    'Record_ID',
    'Record_Type',
    'Status',
    'Issue_Date_UTC',
    'Due_Date_UTC',
    'Paid_Timestamp_UTC',
    'Counterparty_Name',
    'Reference_Or_Tax_ID',
    'Line_Items_Breakdown',
    'Subtotal_USD',
    'Tax_Amount_USD',
    'Total_Invoice_USD',
    'Gas_Fee_Paid_By_User_USD',
    'Net_Settled_USDC',
    'USDC_USD_Exchange_Rate',
    'Recognized_USD_Value',
    'Debit_GL_Account',
    'Credit_GL_Account',
    'Client_Origin_Payment_Rail',
    'NEAR_Settlement_Tx_URL',
    'Refund_Tx_URL',
    'Stealth_Claim_Status',
    'Stealth_Commitment_Hash',
  ];

  const rows = records.map((rec) => {
    const decrypted = decryptViewingNote(rec.encryptedViewingNote, viewingKey);
    const counterparty = decrypted ? decrypted.counterpartyName : rec.clientName;
    const reference = decrypted ? decrypted.referenceCode : rec.clientReference;
    const lineItemsText = decrypted
      ? decrypted.lineItemsSummary
      : rec.lineItems
          .map(
            (li) =>
              `${li.description} (${li.quantity} x $${li.unitPriceUsd.toFixed(2)})`
          )
          .join('; ');

    const isRevenue = rec.recordType === 'AR_INVOICE';
    const isRefunded = rec.status === 'REFUNDED';
    const isPaid = rec.status === 'PAID';

    const netSettledUsdc = isPaid ? rec.totalAmountUsdc.toFixed(2) : '0.00';
    const recognizedUsd = isPaid ? rec.totalAmountUsdc.toFixed(2) : '0.00';

    const debitGl = isRevenue
      ? isRefunded
        ? '4090 - Sales Returns & Refunds'
        : '1010 - Digital Cash (USDC on NEAR)'
      : '6100 - Contractor & Private Payroll Expense';

    const creditGl = isRevenue
      ? '4000 - Consulting & Freelance Revenue'
      : '1010 - Digital Cash (USDC on NEAR)';

    const stealthStatus = rec.claimedToStealthWallet
      ? `Swept to Stealth Account (${rec.claimedDestinationAccount?.slice(0, 10)}...)`
      : isPaid
        ? 'Held in NearVeil Shielded Vault (Ready to Claim)'
        : 'Awaiting Settlement';

    return [
      rec.invoiceId,
      rec.recordType,
      rec.status,
      rec.issueDateUtc,
      rec.dueDateUtc,
      rec.paidTimestampUtc || 'N/A',
      counterparty,
      reference || 'N/A',
      lineItemsText,
      rec.subtotalUsd.toFixed(2),
      rec.taxAmountUsd.toFixed(2),
      rec.totalAmountUsdc.toFixed(2),
      '0.00 (Sponsored by NearVeil Relayer)',
      netSettledUsdc,
      '1.0000',
      recognizedUsd,
      debitGl,
      creditGl,
      `${rec.selectedOriginAsset} (${rec.selectedOriginChain}) via 1Click`,
      rec.settlementTxUrl || rec.creationTxUrl,
      rec.refundTxUrl || 'N/A',
      stealthStatus,
      `sha256:${rec.stealthCommitmentHash.slice(0, 24)}...`,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

