import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from '../components/ui/general/Sidebar';
import { Search, MapPin } from 'lucide-react';
import { motion, animate } from 'framer-motion';
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";

// --- IMPORTAÇÃO DO SIMPLEBAR E CSS ---
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import HoloBadge from '../components/HoloBadge';

/* =========================================================================
   COMPONENTE: FILTER TAG
   ========================================================================= */
const FilterTag = ({ name, isActive, onClick }) => {
  const baseClasses = "flex items-center justify-center font-inter font-semibold text-[0.80em] py-[14px] px-4 rounded-xl cursor-pointer transition-all duration-200 whitespace-nowrap select-none";
  const activeClasses = "bg-[#FAFAFA] text-[#1C1C1F] border-transparent shadow-sm scale-105";
  const inactiveClasses = "bg-[#26272B] text-[#A2A2AB] border-transparent hover:text-white hover:bg-[#2E2F33]";

  return (
    <button
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={() => onClick(name)}
    >
      {name}
    </button>
  );
};

/* =========================================================================
   COMPONENTE: FILTER BAR
   ========================================================================= */
function FilterBar({ activeCategory, onCategorySelect, categories }) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const isOverflowing = scrollWidth > clientWidth;
      setCanScrollLeft(isOverflowing && scrollLeft > 1);
      setCanScrollRight(isOverflowing && Math.ceil(scrollLeft) < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => checkScrollability());
    observer.observe(container);
    container.addEventListener('scroll', checkScrollability, { passive: true });

    const handleMouseDown = (e) => {
      isDragging.current = true;
      startX.current = e.pageX - container.offsetLeft;
      scrollLeftStart.current = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const stopDragging = () => {
      isDragging.current = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      container.scrollLeft = scrollLeftStart.current - walk;
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', stopDragging);
    container.addEventListener('mouseup', stopDragging);
    container.addEventListener('mousemove', handleMouseMove);

    checkScrollability();

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', checkScrollability);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', stopDragging);
      container.removeEventListener('mouseup', stopDragging);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative w-full group py-1">
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
        style={{ scrollBehavior: 'auto' }}
      >
        <div className="flex gap-2 py-1 px-1">
          {categories.map((category) => (
            <div key={category} className="flex-shrink-0">
              <FilterTag name={category} isActive={activeCategory === category} onClick={onCategorySelect} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTE: BADGE CARD SKELETON
   ========================================================================= */
const BadgeCardSkeleton = () => (
  <div className="border border-[#202024] rounded-[20px] overflow-hidden flex flex-col h-full">
    <div className="aspect-square p-7.5 flex items-center justify-center">
      <div className="w-full h-full bg-[#2A2A2E] rounded-[32px] animate-pulse"></div>
    </div>
    <div className="p-5 bg-[#1C1C1F] space-y-2 flex-1">
      <div className="h-5 bg-[#242427] rounded w-3/4 animate-pulse"></div>
      <div className="space-y-2 pt-1">
        <div className="h-2.5 bg-[#242427] rounded w-1/2 animate-pulse"></div>
        <div className="h-2 bg-[#242427] rounded w-1/3 animate-pulse"></div>
      </div>
    </div>
  </div>
);

/* =========================================================================
   COMPONENTE PRINCIPAL: BADGES
   ========================================================================= */
function Badges() {
  const { currentUser } = useAuth();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  useEffect(() => {
    if (currentUser) {
      fetchBadges();
    }
  }, [currentUser]);

  const fetchBadges = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/user/badges?userId=${currentUser.uid}`);
      const data = await response.json();
      if (data.badges) {
        setBadges(data.badges);
      }
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.leaderName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'All') return matchesSearch;
    if (filter === 'Gym Challenge') return matchesSearch && badge.location === 'Gym Challenge';
    if (filter === 'Victory Road') return matchesSearch && badge.location === 'Victory Road';
    if (filter === 'Elite Four') return matchesSearch && badge.location === 'Elite Four';
    // when filter is pvp or does not have the variable location
    if (filter === 'PvP') return matchesSearch && (badge.location === 'PvP' || !badge.location);
    return matchesSearch;
  });

  return (
    <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">

      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-30 p-2 rounded-full hover:bg-black/40 cursor-pointer transition-all duration-300 ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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

            <div className="max-w-4xl mx-auto pb-20">

              {/* HEADER */}
              <div className="flex flex-col mb-2.5">
                <div className="flex justify-end md:justify-between items-center w-full gap-4 select-none">
                  <h1 className="hidden md:block text-lg font-semibold text-[#FAFAFA] whitespace-nowrap">
                    Badges
                  </h1>
                  <div className="flex items-center gap-2 px-6 py-4 w-full max-w-xs md:max-w-sm rounded-full bg-[#202024] transition-all">
                    <Search color="#FAFAFA" size={16} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent text-[#FAFAFA] placeholder:text-[#959BA5] text-sm focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="md:hidden mt-5">
                  <h1 className="text-lg font-semibold text-[#FAFAFA]">Badges</h1>
                </div>

                <div className="mt-5 w-full pl-0">
                  <FilterBar
                    activeCategory={filter}
                    onCategorySelect={setFilter}
                    categories={["Gym Challenge", "Victory Road", "Elite Four", "PvP"]}
                  />
                </div>
              </div>

              {/* GRID DE BADGES */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <BadgeCardSkeleton key={index} />
                  ))
                ) : filteredBadges.length > 0 ? (
                  filteredBadges.map((badge) => (
                    <motion.div
                      key={badge.gymId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="bg-black rounded-[20px] group cursor-pointer shadow-sm relative hover:z-20 flex flex-col h-full"
                    >
                      {/* 
                          --- MUDANÇA PRINCIPAL AQUI ---
                          1. bg-[#202024] alterado para bg-gradient-to-r from-[#FFFFFF] to-[#868686] (Prateado)
                          2. Adicionado um overlay sutil (white/5) para dar profundidade, igual ao BattleGym
                      */}
                      <div className="aspect-square bg-gradient-to-r from-[#FFFFFF] to-[#868686] rounded-t-[20px] overflow-hidden relative flex items-center justify-center 
                                      shadow-[0_0px_40px_1px_rgba(255,230,195,0)] group-hover:shadow-[0_0px_40px_1px_rgba(255,230,195,0.5)] 
                                      transition-all duration-500 ease-out group-hover:duration-200">

                        {/* Overlay para melhorar o efeito metálico (similar ao BattleGym) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                        <div className="w-full h-full relative z-10">
                          <HoloBadge imageUrl={badge.badgeImage} holo={badge.holo || 1} />
                        </div>

                        {/* Glow estático interno - mantém contraste nas bordas */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
                      </div>

                      {/* PARTE INFERIOR (TEXTO) */}
                      <div className="p-5 bg-black flex-1 rounded-b-[20px]">
                        <h3 className="font-semibold text-[#FAFAFA] text-base leading-tight truncate mb-1">
                          {badge.gymName}
                        </h3>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-[#A1A1AA] truncate flex items-center gap-1">
                            By
                            {badge.twitter ? (
                              <a
                                href={`https://x.com/${badge.twitter.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-400 hover:underline hover:underline-offset-2 transition-all relative z-10"
                              >
                                {`@${badge.twitter.replace(/^@/, '')}`}
                              </a>
                            ) : (
                              <span className="text-[#A2A2AB]">
                                {badge.leaderName || 'Unknown'}
                              </span>
                            )}
                          </p>

                          {badge.location ? <div className="flex items-center gap-1 text-[#A1A1AA] text-xs"><MapPin color="#FFADAD" size={12} strokeWidth={2} />
                            <span>{badge.location
                              ? `${badge.location}${badge.region ? `, ${badge.region}` : ''}`
                              : 'PvP'
                            }</span></div> : <> </>}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#52525B]">
                    <Search size={48} strokeWidth={1} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No badges found</p>
                  </div>
                )}
              </div>

            </div>
          </main>
        </SimpleBar>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default Badges;