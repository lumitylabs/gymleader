import React from "react";
import { motion } from "framer-motion";

// --- IMPORTAÇÃO DE ASSETS (GRADERS) ---
import PsaLogo from "../../../assets/graders/psa.png";
import CgcLogo from "../../../assets/graders/cgc.png";
import SgcLogo from "../../../assets/graders/sgc.png";
import TagLogo from "../../../assets/graders/tag.png";

const GRADER_IMAGES = {
  psa: PsaLogo, cgc: CgcLogo, sgc: SgcLogo, tag: TagLogo
};

export function CardPreview({ card, topPos }) {
  if (!card) return null;

  const PREVIEW_HEIGHT = 720; 
  const SCREEN_MARGIN = 20; 
  const maxTopAllowed = window.innerHeight - PREVIEW_HEIGHT - SCREEN_MARGIN;
  let targetTop = topPos - 100;
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
};
