// src/config/networks.js

import { defineChain } from 'viem';
import { solanaDevnet as appkitSolanaDevnet } from '@reown/appkit/networks';

// Definição da Flow EVM Testnet
export const flowEvmTestnet = defineChain({
  id: 9000,
  name: 'Flow EVM Testnet',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
  },
});

// Exportamos a rede Solana Devnet para ser usada em outros lugares
export const solanaDevnet = appkitSolanaDevnet;

// Exportamos um array com todas as redes para facilitar a configuração no main.jsx
export const configuredNetworks = [flowEvmTestnet, solanaDevnet];