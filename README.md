# NearPay Veil — Gasless Invoicing, Merchant Pay & Private Payroll on NEAR

> **Private Treasury, Invoicing, Merchant Checkout & Confidential Payroll on NEAR Testnet**  
> *Gasless freelancer invoicing, instant Merchant Pay in Circle USDC or NEAR via Meteor Wallet, Umbra-style private company payrolls, and Zero-Question Accountant CSV exports.*

---

## Demo Video & Screenshots

> Replace the placeholders below with your recorded demo video link and hosted screenshot URLs (or local `./docs/` image paths).

### Demo Video
- **Walkthrough Video**: `[Watch the NearPay Veil Demo Video](https://your-demo-video-link.com)`
- <!-- Optional embed / thumbnail placeholder: [![NearPay Veil Demo](https://your-image-host.com/demo-thumbnail.png)](https://your-demo-video-link.com) -->

### Screenshots

| Feature | Preview Placeholder |
| :--- | :--- |
| **Landing Page (`/`)** | `![Landing Page](https://your-image-host.com/01-landing.png)` |
| **Gasless Invoicing (`/app` & `/invoice/[id]`)** | `![Gasless Invoicing](https://your-image-host.com/02-invoicing.png)` |
| **Merchant Pay & Item Checkout (`/pay/[id]`)** | `![Merchant Checkout](https://your-image-host.com/03-merchant-checkout.png)` |
| **Private Payrolls — Company & Members (`/app`)** | `![Private Payrolls](https://your-image-host.com/04-private-payroll.png)` |
| **Bookkeeper Audit & Accountant CSV Export** | `![Bookkeeper Audit](https://your-image-host.com/05-bookkeeper-audit.png)` |

---

## Core Features

### 1. Gasless Freelancer Invoicing (`/app` & `/invoice/[id]`)
- **Zero-Gas Creation**: Freelancers create itemized invoices (`USD` / `USDC`) with **$0.00 gas** through the whitelisted **Meta-Transaction Relayer** (`/api/relay`).
- **On-Chain Settlement via Meteor Wallet**: Clients open the shareable `/invoice/[id]` link and pay directly on **NEAR Testnet** in **Circle Native USDC** (`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`) or **Native NEAR**.
- **Reliable Browser RPC Proxy**: Wallet transactions and storage checks route through a same-origin JSON-RPC proxy (`/api/near-rpc`) with multi-endpoint fallback (`fastnear`, `rpc.testnet.near.org`, `pagoda`) to prevent browser CORS/rate-limit errors.
- **Full Lifecycle Tracking**: Tracks `PENDING`, `PAID`, and `REFUNDED` statuses with clickable `testnet.nearblocks.io` transaction links and instant client/server state synchronization.

### 2. Merchant Pay & Item Checkout (`/app` & `/pay/[id]`)
- **Reusable & Single-Order Links**: Create persistent storefront links or one-time order checkout links in seconds.
- **Rich Item Showcase**: Add a title, description, USDC price, and an optional **Item Image Link** with a live preview in the dashboard and a framed hero product display on the `/pay/[id]` checkout page.
- **Instant Merchant Controls**: Copy checkout links, open live checkouts, pause/archive links, and track real-time sales counts and collected USDC volume.

### 3. Umbra-Style Private Payrolls (`/app` — Employer & Employee Modes)
- **Company & Team Setup (Employer Mode)**: Create your company profile, add and manage team members with salaries and reference codes, and fund a batch payroll run in a single flow.
- **Confidential On-Chain Commitments**: Payroll runs settle against cryptographic commitments (`SHA-256`) in the NearPay Veil Vault—keeping individual employee identities and compensation private on public block explorers.
- **Gasless Stealth Claims (Employee Mode)**: Switch to Employee view to inspect incoming payouts and claim funds with **0 NEAR gas** to a fresh stealth implicit account via the Relayer.

### 4. Bookkeeper Audit & Zero-Question CSV Export
- **Read-Only Viewing Key**: Share a read-only **Bookkeeper Viewing Key** (`vk_nearveil_...`) so accountants and CPAs can decrypt invoice line items and payroll records in the browser without any ability to move funds.
- **Accountant-Ready CSV**: Export clean spreadsheets ready for Excel, Google Sheets, QuickBooks, or Xero:

| Column Name | Meaning |
| :--- | :--- |
| `Record_ID` | Unique Invoice or Payroll Slip ID |
| `Record_Type` | `AR_INVOICE` (Income) or `AP_PAYROLL` (Expense) |
| `Status` | `PAID`, `PENDING`, or `REFUNDED` |
| `Issue_Date_UTC` / `Due_Date_UTC` | Accrual & AR aging dates |
| `Paid_Timestamp_UTC` | Cash-basis settlement timestamp |
| `Counterparty_Name` | Client or contractor/member name |
| `Line_Items_Breakdown` | Itemized breakdown |
| `Subtotal_USD`, `Tax_Amount_USD`, `Total_Invoice_USD` | Gross, tax, and total USD billed |
| `Gas_Fee_Paid_By_User_USD` | Always `$0.00` (Relayer-sponsored) |
| `Net_Settled_USDC` / `Recognized_USD_Value` | Final settled USD/USDC value (`1.0000` peg) |
| `NEAR_Settlement_Tx_URL` / `Refund_Tx_URL` | Verifiable `testnet.nearblocks.io` receipt links |
| `Stealth_Commitment_Hash` | Cryptographic commitment proof |

---

## Architecture & Key Routes

- **Frontend Pages**:
  - `src/app/page.tsx` — Product landing page & interactive overview (`/`)
  - `src/app/app/page.tsx` — Main workspace: Invoicing, Merchant Pay, Private Payrolls, and Bookkeeper Audit (`/app`)
  - `src/app/invoice/[id]/page.tsx` — Shareable client invoice checkout (`/invoice/[id]`)
  - `src/app/pay/[id]/page.tsx` — Shareable merchant item checkout (`/pay/[id]`)
- **API Routes**:
  - `src/app/api/invoices/route.ts` — Invoice creation, syncing, settlement, refunds, and CSV/audit data
  - `src/app/api/merchant/route.ts` — Merchant checkout link creation, image validation, payment, and status toggles
  - `src/app/api/relay/route.ts` — Whitelisted NEP-366 Meta-Transaction Relayer (`create_invoice`, `settle_invoice_1click`, `refund_invoice`, `create_private_payroll_batch`, `claim_stealth_payout`, `register_stealth_meta`)
  - `src/app/api/near-rpc/route.ts` — Same-origin NEAR Testnet JSON-RPC proxy with multi-RPC fallback
  - `src/app/api/wallet/balance/route.ts` — Live NEAR & Circle USDC balance lookup
- **Wallet Integration**:
  - `src/components/WalletProvider.tsx` — `@near-wallet-selector/core` configured with **Meteor Wallet** (`setupMeteorWallet()`)

---

## Quickstart (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Initialize / verify NEAR Testnet Relayer & Vault accounts
npm run setup:testnet

# 3. Start development server
npm run dev
```

For production:
```bash
npm run build
npm start
```

Open `http://127.0.0.1:3000` in your browser.

---

## Deployment Environment Variables (Vercel / Production)

Configure the following environment variables in your hosting provider (e.g., Vercel) so the Relayer and NEAR Testnet backend connect reliably:

| Variable | Description |
| :--- | :--- |
| `NEARVEIL_CONTRACT_ID` | Deployed NearPay Veil vault contract account ID (e.g. `nearveil-vault-48eb1e.testnet`) |
| `NEARVEIL_CONTRACT_KEY` | Contract account private key (`ed25519:...`) |
| `NEARVEIL_RELAYER_ID` | Gasless meta-transaction relayer account ID |
| `NEARVEIL_RELAYER_KEY` | Relayer account private key (`ed25519:...`) |
| `NEARVEIL_VIEWING_KEY` | Default read-only Bookkeeper Viewing Key (`vk_nearveil_...`) |
| `NEAR_TESTNET_RPC` | Primary NEAR Testnet RPC URL (e.g. `https://test.rpc.fastnear.com`) |
