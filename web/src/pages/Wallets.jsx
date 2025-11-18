import React, { useState } from 'react';
import Sidebar from '../components/ui/general/Sidebar';

// --- HOOKS PARA A SESSÃO EVM (VIA REOWN) ---
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';

// --- HOOKS PARA A SESSÃO SOLANA (VIA SOLANA WALLET ADAPTER) ---
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function Wallets() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(true);

  // --- SESSÃO 1: EVM (Beezie / Flow) controlada pelo Reown AppKit ---
  const { open: openReownModal } = useAppKit();
  const { address: evmWalletAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  // --- SESSÃO 2: SOLANA (Collectorcrypt) controlada pelo Solana Wallet Adapter ---
  const { publicKey, connected: isSolanaConnected, disconnect: disconnectSolana } = useWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const solanaWalletAddress = publicKey ? publicKey.toBase58() : null;

  return (
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} />
      <main className={`flex-grow transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl font-bold text-white mb-8">Wallets</h1>

          <div className="bg-[#202024] p-6 rounded-lg flex justify-between items-center mb-8">
            <div>
              <h2 className="font-semibold text-lg text-white">Ask professor oak for 3 free cards</h2>
              <p className="text-sm text-[#A2A2AB] mt-1">No Pokémon yet? you can redeem 3 free cards for now.</p>
            </div>
            <button className="bg-[#363639] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#4F4F52] transition-colors active:scale-95">
              Redeem
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Seção Beezie (Flow EVM) - Usa o modal do Reown */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white text-lg">Beezie (Flow EVM)</span>
              <div className="flex items-center gap-4 w-full max-w-md">
                <input type="text" readOnly value={evmWalletAddress || "Not Connected"} className="bg-[#202024] text-[#A2A2AB] w-full px-4 py-3 rounded-lg" />
                <button
                  onClick={() => isEvmConnected ? disconnectEvm() : openReownModal()}
                  className="bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-[#E3E3E4] transition-colors active:scale-95 whitespace-nowrap"
                >
                  {isEvmConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Seção Collectorcrypt (Solana) - Usa o modal do Solana Wallet Adapter (agora estilizado) */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white text-lg">Collectorcrypt (Solana)</span>
              <div className="flex items-center gap-4 w-full max-w-md">
                <input type="text" readOnly value={solanaWalletAddress || "Not Connected"} className="bg-[#202024] text-[#A2A2AB] w-full max-w-md px-4 py-3 rounded-lg" />
                <button
                  onClick={() => isSolanaConnected ? disconnectSolana() : setSolanaModalVisible(true)}
                  className="bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-[#E3E3E4] transition-colors active:scale-95 whitespace-nowrap"
                >
                  {isSolanaConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Wallets;