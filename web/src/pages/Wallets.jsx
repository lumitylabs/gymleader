// pages/Wallets.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// --- UTILS E ICONS ---
import { toast } from 'sonner';
import { X } from 'lucide-react';

// --- FIREBASE ---
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";

// --- ASSETS ---
import Oak from '../assets/oak.png';
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";

// --- FRAMER MOTION ---
import { motion, AnimatePresence } from "framer-motion";

// --- IMPORTAÇÃO DO SIMPLEBAR E CSS ---
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";


// --- COMPONENTE DE PREVIEW FLUTUANTE ---
const FloatingPreview = ({ hoveredData }) => {
  if (!hoveredData) return null;

  const { card, rect, showOnRight } = hoveredData;

  const PREVIEW_HEIGHT = 580;
  const PREVIEW_WIDTH = 420;
  const GAP = 4;
  const SCREEN_PADDING = 15;

  const windowHeight = window.innerHeight;
  let topPosition = rect.top + (rect.height / 2) - (PREVIEW_HEIGHT / 2);

  if (topPosition + PREVIEW_HEIGHT > windowHeight - SCREEN_PADDING) {
    topPosition = windowHeight - PREVIEW_HEIGHT - SCREEN_PADDING;
  }
  if (topPosition < SCREEN_PADDING) {
    topPosition = SCREEN_PADDING;
  }

  const leftPosition = showOnRight
    ? rect.right + GAP
    : rect.left - PREVIEW_WIDTH - GAP;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={card.token_address}
        initial={{ opacity: 0, scale: 0.9, x: showOnRight ? -20 : 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.08 } }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        style={{
          position: 'fixed',
          top: topPosition,
          left: leftPosition,
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          zIndex: 9999,
          pointerEvents: 'none'
        }}
        className="flex items-center justify-center"
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] border-[3px] border-[#202024] bg-[#18181B]">
          <img
            src={card.imagem}
            alt="Preview"
            className="w-full h-full object-contain bg-[#131316]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 mix-blend-overlay"></div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// --- COMPONENTE DE CARTA INDIVIDUAL ---
const PokemonCardItem = ({ card, index, isSelected, onToggle, onHoverStart, onHoverEnd }) => {
  const handleMouseEnter = (e) => {
    // Desabilita hover em telas touch/mobile para evitar bugs visuais
    if (window.innerWidth < 768) return;

    const rect = e.currentTarget.getBoundingClientRect();
    onHoverStart(card, rect, index);
  };

  return (
    <motion.div
      onClick={() => onToggle(card.token_address)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      whileHover={{ scale: !isSelected ? 1.03 : 1 }}
      animate={{ y: isSelected ? -10 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        relative cursor-pointer rounded-xl group
        ${isSelected ? '' : 'hover:brightness-110'}
      `}
      style={{
        boxShadow: isSelected
          ? "0px 15px 40px -5px rgba(234, 179, 8, 0.35)"
          : "0px 5px 15px -2px rgba(0,0,0,0.5)"
      }}
    >
      <div className="aspect-[3/4] rounded-xl overflow-hidden">
        <img
          src={card.details?.image ? (card.details.image + "/high.png") : card.imagem}
          alt={card.nome}
          className="w-full h-full object-contain"
        />
      </div>
    </motion.div>
  );
};

// --- MODAL DE RESGATE ---
const RedeemModal = ({ isOpen, onClose, userId, onRedeemSuccess }) => {
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [hoveredData, setHoveredData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchGiftOptions();
    }
  }, [isOpen]);

  const fetchGiftOptions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/gift-options`);
      const data = await response.json();
      if (data.cards) setCards(data.cards);
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
    if (selectedCards.length !== 3) {
      toast.warning("Please select exactly 3 cards.");
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/redeem-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, selectedCardIds: selectedCards })
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
      toast.error("An error occurred while redeeming.");
    } finally {
      setRedeeming(false);
    }
  };

  const onHoverStart = (card, rect, index) => {
    const isMobile = window.innerWidth < 640;

    // Em mobile, não mostramos o preview flutuante
    if (isMobile) return;

    let showOnRight = true;
    // Lógica para 4 colunas (Desktop)
    showOnRight = (index % 4) < 2;

    setHoveredData({ card, rect, showOnRight });
  };

  const onHoverEnd = () => {
    setHoveredData(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          // RESPONSIVIDADE AQUI:
          // Mobile: h-[85vh] (flexível)
          className="bg-[#18181B] w-full max-w-5xl h-[85vh] md:h-[800px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
          onScroll={() => setHoveredData(null)}
        >
          {/* Botão Fechar - Ajustado levemente para mobile */}
          <button
            onClick={onClose}
            className="absolute top-6 right-4 md:top-5 md:right-6 z-50 backdrop-blur-sm transition-colors text-gray-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header - Padding Responsivo (px-4 no mobile, px-8 no desktop) */}
          <div className='flex justify-between items-center px-4 md:px-8 mt-6 md:mt-8 mb-4 md:mb-5'>
            <div className='text-sm text-[#FFF1E0] font-medium text-white'>Select your Pokémons</div>
          </div>

          {/* Professor Oak Area */}
          <div className="px-4 md:px-8 flex flex-col bg-[#18181B] shrink-0 border-b border-[#26272B]/50 md:border-none">
            <div className="flex gap-2">
              <div className="ml-0 md:ml-5 w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm">
                <img src={Oak} alt="Professor Oak" className="w-full h-full object-cover select-none" />
              </div>
              <div className="flex flex-col bg-[#282828] px-4 py-2 mt-4 rounded-r-xl rounded-bl-xl select-none max-w-full mb-2 md:mb-0">
                <h2 className="text-xs text-[#FFF1E0] font-medium text-white leading-tight">Professor OAK</h2>
                <p className="text-xs text-[#FFDBAF] leading-snug">Welcome, Leader! Choose <span className="text-yellow-500 font-bold">3 Pokémons</span> to begin your journey. </p>
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <SimpleBar
            style={{ height: '100%' }}
            className="flex-1 min-h-0 w-full"
            id="modal-scrollbar"
            autoHide={false}
            scrollableNodeProps={{
              onScroll: () => setHoveredData(null)
            }}
          >
            {/* 
                AQUI MUDOU: 
                Adicionamos 'flex-1' para esta div crescer e ocupar os 100% definidos no CSS.
                Mantivemos o padding aqui.
            */}
            <div className="flex-1 flex flex-col w-full bg-[#18181B] px-4 md:px-8 pt-6 md:pt-10 pb-8 md:pb-12">

              {loading ? (
                /* 
                   AQUI MUDOU: 
                   'm-auto' (margin auto) é o jeito mais seguro de centralizar 
                   em um flex-container vertical que tem altura total.
                */
                <div className="m-auto flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-sm">Opening packs...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8 w-full max-w-3xl mx-auto content-start">
                  {cards.map((card, index) => (
                    <PokemonCardItem
                      key={card.token_address}
                      card={card}
                      index={index}
                      isSelected={selectedCards.includes(card.token_address)}
                      onToggle={toggleCardSelection}
                      onHoverStart={onHoverStart}
                      onHoverEnd={onHoverEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          </SimpleBar>

          {/* Footer - Padding Responsivo */}
          <div className="px-4 md:px-8 py-4 md:py-8 bg-[#18181B] flex justify-between items-center shrink-0 border-t border-[#26272B]/50 md:border-none">
            <div className="text-sm">
              <span className={selectedCards.length === 3 ? "text-yellow-500 font-medium" : "text-gray-400"}>
                {selectedCards.length} of 3 Selected
              </span>
            </div>

            <button
              onClick={handleRedeem}
              disabled={redeeming || selectedCards.length !== 3}
              className={`
                px-8 md:px-10 py-2.5 rounded-full text-xs sm:text-sm transition-all transform
                ${redeeming || selectedCards.length !== 3
                  ? 'bg-[#89898A] text-[#232325] cursor-ignore'
                  : 'bg-[#FAFAFA] text-[#2D2D2D] font-regular hover:bg-white active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer'
                }
              `}
            >
              {redeeming ? 'Claiming...' : 'Claim'}
            </button>
          </div>

        </motion.div >
      </div >

      {/* Preview Flutuante (Lógica de exibição controlada dentro do componente e no hoverStart) */}
      <FloatingPreview hoveredData={hoveredData} />
    </>
  );
};

// --- PÁGINA WALLETS (INALTERADA) ---
function Wallets() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [giftRedeemed, setGiftRedeemed] = useState(false);

  const { currentUser } = useAuth();
  const { open: openReownModal } = useAppKit();
  const { address: evmWalletAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();
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

  const connectButtonStyle = "flex items-center gap-1 px-6 py-3.5 bg-transparent border border-[#3A3A3A] text-sm text-[#D9D3D3] font-semibold rounded-full cursor-pointer hover:bg-[#1F1F22] transition duration-200 active:scale-95 select-none disabled:cursor-not-allowed";
  const disconnectButtonStyle = "h-full flex items-center justify-center gap-2 px-6 py-3.5 border border-[#3F3F46] text-sm text-[#D9D3D3] font-semibold rounded-full cursor-pointer hover:bg-[#2A2A2E] hover:text-white transition duration-200 active:scale-95";
  const inputStyle = "w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-3.5 text-white focus:outline-none transition-colors placeholder:text-[#9DA3AE]";

  return (
    <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3F3F46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525B;
        }
      `}</style>

      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-black/40 hover:rounded-full cursor-pointer transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open navigation menu"
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      <div
        className={`hidden lg:block flex-shrink-0 bg-transparent transition-[width] duration-300 ease-in-out h-full ${isNavbarOpen ? 'w-[260px]' : 'w-0'}`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 h-full relative flex flex-col">
        <SimpleBar style={{ height: '100%' }} className="w-full login-page-scrollbar">
          <main className="p-4 sm:p-8 w-full min-h-full">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">

              <div className="flex items-center justify-between pl-12 lg:pl-0 pt-1.5 lg:pt-0">
                <h1 className="text-lg font-semibold text-[#FAFAFA]">Wallets</h1>
              </div>

              {!giftRedeemed && (
                <div className="w-full">
                  <div className="group relative bg-gradient-to-r from-[#FFD77D]/5 via-[#BB9F60]/5 to-[#18181B]/5 w-full rounded-2xl p-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all duration-300 ease-out">
                    <div className="flex flex-col gap-1">
                      <h2 className="font-medium text-[#FFF1E0] text-md">
                        Ask Professor OAK for 3 free cards
                      </h2>
                      <div className="flex flex-col text-[#FFDBAF] font-regular text-sm leading-snug">
                        <span>No Pokémon yet?</span>
                        <span>You can redeem 3 free cards for now.</span>
                      </div>
                    </div>
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
                    <div className={`w-1.5 h-1.5 rounded-full ${isEvmConnected ? 'bg-green-400 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'bg-[#3F3F46]'}`}></div>
                    <label className="text-sm font-medium text-[#FAFAFA]">Beezie</label>
                    <span className="text-xs font-medium text-[#52525B] border-l border-[#3F3F46] pl-1.5 leading-3">Flow EVM</span>
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
                    <div className={`w-1.5 h-1.5 rounded-full ${isSolanaConnected ? 'bg-[#22C55E]' : 'bg-[#3F3F46]'}`}></div>
                    <label className="text-sm font-medium text-[#FAFAFA]">Collector</label>
                    <span className="text-xs font-medium text-[#52525B] border-l border-[#3F3F46] pl-1.5 leading-3">Solana</span>
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
        </SimpleBar>
      </div>

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