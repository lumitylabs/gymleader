import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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

// Adicione LogOut, Settings, ChevronDown aos imports do lucide-react
import { RefreshCw, Wallet, ChevronsLeft, Search, LogOut, Settings, ChevronDown } from 'lucide-react';

// Adicione os hooks do Wagmi/Reown se quiser mostrar o endereço (opcional, mas recomendado)
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
// import { useAppKitAccount } from '@reown/appkit/react'; // Opcional se quiser mostrar Solana aqui

// Importe o Avatar padrão (ajuste o caminho se necessário)
import Avatar from "../../../assets/avatar.png";

const TAG_COLORS = {
  Water: "bg-[#3B99D6]",
  Fire: "bg-[#FF9D55]",
  Grass: "bg-[#63BC5A]",
  Lightning: "bg-[#F3D23B]",
  Psychic: "bg-[#FA7552]",
  Fighting: "bg-[#C03028]",
  Darkness: "bg-[#547E86]", // Tom azulado/teal da imagem
  Metal: "bg-[#9FA6B3]",
  Fairy: "bg-[#EE90E6]",
  Colorless: "bg-[#E1E1E1]", // Quase branco/cinza claro
  Dragon: "bg-[#C2A12B]",
  default: "bg-[#363639]"
};


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

function UserAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  // 1. Hook EVM (Beezie/Flow)
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();

  // 2. Hook Solana (Collector)
  const { publicKey, connected: isSolanaConnected } = useWallet();
  const solanaAddress = publicKey ? publicKey.toBase58() : null;

  // Helper para formatar endereço
  const formatAddress = (addr) => addr ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : "Not Connected";

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <div className="px-4 py-2 border-t border-[#26272B] bg-[#131316] relative mx-6 ">
      {/* Menu Dropdown (Abre para CIMA) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-4 right-4 mb-2 bg-[#18181B] border border-[#26272B] rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Info das Carteiras */}
            <div className="px-4 py-3 bg-[#18181B] border-b border-[#26272B]">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Active Wallets</p>
              
              <div className="flex flex-col gap-2">
                {/* Beezie (EVM) */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${isEvmConnected ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'bg-gray-600'}`}></div>
                    <span>Beezie</span>
                  </div>
                  <span className="font-mono text-gray-500 text-[10px]">
                    {isEvmConnected ? formatAddress(evmAddress) : "Not Connected"}
                  </span>
                </div>

                {/* Collector (Solana) */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSolanaConnected ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'bg-gray-600'}`}></div>
                    <span>Collector</span>
                  </div>
                  <span className="font-mono text-gray-500 text-[10px]">
                    {isSolanaConnected ? formatAddress(solanaAddress) : "Not Connected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="p-1">
              <button
                onClick={() => navigate('/wallets')}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-gray-200 rounded-lg hover:bg-[#26272B] transition-colors"
              >
                <Wallet size={16} />
                <span>Manage Wallets</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-red-400 rounded-lg hover:bg-[#26272B] transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão do Usuário */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-[#202024] transition-colors group"
      >
        <div className="relative">
            <img 
                className="w-10 h-10 rounded-full object-cover border border-[#26272B] group-hover:border-gray-500 transition-colors" 
                src={ Avatar} 
                alt="User" 
            />
            {/* Indicador Online (Verde se alguma carteira estiver conectada) */}
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#131316] rounded-full ${isEvmConnected || isSolanaConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        </div>
        
        <div className="flex flex-col items-start flex-grow min-w-0">
          <span className="font-inter font-medium text-sm text-white truncate w-full text-left">
            {currentUser?.displayName || "Trainer"}
          </span>
          <span className="font-inter text-xs text-gray-500 truncate w-full text-left">
            {currentUser?.email}
          </span>
        </div>

        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
// Cores de Fundo
const getTypeColor = (type) => {
  const gradients = {
    Water: "bg-gradient-to-r from-[#4DB9DA] to-[#2F80ED]", // Azul Claro -> Azul Escuro
    Fire: "bg-gradient-to-r from-[#F2994A] to-[#F2C94C]", // Laranja -> Amarelo
    Grass: "bg-gradient-to-r from-[#A8E063] to-[#56AB2F]",
    Lightning: "bg-gradient-to-r from-[#FDC830] to-[#F37335]",
    Psychic: "bg-gradient-to-r from-[#BD85ED] to-[#A66BD9]",
    Fighting: "bg-gradient-to-r from-[#C94B4B] to-[#4B134F]",
    Darkness: "bg-gradient-to-r from-[#434343] to-[#000000]",
    Metal: "bg-gradient-to-r from-[#E0EAFC] to-[#CFDEF3]",
    Fairy: "bg-gradient-to-r from-[#EF629F] to-[#EECDA3]",
    Colorless: "bg-gradient-to-r from-[#D3CCE3] to-[#E9E4F0]",
    Dragon: "bg-gradient-to-r from-[#C2A12B] to-[#3D2E08]",
    default: "bg-gradient-to-r from-[#434343] to-[#000000]"
  };
  return gradients[type] || gradients.default;
};

// --- COMPONENTE: Card Preview (Janela Flutuante) ---
function CardPreview({ card, topPos }) {
  if (!card) return null;

  // 1. Definição da Altura Estimada
  // Largura 400px * Aspect Ratio da imagem (~1.33) + Espaço para textos/padding
  // 400 * 1.33 = 532px + ~70px de infos = ~600px total
  const PREVIEW_HEIGHT = 720; 
  const SCREEN_MARGIN = 20; // Margem mínima das bordas da tela

  // 2. Calcular o limite máximo que o 'top' pode ter
  // (Altura da Tela - Altura do Card - Margem)
  // Se o 'top' for maior que isso, a carta sai da tela embaixo.
  const maxTopAllowed = window.innerHeight - PREVIEW_HEIGHT - SCREEN_MARGIN;

  // 3. Posição desejada (alinhada com o mouse, mas subindo um pouco -100px)
  let targetTop = topPos - 100;

  // 4. Aplicar limites (Clamp)
  // Math.min: Garante que não desça mais que o permitido (corta embaixo)
  // Math.max: Garante que não suba mais que a margem superior (corta em cima)
  const finalTop = Math.max(SCREEN_MARGIN, Math.min(targetTop, maxTopAllowed));

  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ top: finalTop }}
      className="fixed left-[360px] z-50 w-[500px] pointer-events-none"
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
            <p className="text-white font-bold text-lg leading-tight">{card.name}</p>
            <p className="text-gray-500 text-sm">{card.fullName.split('#')[0]}</p>
          </div>
          {GraderLogoSrc && (
             <div className="bg-white/10 p-1.5 rounded-md">
                <img src={GraderLogoSrc} alt="Grader" className="h-5 w-auto" />
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- COMPONENTE: Item da Lista ---
function CollectionItem({ card, onHover, onLeave, onDragStart, onDragEnd }) {
  const mainType = card.types && card.types.length > 0 ? card.types[0] : 'Unknown';
  const bgGradient = getTypeColor(mainType); // Agora usa o gradiente
  const typeImageSrc = TYPE_IMAGES[mainType] || TYPE_IMAGES.default;
  const tagColor = TAG_COLORS[mainType] || TAG_COLORS.default;
  
  const cardNumber = card.cardId;
  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

  // Badges de Plataforma (Mantive igual, só ajustei margens se necessário)
  let PlatformBadge;
  if (card.chain === 'flow') {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black/80 rounded-full px-2.5 py-1 h-6 shadow-sm">
        <div className="text-yellow-400 font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-yellow-400 rotate-45"></div>
           beezie
        </div>
      </div>
    );
  } else if (card.chain === 'solana') {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black/80 rounded-full px-2.5 py-1 h-6 shadow-sm">
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-gradient-to-tr from-orange-500 to-blue-500 rounded-sm"></div>
           COLLECTOR
        </div>
      </div>
    );
  } else {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black/80 rounded-full px-2.5 py-1 h-6 shadow-sm">
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
           <div className="w-2 h-2 bg-red-500 rounded-full border border-white"></div>
           OAK GIFT
        </div>
      </div>
    );
  }

  return (
    <div 
      draggable="true"
      onDragStart={(e) => {
        if (onDragStart) onDragStart();
        e.dataTransfer.setData("application/json", JSON.stringify(card));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={(e) => {
        if (onDragEnd) onDragEnd();
      }}
      onMouseEnter={(e) => onHover(card, e)}
      onMouseLeave={() => onLeave(card)}
      className={`group relative w-full h-[90px] rounded-2xl overflow-hidden mb-2 select-none transition-transform active:scale-[0.98] cursor-pointer shadow-lg ${bgGradient} hover:scale-[0.98]`}
    >
      {/* Conteúdo Principal */}
      <div className="relative z-10 flex justify-between h-full px-4 py-2 items-center">
        
        {/* Lado Esquerdo: Aumentei max-w para 65% para caber o nome */}
        <div className="flex flex-col justify-center h-full max-w-[55%] z-20 gap-2">
          
          {/* Nome e Número */}
          <div className="flex items-center gap-2">
            {/* Nome Maior e Italico */}
            <h3 className="font-bold text-white text-md uppercase leading-none tracking-tight drop-shadow-md truncate">
              {card.name}
            </h3>
            
            {/* Círculo do Número Maior e Translúcido */}
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold flex-shrink-0 shadow-inner">
              {cardNumber}
            </div>
          </div>

          {/* Badges Inferiores */}
          <div className="flex items-center gap-2">
            {PlatformBadge}
            {GraderLogoSrc && (
              <img src={GraderLogoSrc} alt={card.grader} className="h-2.5 w-auto object-contain drop-shadow-md" />
            )}
          </div>
        </div>

        {/* Lado Direito */}
        <div className="absolute right-0 top-0 h-full w-[45%] pointer-events-none">
          
          {/* --- TAG DE TIPO --- */}
          {/* Ajustei o posicionamento para ficar alinhado com o meio/baixo */}
          <div className="absolute right-[60px] top-[50%] translate-y-[-50%] z-20 flex items-center rounded-[4px] overflow-hidden shadow-lg ">
             {/* Ícone */}
             <div className={`w-4 h-5 flex items-center justify-center ${tagColor}`}>
                <img 
                  src={typeImageSrc} 
                  alt={mainType} 
                  className="w-3 h-3 object-contain drop-shadow-sm"
                />
             </div>
             {/* Texto (Fundo azulado escuro para combinar com Water, ou neutro) */}
             <div className="bg-[#283845] px-1 h-5 flex items-center min-w-[40px] justify-center">
                <span className="text-white text-[8px] font-bold uppercase tracking-wider">
                  {mainType}
                </span>
             </div>
          </div>

          {/* Sprite do Pokemon */}
          <div className="absolute right-2 bottom-3 w-13 h-13 z-10">
             <img 
               src={card.officialArt} 
               alt={card.name} 
               className="w-full h-full object-contain drop-shadow-2xl filter contrast-110" 
               loading="lazy"
             />
          </div>
        </div>
      </div>

      {/* Overlay de Brilho/Ruído sutil para textura */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/5 pointer-events-none mix-blend-overlay"></div>
      
      {/* Highlight de Hover */}
      <div className="absolute inset-0 rounded-2xl transition-colors pointer-events-none"></div>
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
  const location = useLocation();

  // Estados para o Preview Flutuante
  const [previewCard, setPreviewCard] = useState(null);
  const [mouseY, setMouseY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handlers de Hover
  const handleCardHover = (card, event) => {
    if (isDragging) return;
    setPreviewCard(card);
    setMouseY(event.clientY);
  };

    const handleCardLeave = (cardLeft) => {
    setPreviewCard((currentCard) => {
      // Só limpa o preview se o card que o mouse saiu for o mesmo que está ativo.
      // Se o usuário já passou para o próximo card, 'currentCard' já será o novo,
      // então não fazemos nada (evita apagar o novo card).
      if (currentCard === cardLeft) {
        return null;
      }
      return currentCard;
    });
  };

  const handleDragStart = () => {
    setIsDragging(true);
    setPreviewCard(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
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
        {/* --- PREVIEW FLUTUANTE --- */}
        <AnimatePresence>
          {previewCard && !isDragging && <CardPreview key={previewCard.token_address + previewCard.cardId} card={previewCard} topPos={mouseY} />}
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
            <button onClick={() => navigate('/gym')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/gym' ? 'bg-[#26272B] text-white' : 'text-gray-400 hover:text-white hover:bg-[#26272B]'}`}>
                <div className="w-5 h-5 border-2 border-current rounded-md" />
                <span className="font-medium text-sm">Gym</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#26272B] rounded-lg transition-colors">
                <div className="w-5 h-5 border-2 border-current rounded-md rotate-45" />
                <span className="font-medium text-sm">Battle</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#26272B] rounded-lg transition-colors">
                <div className="w-5 h-5 border-2 border-current rounded-full" />
                <span className="font-medium text-sm">Badges</span>
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
                    placeholder="Search" 
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
            <SimpleBar 
                style={{ height: '100%' }} 
                className="pr-2" 
                id="scrollbar" 
                autoHide={false} 
            >
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
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                            />
                        ))
                    )}
                </div>
            </SimpleBar>
        </div>
         <UserAccount />
      </motion.nav>
    </>
  );
}

export default Sidebar;