import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// --- IMPORTAÇÃO DE ASSETS (GRADERS) ---
import PsaLogo from "../../../assets/graders/psa.png";
import CgcLogo from "../../../assets/graders/cgc.png";
import SgcLogo from "../../../assets/graders/sgc.png";
import TagLogo from "../../../assets/graders/tag.png";

// --- IMPORTAÇÃO DE LOGOS (ADICIONADO) ---
import BeezieLogo from "../../../assets/beezie_logo.svg";
import CollectorLogo from "../../../assets/collector_logo.svg";
import OakLogo from "../../../assets/oak_logo.svg";

const GRADER_IMAGES = {
  psa: PsaLogo, cgc: CgcLogo, sgc: SgcLogo, tag: TagLogo
};

export function CardPreview({ card, topPos, onClose }) {
  if (!card) return null;

  const PREVIEW_HEIGHT = 720;
  const SCREEN_MARGIN = 20;
  const maxTopAllowed = window.innerHeight - PREVIEW_HEIGHT - SCREEN_MARGIN;
  let targetTop = topPos - 100;
  const finalTop = Math.max(SCREEN_MARGIN, Math.min(targetTop, maxTopAllowed));

  const graderKey = card.grader ? card.grader.toLowerCase() : "";
  const GraderLogoSrc = GRADER_IMAGES[graderKey];

  // --- LÓGICA DO CHIP/BADGE (BASEADO EM COLLECTIONITEM) ---
  let PlatformBadge;

  if (card.tag === 'OAK GIFT') {
    PlatformBadge = (
      <div className="flex items-center gap-[2px] bg-gradient-to-r from-[#161A1C] from-10% via-[#0C2D56] via-50% to-[#78313B] to-90% rounded-full px-2.5 py-1 h-6">
        <img src={OakLogo} alt="Oak" className="w-4 h-4" />
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
          OAK GIFT
        </div>
      </div>
    );
  } else if (card.chain === 'flow') {
    PlatformBadge = (
      <div className="flex items-center gap-[2px] bg-gradient-to-r from-[#131316]/90 to-[#575765]/90 rounded-full px-2.5 py-1 h-6">
        <img src={BeezieLogo} alt="Beezie" className="w-4 h-4" />
        <div className="text-white font-semibold text-[11px] flex items-center gap-1">
          beezie
        </div>
      </div>
    );
  } else if (card.chain === 'solana') {
    PlatformBadge = (
      <div className="flex items-center bg-gradient-to-r from-[#121212] from-10% via-[#1E2D2F] via-30% to-[#2B1E14] to-90% rounded-full px-2.5 py-1 h-6">
        <img src={CollectorLogo} alt="Collector" className="w-4 h-4" />
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
          COLLECTOR
        </div>
      </div>
    );
  } else {
    PlatformBadge = (
      <div className="flex items-center gap-1.5 bg-black/80 rounded-full px-2.5 py-1 h-6 shadow-sm">
        <div className="text-white font-bold text-[10px] flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full border border-white"></div>
          UNKNOWN
        </div>
      </div>
    );
  }

  // Mobile check (can be improved with a hook or context, but this works for inline styles)
  const isMobile = window.innerWidth < 1024;

  return (
    <>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, x: isMobile ? 0 : -20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: isMobile ? 0 : -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ top: isMobile ? '50%' : finalTop, transform: isMobile ? 'translate(-50%, -50%)' : undefined }}
        className={`fixed z-50 pointer-events-auto ${isMobile ? 'left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px]' : 'left-[360px] w-[500px]'}`}
      >
        <div className="relative bg-[#18181B] p-2 rounded-2xl shadow-2xl border border-[#26272B]">

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#131316]">
            {/* Close Button for Mobile - Inside Image Container */}
            {isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute top-2 right-2 z-50 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X color="#FAFAFA" size={15} />
              </button>
            )}

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
              <p className="text-gray-500 text-sm">{`#${card.cardId}`}</p>
            </div>

            {/* Container para Badge e Grader */}
            <div className="flex items-center gap-2">
              {PlatformBadge}

              {GraderLogoSrc && (
                <div className="bg-white/10 p-1.5 rounded-md flex items-center justify-center">
                  <img src={GraderLogoSrc} alt="Grader" className="h-5 w-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};