import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NearVeil — Simple Invoicing & Private Payroll',
  description:
    'Send invoices, get paid from any chain in USDC with zero gas fees, and run Umbra-style private payroll on NEAR Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
