# NearVeil — Gasless Invoicing & Private Payroll for Real Businesses

> **Built for the NEAR Hackathon · Track 08: Real-World Money (`realworld`)**  
> *Bring the boring money onchain: Gasless Freelancer Invoicing, Cross-Chain Client Payments (1Click API), Umbra-Style Private Payroll on NEAR Testnet, and Zero-Question Bookkeeper Exports.*

---

## Part 1: A Guide for Bookkeepers, CPAs & Finance Teams (Read This First)

If you manage bookkeeping, payroll reconciliation, or tax preparation for a freelancer or a growing business, **you do not need to know anything about cryptocurrency to audit or reconcile records from NearVeil.**

Here is everything you need to know to close your books at the end of the month without asking a single follow-up question:

### 1. What Currency Are We Using?
- Every invoice issued and every payroll run settled through NearVeil is denominated in and paid out in **Digital US Dollars (`USDC`)**, pegged **1:1 to $1.00 USD**.
- Even if a client pays an invoice using a foreign digital asset (like Solana, Ethereum, or Arbitrum tokens), NearVeil's automated payment processor (**1Click Settlement Rail**) converts the payment before it reaches your client's ledger so that **the exact USD invoice total arrives in `USDC` down to the cent.**
- There are **no exchange-rate gains or losses** for the recipient to calculate on invoice settlement.

### 2. Why Is the "Network / Gas Fee" Always `$0.00`?
- Normally, blockchain software forces freelancers and employees to buy volatile tokens (like `NEAR` or `ETH`) to pay "gas fees" every time they send an invoice or move their money—creating a nightmare of tiny $0.02 capital-gains entries on your general ledger.
- **NearVeil eliminates this completely.** All network transaction fees for creating invoices and claiming payouts are sponsored by NearVeil's **Meta-Transaction Relayer**.
- On your General Ledger and CSV exports, `Network_Fee_Paid_By_Freelancer_USD` is **always `$0.00`**. You never have to reconcile gas tokens.

### 3. How Does "Umbra-Style Private Payroll" Work for Auditing?
When a business pays contractors or employees on a public blockchain, anyone on the internet can usually look up the company's account and see every employee's name/wallet and exact salary.

NearVeil protects your company's confidential compensation data while keeping your audit trail **100% transparent to you (the bookkeeper)**:
1. **What the Public Sees**: When payroll or an invoice is paid, funds are deposited into the **NearVeil Shielded Vault** using a one-time cryptographic commitment (`Commitment_Hash`). When the employee or freelancer claims their pay, our Relayer sends the `USDC` to an unlinked one-time account. Competitors cannot see who works for the company or what anyone earns.
2. **What You (The Bookkeeper) See**: Your client provides you with a read-only **Bookkeeper Viewing Key** (e.g., `vk_nearveil_...`).
   - Entering this Viewing Key in the **Bookkeeper & Audit Portal** decrypts every invoice and payroll line item in your browser.
   - A Viewing Key **cannot move or spend money**—it is strictly a read-only auditor key, just like "View-Only Accountant Access" in QuickBooks Online, Xero, or Gusto.

### 4. How to Reconcile Payment Statuses (`PAID`, `PENDING`, `REFUNDED`)
Every invoice and payroll item has one of three accounting statuses, backed by a permanent, timestamped digital receipt URL (`NEAR_Settlement_Tx_URL`):
- **`PENDING`**: The invoice has been issued (Accounts Receivable / `1200`), or the payroll batch has been drafted, but funds have not yet settled.
- **`PAID`**: The exact `USDC` amount has been verified and credited on-chain. The CSV includes the exact `Paid_Timestamp_UTC` and a clickable receipt link (`https://testnet.nearblocks.io/txns/...`) showing the immutable bank-equivalent confirmation.
- **`REFUNDED`**: If a client overpaid, cancelled, or received a credit memo, the funds were returned to the client's origin account. Both the original payment receipt URL and the `Refund_Tx_URL` are recorded side-by-side so the net revenue impact reconciles to `$0.00`.

