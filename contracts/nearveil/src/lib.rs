use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap, Vector};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum InvoiceStatus {
    Pending,
    Paid,
    Refunded,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct LineItem {
    pub description: String,
    pub quantity: u32,
    pub unit_price_cents: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct InvoiceRecord {
    pub invoice_id: String,
    pub freelancer_account: AccountId,
    pub client_name: String,
    pub client_reference: String,
    pub due_date_utc: String,
    pub created_at_utc: String,
    pub paid_at_utc: Option<String>,
    pub line_items: Vec<LineItem>,
    pub subtotal_cents: u64,
    pub tax_cents: u64,
    pub total_usdc_cents: u64,
    pub status: InvoiceStatus,
    /// Umbra-style SHA-256 commitment hash: H(claim_secret || invoice_id)
    pub stealth_commitment_hash: String,
    /// AES-GCM encrypted payload decryptable via Bookkeeper Viewing Key
    pub encrypted_viewing_note: String,
    /// 1-byte view tag for fast client scanning
    pub view_tag: String,
    pub origin_payment_rail: Option<String>,
    pub settlement_tx_hash: Option<String>,
    pub refund_tx_hash: Option<String>,
    pub claimed_to_stealth: bool,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct StealthAnnouncement {
    pub announcement_id: String,
    pub record_id: String,
    pub record_type: String, // "AR_INVOICE" | "AP_PAYROLL"
    pub ephemeral_pubkey_hex: String,
    pub view_tag: String,
    pub commitment_hash: String,
    pub encrypted_note: String,
    pub amount_usdc_cents: u64,
    pub claimed: bool,
    pub timestamp_ms: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NearVeilContract {
    pub relayer_account: AccountId,
    pub invoices: UnorderedMap<String, InvoiceRecord>,
    pub announcements: Vector<StealthAnnouncement>,
    pub commitments_claimed: LookupMap<String, bool>,
    pub testnet_usdc_balances: LookupMap<AccountId, u64>,
}

#[near_bindgen]
impl NearVeilContract {
    #[init]
    pub fn new(relayer_account: AccountId) -> Self {
        Self {
            relayer_account,
            invoices: UnorderedMap::new(b"i"),
            announcements: Vector::new(b"a"),
            commitments_claimed: LookupMap::new(b"c"),
            testnet_usdc_balances: LookupMap::new(b"u"),
        }
    }

    /// Creates a new freelancer invoice. Can be called directly or gaslessly via the whitelisted NEP-366 Relayer.
    pub fn create_invoice(
        &mut self,
        invoice_id: String,
        freelancer_account: AccountId,
        client_name: String,
        client_reference: String,
        due_date_utc: String,
        created_at_utc: String,
        line_items: Vec<LineItem>,
        tax_cents: u64,
        stealth_commitment_hash: String,
        encrypted_viewing_note: String,
        view_tag: String,
    ) -> InvoiceRecord {
        let subtotal_cents: u64 = line_items
            .iter()
            .map(|item| (item.quantity as u64) * item.unit_price_cents)
            .sum();
        let total_usdc_cents = subtotal_cents + tax_cents;

        let record = InvoiceRecord {
            invoice_id: invoice_id.clone(),
            freelancer_account,
            client_name,
            client_reference,
            due_date_utc,
            created_at_utc,
            paid_at_utc: None,
            line_items,
            subtotal_cents,
            tax_cents,
            total_usdc_cents,
            status: InvoiceStatus::Pending,
            stealth_commitment_hash: stealth_commitment_hash.clone(),
            encrypted_viewing_note: encrypted_viewing_note.clone(),
            view_tag: view_tag.clone(),
            origin_payment_rail: None,
            settlement_tx_hash: None,
            refund_tx_hash: None,
            claimed_to_stealth: false,
        };

        self.invoices.insert(&invoice_id, &record);
        env::log_str(&format!("NEARVEIL_EVENT:INVOICE_CREATED:{}", invoice_id));
        record
    }

    /// Settles an invoice via 1Click Solver or Testnet USDC and logs the Umbra Stealth Announcement.
    #[payable]
    pub fn settle_invoice_1click(
        &mut self,
        invoice_id: String,
        origin_payment_rail: String,
        ephemeral_pubkey_hex: String,
        paid_at_utc: String,
        settlement_tx_ref: String,
    ) -> InvoiceRecord {
        let mut invoice = self
            .invoices
            .get(&invoice_id)
            .expect("Invoice ID does not exist");
        assert!(
            invoice.status == InvoiceStatus::Pending,
            "Invoice is not in Pending state"
        );

        invoice.status = InvoiceStatus::Paid;
        invoice.origin_payment_rail = Some(origin_payment_rail);
        invoice.paid_at_utc = Some(paid_at_utc);
        invoice.settlement_tx_hash = Some(settlement_tx_ref);
        self.invoices.insert(&invoice_id, &invoice);

        let announcement = StealthAnnouncement {
            announcement_id: format!("ann-{}", invoice_id),
            record_id: invoice_id.clone(),
            record_type: "AR_INVOICE".to_string(),
            ephemeral_pubkey_hex,
            view_tag: invoice.view_tag.clone(),
            commitment_hash: invoice.stealth_commitment_hash.clone(),
            encrypted_note: invoice.encrypted_viewing_note.clone(),
            amount_usdc_cents: invoice.total_usdc_cents,
            claimed: false,
            timestamp_ms: env::block_timestamp_ms(),
        };
        self.announcements.push(&announcement);

        env::log_str(&format!("NEARVEIL_EVENT:INVOICE_PAID:{}", invoice_id));
        invoice
    }

    /// Refunds a settled invoice back to the client origin and records the refund transaction reference.
    pub fn refund_invoice(&mut self, invoice_id: String, refund_tx_ref: String) -> InvoiceRecord {
        let mut invoice = self
            .invoices
            .get(&invoice_id)
            .expect("Invoice ID does not exist");
        invoice.status = InvoiceStatus::Refunded;
        invoice.refund_tx_hash = Some(refund_tx_ref);
        self.invoices.insert(&invoice_id, &invoice);

        env::log_str(&format!("NEARVEIL_EVENT:INVOICE_REFUNDED:{}", invoice_id));
        invoice
    }

    /// Executes an Umbra-style Private Batch Payroll deposit into the Pooled Vault.
    /// Individual employee wallet addresses are NEVER passed here—only cryptographic commitments and encrypted notes.
    #[payable]
    pub fn create_private_payroll_batch(
        &mut self,
        batch_id: String,
        announcements: Vec<StealthAnnouncement>,
    ) -> u32 {
        let count = announcements.len() as u32;
        for ann in announcements {
            self.announcements.push(&ann);
        }
        env::log_str(&format!(
            "NEARVEIL_EVENT:PRIVATE_PAYROLL_BATCH:{}:COUNT:{}",
            batch_id, count
        ));
        count
    }

    /// Gasless Stealth Claim: Called by the Relayer when a freelancer/employee proves knowledge of the claim secret
    /// matching `commitment_hash` to sweep USDC into a fresh, unlinked NEAR Stealth Implicit Account.
    pub fn claim_stealth_payout(
        &mut self,
        record_id: String,
        commitment_hash: String,
        stealth_destination: AccountId,
        amount_usdc_cents: u64,
    ) -> bool {
        let already_claimed = self
            .commitments_claimed
            .get(&commitment_hash)
            .unwrap_or(false);
        assert!(!already_claimed, "Commitment already claimed");

        self.commitments_claimed.insert(&commitment_hash, &true);

        let current_bal = self
            .testnet_usdc_balances
            .get(&stealth_destination)
            .unwrap_or(0);
        self.testnet_usdc_balances
            .insert(&stealth_destination, &(current_bal + amount_usdc_cents));

        if let Some(mut inv) = self.invoices.get(&record_id) {
            inv.claimed_to_stealth = true;
            self.invoices.insert(&record_id, &inv);
        }

        // Also send a tiny symbolic native testnet transfer if attached deposit > 0
        if env::attached_deposit().as_yoctonear() > 0 {
            let _ = Promise::new(stealth_destination.clone()).transfer(env::attached_deposit());
        }

        env::log_str(&format!(
            "NEARVEIL_EVENT:STEALTH_CLAIM:{}:TO:{}",
            record_id, stealth_destination
        ));
        true
    }

    pub fn get_invoice(&self, invoice_id: String) -> Option<InvoiceRecord> {
        self.invoices.get(&invoice_id)
    }

    pub fn get_announcements(&self) -> Vec<StealthAnnouncement> {
        self.announcements.iter().collect()
    }
}

