// pages/Badges.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../contexts/AuthContext";
import Sidebar from '../components/ui/general/Sidebar';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, animate } from 'framer-motion';
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";

// --- IMPORTAÇÃO DO SIMPLEBAR E CSS ---
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

/* =========================================================================
   COMPONENTE: FILTER TAG (Padrão Battle)
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
   COMPONENTE: FILTER BAR (Padrão Battle)
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

  const handleScrollByButton = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.6;
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    animate(container.scrollLeft, targetScroll, {
      type: "spring", stiffness: 300, damping: 30,
      onUpdate: (latest) => { if (container) container.scrollLeft = latest; },
      onComplete: checkScrollability
    });
  };

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

      {canScrollLeft && (
        <div className="absolute top-0 left-[-2px] bottom-0 w-20 bg-gradient-to-r from-[#18181B] via-[#18181B]/90 to-transparent pointer-events-none flex items-center justify-start z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => handleScrollByButton('left')}
            className="pointer-events-auto pl-1 pr-4 h-full flex items-center text-white/60 hover:text-white transition-colors outline-none cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      )}

      {canScrollRight && (
        <div className="absolute top-0 right-[-2px] bottom-0 w-20 bg-gradient-to-l from-[#18181B] via-[#18181B]/90 to-transparent pointer-events-none flex items-center justify-end z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => handleScrollByButton('right')}
            className="pointer-events-auto pr-1 pl-4 h-full flex items-center text-white/60 hover:text-white transition-colors outline-none cursor-pointer"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

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
    if (filter === 'Kanto') return matchesSearch && badge.location === 'Kanto';
    if (filter === 'Leaders') return matchesSearch;
    return matchesSearch;
  });

  return (
    // FIX 1: Container Principal Travado
    <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">

      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-30 p-2 rounded-full hover:bg-[#1F1F22] cursor-pointer transition-all duration-300 ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open navigation menu"
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      {/* FIX 2: Spacer Fantasma (Flexbox) */}
      <div
        className={`hidden lg:block flex-shrink-0 bg-transparent transition-[width] duration-300 ease-in-out h-full ${isNavbarOpen ? 'w-[260px]' : 'w-0'}`}
        aria-hidden="true"
      />

      {/* FIX 3: Conteúdo Flexível */}
      <div className="flex-1 min-w-0 h-full relative flex flex-col">

        {/* FIX 4: SimpleBar Personalizada */}
        <SimpleBar style={{ height: '100%' }} className="w-full login-page-scrollbar">
          <main className="p-4 sm:p-8 w-full min-h-full">

            {/* PADRONIZAÇÃO: max-w-4xl igual Gym/Wallets/Battle */}
            <div className="max-w-4xl mx-auto pb-20">

              {/* HEADER E FILTROS (Padronizado com Battle) */}
              <div className="flex flex-col mb-2.5">
                <div className="flex justify-end md:justify-between items-center w-full gap-4 select-none">
                  {/* Titulo Desktop */}
                  <h1 className="hidden md:block text-lg font-semibold text-[#FAFAFA] whitespace-nowrap">
                    Badges
                  </h1>

                  {/* Barra de Pesquisa (Estilo Battle) */}
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

                {/* Titulo Mobile */}
                <div className="md:hidden mt-5">
                  <h1 className="text-lg font-semibold text-[#FAFAFA]">Badges</h1>
                </div>

                {/* Filtros */}
                <div className="mt-5 w-full pl-0">
                  <FilterBar
                    activeCategory={filter}
                    onCategorySelect={setFilter}
                    categories={['All', 'Kanto', 'Leaders']}
                  />
                </div>
              </div>

              {/* GRID DE BADGES (Conteúdo Específico desta página) */}
              {loading ? (
                <div className="text-center text-gray-500 py-20 flex items-center justify-center h-40">
                  {/* Pode usar um Skeleton aqui se quiser, ou texto simples */}
                  Loading badges...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredBadges.map((badge) => (
                    <motion.div
                      key={badge.gymId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-[#202024] rounded-3xl overflow-hidden border border-[#26272B] group hover:border-[#FACC15]/50 transition-colors"
                    >
                      <div className="aspect-square bg-[#131316] relative p-4 flex items-center justify-center">
                        <img
                          src={badge.badgeImage}
                          alt={badge.gymName}
                          className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4 border-t border-[#26272B]">
                        <h3 className="font-bold text-white mb-1 truncate text-sm sm:text-base">{badge.gymName}</h3>
                        <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                          <p className="truncate">
                            By <span className="text-blue-400">{badge.twitter ? `@${badge.twitter}` : badge.leaderName}</span>
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                            <span>{badge.location || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {filteredBadges.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#52525B]">
                      <Search size={48} strokeWidth={1} className="mb-4 opacity-50" />
                      <p className="text-lg font-medium">No badges found</p>
                    </div>
                  )}
                </div>
              )}

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