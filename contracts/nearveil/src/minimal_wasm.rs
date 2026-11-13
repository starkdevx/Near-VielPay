#![no_std]

extern "C" {
    fn input(register_id: u64);
    fn read_register(register_id: u64, ptr: u64);
    fn register_len(register_id: u64) -> u64;
    fn log_utf8(len: u64, ptr: u64);
    fn value_return(len: u64, ptr: u64);
}

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

fn log_event_with_input(prefix: &[u8]) {
    unsafe {
        input(0);
        let len = register_len(0);
        let mut buf = [0u8; 1024];
        let mut idx = 0usize;
        while idx < prefix.len() && idx < 256 {
            buf[idx] = prefix[idx];
            idx += 1;
        }
        if len > 0 && len <= 700 {
            read_register(0, buf.as_mut_ptr().add(idx) as u64);
            idx += len as usize;
        }
        log_utf8(idx as u64, buf.as_ptr() as u64);
        let ok = b"{\"ok\":true}";
        value_return(ok.len() as u64, ok.as_ptr() as u64);
    }
}

#[no_mangle]
pub extern "C" fn create_invoice() {
    log_event_with_input(b"NEARVEIL_EVENT:INVOICE_CREATED:");
}

#[no_mangle]
pub extern "C" fn settle_invoice_1click() {
    log_event_with_input(b"NEARVEIL_EVENT:INVOICE_PAID_1CLICK:");
}

#[no_mangle]
pub extern "C" fn refund_invoice() {
    log_event_with_input(b"NEARVEIL_EVENT:INVOICE_REFUNDED:");
}

#[no_mangle]
pub extern "C" fn create_private_payroll_batch() {
    log_event_with_input(b"NEARVEIL_EVENT:UMBRA_PRIVATE_PAYROLL_BATCH:");
}

#[no_mangle]
pub extern "C" fn claim_stealth_payout() {
    log_event_with_input(b"NEARVEIL_EVENT:UMBRA_STEALTH_CLAIM:");
}

#[no_mangle]
pub extern "C" fn register_stealth_meta() {
    log_event_with_input(b"NEARVEIL_EVENT:STEALTH_META_REGISTERED:");
}

