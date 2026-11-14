import { NextRequest, NextResponse } from 'next/server';

const TESTNET_RPCS = [
  process.env.NEAR_TESTNET_RPC,
  'https://test.rpc.fastnear.com',
  'https://rpc.testnet.near.org',
  'https://rpc.testnet.pagoda.co',
].filter((u): u is string => Boolean(u && u.startsWith('https://')));

/**
 * Same-origin NEAR Testnet JSON-RPC proxy for browser wallet SDK calls.
 * Prevents CORS, rate-limit, and browser network "Failed to fetch" errors
 * by falling back across multiple NEAR Testnet RPC endpoints server-side.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON-RPC payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected JSON-RPC object' }, { status: 400 });
  }

  const payload = JSON.stringify(body);
  let lastError = 'All NEAR Testnet RPC endpoints failed';

  for (const rpcUrl of TESTNET_RPCS) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        lastError = `RPC ${rpcUrl} returned ${res.status}`;
        continue;
      }
      const data = await res.json();
      return NextResponse.json(data);
    } catch (err) {
      lastError = (err as Error).message || lastError;
    }
  }

  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id: (body as { id?: unknown }).id ?? null,
      error: { code: -32000, message: lastError },
    },
    { status: 502 }
  );
}
