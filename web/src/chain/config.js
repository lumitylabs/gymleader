export const flowEvmMainnet = {
  chainId: '0x2EB', // 747 em hexadecimal
  chainName: 'Flow EVM Mainnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.evm.nodes.onflow.org'],
  blockExplorerUrls: ['https://flowscan.org'],
};

// Detalhes da Flow EVM Testnet (recomendado para desenvolvimento)
export const flowEvmTestnet = {
  chainId: '0x2328', // 9000 em hexadecimal
  chainName: 'Flow EVM Testnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
  blockExplorerUrls: ['https://testnet.flowscan.org'],
};