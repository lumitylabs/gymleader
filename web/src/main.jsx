import React, { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// --- Provedores da Aplicação ---
import { AuthProvider } from "./contexts/AuthContext";

// --- CONFIGURAÇÃO DO REOWN APPKIT (APENAS PARA EVM/FLOW) ---
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';

// --- CONFIGURAÇÃO DO SOLANA WALLET ADAPTER (INDEPENDENTE) ---
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// --- Componentes e Páginas ---
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Gym from "./pages/Gym.jsx";
import Wallets from "./pages/Wallets.jsx";

// --- Estilos ---
import "./index.css";
import '@solana/wallet-adapter-react-ui/styles.css'; // CSS base para o modal da Solana

// --- CONFIGURAÇÃO DO REOWN APPKIT ---
const queryClient = new QueryClient();
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not defined in your .env file.');
}

const flowEvmTestnet = defineChain({
  id: 9000,
  name: 'Flow EVM Testnet',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet.evm.nodes.onflow.org'] } },
});

const wagmiAdapter = new WagmiAdapter({
  networks: [flowEvmTestnet],
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [flowEvmTestnet],
  projectId,
  metadata: {
    name: 'Gymleader - EVM Connection',
    description: 'Connect your EVM wallet for Beezie',
    url: 'http://localhost:5173',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  features: {
    analytics: true,
    socials: [],
    email: false,
  },
});

const App = () => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const solanaWallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [network]);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={solanaWallets} autoConnect>
            {/* AQUI ESTÁ A MÁGICA: Adicionamos uma classe customizada ao provedor do modal da Solana */}
            <WalletModalProvider className="reown-like-modal">
              <AuthProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="/gym" element={<ProtectedRoute><Gym /></ProtectedRoute>} />
                    <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
                  </Routes>
                </BrowserRouter>
              </AuthProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);