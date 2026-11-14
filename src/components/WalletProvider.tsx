'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupModal, WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { transactions, utils } from 'near-api-js';
import '@near-wallet-selector/modal-ui/styles.css';

export interface WalletPaymentParams {
  receiverId: string;
  amountUsd: number;
  tokenSymbol: 'USDC' | 'NEAR';
  nearPriceUsd?: number;
  memo?: string;
}

export interface WalletBatchPaymentParams {
  recipients: Array<{
    receiverId: string;
    amountUsd: number;
    memo?: string;
  }>;
  tokenSymbol: 'USDC' | 'NEAR';
  nearPriceUsd?: number;
}

interface WalletContextValue {
  accountId: string | null;
  stealthMetaAddress: string | null;
  isConnected: boolean;
  walletReady: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  deriveClientStealthMeta: (seed: string) => Promise<string>;
  sendNearOrUsdcPayment: (params: WalletPaymentParams) => Promise<{ txHash: string }>;
  sendBatchNearOrUsdcPayroll: (params: WalletBatchPaymentParams) => Promise<{ txHash: string }>;
}

const WalletContext = createContext<WalletContextValue>({
  accountId: null,
  stealthMetaAddress: null,
  isConnected: false,
  walletReady: false,
  connect: () => {},
  disconnect: async () => {},
  deriveClientStealthMeta: async () => '',
  sendNearOrUsdcPayment: async () => {
    throw new Error('Wallet not ready');
  },
  sendBatchNearOrUsdcPayroll: async () => {
    throw new Error('Wallet not ready');
  },
});

const CIRCLE_USDC_TESTNET =
  '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';

async function checkStorageRegistered(
  contractId: string,
  accountId: string
): Promise<boolean> {
  try {
    const argsBase64 = btoa(JSON.stringify({ account_id: accountId }));
    const res = await fetch('https://test.rpc.fastnear.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'storage_check',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: contractId,
          method_name: 'storage_balance_of',
          args_base64: argsBase64,
        },
      }),
    });
    const data = await res.json();
    if (data?.result?.result) {
      const bytes = new Uint8Array(data.result.result);
      const text = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(text);
      return parsed !== null;
    }
    return false;
  } catch {
    return false;
  }
}

