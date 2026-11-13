import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { KeyPair } from 'near-api-js';
import { readLedger, writeLedger } from '@/lib/store';
import {
  ALLOWED_RELAYER_METHODS,
  executeRelayedContractCall,
  getTestnetConfig,
} from '@/lib/near-testnet';
import {
  decryptViewingNote,
  generateStealthBundle,
  verifyClaimCommitment,
} from '@/lib/umbra-stealth';
import {
  createOneClickQuote,
  fetchOneClickTokens,
} from '@/lib/oneclick-service';
import { generateAccountantCsv } from '@/lib/csv-exporter';
import { InvoiceLineItem, NearVeilInvoice, PayrollRecipientInput } from '@/lib/types';

// Simple in-memory rate limiter per IP for API protection
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= 120;
}

// TODO(security): For multi-tenant production deployment, integrate OAuth2/OIDC + MFA and CSRF synchronizer tokens.

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const config = getTestnetConfig();
  const ledger = readLedger();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const viewingKey = searchParams.get('viewingKey') || config.defaultViewingKey;

  if (format === 'csv') {
    const csvContent = generateAccountantCsv(ledger.invoices, viewingKey);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="NearVeil_Bookkeeper_Ledger.csv"',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }

  const { tokens, liveApiConnected } = await fetchOneClickTokens();

  // Check if the supplied viewingKey is valid for decrypting notes
  const sampleNote = ledger.invoices[0]?.encryptedViewingNote;
  const viewingKeyValid = sampleNote
    ? Boolean(decryptViewingNote(sampleNote, viewingKey))
    : viewingKey === config.defaultViewingKey;

  return NextResponse.json({
    testnetInfo: {
      networkId: config.networkId,
      rpcUrl: config.rpcUrl,
      explorerBaseUrl: config.explorerBaseUrl,
      contractAccountId: config.contractAccountId,
      relayerAccountId: config.relayerAccountId,
      liveTestnetFunded: config.liveTestnetFunded,
      deployTxHash: config.deployTxHash,
      deployTxUrl: config.deployTxHash
        ? `${config.explorerBaseUrl}/txns/${config.deployTxHash}`
        : null,
      defaultViewingKey: config.defaultViewingKey,
      allowedRelayerMethods: Array.from(ALLOWED_RELAYER_METHODS),
      oneClickLivePricing: liveApiConnected,
    },
    faucetUsdcBalance: ledger.faucetUsdcBalance,
    stealthClaimedBalanceUsdc: ledger.stealthClaimedBalanceUsdc,
    viewingKeyValid,
    oneClickTokens: tokens,
    invoices: ledger.invoices,
    payrollBatches: ledger.payrollBatches,
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || '');
    const config = getTestnetConfig();
    const ledger = readLedger();

    // 1. Gasless Invoice Creation (Routed via Whitelisted Relayer -> NearVeil Contract)
    if (action === 'create_invoice') {
      const clientName = String(body.clientName || '').trim().slice(0, 120);
      const clientReference = String(body.clientReference || 'PO-2026').trim().slice(0, 80);
      const freelancerAccount = String(
        body.freelancerAccount || 'freelancer-studio.testnet'
      )
        .trim()
        .slice(0, 80);
      const dueDateUtc = String(body.dueDateUtc || '2026-11-30').slice(0, 20);
      const taxRatePercent = Math.max(0, Math.min(50, Number(body.taxRatePercent || 0)));
      const rawItems = Array.isArray(body.lineItems) ? body.lineItems : [];

      if (!clientName || rawItems.length === 0) {
        return NextResponse.json(
          { error: 'Client name and at least one line item are required.' },
          { status: 400 }
        );
      }

      const lineItems: InvoiceLineItem[] = rawItems.slice(0, 20).map((item: Record<string, unknown>, idx: number) => ({
        id: `li-${idx + 1}`,
        description: String(item.description || 'Consulting Service').trim().slice(0, 160),
        quantity: Math.max(1, Math.min(10_000, Number(item.quantity || 1))),
        unitPriceUsd: Math.max(0.01, Math.min(1_000_000, Number(item.unitPriceUsd || 100))),
      }));

      const subtotalUsd = Number(
        lineItems.reduce((sum, li) => sum + li.quantity * li.unitPriceUsd, 0).toFixed(2)
      );
      const taxAmountUsd = Number(((subtotalUsd * taxRatePercent) / 100).toFixed(2));
      const totalAmountUsdc = Number((subtotalUsd + taxAmountUsd).toFixed(2));

      const invoiceId = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const issueDateUtc = new Date().toISOString().slice(0, 10);
      const lineItemsSummary = lineItems
        .map((li) => `${li.description} (${li.quantity} x $${li.unitPriceUsd.toFixed(2)})`)
        .join('; ');

      const stealthBundle = generateStealthBundle(
        invoiceId,
        {
          recordId: invoiceId,
          recordType: 'AR_INVOICE',
          counterpartyName: clientName,
          referenceCode: clientReference,
          lineItemsSummary,
          subtotalUsd,
          taxAmountUsd,
          totalUsdc: totalAmountUsdc,
          issuedAtUtc: issueDateUtc,
        },
        config.defaultViewingKey
      );

      // Execute REAL on-chain call on NEAR Testnet via the Whitelisted Relayer!
      const relayResult = await executeRelayedContractCall({
        targetContractId: config.contractAccountId,
        methodName: 'create_invoice',
        args: {
          invoice_id: invoiceId,
          freelancer_account: freelancerAccount,
          total_usdc_cents: Math.round(totalAmountUsdc * 100),
          stealth_commitment_hash: stealthBundle.stealthCommitmentHash,
          view_tag: stealthBundle.viewTag,
        },
      });

      const newInvoice: NearVeilInvoice = {
        invoiceId,
        recordType: 'AR_INVOICE',
        freelancerAccount,
        clientName,
        clientReference,
        issueDateUtc,
        dueDateUtc,
        paidTimestampUtc: null,
        refundedTimestampUtc: null,
        lineItems,
        subtotalUsd,
        taxRatePercent,
        taxAmountUsd,
        totalAmountUsdc,
        status: 'PENDING',
        privacyEnabled: true,
        stealthImplicitAccount: stealthBundle.stealthImplicitAccount,
        ephemeralPubKeyHex: stealthBundle.ephemeralPubKeyHex,
        viewTag: stealthBundle.viewTag,
        stealthCommitmentHash: stealthBundle.stealthCommitmentHash,
        encryptedViewingNote: stealthBundle.encryptedViewingNote,
        claimSecretHint: stealthBundle.claimSecret,
        claimedToStealthWallet: false,
        claimedDestinationAccount: null,
        selectedOriginAsset: 'SOL',
        selectedOriginChain: 'Solana',
        oneClickQuoteId: null,
        oneClickDepositAddress: null,
        originInputAmount: null,
        creationTxHash: relayResult.txHash,
        creationTxUrl: relayResult.txUrl,
        settlementTxHash: null,
        settlementTxUrl: null,
        refundTxHash: null,
        refundTxUrl: null,
        stealthClaimTxHash: null,
        stealthClaimTxUrl: null,
        relayerSponsoredGasNear: relayResult.gasSponsoredNear,
      };

      ledger.invoices.unshift(newInvoice);
      writeLedger(ledger);

      return NextResponse.json({
        invoice: newInvoice,
        relayResult,
      });
    }

    // 2. Request a 1Click Cross-Chain Quote for an Invoice
    if (action === 'quote_1click') {
      const invoiceId = String(body.invoiceId || '');
      const originAssetId = String(body.originAssetId || '');
      const invoice = ledger.invoices.find((i) => i.invoiceId === invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const quote = await createOneClickQuote({
        originAssetId,
        amountOutUsdc: invoice.totalAmountUsdc,
        recipientStealthAccount: invoice.stealthImplicitAccount,
        invoiceId: invoice.invoiceId,
      });

      invoice.selectedOriginAsset = quote.originSymbol;
      invoice.selectedOriginChain = quote.originChain;
      invoice.oneClickQuoteId = quote.quoteId;
      invoice.oneClickDepositAddress = quote.depositAddress;
      invoice.originInputAmount = quote.amountInFormatted;
      writeLedger(ledger);

      return NextResponse.json({ quote, invoice });
    }

    // 3. Pay / Settle an Invoice via 1Click API Testnet Solver
    if (action === 'pay_invoice_1click') {
      const invoiceId = String(body.invoiceId || '');
      const originAssetSymbol = String(body.originAssetSymbol || 'SOL');
      const originChain = String(body.originChain || 'Solana');
      const invoice = ledger.invoices.find((i) => i.invoiceId === invoiceId);

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (invoice.status === 'PAID') {
        return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
      }

      const paidAtUtc = new Date().toISOString();
      const relayResult = await executeRelayedContractCall({
        targetContractId: config.contractAccountId,
        methodName: 'settle_invoice_1click',
        args: {
          invoice_id: invoice.invoiceId,
          origin_rail: `${originAssetSymbol} (${originChain}) -> NEAR USDC via 1Click`,
          stealth_commitment_hash: invoice.stealthCommitmentHash,
          ephemeral_pubkey_hex: invoice.ephemeralPubKeyHex,
          view_tag: invoice.viewTag,
          amount_usdc_cents: Math.round(invoice.totalAmountUsdc * 100),
          paid_at_utc: paidAtUtc,
        },
      });

      invoice.status = 'PAID';
      invoice.paidTimestampUtc = paidAtUtc;
      invoice.selectedOriginAsset = originAssetSymbol;
      invoice.selectedOriginChain = originChain;
      invoice.settlementTxHash = relayResult.txHash;
      invoice.settlementTxUrl = relayResult.txUrl;
      ledger.faucetUsdcBalance = Math.max(
        0,
        Number((ledger.faucetUsdcBalance - invoice.totalAmountUsdc).toFixed(2))
      );
      writeLedger(ledger);

      return NextResponse.json({
        invoice,
        relayResult,
      });
    }

    // 4. Refund a Paid Invoice on NEAR Testnet
    if (action === 'refund_invoice') {
      const invoiceId = String(body.invoiceId || '');
      const invoice = ledger.invoices.find((i) => i.invoiceId === invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const refundedAtUtc = new Date().toISOString();
      const relayResult = await executeRelayedContractCall({
        targetContractId: config.contractAccountId,
        methodName: 'refund_invoice',
        args: {
          invoice_id: invoice.invoiceId,
          refund_to_origin_chain: invoice.selectedOriginChain,
          amount_usdc_cents: Math.round(invoice.totalAmountUsdc * 100),
          refunded_at_utc: refundedAtUtc,
        },
      });

      invoice.status = 'REFUNDED';
      invoice.refundedTimestampUtc = refundedAtUtc;
      invoice.refundTxHash = relayResult.txHash;
      invoice.refundTxUrl = relayResult.txUrl;
      ledger.faucetUsdcBalance = Number(
        (ledger.faucetUsdcBalance + invoice.totalAmountUsdc).toFixed(2)
      );
      writeLedger(ledger);

      return NextResponse.json({
        invoice,
        relayResult,
      });
    }

    // 5. Gasless Umbra Stealth Claim (Sweeps USDC from Shielded Vault to Fresh Unlinked Account)
    if (action === 'claim_stealth') {
      const invoiceId = String(body.invoiceId || '');
      const invoice = ledger.invoices.find((i) => i.invoiceId === invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }
      if (invoice.status !== 'PAID') {
        return NextResponse.json(
          { error: 'Only PAID records can be swept to a stealth account' },
          { status: 400 }
        );
      }
      if (invoice.claimedToStealthWallet) {
        return NextResponse.json(
          { error: 'This stealth commitment has already been claimed' },
          { status: 400 }
        );
      }

      const claimSecret = String(body.claimSecret || invoice.claimSecretHint || '').trim();
      if (
        !verifyClaimCommitment(
          claimSecret,
          invoice.invoiceId,
          invoice.stealthCommitmentHash
        )
      ) {
        return NextResponse.json(
          { error: 'Invalid stealth claim secret for this commitment hash' },
          { status: 403 }
        );
      }

      // Generate or use a fresh unlinked 64-char hex NEAR Stealth Implicit Account
      const customDest = String(body.destinationStealthAccount || '').trim();
      const destinationAccount =
        customDest ||
        invoice.stealthImplicitAccount ||
        Buffer.from(KeyPair.fromRandom('ed25519').getPublicKey().data).toString('hex');

      const relayResult = await executeRelayedContractCall({
        targetContractId: config.contractAccountId,
        methodName: 'claim_stealth_payout',
        args: {
          record_id: invoice.invoiceId,
          commitment_hash: invoice.stealthCommitmentHash,
          stealth_destination: destinationAccount,
          amount_usdc_cents: Math.round(invoice.totalAmountUsdc * 100),
        },
      });

      invoice.claimedToStealthWallet = true;
      invoice.claimedDestinationAccount = destinationAccount;
      invoice.stealthClaimTxHash = relayResult.txHash;
      invoice.stealthClaimTxUrl = relayResult.txUrl;
      ledger.stealthClaimedBalanceUsdc = Number(
        (ledger.stealthClaimedBalanceUsdc + invoice.totalAmountUsdc).toFixed(2)
      );
      writeLedger(ledger);

      return NextResponse.json({
        invoice,
        relayResult,
      });
    }

    // 6. Execute Umbra-Style Private Batch Payroll on NEAR Testnet
    if (action === 'create_private_payroll') {
      const companyName = String(body.companyName || 'Acme Corp').trim().slice(0, 100);
      const payPeriodLabel = String(body.payPeriodLabel || 'Nov 2026 Bi-Weekly').trim().slice(0, 80);
      const fundingOriginChain = String(body.fundingOriginChain || 'NEAR Testnet');
      const fundingOriginAsset = String(body.fundingOriginAsset || 'USDC (NEAR Testnet)');
      const recipients: PayrollRecipientInput[] = Array.isArray(body.recipients)
        ? body.recipients
        : [];

      if (recipients.length === 0) {
        return NextResponse.json(
          { error: 'Add at least one payroll recipient' },
          { status: 400 }
        );
      }

      const batchId = `BATCH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const nowIso = new Date().toISOString();
      const issueDate = nowIso.slice(0, 10);

      const createdSlips: NearVeilInvoice[] = [];
      const onChainCommitments: Array<{
        commitment_hash: string;
        ephemeral_pubkey: string;
        view_tag: string;
      }> = [];

      let totalBatchUsdc = 0;

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const amountUsdc = Math.max(1, Number(r.amountUsdc || 1000));
        totalBatchUsdc += amountUsdc;
        const slipId = `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const lineDesc = `Private Payroll (${payPeriodLabel}) - ${r.roleOrDepartment || 'Engineering'}`;

        const bundle = generateStealthBundle(
          slipId,
          {
            recordId: slipId,
            recordType: 'AP_PAYROLL',
            counterpartyName: String(r.contractorName || `Contractor #${i + 1}`),
            referenceCode: String(r.referenceCode || `EMP-${i + 101}`),
            lineItemsSummary: `${lineDesc} (1 x $${amountUsdc.toFixed(2)})`,
            subtotalUsd: amountUsdc,
            taxAmountUsd: 0,
            totalUsdc: amountUsdc,
            issuedAtUtc: issueDate,
          },
          config.defaultViewingKey
        );

        onChainCommitments.push({
          commitment_hash: bundle.stealthCommitmentHash,
          ephemeral_pubkey: bundle.ephemeralPubKeyHex,
          view_tag: bundle.viewTag,
        });

        createdSlips.push({
          invoiceId: slipId,
          recordType: 'AP_PAYROLL',
          freelancerAccount: bundle.stealthImplicitAccount,
          clientName: String(r.contractorName || `Contractor #${i + 1}`),
          clientReference: String(r.referenceCode || `EMP-${i + 101}`),
          issueDateUtc: issueDate,
          dueDateUtc: issueDate,
          paidTimestampUtc: nowIso,
          refundedTimestampUtc: null,
          lineItems: [
            {
              id: 'pay-1',
              description: lineDesc,
              quantity: 1,
              unitPriceUsd: amountUsdc,
            },
          ],
          subtotalUsd: amountUsdc,
          taxRatePercent: 0,
          taxAmountUsd: 0,
          totalAmountUsdc: amountUsdc,
          status: 'PAID',
          privacyEnabled: true,
          stealthImplicitAccount: bundle.stealthImplicitAccount,
          ephemeralPubKeyHex: bundle.ephemeralPubKeyHex,
          viewTag: bundle.viewTag,
          stealthCommitmentHash: bundle.stealthCommitmentHash,
          encryptedViewingNote: bundle.encryptedViewingNote,
          claimSecretHint: bundle.claimSecret,
          claimedToStealthWallet: false,
          claimedDestinationAccount: null,
          selectedOriginAsset: fundingOriginAsset,
          selectedOriginChain: fundingOriginChain,
          oneClickQuoteId: `1click_batch_${batchId.toLowerCase()}`,
          oneClickDepositAddress: config.contractAccountId,
          originInputAmount: `${totalBatchUsdc.toFixed(2)} USDC`,
          creationTxHash: '',
          creationTxUrl: '',
          settlementTxHash: '',
          settlementTxUrl: '',
          refundTxHash: null,
          refundTxUrl: null,
          stealthClaimTxHash: null,
          stealthClaimTxUrl: null,
          relayerSponsoredGasNear: '0.00042 NEAR ($0.00 to Employee)',
        });
      }

      // Single pooled on-chain transaction on NEAR Testnet: NO employee names or wallets on-chain!
      const relayResult = await executeRelayedContractCall({
        targetContractId: config.contractAccountId,
        methodName: 'create_private_payroll_batch',
        args: {
          batch_id: batchId,
          recipient_count: createdSlips.length,
          commitments: onChainCommitments,
        },
      });

      for (const slip of createdSlips) {
        slip.creationTxHash = relayResult.txHash;
        slip.creationTxUrl = relayResult.txUrl;
        slip.settlementTxHash = relayResult.txHash;
        slip.settlementTxUrl = relayResult.txUrl;
        ledger.invoices.unshift(slip);
      }

      const batchRecord = {
        batchId,
        companyName,
        payPeriodLabel,
        createdAtUtc: nowIso,
        fundingOriginChain,
        fundingOriginAsset,
        totalAmountUsdc: Number(totalBatchUsdc.toFixed(2)),
        recipientCount: createdSlips.length,
        fundingTxHash: relayResult.txHash,
        fundingTxUrl: relayResult.txUrl,
        invoiceIds: createdSlips.map((s) => s.invoiceId),
      };

      ledger.payrollBatches.unshift(batchRecord);
      ledger.faucetUsdcBalance = Math.max(
        0,
        Number((ledger.faucetUsdcBalance - totalBatchUsdc).toFixed(2))
      );
      writeLedger(ledger);

      return NextResponse.json({
        batch: batchRecord,
        slips: createdSlips,
        relayResult,
      });
    }

    // 7. Mint Free Testnet USDC Faucet
    if (action === 'mint_faucet_usdc') {
      ledger.faucetUsdcBalance = Number((ledger.faucetUsdcBalance + 10000).toFixed(2));
      writeLedger(ledger);
      return NextResponse.json({
        faucetUsdcBalance: ledger.faucetUsdcBalance,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal error' },
      { status: 500 }
    );
  }
}

