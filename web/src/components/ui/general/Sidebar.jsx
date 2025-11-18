import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Wallet, ChevronsLeft, Search } from 'lucide-react';
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

// Firebase
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../firebase/config";
import { ref, onValue } from "firebase/database";

// --- IMPORTAÇÃO DE ASSETS (TIPOS) ---
import WaterType from "../../../assets/types/water.png";
import FireType from "../../../assets/types/fire.png";
import GrassType from "../../../assets/types/grass.png";
import LightningType from "../../../assets/types/lightning.png";
import PsychicType from "../../../assets/types/psychic.png";
import FightingType from "../../../assets/types/fighting.png";
import DarknessType from "../../../assets/types/darkness.png";
import MetalType from "../../../assets/types/metal.png";
import FairyType from "../../../assets/types/fairy.png";
import ColorlessType from "../../../assets/types/colorless.png";
import UnknownType from "../../../assets/types/unknown.png";
import DragonType from "../../../assets/types/dragon.png";

// --- IMPORTAÇÃO DE ASSETS (GRADERS) ---
import PsaLogo from "../../../assets/graders/psa.png";
import CgcLogo from "../../../assets/graders/cgc.png";
import SgcLogo from "../../../assets/graders/sgc.png";
import TagLogo from "../../../assets/graders/tag.png";

// Mapas de Imagens
const TYPE_IMAGES = {
  Water: WaterType, Fire: FireType, Grass: GrassType, Lightning: LightningType,
  Psychic: PsychicType, Fighting: FightingType, Darkness: DarknessType,
  Metal: MetalType, Fairy: FairyType, Colorless: ColorlessType, Dragon: DragonType,
  default: UnknownType 
};

const GRADER_IMAGES = {
  psa: PsaLogo, cgc: CgcLogo, sgc: SgcLogo, tag: TagLogo
};

// Cores de Fundo
const getTypeColor = (type) => {
  const colors = {
    Water: "bg-[#719FCB]", Fire: "bg-[#CB7171]", Grass: "bg-[#80CB71]",
    Lightning: "bg-[#CBC071]", Psychic: "bg-[#C371CB]", Fighting: "bg-[#CB9B71]",
    Darkness: "bg-[#272727]", Metal: "bg-[#949494]", Fairy: "bg-[#CB719C]",
    Colorless: "bg-[#D6D6D6]", Dragon: "bg-[#CBA171]", default: "bg-[#363639]"
  };
  return colors[type] || colors.default;
};