export function useNearWallet() {
  return useContext(WalletContext);
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<WalletSelectorModal | null>(null);

  const [accountId, setAccountId] = useState<string | null>(null);
  const [stealthMetaAddress, setStealthMetaAddress] = useState<string | null>(
    null
  );
  const [walletReady, setWalletReady] = useState<boolean>(false);

  const deriveClientStealthMeta = useCallback(async (seed: string) => {
    const clean = seed.trim().toLowerCase();
    const digest = await sha256Hex(`nearveil_meta_v1:${clean}`);
    return `nv_meta_${digest}`;
  }, []);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initWalletSelector() {
      try {
        const selector = await setupWalletSelector({
          network: 'testnet',
          modules: [
            setupMyNearWallet(),
            setupMeteorWallet(),
            setupHereWallet(),
          ],
        });

        const modal = setupModal(selector, {
          contractId: 'nearveil-vault-48eb1e.testnet',
          theme: 'dark',
        });

        if (!active) return;

        selectorRef.current = selector;
        modalRef.current = modal;

        const state = selector.store.getState();
        const activeAccount =
          state.accounts.find((a) => a.active)?.accountId ||
          state.accounts[0]?.accountId ||
          null;
        setAccountId(activeAccount);

        subscription = selector.store.observable.subscribe((nextState) => {
          const nextAcc =
            nextState.accounts.find((a) => a.active)?.accountId ||
            nextState.accounts[0]?.accountId ||
            null;
          setAccountId(nextAcc);
        });

        setWalletReady(true);
      } catch (err) {
        console.warn('Wallet selector initialization skipped:', err);
        if (active) setWalletReady(true);
      }
    }

    initWalletSelector();

    return () => {
      active = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      setStealthMetaAddress(null);
      return;
    }
    deriveClientStealthMeta(accountId).then((meta) => {
      if (!cancelled) {
        setStealthMetaAddress(meta);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, deriveClientStealthMeta]);

  const connect = useCallback(() => {
    modalRef.current?.show();
  }, []);

  const disconnect = useCallback(async () => {
    const selector = selectorRef.current;
    if (!selector) return;
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
      setAccountId(null);
      setStealthMetaAddress(null);
    } catch (err) {
      console.warn('Disconnect error:', err);
    }
  }, []);

  const sendNearOrUsdcPayment = useCallback(
    async (params: WalletPaymentParams): Promise<{ txHash: string }> => {
      const selector = selectorRef.current;
      if (!selector || !accountId) {
        throw new Error('Please connect your NEAR wallet first.');
      }
      const wallet = await selector.wallet();
      const receiverId = params.receiverId.trim();
      if (!receiverId) {
        throw new Error('Recipient NEAR account is required.');
      }

      if (params.tokenSymbol === 'NEAR') {
        const price = params.nearPriceUsd && params.nearPriceUsd > 0 ? params.nearPriceUsd : 4.85;
        const nearAmt = (params.amountUsd / price).toFixed(6);
        const yoctoStr = utils.format.parseNearAmount(nearAmt);
        if (!yoctoStr) {
          throw new Error('Invalid NEAR amount.');
        }
        const outcome = await wallet.signAndSendTransaction({
          signerId: accountId,
          receiverId,
          actions: [transactions.transfer(BigInt(yoctoStr))],
        });
        const txHash =
          (outcome as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } })
            ?.transaction?.hash ||
          (outcome as { transaction_outcome?: { id?: string } })?.transaction_outcome?.id;
        if (!txHash) {
          throw new Error('Wallet transaction was cancelled or did not return a hash.');
        }
        return { txHash };
      }

      const usdcContract = CIRCLE_USDC_TESTNET;
      const isRegistered = await checkStorageRegistered(usdcContract, receiverId);
      const actions = [];
      if (!isRegistered) {
        actions.push(
          transactions.functionCall(
            'storage_deposit',
            { account_id: receiverId, registration_only: true },
            BigInt('30000000000000'),
            BigInt('1250000000000000000000')
          )
        );
      }
      const rawAmount = String(Math.round(params.amountUsd * 1_000_000));
      actions.push(
        transactions.functionCall(
          'ft_transfer',
          {
            receiver_id: receiverId,
            amount: rawAmount,
            ...(params.memo ? { memo: params.memo.slice(0, 120) } : {}),
          },
          BigInt('30000000000000'),
          BigInt('1')
        )
      );

      const outcome = await wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: usdcContract,
        actions,
      });
      const txHash =
        (outcome as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } })
          ?.transaction?.hash ||
        (outcome as { transaction_outcome?: { id?: string } })?.transaction_outcome?.id;
      if (!txHash) {
        throw new Error('Wallet transaction was cancelled or did not return a hash.');
      }
      return { txHash };
    },
    [accountId]
  );

  const sendBatchNearOrUsdcPayroll = useCallback(
    async (params: WalletBatchPaymentParams): Promise<{ txHash: string }> => {
      const selector = selectorRef.current;
      if (!selector || !accountId) {
        throw new Error('Please connect your NEAR wallet first.');
      }
      if (!params.recipients.length) {
        throw new Error('No payroll recipients specified.');
      }
      const wallet = await selector.wallet();

      if (params.tokenSymbol === 'NEAR') {
        const price = params.nearPriceUsd && params.nearPriceUsd > 0 ? params.nearPriceUsd : 4.85;
        const txs = params.recipients.map((r) => {
          const nearAmt = (r.amountUsd / price).toFixed(6);
          const yoctoStr = utils.format.parseNearAmount(nearAmt) || '0';
          return {
            signerId: accountId,
            receiverId: r.receiverId,
            actions: [transactions.transfer(BigInt(yoctoStr))],
          };
        });
        const outcomes = await wallet.signAndSendTransactions({ transactions: txs });
        const firstOutcome = Array.isArray(outcomes) ? outcomes[0] : outcomes;
        const txHash =
          (firstOutcome as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } })
            ?.transaction?.hash ||
          (firstOutcome as { transaction_outcome?: { id?: string } })?.transaction_outcome?.id;
        if (!txHash) {
          throw new Error('Batch wallet transaction was cancelled or did not return a hash.');
        }
        return { txHash };
      }

      const totalUsd = params.recipients.reduce((s, r) => s + r.amountUsd, 0);
      const usdcContract = CIRCLE_USDC_TESTNET;
      const regChecks = await Promise.all(
        params.recipients.map((r) => checkStorageRegistered(usdcContract, r.receiverId))
      );

      const txs = params.recipients.map((r, idx) => {
        const actions = [];
        if (!regChecks[idx]) {
          actions.push(
            transactions.functionCall(
              'storage_deposit',
              { account_id: r.receiverId, registration_only: true },
              BigInt('30000000000000'),
              BigInt('1250000000000000000000')
            )
          );
        }
        actions.push(
          transactions.functionCall(
            'ft_transfer',
            {
              receiver_id: r.receiverId,
              amount: String(Math.round(r.amountUsd * 1_000_000)),
              ...(r.memo ? { memo: r.memo.slice(0, 120) } : {}),
            },
            BigInt('30000000000000'),
            BigInt('1')
          )
        );
        return {
          signerId: accountId,
          receiverId: usdcContract,
          actions,
        };
      });

      const outcomes = await wallet.signAndSendTransactions({ transactions: txs });
      const firstOutcome = Array.isArray(outcomes) ? outcomes[0] : outcomes;
      const txHash =
        (firstOutcome as { transaction?: { hash?: string }; transaction_outcome?: { id?: string } })
          ?.transaction?.hash ||
        (firstOutcome as { transaction_outcome?: { id?: string } })?.transaction_outcome?.id;
      if (!txHash) {
        throw new Error('Batch wallet transaction was cancelled or did not return a hash.');
      }
      return { txHash };
    },
    [accountId]
  );

  return (
    <WalletContext.Provider
      value={{
        accountId,
        stealthMetaAddress,
        isConnected: Boolean(accountId),
        walletReady,
        connect,
        disconnect,
        deriveClientStealthMeta,
        sendNearOrUsdcPayment,
        sendBatchNearOrUsdcPayroll,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
