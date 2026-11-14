import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readLedger, writeLedger } from '@/lib/store';
import {
  executeRelayedContractCall,
  getTestnetConfig,
} from '@/lib/near-testnet';
import { fetchOneClickTokens } from '@/lib/oneclick-service';
import { MerchantPaymentLink, MerchantReceipt } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');
  const accountId = searchParams.get('accountId');
  const ledger = readLedger();

  if (paymentId) {
    const link = ledger.merchantLinks.find(
      (l) => l.paymentId.toLowerCase() === paymentId.trim().toLowerCase()
    );
    if (!link) {
      return NextResponse.json(
        { error: 'Checkout link not found' },
        { status: 404 }
      );
    }
    const { tokens } = await fetchOneClickTokens();
    return NextResponse.json(
      { link, oneClickTokens: tokens },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!accountId) {
    return NextResponse.json(
      { merchantLinks: ledger.merchantLinks || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const normalized = accountId.trim().toLowerCase();
  const filtered = ledger.merchantLinks.filter(
    (link) =>
      link.merchantAccountId.toLowerCase() === normalized ||
      link.payments.some((p) => p.payerAccountId.toLowerCase() === normalized)
  );

  return NextResponse.json(
    { merchantLinks: filtered, allLinks: ledger.merchantLinks || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '');
    const config = getTestnetConfig();
    const ledger = readLedger();

    if (action === 'create_link') {
      const merchantAccountId = String(body.merchantAccountId || '').trim();
      const businessName = String(body.businessName || 'Merchant Store')
        .trim()
        .slice(0, 80);
      const title = String(body.title || '').trim().slice(0, 120);
      const description = String(body.description || '').trim().slice(0, 280);
      const rawImageUrl = String(body.imageUrl || '').trim().slice(0, 500);
      const amountUsdc = Number(body.amountUsdc);
      const linkType =
        body.linkType === 'ONE_TIME' ? 'ONE_TIME' : 'REUSABLE';

      if (rawImageUrl && !/^https?:\/\//i.test(rawImageUrl)) {
        return NextResponse.json(
          { error: 'Item image URL must start with https:// or http://.' },
          { status: 400 }
        );
      }

      if (!merchantAccountId) {
        return NextResponse.json(
          { error: 'Connect your NEAR wallet to create a checkout link.' },
          { status: 400 }
        );
      }
      if (!title || isNaN(amountUsdc) || amountUsdc <= 0) {
        return NextResponse.json(
          { error: 'Enter a valid item title and USDC price.' },
          { status: 400 }
        );
      }

      const paymentId = `PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const newLink: MerchantPaymentLink = {
        paymentId,
        merchantAccountId,
        businessName: businessName || merchantAccountId,
        title,
        description: description || undefined,
        imageUrl: rawImageUrl || undefined,
        amountUsdc: Number(amountUsdc.toFixed(2)),
        linkType,
        status: 'ACTIVE',
        salesCount: 0,
        totalCollectedUsdc: 0,
        createdAtUtc: new Date().toISOString(),
        payments: [],
      };

      ledger.merchantLinks.unshift(newLink);
      writeLedger(ledger);

      return NextResponse.json({ link: newLink });
    }

    if (action === 'pay_link') {
      const paymentId = String(body.paymentId || '').trim();
      const payerAccountId = String(body.payerAccountId || '').trim();
      const customerNote = String(body.customerNote || '').trim().slice(0, 200);
      const originAsset = String(body.originAsset || 'USDC').trim();
      const originChain = String(body.originChain || 'NEAR Testnet').trim();

      if (!payerAccountId) {
        return NextResponse.json(
          { error: 'Please connect your NEAR wallet to pay.' },
          { status: 400 }
        );
      }

      const link = ledger.merchantLinks.find(
        (l) => l.paymentId.toLowerCase() === paymentId.toLowerCase()
      );
      if (!link) {
        return NextResponse.json(
          { error: 'Checkout link not found.' },
          { status: 404 }
        );
      }
      if (link.status === 'ARCHIVED') {
        return NextResponse.json(
          { error: 'This checkout link has been paused by the merchant.' },
          { status: 400 }
        );
      }
      if (link.linkType === 'ONE_TIME' && link.status === 'PAID') {
        return NextResponse.json(
          { error: 'This one-time order has already been paid.' },
          { status: 400 }
        );
      }

      const receiptId = `RCPT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const providedTxHash = String(body.settlementTxHash || '').trim();
      let txHash = providedTxHash;
      let txUrl = providedTxHash
        ? `${config.explorerBaseUrl}/txns/${providedTxHash}`
        : '';

      if (!txHash) {
        const relayResult = await executeRelayedContractCall({
          targetContractId: config.contractAccountId,
          methodName: 'settle_invoice_1click',
          args: {
            invoice_id: `${link.paymentId}:${receiptId}`,
            merchant_account: link.merchantAccountId,
            payer_account: payerAccountId,
            amount_usdc: link.amountUsdc.toFixed(2),
            origin_asset: originAsset,
          },
        });
        txHash = relayResult.txHash;
        txUrl = relayResult.txUrl;
      }

      const receipt: MerchantReceipt = {
        receiptId,
        payerAccountId,
        customerNote: customerNote || undefined,
        amountUsdc: link.amountUsdc,
        originAsset,
        originChain,
        settlementTxHash: txHash,
        settlementTxUrl: txUrl,
        paidAtUtc: new Date().toISOString(),
      };

      link.payments.unshift(receipt);
      link.salesCount += 1;
      link.totalCollectedUsdc = Number(
        (link.totalCollectedUsdc + link.amountUsdc).toFixed(2)
      );
      if (link.linkType === 'ONE_TIME') {
        link.status = 'PAID';
      }

      writeLedger(ledger);
      return NextResponse.json({ link, receipt });
    }

    if (action === 'toggle_status') {
      const paymentId = String(body.paymentId || '').trim();
      const merchantAccountId = String(body.merchantAccountId || '').trim();
      const link = ledger.merchantLinks.find(
        (l) => l.paymentId.toLowerCase() === paymentId.toLowerCase()
      );
      if (!link) {
        return NextResponse.json(
          { error: 'Checkout link not found.' },
          { status: 404 }
        );
      }
      if (
        link.merchantAccountId.toLowerCase() !== merchantAccountId.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Only the merchant owner can modify this link.' },
          { status: 403 }
        );
      }
      if (link.status === 'PAID') {
        return NextResponse.json(
          { error: 'Completed one-time orders cannot be reopened.' },
          { status: 400 }
        );
      }
      link.status = link.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
      writeLedger(ledger);
      return NextResponse.json({ link });
    }

    if (action === 'sync_link') {
      const incoming = body.link as MerchantPaymentLink | undefined;
      if (!incoming || !incoming.paymentId) {
        return NextResponse.json({ error: 'Invalid link payload' }, { status: 400 });
      }
      if (!ledger.merchantLinks.some((l) => l.paymentId === incoming.paymentId)) {
        ledger.merchantLinks.unshift(incoming);
        writeLedger(ledger);
      }
      return NextResponse.json({ synced: true, link: incoming });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal error' },
      { status: 500 }
    );
  }
}
