import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Instrument_Serif,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';

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
  title: 'NearPay Veil — Private Treasury, Invoicing & Merchant Pay on NEAR',
  description:
    'Send gasless invoices, accept instant merchant payments in Circle USDC or NEAR, and run confidential stealth payroll on NEAR.',
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
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
