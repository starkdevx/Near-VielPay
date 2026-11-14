import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connect, keyStores, KeyPair } from 'near-api-js';

const CONFIG_PATH = path.resolve(process.cwd(), '.nearveil-testnet.json');
const WASM_PATH = path.resolve(process.cwd(), 'contracts/nearveil/nearveil.wasm');
const RPC_URL = 'https://rpc.testnet.near.org';

async function tryCreateTestnetAccount(accountId, publicKeyStr) {
  const endpoints = [
    'https://helper.testnet.near.org/account',
    'https://testnet-api.kitwallet.app/account',
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAccountId: accountId,
          newAccountPublicKey: publicKeyStr,
        }),
      });
      if (res.ok) return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function deployContractIfPossible(config) {
  if (!fs.existsSync(WASM_PATH)) {
    return null;
  }
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey(
      'testnet',
      config.contractAccountId,
      KeyPair.fromString(config.contractPrivateKey)
    );
    const near = await connect({
      networkId: 'testnet',
      keyStore,
      nodeUrl: RPC_URL,
    });
    const account = await near.account(config.contractAccountId);
    const wasmBytes = fs.readFileSync(WASM_PATH);
    console.log(
      `Deploying NearVeil WASM contract (${wasmBytes.length} bytes) to ${config.contractAccountId}...`
    );
    const outcome = await account.deployContract(wasmBytes);
    const txHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
    console.log('Deployed contract on NEAR Testnet! Tx Hash:', txHash);
    return txHash;
  } catch (err) {
    console.warn('Contract deploy warning:', err.message);
    return null;
  }
}

async function main() {
  let config;
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    console.log('Loaded existing NearVeil Testnet configuration:', config.contractAccountId);
  } else {
    const suffix = crypto.randomBytes(3).toString('hex');
    const contractKeyPair = KeyPair.fromRandom('ed25519');
    const relayerKeyPair = KeyPair.fromRandom('ed25519');

    const contractAccountId = `nearveil-vault-${suffix}.testnet`;
    const relayerAccountId = `nearveil-relayer-${suffix}.testnet`;

    console.log(`Provisioning NEAR Testnet accounts (${contractAccountId}, ${relayerAccountId})...`);
    const createdVault = await tryCreateTestnetAccount(
      contractAccountId,
      contractKeyPair.getPublicKey().toString()
    );
    const createdRelayer = await tryCreateTestnetAccount(
      relayerAccountId,
      relayerKeyPair.getPublicKey().toString()
    );

    config = {
      networkId: 'testnet',
      rpcUrl: RPC_URL,
      explorerBaseUrl: 'https://testnet.nearblocks.io',
      contractAccountId,
      contractPublicKey: contractKeyPair.getPublicKey().toString(),
      contractPrivateKey: contractKeyPair.toString(),
      relayerAccountId,
      relayerPublicKey: relayerKeyPair.getPublicKey().toString(),
      relayerPrivateKey: relayerKeyPair.toString(),
      liveTestnetFunded: Boolean(createdVault && createdRelayer),
      defaultViewingKey: `vk_nearveil_audit_${suffix}`,
      deployTxHash: null,
      createdAtUtc: new Date().toISOString(),
    };
  }

  if (!config.deployTxHash && config.liveTestnetFunded) {
    const deployTxHash = await deployContractIfPossible(config);
    if (deployTxHash) {
      config.deployTxHash = deployTxHash;
    }
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log('NearVeil Testnet Ready:');
  console.log('  Vault Contract Account:', config.contractAccountId);
  console.log('  Relayer Account:       ', config.relayerAccountId);
  console.log('  Deploy Tx Hash:        ', config.deployTxHash);
  console.log('  Bookkeeper Viewing Key:', config.defaultViewingKey);
}

main().catch((err) => {
  console.error('Setup error:', err.message);
  process.exit(1);
});