### 5. Reading the "Zero-Question Accountant CSV Export"
When you click **Export Accountant CSV**, the downloaded spreadsheet opens directly in Excel, Google Sheets, QuickBooks, or Xero with the following self-explanatory columns:

| Column Name | What It Means for Your Books | Example Value |
| :--- | :--- | :--- |
| `Record_ID` | Unique Invoice or Payroll Slip Number | `INV-2026-1042` / `PAY-2026-089` |
| `Record_Type` | `AR_INVOICE` (Income) or `AP_PAYROLL` (Expense) | `AR_INVOICE` |
| `Status` | Current state (`PAID`, `PENDING`, or `REFUNDED`) | `PAID` |
| `Issue_Date_UTC` | Date the invoice or pay run was created (Accrual Date) | `2026-11-14` |
| `Due_Date_UTC` | Payment due date for AR aging reports | `2026-11-28` |
| `Paid_Timestamp_UTC` | Exact UTC timestamp funds settled (Cash-Basis Date) | `2026-11-14T00:15:30Z` |
| `Counterparty_Name` | Client Name (for Invoices) or Contractor Name (for Payroll) | `Acme Design Studio LLC` |
| `Reference_Or_Tax_ID` | Purchase Order #, Contract Ref, or W-9/W-8BEN Ref | `PO-2026-881` |
| `Line_Items_Breakdown` | Semicolon-separated list of billable items & quantities | `UI Architecture (20h @ $85/h); Design System ($800)` |
| `Subtotal_USD` | Gross amount before tax | `2500.00` |
| `Tax_Amount_USD` | Sales tax / VAT / withholding amount | `0.00` |
| `Total_Invoice_USD` | Total USD billed | `2500.00` |
| `Gas_Fee_Paid_By_User_USD` | Always `$0.00` (Sponsored by NearVeil Relayer) | `0.00` |
| `Net_Settled_USDC` | Exact `USDC` units received or disbursed | `2500.00` |
| `USDC_USD_Exchange_Rate` | Spot rate at settlement (`1.0000`) | `1.0000` |
| `Recognized_USD_Value` | Final USD amount for tax & P&L reporting | `2500.00` |
| `Debit_GL_Account` | Standard Chart of Accounts Debit mapping | `1010 - Digital Cash (USDC)` |
| `Credit_GL_Account` | Standard Chart of Accounts Credit mapping | `4000 - Consulting & Freelance Revenue` |
| `Client_Origin_Payment_Rail` | How the client paid (e.g., 1Click Cross-Chain or x402) | `SOL (Solana) -> USDC (NEAR) via 1Click` |
| `NEAR_Settlement_Tx_URL` | Clickable link to permanent on-chain settlement receipt | `https://testnet.nearblocks.io/txns/...` |
| `Refund_Tx_URL` | Clickable link to refund receipt (if `REFUNDED`, else `N/A`) | `N/A` |
| `Stealth_Commitment_Hash` | Cryptographic proof linking private claim to this record | `sha256:9f82a4...` |

---

## Part 2: Technical Overview (For Hackathon Judges & Developers)

**NearVeil** brings together all core pillars of the **NEAR Real-World Money Track (`realworld`)** plus **Umbra-style Private Payrolls natively on NEAR Testnet**:

1. **Cross-Chain Client Payments via 1Click API (`/api/oneclick`)**:
   - Integrates the [NEAR Intents 1Click API](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart) (`/v0/tokens`, `/v0/quote`, `/v0/status`) so a client can select whatever token and chain they already hold (`SOL`, `Base USDC`, `Arbitrum USDT`, `ETH`, or `NEAR`), while the freelancer receives `USDC` on NEAR.
   - **100% Testnet Playable**: Since the mainnet 1Click solver requires real funds, NearVeil pairs live 1Click API token/quote pricing with an **On-Chain NEAR Testnet Solver** (`rpc.testnet.near.org`) so judges can execute complete cross-chain invoice payments, refunds, and batch payrolls on **NEAR Testnet with $0 of real money**, producing real, verifiable transactions on `https://testnet.nearblocks.io`.
