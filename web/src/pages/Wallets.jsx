// pages/Wallets.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/ui/general/Sidebar';

// --- IMPORTAR O CONTEXTO DE AUTH (CORREÇÃO) ---
import { useAuth } from '../contexts/AuthContext';

// --- HOOKS PARA A SESSÃO EVM (VIA REOWN) ---
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';

// --- HOOKS PARA A SESSÃO SOLANA (VIA SOLANA WALLET ADAPTER) ---
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Oak from '../assets/oak.png';

// Modal Component
const RedeemModal = ({ isOpen, onClose, userId, onRedeemSuccess }) => {
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGiftOptions();
    }
  }, [isOpen]);

  const fetchGiftOptions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/gift-options`);
      const data = await response.json();
      if (data.cards) {
        setCards(data.cards);
      }
    } catch (error) {
      console.error("Error fetching gift options:", error);
      toast.error("Failed to load gift options");
    } finally {
      setLoading(false);
    }
  };

  const toggleCardSelection = (tokenAddress) => {
    if (selectedCards.includes(tokenAddress)) {
      setSelectedCards(selectedCards.filter(id => id !== tokenAddress));
    } else {
      if (selectedCards.length < 3) {
        setSelectedCards([...selectedCards, tokenAddress]);
      } else {
        toast.warning("You can only select up to 3 cards.");
      }
    }
  };

  const handleRedeem = async () => {
    if (selectedCards.length === 0) {
      toast.warning("Please select at least one card.");
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/redeem-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedCardIds: selectedCards
        })
      });

      if (response.ok) {
        toast.success("Gift redeemed successfully!");
        onRedeemSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to redeem gift");
      }
    } catch (error) {
      console.error("Redeem error:", error);
      toast.error("An error occurred while redeeming.");
    } finally {
      setRedeeming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181B] w-full max-w-5xl rounded-2xl border border-[#26272B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#26272B] flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Select your Pokémons</h2>
            <div className="flex items-center gap-3 bg-[#202024] p-3 rounded-lg border border-[#26272B]">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                 {/* Placeholder for Oak Image */}
                 <img src={Oak} alt="Professor Oak" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Professor OAK</p>
                <p className="text-xs text-gray-400">Select three Pokémon gift cards to start your journey.</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40 text-gray-400">Loading cards...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {cards.map((card) => {
                const isSelected = selectedCards.includes(card.token_address);
                return (
                  <div key={card.token_address} className="flex flex-col gap-3">
                    <div 
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-transparent hover:border-gray-600'}`}
                      onClick={() => toggleCardSelection(card.token_address)}
                    >
                      <img src={card.imagem} alt={card.nome} className="w-full h-full object-contain bg-[#131316]" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-black rounded-full p-1">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleCardSelection(card.token_address)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected 
                          ? 'bg-[#202024] text-white border border-[#26272B] flex items-center justify-center gap-2' 
                          : 'bg-[#202024] text-gray-400 border border-[#26272B] hover:bg-[#2A2A2E] hover:text-white'
                      }`}
                    >
                      {isSelected ? <><Check size={14} /> Selected</> : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#26272B] flex justify-end">
          <button
            onClick={handleRedeem}
            disabled={redeeming || selectedCards.length === 0}
            className={`px-8 py-3 rounded-full font-bold text-black transition-all ${
              redeeming || selectedCards.length === 0
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-white hover:bg-gray-200 active:scale-95'
            }`}
          >
            {redeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </div>

      </div>
    </div>
  );
};

function Wallets() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(true);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [giftRedeemed, setGiftRedeemed] = useState(false);

  // 1. PEGAR O USUÁRIO ATUAL DO FIREBASE
  const { currentUser } = useAuth();

  // --- SESSÃO 1: EVM (Beezie / Flow) ---
  const { open: openReownModal } = useAppKit();
  const { address: evmWalletAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  // --- SESSÃO 2: SOLANA (Collectorcrypt) ---
  const { publicKey, connected: isSolanaConnected, disconnect: disconnectSolana } = useWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const solanaWalletAddress = publicKey ? publicKey.toBase58() : null;

  // Check if gift is already redeemed
  useEffect(() => {
    if (currentUser) {
      const metaRef = ref(db, `users/${currentUser.uid}/metadata/giftRedeemed`);
      const unsubscribe = onValue(metaRef, (snapshot) => {
        setGiftRedeemed(!!snapshot.val());
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // 2. USE EFFECT PARA SINCRONIZAR CARTEIRAS E CARTAS
  useEffect(() => {
    const syncWallet = async () => {
      // Só executa se tiver usuário logado e pelo menos uma carteira conectada
      if (currentUser && (evmWalletAddress || solanaWalletAddress)) {
        try {
          console.log("Sincronizando carteiras com o Firebase...");
          
          // Chama a API que criamos no passo anterior (api/sync-collection.js)
          await fetch(import.meta.env.VITE_SERVER_URL+'/api/sync-collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.uid,
              flow_address: evmWalletAddress || null,
              solana_address: solanaWalletAddress || null
            })
          });
          
          console.log("Sincronização iniciada com sucesso.");
        } catch (error) {
          console.error("Erro ao sincronizar carteira:", error);
        }
      }
    };

    // Executa quando o usuário muda ou quando conecta/desconecta uma carteira
    if (isEvmConnected || isSolanaConnected) {
      syncWallet();
    }
  }, [currentUser, evmWalletAddress, solanaWalletAddress, isEvmConnected, isSolanaConnected]);

  return (
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} />
      <main className={`flex-grow transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl font-bold text-white mb-8">Wallets</h1>

          {!giftRedeemed && (
            <div className="bg-[#202024] p-6 rounded-lg flex justify-between items-center mb-8 border border-[#26272B]">
              <div>
                <h2 className="font-semibold text-lg text-white">Ask professor oak for 3 free cards</h2>
                <p className="text-sm text-[#A2A2AB] mt-1">No Pokémon yet? you can redeem 3 free cards for now.</p>
              </div>
              <button 
                onClick={() => setIsRedeemModalOpen(true)}
                className="bg-[#363639] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#4F4F52] transition-colors active:scale-95"
              >
                Redeem
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {/* Seção Beezie (Flow EVM) */}
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

            {/* Seção Collectorcrypt (Solana) */}
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

      <RedeemModal 
        isOpen={isRedeemModalOpen} 
        onClose={() => setIsRedeemModalOpen(false)} 
        userId={currentUser?.uid}
        onRedeemSuccess={() => setGiftRedeemed(true)}
      />
    </div>
  );
}

export default Wallets;