// --- COMPONENTE: Card Preview (Janela Flutuante) ---
function CardPreview({ card, topPos }) {
  if (!card) return null;

  // Ajuste para garantir que o preview não saia da tela (viewport)
  // Se estiver muito embaixo, empurra para cima
  const adjustedTop = Math.min(topPos - 100, window.innerHeight - 450); 
  const finalTop = Math.max(20, adjustedTop); // Não deixa passar do topo também

  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ top: finalTop }}
      className="fixed left-[360px] z-50 w-[280px] pointer-events-none"
    >
      <div className="relative bg-[#18181B] p-2 rounded-2xl shadow-2xl border border-[#26272B]">
        {/* Imagem do Scan */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#131316]">
          {card.image ? (
            <img 
              src={card.image} 
              alt={card.name} 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-xs">
              No Scan Available
            </div>
          )}
        </div>

        {/* Info Rápida Abaixo do Scan */}
        <div className="mt-3 px-1 pb-1 flex justify-between items-center">
          <div>
            <p className="text-white font-bold text-sm leading-tight">{card.name}</p>
            <p className="text-gray-500 text-xs">{card.fullName.split('#')[0]}</p>
          </div>
          {GraderLogoSrc && (
             <div className="bg-white/10 p-1.5 rounded-md">
                <img src={GraderLogoSrc} alt="Grader" className="h-4 w-auto" />
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- COMPONENTE: Item da Lista ---
function CollectionItem({ card, onHover, onLeave }) {
  const mainType = card.types && card.types.length > 0 ? card.types[0] : 'Unknown';
  const bgColor = getTypeColor(mainType);
  const typeImageSrc = TYPE_IMAGES[mainType] || TYPE_IMAGES.default;
  const cardNumber = card.cardId;
  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

  // Badges de Plataforma
  let PlatformBadge;
  if (card.chain === 'flow') {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black rounded-full px-2 py-1 h-6 border border-white/10">
        <div className="text-yellow-400 font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-yellow-400 rotate-45"></div>
           beezie
        </div>
      </div>
    );
  } else if (card.chain === 'solana') {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black rounded-full px-2 py-1 h-6 border border-white/10">
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-gradient-to-tr from-orange-500 to-blue-500 rounded-sm"></div>
           COLLECTOR
        </div>
      </div>
    );
  } else {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black rounded-full px-2 py-1 h-6 border border-white/10">
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-red-500 rounded-full border border-white"></div>
           OAK GIFT
        </div>
      </div>
    );
  }

  return (
    <div 
      onMouseEnter={(e) => onHover(card, e)}
      onMouseLeave={onLeave}
      className={`group relative w-full h-[90px] rounded-2xl overflow-hidden mb-3 select-none transition-transform active:scale-[0.98] cursor-pointer shadow-lg ${bgColor}`}
    >
      {/* Conteúdo Principal */}
      <div className="relative z-10 flex justify-between h-full px-4 py-3">
        
        {/* Lado Esquerdo */}
        <div className="flex flex-col justify-between h-full max-w-[55%] z-20">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-white text-xl uppercase leading-none tracking-tight drop-shadow-sm truncate">
              {card.name}
            </h3>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold flex-shrink-0">
              {cardNumber}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {PlatformBadge}
            {GraderLogoSrc && (
              <img src={GraderLogoSrc} alt={card.grader} className="h-4 w-auto object-contain drop-shadow-sm" />
            )}
          </div>
        </div>

        {/* Lado Direito */}
        <div className="absolute right-0 top-0 h-full w-[50%] pointer-events-none">
          <div className="absolute right-[90px] bottom-[28px] z-20">
             <img src={typeImageSrc} alt={mainType} className="h-6 w-auto object-contain drop-shadow-md"/>
          </div>
          <div className="absolute right-1 bottom-2 w-15 h-15 z-10">
             <img src={card.officialArt} alt={card.name} className="w-full h-full object-contain drop-shadow-2xl" loading="lazy"/>
          </div>
        </div>
      </div>

      {/* Efeito de brilho sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none group-hover:opacity-0 transition-opacity"></div>
      
      {/* Highlight de Hover (Borda interna ou brilho) */}
      <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 rounded-2xl transition-colors pointer-events-none"></div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL: Sidebar ---
function Sidebar({ isOpen, setIsOpen, handleMobileNavClick }) {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  // Estados para o Preview Flutuante
  const [previewCard, setPreviewCard] = useState(null);
  const [mouseY, setMouseY] = useState(0);

  // Handlers de Hover
  const handleCardHover = (card, event) => {
    setPreviewCard(card);
    setMouseY(event.clientY);
  };

  const handleCardLeave = () => {
    setPreviewCard(null);
  };

  // Listener do Firebase
  useEffect(() => {
    if (!currentUser) return;
    const collectionRef = ref(db, `users/${currentUser.uid}/collection`);
    const unsubscribe = onValue(collectionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const cardsArray = Object.values(data).sort((a, b) => b.lastUpdated - a.lastUpdated);
        setCards(cardsArray);
      } else {
        setCards([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Função de Refresh
  const handleRefresh = async () => {
    if (!currentUser || syncing) return;
    setSyncing(true);
    try {
      await fetch(import.meta.env.VITE_SERVER_URL + '/api/sync-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid })
      });
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setSyncing(false);
    }
  };

  const variants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={variants}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed top-0 left-0 w-[340px] h-screen bg-[#131316] border-r border-[#26272B] font-inter flex flex-col z-40 select-none shadow-2xl"
      >
        {/* --- PREVIEW FLUTUANTE (Renderizado fora da lista para não ser cortado) --- */}
        <AnimatePresence>
          {previewCard && <CardPreview card={previewCard} topPos={mouseY} />}
        </AnimatePresence>

        {/* Header */}
        <div className="p-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <span className="font-bold text-white">G</span>
             </div>
             <span className="font-bold text-white text-lg tracking-tight">Gym Leader</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500">
            <ChevronsLeft />
          </button>
        </div>

        {/* Menu Principal */}
        <div className="px-3 py-4 space-y-1">
            <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#26272B] rounded-lg transition-colors">
                <div className="w-5 h-5 border-2 border-current rounded-md" />
                <span className="font-medium text-sm">Gym</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#26272B] rounded-lg transition-colors">
                <div className="w-5 h-5 border-2 border-current rounded-md rotate-45" />
                <span className="font-medium text-sm">Battle</span>
            </button>
            <button onClick={() => navigate('/wallets')} className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#26272B] rounded-lg transition-colors">
                <Wallet size={20} />
                <span className="font-medium text-sm">Wallets</span>
            </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-2">
            <div className="bg-[#202024] flex items-center px-3 py-2 rounded-lg border border-[#26272B] focus-within:border-gray-600 transition-colors">
                <Search size={14} className="text-gray-500 mr-2"/>
                <input 
                    type="text" 
                    placeholder="Search collection..." 
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-600"
                />
            </div>
        </div>

        {/* Collection Header & Refresh */}
        <div className="px-5 py-2 flex items-center justify-between mt-2">
            <span className="text-xs font-semibold text-[#818182] uppercase tracking-wider">
                Collection ({cards.length})
            </span>
            <button 
                onClick={handleRefresh}
                disabled={syncing}
                className={`p-2 rounded-full bg-[#202024] hover:bg-[#2D2D32] text-gray-400 hover:text-white transition-all ${syncing ? 'animate-spin text-blue-500' : ''}`}
                title="Sync with Blockchain"
            >
                <RefreshCw size={14} />
            </button>
        </div>

        {/* Lista de Cartas (Scrollable) */}
        <div className="flex-1 overflow-hidden px-4">
            <SimpleBar style={{ height: '100%' }} className="pr-2">
                <div className="flex flex-col pb-4 pt-2">
                    {loading ? (
                        <div className="text-center py-10 text-gray-600 text-sm">Loading...</div>
                    ) : cards.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 text-sm px-4 border border-dashed border-[#26272B] rounded-xl mt-2">
                            No cards found.<br/>Connect your wallets and click refresh.
                        </div>
                    ) : (
                        cards.map((card, index) => (
                            <CollectionItem 
                              key={index} 
                              card={card} 
                              onHover={handleCardHover}
                              onLeave={handleCardLeave}
                            />
                        ))
                    )}
                </div>
            </SimpleBar>
        </div>
      </motion.nav>
    </>
  );
}

export default Sidebar;