2. **Gasless Freelancer & Employee UX via Whitelisted Meta-Transaction Relayer (`/api/relay`)**:
   - Implements the [NEAR Meta-Transaction Relayer pattern (NEP-366 / Sponsored Relayer)](https://docs.near.org/web3-apps/tutorials/meta-transactions).
   - Freelancers and employees sign actions locally with an `ed25519` keypair (`0 NEAR` balance).
   - Our Relayer strictly enforces a **contract & method allowlist**—it **only** sponsors gas for calls targeting our own NearVeil contract methods (`create_invoice`, `claim_stealth_payout`, `register_stealth_meta`).
3. **Umbra-Style Private Payroll & Stealth Settlement on NEAR**:
   - Inspired by Solana Umbra, adapted specifically for NEAR's account and key model:
     - **Pooled Commitment Vault**: When an invoice is paid or an employer funds a batch payroll for multiple contractors, funds settle into the NearVeil Vault on NEAR Testnet against one-time cryptographic commitments (`SHA-256(claim_secret + record_id)`). No employee wallet addresses appear in the funding transaction.
     - **Unlinkable Gasless Stealth Sweeps**: Recipients use their one-time `claim_secret` to withdraw their `USDC` through the Gasless Relayer into a freshly generated **64-character hex NEAR Implicit Stealth Account** (`ed25519` public key)—breaking the on-chain link between payer and recipient while requiring zero gas from the recipient.
     - **Selective Disclosure via Viewing Keys**: Invoice line items and salary details are encrypted with `AES-GCM` using an organization/freelancer **Viewing Key**, enabling bookkeepers to audit everything and export the CSV while keeping public blockchain observers in the dark.
4. **PingPay x402 Machine-Payable Invoices (`/api/x402/[id]`)**:
   - Every invoice exposes an **x402 Agent Paywall endpoint** compatible with the [PingPay Agent Pay Facilitator](https://pingpay.gitbook.io/docs/pingpay-api/agent-pay-facilitator), allowing autonomous AI agents to pay `HTTP 402 Payment Required` invoices in USDC on Base and settle on NEAR.

---

## Part 3: Quickstart (Run & Test on NEAR Testnet in 60 Seconds)

```bash
# 1. Install dependencies
npm install

# 2. Initialize / verify live NEAR Testnet Relayer & Vault accounts (free via Testnet Faucet)
npm run setup:testnet

# 3. Start the application on localhost
npm run dev
```

Open `http://127.0.0.1:3000` in your browser:
1. **Create a Gasless Invoice**: Add line items and click **Create Invoice (0 Gas via Relayer)**—watch it confirm live on NEAR Testnet with a `testnet.nearblocks.io` link.
2. **Pay the Invoice (`/invoice/[id]`)**: Open the shareable client invoice page, choose any chain/token via the **1Click API** widget (or x402 Agent Pay), and click **Pay Invoice on Testnet**—watch the status update from `PENDING` $\rightarrow$ `PAID` (and optionally test `REFUNDED`) with clickable NEAR Testnet transaction links.
3. **Sweep Privately (Umbra Stealth Claim)**: Click **Claim to Fresh Stealth Account (0 Gas)** to sweep the `USDC` to an unlinked NEAR Testnet address via the Relayer.
4. **Run Private Batch Payroll (`/payroll`)**: Fund a multi-contractor payroll batch in one lump-sum transaction and generate unlinkable employee claim links.
5. **Export the Bookkeeper CSV (`/accounting`)**: Verify with the **Bookkeeper Viewing Key** and download the **Zero-Question Accountant CSV**.

