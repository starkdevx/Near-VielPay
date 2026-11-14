import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveAccountBalances } from '@/lib/near-testnet';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({
      accountId: '',
      nearBalance: 0,
      usdcBalance: 0,
      usdcOfficialBalance: 0,
      usdcBridgedBalance: 0,
    });
  }

  const balances = await fetchLiveAccountBalances(accountId);
  return NextResponse.json(balances, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
