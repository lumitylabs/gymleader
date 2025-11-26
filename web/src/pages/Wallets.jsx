// pages/Wallets.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/ui/general/Sidebar';

// --- IMPORTAR O CONTEXTO DE AUTH ---
import { useAuth } from '../contexts/AuthContext';

// --- HOOKS PARA A SESSÃO EVM (VIA REOWN) ---
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';

// --- IMPORTAÇÃO DE LOGOS ---
import BeezieLogo from "../assets/beezie_logo.svg";
import CollectorLogo from "../assets/collector_logo.svg";

// --- HOOKS PARA A SESSÃO SOLANA (VIA SOLANA WALLET ADAPTER) ---
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Oak from '../assets/oak.png';
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";

// Modal Component (Mantido idêntico)
const RedeemModal = ({ isOpen, onClose, userId, onRedeemSuccess }) => {
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

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
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 h-full lg:h-[800px] max-h-[90vh] w-full max-w-7xl justify-center">

        {/* Main Modal Content */}
        <div className="bg-[#18181B] w-full lg:flex-1 max-w-4xl rounded-2xl border border-[#26272B] shadow-2xl overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#26272B] flex justify-between items-start shrink-0">
            <div className="flex-1 mr-4">
              <h2 className="text-xl font-bold text-white mb-2">Select your Pokémons</h2>
              <div className="flex items-center gap-3 bg-[#202024] p-3 rounded-lg border border-[#26272B]">
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden shrink-0">
                  <img src={Oak} alt="Professor Oak" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Professor OAK</p>
                  <p className="text-xs text-gray-400 line-clamp-2 sm:line-clamp-none">Select three Pokémon gift cards to start your journey.</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
          </div>

          {/* Content Area (Grid Only) */}
          <div className="flex-1 overflow-hidden">
            <SimpleBar style={{ height: '100%' }} className="p-4 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center h-40 text-gray-400">Loading cards...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {cards.map((card) => {
                    const isSelected = selectedCards.includes(card.token_address);
                    return (
                      <div key={card.token_address} className="flex flex-col gap-2 sm:gap-3">
                        <div
                          className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-transparent hover:border-gray-600'}`}
                          onClick={() => toggleCardSelection(card.token_address)}
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
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
                          className={`w-full py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${isSelected
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
            </SimpleBar>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-[#26272B] flex justify-end shrink-0 bg-[#18181B]">
            <button
              onClick={handleRedeem}
              disabled={redeeming || selectedCards.length === 0}
              className={`w-full sm:w-auto px-8 py-3 rounded-full font-bold text-black transition-all ${redeeming || selectedCards.length === 0
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-white hover:bg-gray-200 active:scale-95'
                }`}
            >
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </div>

        {/* Right: Preview Panel (Outside) */}
        <div className={`hidden lg:flex w-[350px] transition-opacity duration-200 ${hoveredCard ? 'opacity-100' : 'opacity-0 pointer-events-none'} bg-[#18181B] rounded-2xl border border-[#26272B] shadow-2xl p-6 flex-col items-center justify-center h-full shrink-0`}>
          {hoveredCard && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 w-full h-full justify-center">
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-[#26272B]">
                <img src={hoveredCard.imagem} alt={hoveredCard.nome} className="w-full h-full object-contain bg-[#09090B]" />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

function Wallets() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(true);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [giftRedeemed, setGiftRedeemed] = useState(false);

  const { currentUser } = useAuth();

  // --- SESSÃO 1: EVM (Beezie / Flow) ---
  const { open: openReownModal } = useAppKit();
  const { address: evmWalletAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  // --- SESSÃO 2: SOLANA (Collectorcrypt) ---
  const { publicKey, connected: isSolanaConnected, disconnect: disconnectSolana } = useWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const solanaWalletAddress = publicKey ? publicKey.toBase58() : null;

  useEffect(() => {
    if (currentUser) {
      const metaRef = ref(db, `users/${currentUser.uid}/metadata/giftRedeemed`);
      const unsubscribe = onValue(metaRef, (snapshot) => {
        setGiftRedeemed(!!snapshot.val());
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    const syncWallet = async () => {
      if (currentUser && (evmWalletAddress || solanaWalletAddress)) {
        try {
          await fetch(import.meta.env.VITE_SERVER_URL + '/api/sync-collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.uid,
              flow_address: evmWalletAddress || null,
              solana_address: solanaWalletAddress || null
            })
          });
        } catch (error) {
          console.error("Erro ao sincronizar carteira:", error);
        }
      }
    };

    if (isEvmConnected || isSolanaConnected) {
      syncWallet();
    }
  }, [currentUser, evmWalletAddress, solanaWalletAddress, isEvmConnected, isSolanaConnected]);

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  // Estilos reutilizáveis
  const connectButtonStyle = "flex items-center gap-1 px-6 py-3.5 bg-transparent border border-[#3A3A3A] text-sm text-[#D9D3D3] font-semibold rounded-full cursor-pointer hover:bg-[#1F1F22] transition duration-200 active:scale-95 select-none disabled:cursor-not-allowed";
  const disconnectButtonStyle = "h-full flex items-center justify-center gap-2 px-6 py-3.5 border border-[#3F3F46] text-sm text-[#D9D3D3] font-semibold rounded-full cursor-pointer hover:bg-[#2A2A2E] hover:text-white transition duration-200 active:scale-95";
  const inputStyle = "w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-3.5 text-white focus:outline-none transition-colors placeholder:text-[#9DA3AE]";

  return (
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-[#1F1F22] hover:rounded-full cursor-pointer transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open navigation menu"
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      {/* PADRONIZAÇÃO: layout responsivo igual ao Gym.jsx */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'} p-4 sm:p-8`}>
        <div className="max-w-4xl mx-auto space-y-8 pb-20">

          {/* PADRONIZAÇÃO: Header alinhado para mobile e desktop */}
          <div className="flex items-center justify-between pl-12 lg:pl-0 pt-1.5 lg:pt-0">
            <h1 className="text-2xl font-bold text-white">Wallets</h1>
          </div>

          {!giftRedeemed && (
            <div className="w-full">
              <div className="group relative bg-gradient-to-r from-[#FFD77D]/5 via-[#BB9F60]/5 to-[#18181B]/5 w-full rounded-2xl p-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all duration-300 ease-out">

                {/* Texto */}
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium text-[#FFF1E0] text-[17px] tracking-wider">
                    Ask Professor OAK for 3 free cards
                  </h2>
                  <div className="flex flex-col text-[#FFDBAF] font-regular text-[15px] tracking-tight leading-snug">
                    <span>No Pokémon yet?</span>
                    <span>You can redeem 3 free cards for now.</span>
                  </div>
                </div>

                {/* Botão */}
                <button
                  onClick={() => setIsRedeemModalOpen(true)}
                  className="w-full sm:w-auto bg-[#FFE7CA] shadow-[0_0px_90px_1px_rgba(255,230,195,0.5)] text-[#1A1A1A] text-[15px] py-2.5 px-8 rounded-full transition-all duration-200 transform hover:bg-[#FFDEB5] hover:shadow-[0_0px_40px_1px_rgba(255,230,195,0.5)] active:scale-95 cursor-pointer"
                >
                  Redeem
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8">
            {/* --- Seção Beezie (Flow EVM) --- */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEvmConnected ? 'bg-green-400 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'bg-[#3F3F46]'}`}></div>
                <label className="text-sm font-medium text-[#FAFAFA]">Beezie</label>
                <span className="text-xs font-medium text-[#52525B] border-l border-[#3F3F46] pl-2 leading-3">Flow EVM</span>
              </div>

              {!isEvmConnected ? (
                <div>
                  <button onClick={() => openReownModal()} className={connectButtonStyle} title="Connect">
                    <img src={BeezieLogo} alt="Beezie" className="w-4 h-4" />
                    Connect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => disconnectEvm()} className={disconnectButtonStyle}>
                    <img src={BeezieLogo} alt="Beezie" className="w-4 h-4" />
                    Disconnect
                  </button>
                  <input type="text" readOnly value={evmWalletAddress || ""} className={inputStyle} maxLength={60} />
                </div>
              )}
            </div>

            {/* --- Seção Collectorcrypt (Solana) --- */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSolanaConnected ? 'bg-[#22C55E]' : 'bg-[#3F3F46]'}`}></div>
                <label className="text-sm font-medium text-[#FAFAFA]">Collectorcrypt</label>
                <span className="text-xs font-medium text-[#52525B] border-l border-[#3F3F46] pl-2 leading-3">Solana</span>
              </div>

              {!isSolanaConnected ? (
                <div>
                  <button onClick={() => setSolanaModalVisible(true)} className={connectButtonStyle} title="Connect">
                    <img src={CollectorLogo} alt="Collector" className="w-4 h-4" />
                    Connect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => disconnectSolana()} className={disconnectButtonStyle}>
                    <img src={CollectorLogo} alt="Collector" className="w-4 h-4" />
                    Disconnect
                  </button>
                  <input type="text" readOnly value={solanaWalletAddress || ""} className={inputStyle} maxLength={60} />
                </div>
              )}
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