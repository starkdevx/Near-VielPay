import crypto from 'crypto';
import { OneClickQuoteResponse, OneClickTokenOption } from './types';

export const ONECLICK_API_BASE = 'https://1click.chaindefuser.com';
export const NEAR_USDC_ASSET_ID =
  'nep141:3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';

/**
 * Real NEAR Testnet tokens supported for direct wallet-signed payments & payroll.
 * Enriched with live NEAR/USD market pricing when online.
 */
export const DEFAULT_ONECLICK_TOKENS: OneClickTokenOption[] = [
  {
    assetId: 'nep141:3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
    symbol: 'USDC',
    name: 'Circle Native USDC (NEAR Testnet)',
    chain: 'NEAR Testnet',
    decimals: 6,
    priceUsd: 1.0,
  },
  {
    assetId: 'native:near.testnet',
    symbol: 'NEAR',
    name: 'Native NEAR (Testnet)',
    chain: 'NEAR Testnet',
    decimals: 24,
    priceUsd: 4.85,
  },
];

/**
 * Fetches live supported tokens from the 1Click API (`GET /v0/tokens`) and merges
 * live USD prices into our cross-chain token selector.
 */
export async function fetchOneClickTokens(): Promise<{
  tokens: OneClickTokenOption[];
  liveApiConnected: boolean;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${ONECLICK_API_BASE}/v0/tokens`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const priceBySymbol = new Map<string, number>();
        for (const item of data) {
          if (item?.symbol && typeof item?.price === 'number' && item.price > 0) {
            priceBySymbol.set(String(item.symbol).toUpperCase(), item.price);
          }
        }
        const updated = DEFAULT_ONECLICK_TOKENS.map((t) => {
          const baseSym = t.symbol.split(' ')[0].replace(/^w/, '').toUpperCase();
          const livePrice = priceBySymbol.get(baseSym);
          return livePrice ? { ...t, priceUsd: livePrice } : t;
        });
        return { tokens: updated, liveApiConnected: true };
      }
    }
  } catch {
    // Fallback to deterministic Testnet pricing if offline
  }
  return { tokens: DEFAULT_ONECLICK_TOKENS, liveApiConnected: false };
}

/**
 * Generates an EXACT_OUTPUT 1Click Quote (`POST /v0/quote` schema) settling into
 * the freelancer's one-time NEAR Stealth Implicit Account in USDC.
 */
export async function createOneClickQuote(params: {
  originAssetId: string;
  amountOutUsdc: number;
  recipientStealthAccount: string;
  invoiceId: string;
}): Promise<OneClickQuoteResponse> {
  const { tokens } = await fetchOneClickTokens();
  const selected =
    tokens.find((t) => t.assetId === params.originAssetId) || DEFAULT_ONECLICK_TOKENS[0];

  const rawAmountIn = params.amountOutUsdc / selected.priceUsd;
  const amountInFormatted =
    selected.priceUsd === 1.0 ? rawAmountIn.toFixed(2) : rawAmountIn.toFixed(5);

  const quoteHash = crypto
    .createHash('sha256')
    .update(`${params.invoiceId}:${params.originAssetId}:${Date.now()}`)
    .digest('hex');

  const depositAddress =
    selected.chain === 'Solana'
      ? `1ClickSoL${quoteHash.slice(0, 35)}`
      : selected.chain.includes('NEAR')
        ? `solver-deposit-${quoteHash.slice(0, 8)}.testnet`
        : `0x${quoteHash.slice(0, 40)}`;

  return {
    quoteId: `1click_q_${quoteHash.slice(0, 14)}`,
    originAsset: selected.assetId,
    originSymbol: selected.symbol,
    originChain: selected.chain,
    destinationAsset: NEAR_USDC_ASSET_ID,
    destinationChain: 'NEAR Testnet',
    amountInFormatted: `${amountInFormatted} ${selected.symbol.split(' ')[0]}`,
    amountOutUsdc: params.amountOutUsdc.toFixed(2),
    depositAddress,
    recipientStealthAccount: params.recipientStealthAccount,
    expiresAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    solverMode: 'NEAR_TESTNET_SOLVER',
  };
}

