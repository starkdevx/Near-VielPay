import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Instrument_Serif,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NearVeil — Private Treasury, Invoicing & Payroll on NEAR',
  description:
    'Send invoices, settle from any chain in USDC with zero gas fees, and run private payroll on NEAR Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#0a0a09] text-[#f5f2eb] font-sans antialiased selection:bg-[#d4b06a]/30 selection:text-[#f5f2eb]">
        {children}
      </body>
    </html>
  );
}
