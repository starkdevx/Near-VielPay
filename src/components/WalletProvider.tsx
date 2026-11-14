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
import '@near-wallet-selector/modal-ui/styles.css';

interface WalletContextValue {
  accountId: string | null;
  stealthMetaAddress: string | null;
  isConnected: boolean;
  walletReady: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  deriveClientStealthMeta: (seed: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue>({
  accountId: null,
  stealthMetaAddress: null,
  isConnected: false,
  walletReady: false,
  connect: () => {},
  disconnect: async () => {},
  deriveClientStealthMeta: async () => '',
});

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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
