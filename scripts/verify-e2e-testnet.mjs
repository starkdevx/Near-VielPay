import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function runVerification() {
  console.log('=== NearVeil E2E NEAR Testnet Verification ===\n');

  // 1. Fetch initial dashboard & testnet config
  const initRes = await fetch(`${BASE_URL}/api/invoices`);
  assert.strictEqual(initRes.status, 200, 'GET /api/invoices should return 200');
  const initData = await initRes.json();
  console.log('1. NEAR Testnet Vault:', initData.testnetInfo.contractAccountId);
  console.log('   NEAR Testnet Relayer:', initData.testnetInfo.relayerAccountId);
  console.log('   Bookkeeper Viewing Key:', initData.testnetInfo.defaultViewingKey);

  // 2. Create a Gasless Freelancer Invoice on NEAR Testnet
  const createRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_invoice',
      clientName: 'Stellar Biotech Corp',
      clientReference: 'INV-BIO-901',
      freelancerAccount: 'maya-design.testnet',
      dueDateUtc: '2026-12-01',
      taxRatePercent: 0,
      lineItems: [
        {
          description: 'Frontend Dashboard & UX Audit',
          quantity: 12,
          unitPriceUsd: 125,
        },
      ],
    }),
  });
  assert.strictEqual(createRes.status, 200, 'create_invoice should return 200');
  const created = await createRes.json();
  const invoiceId = created.invoice.invoiceId;
  console.log(`\n2. Created Gasless Invoice ${invoiceId} ($${created.invoice.totalAmountUsdc} USDC)`);
  console.log('   Creation Tx URL:', created.invoice.creationTxUrl);
  console.log('   Derived Stealth Account:', created.invoice.stealthImplicitAccount);

  // 3. Request a 1Click API Cross-Chain Quote
  const quoteRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'quote_1click',
      invoiceId,
      originAssetId:
        'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
    }),
  });
  assert.strictEqual(quoteRes.status, 200, 'quote_1click should return 200');
  const quoteData = await quoteRes.json();
  console.log(`\n3. 1Click Quote Generated: ${quoteData.quote.amountInFormatted} -> ${quoteData.quote.amountOutUsdc} USDC`);
  console.log('   1Click Deposit Address:', quoteData.quote.depositAddress);

  // 4. Pay Invoice via 1Click Testnet Solver
  const payRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'pay_invoice_1click',
      invoiceId,
      originAssetSymbol: 'SOL',
      originChain: 'Solana',
    }),
  });
  assert.strictEqual(payRes.status, 200, 'pay_invoice_1click should return 200');
  const paidData = await payRes.json();
  assert.strictEqual(paidData.invoice.status, 'PAID');
  console.log(`\n4. Invoice ${invoiceId} Paid on NEAR Testnet!`);
  console.log('   Settlement Tx URL:', paidData.invoice.settlementTxUrl);

  // 5. Sweep USDC Gaslessly to Unlinked Stealth Account
  const claimRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'claim_stealth',
      invoiceId,
      claimSecret: paidData.invoice.claimSecretHint,
    }),
  });
  assert.strictEqual(claimRes.status, 200, 'claim_stealth should return 200');
  const claimData = await claimRes.json();
  assert.strictEqual(claimData.invoice.claimedToStealthWallet, true);
  console.log(`\n5. Gasless Umbra Stealth Sweep Complete!`);
  console.log('   Stealth Destination:', claimData.invoice.claimedDestinationAccount);
  console.log('   Stealth Claim Tx URL:', claimData.invoice.stealthClaimTxUrl);

  // 6. Execute Umbra Private Batch Payroll
  const payrollRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_private_payroll',
      companyName: 'NearVeil Labs',
      payPeriodLabel: 'Nov 2026 Batch #1',
      fundingOriginChain: 'Solana',
      fundingOriginAsset: 'SOL',
      recipients: [
        {
          id: 'p1',
          contractorName: 'Devon Brooks',
          roleOrDepartment: 'Smart Contracts',
          referenceCode: 'EMP-201',
          amountUsdc: 3200,
        },
        {
          id: 'p2',
          contractorName: 'Sora Takahashi',
          roleOrDepartment: 'Cryptography',
          referenceCode: 'EMP-202',
          amountUsdc: 3900,
        },
      ],
    }),
  });
  assert.strictEqual(payrollRes.status, 200, 'create_private_payroll should return 200');
  const payrollData = await payrollRes.json();
  console.log(`\n6. Umbra Private Payroll Batch ${payrollData.batch.batchId} Committed!`);
  console.log('   Pooled Batch Tx URL:', payrollData.batch.fundingTxUrl);

  // 7. Verify Relayer Rejects Foreign Contract Calls
  const badRelayRes = await fetch(`${BASE_URL}/api/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetContractId: 'unauthorized-contract.testnet',
      methodName: 'create_invoice',
      args: {},
    }),
  });
  assert.strictEqual(
    badRelayRes.status,
    403,
    'Relayer must reject calls to non-whitelisted contracts with 403'
  );
  console.log('\n7. Relayer Whitelist Security Check Passed (HTTP 403 on foreign contract).');

  // 8. Verify Bookkeeper CSV Export
  const csvRes = await fetch(
    `${BASE_URL}/api/invoices?format=csv&viewingKey=${encodeURIComponent(
      initData.testnetInfo.defaultViewingKey
    )}`
  );
  assert.strictEqual(csvRes.status, 200, 'CSV export should return 200');
  const csvText = await csvRes.text();
  assert(csvText.includes('Record_ID,Record_Type,Status'), 'CSV headers present');
  assert(csvText.includes(invoiceId), 'CSV contains newly paid invoice');
  console.log('\n8. Bookkeeper Zero-Question CSV Export Verified!');
  console.log('=== ALL NEAR TESTNET CHECKS PASSED ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

