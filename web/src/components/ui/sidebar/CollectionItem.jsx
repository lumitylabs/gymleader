import React from "react";

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

const TAG_COLORS = {
  Water: "bg-[#3B99D6]",
  Fire: "bg-[#FF9D55]",
  Grass: "bg-[#63BC5A]",
  Lightning: "bg-[#F3D23B]",
  Psychic: "bg-[#FA7552]",
  Fighting: "bg-[#C03028]",
  Darkness: "bg-[#547E86]",
  Metal: "bg-[#9FA6B3]",
  Fairy: "bg-[#EE90E6]",
  Colorless: "bg-[#E1E1E1]",
  Dragon: "bg-[#C2A12B]",
  default: "bg-[#363639]"
};

const TYPE_IMAGES = {
  Water: WaterType, Fire: FireType, Grass: GrassType, Lightning: LightningType,
  Psychic: PsychicType, Fighting: FightingType, Darkness: DarknessType,
  Metal: MetalType, Fairy: FairyType, Colorless: ColorlessType, Dragon: DragonType,
  default: UnknownType 
};

const GRADER_IMAGES = {
  psa: PsaLogo, cgc: CgcLogo, sgc: SgcLogo, tag: TagLogo
};

const getTypeColor = (type) => {
  const gradients = {
    Water: "bg-gradient-to-r from-[#4DB9DA] to-[#2F80ED]",
    Fire: "bg-gradient-to-r from-[#F2994A] to-[#F2C94C]",
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

export function CollectionItem({ card, onHover, onLeave, onDragStart, onDragEnd }) {
  const mainType = card.types && card.types.length > 0 ? card.types[0] : 'Unknown';
  const bgGradient = getTypeColor(mainType);
  const typeImageSrc = TYPE_IMAGES[mainType] || TYPE_IMAGES.default;
  const tagColor = TAG_COLORS[mainType] || TAG_COLORS.default;
  
  const cardNumber = card.cardId;
  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

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
      <div className="relative z-10 flex justify-between h-full px-4 py-2 items-center">
        
        <div className="flex flex-col justify-center h-full max-w-[55%] z-20 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-md uppercase leading-none tracking-tight drop-shadow-md truncate">
              {card.name}
            </h3>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold flex-shrink-0 shadow-inner">
              {cardNumber}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {PlatformBadge}
            {GraderLogoSrc && (
              <img src={GraderLogoSrc} alt={card.grader} className="h-2.5 w-auto object-contain drop-shadow-md" />
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 h-full w-[45%] pointer-events-none">
          <div className="absolute right-[60px] top-[50%] translate-y-[-50%] z-20 flex items-center rounded-[4px] overflow-hidden shadow-lg ">
             <div className={`w-4 h-5 flex items-center justify-center ${tagColor}`}>
                <img 
                  src={typeImageSrc} 
                  alt={mainType} 
                  className="w-3 h-3 object-contain drop-shadow-sm"
                />
             </div>
             <div className="bg-[#283845] px-1 h-5 flex items-center min-w-[40px] justify-center">
                <span className="text-white text-[8px] font-bold uppercase tracking-wider">
                  {mainType}
                </span>
             </div>
          </div>

          <div className="absolute right-2 bottom-3 w-13 h-13 z-10">
             <img 
               src={`https://sweet-cendol-f4d090.netlify.app/${card.pokedexId}.gif`} 
               alt={card.name} 
               className="w-full h-full object-contain drop-shadow-2xl filter contrast-110" 
               loading="lazy"
             />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/5 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 rounded-2xl transition-colors pointer-events-none"></div>
    </div>
  );
}
