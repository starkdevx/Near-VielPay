import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NearVeil — Private Treasury, Invoicing & Payroll on NEAR',
  description:
    'Send invoices, settle from any chain in USDC with zero gas fees, and run Umbra-style private payroll on NEAR Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0c0c0b] text-[#f4f1ea] antialiased selection:bg-[#d4b06a]/25 selection:text-[#f4f1ea]">
        {children}
      </body>
    </html>
  );
}
