import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NearVeil — Gasless Invoicing & Umbra-Style Private Payroll on NEAR',
  description:
    'Real-World Money on NEAR Testnet: Gasless freelancer invoicing via NEP-366 Relayer, Cross-Chain 1Click API settlement, Umbra-style Private Payroll, and Bookkeeper CSV Exports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}

