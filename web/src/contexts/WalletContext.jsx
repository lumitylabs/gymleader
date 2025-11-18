import React, { createContext, useContext } from 'react';
// Importe os hooks do Wagmi
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const EvmWalletContext = createContext();

export const useEvmWallet = () => {
  return useContext(EvmWalletContext);
};

export const EvmWalletProvider = ({ children }) => {
  // Hooks do Wagmi que gerenciam tudo para nós
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const value = {
    evmWalletAddress: address,
    isEvmConnected: isConnected,
    connectEvmWallet: connect, // A função de conexão
    evmConnectors: connectors, // A lista de carteiras EVM detectadas (MetaMask, Coinbase, etc.)
    disconnectEvmWallet: disconnect, // A função de desconexão
  };

  return (
    <EvmWalletContext.Provider value={value}>
      {children}
    </EvmWalletContext.Provider>
  );
};