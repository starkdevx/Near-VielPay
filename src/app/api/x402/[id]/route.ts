import { NextRequest, NextResponse } from 'next/server';
import { readLedger, writeLedger } from '@/lib/store';
import { executeRelayedContractCall, getTestnetConfig } from '@/lib/near-testnet';

/**
 * PingPay Agent Pay Facilitator (x402 Protocol) Endpoint (`/api/x402/[id]`).
 * Lets autonomous AI agents inspect and pay an x402 paywall in USDC on Base,
 * settling into the freelancer's NEAR Stealth Account.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ledger = readLedger();
  const config = getTestnetConfig();
  const invoice = ledger.invoices.find((inv) => inv.invoiceId === id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.status === 'PAID') {
    return NextResponse.json({
      protocol: 'x402/1.0',
      status: 'PAID',
      invoiceId: invoice.invoiceId,
      settlementTxUrl: invoice.settlementTxUrl,
    });
  }

  return NextResponse.json(
    {
      protocol: 'x402/1.0',
      facilitator: 'PingPay Agent Pay Facilitator (Base USDC -> NEAR Settlement)',
      status: 'PAYMENT_REQUIRED',
      invoiceId: invoice.invoiceId,
      amountUsdc: invoice.totalAmountUsdc.toFixed(2),
      originNetwork: 'eip155:8453 (Base)',
      originAsset: 'USDC',
      destinationNetwork: 'near:testnet',
      destinationRecipient: invoice.stealthImplicitAccount,
      nearVaultContract: config.contractAccountId,
      instructions:
        'Attach X-PAYMENT header signed for PingPay Facilitator or POST to /api/x402/[id] to execute agent settlement.',
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Facilitator': 'https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator',
        'X-Payment-Amount-USDC': invoice.totalAmountUsdc.toFixed(2),
        'X-Payment-Destination-NEAR': invoice.stealthImplicitAccount,
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ledger = readLedger();
  const config = getTestnetConfig();
  const invoice = ledger.invoices.find((inv) => inv.invoiceId === id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const paidAtUtc = new Date().toISOString();
  const relayResult = await executeRelayedContractCall({
    targetContractId: config.contractAccountId,
    methodName: 'settle_invoice_1click',
    args: {
      invoice_id: invoice.invoiceId,
      origin_rail: 'USDC (Base) via PingPay x402 Agent Facilitator',
      stealth_commitment_hash: invoice.stealthCommitmentHash,
      ephemeral_pubkey_hex: invoice.ephemeralPubKeyHex,
      view_tag: invoice.viewTag,
      amount_usdc_cents: Math.round(invoice.totalAmountUsdc * 100),
      paid_at_utc: paidAtUtc,
    },
  });

  invoice.status = 'PAID';
  invoice.paidTimestampUtc = paidAtUtc;
  invoice.selectedOriginAsset = 'USDC (Base via x402)';
  invoice.selectedOriginChain = 'Base (PingPay x402)';
  invoice.settlementTxHash = relayResult.txHash;
  invoice.settlementTxUrl = relayResult.txUrl;
  writeLedger(ledger);

  return NextResponse.json({
    protocol: 'x402/1.0',
    facilitator: 'PingPay',
    status: 'PAID',
    invoice,
    relayResult,
  });
}

