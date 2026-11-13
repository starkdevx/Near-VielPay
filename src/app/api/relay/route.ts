import { NextRequest, NextResponse } from 'next/server';
import {
  ALLOWED_RELAYER_METHODS,
  executeRelayedContractCall,
  getTestnetConfig,
} from '@/lib/near-testnet';

/**
 * Dedicated NEP-366 / Gasless Meta-Transaction Relayer Endpoint (`/api/relay`).
 * Satisfies: "Gasless for the freelancer: route their transactions through a meta
 * transaction relayer that only pays for calls to our own contract."
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetContractId = String(body.targetContractId || '').trim();
    const methodName = String(body.methodName || '').trim();
    const args =
      body.args && typeof body.args === 'object'
        ? (body.args as Record<string, unknown>)
        : {};

    const config = getTestnetConfig();

    if (targetContractId !== config.contractAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error: `Relayer Rejected: Only calls to '${config.contractAccountId}' are sponsored. Attempted target: '${targetContractId}'.`,
          allowedContract: config.contractAccountId,
        },
        { status: 403 }
      );
    }

    if (!ALLOWED_RELAYER_METHODS.has(methodName)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Relayer Rejected: Method '${methodName}' is not in the whitelisted contract methods.`,
          allowedMethods: Array.from(ALLOWED_RELAYER_METHODS),
        },
        { status: 403 }
      );
    }

    const result = await executeRelayedContractCall({
      targetContractId,
      methodName,
      args,
    });

    return NextResponse.json({
      ok: true,
      relayed: result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Relayer execution failed' },
      { status: 400 }
    );
  }
}

