import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";
import { animate } from 'framer-motion';

import "simplebar-react/dist/simplebar.min.css";
import SimpleBar from 'simplebar-react';

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
   COMPONENTE: SKELETON
   ========================================================================= */
const GymCardSkeleton = () => (
  <div className="bg-[#18181B] border border-[#26272B] rounded-2xl p-6 flex flex-col md:flex-row gap-6 animate-pulse">
    <div className="w-32 h-32 bg-[#26272B] rounded-[40px] flex-shrink-0" />
    <div className="flex-1 space-y-4 py-2">
      <div className="h-6 bg-[#26272B] rounded w-1/3" />
      <div className="h-4 bg-[#26272B] rounded w-1/4" />
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-[#26272B] rounded w-full" />
        <div className="h-4 bg-[#26272B] rounded w-5/6" />
      </div>
    </div>
  </div>
);

/* =========================================================================
   COMPONENTE PRINCIPAL: BATTLE
   ========================================================================= */
function Battle() {
  const navigate = useNavigate();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const handleMobileNavClick = () => {
    if (window.innerWidth < 1024) setIsNavbarOpen(false);
  };

  useEffect(() => {
    const gymsRef = ref(db, 'gyms');
    const unsubscribe = onValue(gymsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGyms(Object.values(data));
      } else {
        setGyms([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Função auxiliar para definir a prioridade de ordenação
  const getLocationPriority = (location) => {
    if (!location) return 5; // Sem localização -> Leaders (Último)

    const loc = location.toLowerCase().trim();

    if (loc === 'leaders') return 5;
    if (loc === 'gym challenge') return 4;
    if (loc === 'elite four') return 3;
    if (loc === 'victory road') return 2;

    // Qualquer outra região (Kanto, Johto, etc) vem primeiro
    return 1;
  };

  // Gera as categorias dinamicamente baseadas nos dados existentes
  const dynamicCategories = useMemo(() => {
    const fixedCategories = ["Victory Road", "Elite Four", "Gym Challenge", "Leaders"];
    const locations = new Set();

    gyms.forEach(gym => {
      if (gym.location && !fixedCategories.includes(gym.location)) {
        locations.add(gym.location);
      }
    });

    // Retorna: All + Regiões (alfabético) + Fixos
    return ["All", ...Array.from(locations).sort(), ...fixedCategories];
  }, [gyms]);

  const filteredGyms = gyms
    .filter(gym => {
      // 1. Filtro de Busca
      const matchesSearch =
        gym.gymName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gym.leaderName?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filtro por Aba (Location)
      if (activeTab === "All") return true;

      const gymLocation = gym.location || "";

      // Se a aba for "Leaders", inclui quem tem location "Leaders" OU quem não tem location
      if (activeTab === "Leaders") {
        return gymLocation === "Leaders" || gymLocation === "";
      }

      // Para as outras abas, tem que ser match exato
      return gymLocation === activeTab;
    })
    .sort((a, b) => {
      // 3. Ordenação: Região -> Victory Road -> Elite Four -> Leaders
      const priorityA = getLocationPriority(a.location);
      const priorityB = getLocationPriority(b.location);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Desempate por nome do ginásio (opcional)
      return (a.gymName || "").localeCompare(b.gymName || "");
    });

  return (
    <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">

      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-30 p-2 rounded-full hover:bg-black/40 cursor-pointer transition-all duration-300 ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      {/* Spacer para Layout Flexbox */}
      <div
        className={`hidden lg:block flex-shrink-0 bg-transparent transition-[width] duration-300 ease-in-out h-full ${isNavbarOpen ? 'w-[260px]' : 'w-0'}`}
        aria-hidden="true"
      />

      {/* Área de Conteúdo */}
      <div className="flex-1 min-w-0 h-full relative flex flex-col">

        {/* SimpleBar com classe personalizada */}
        <SimpleBar style={{ height: '100%' }} className="w-full login-page-scrollbar">
          <main className="p-4 sm:p-8 w-full min-h-full">

            <div className="max-w-4xl mx-auto pb-20">

              <div className="flex flex-col mb-2.5">
                <div className="flex justify-end md:justify-between items-center w-full gap-4 select-none">
                  <h1 className="hidden md:block text-lg font-semibold text-[#FAFAFA] whitespace-nowrap">
                    Battle
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
                  <h1 className="text-lg font-semibold text-[#FAFAFA]">Battle</h1>
                </div>

                <div className="mt-5 w-full pl-0">
                  <FilterBar
                    activeCategory={activeTab}
                    onCategorySelect={setActiveTab}
                    categories={dynamicCategories}
                  />
                </div>
              </div>

              {/* LISTA DE GINÁSIOS */}
              <div className="space-y-4.5">
                {loading ? (
                  <>
                    <GymCardSkeleton /><GymCardSkeleton /><GymCardSkeleton />
                  </>
                ) : filteredGyms.length > 0 ? (
                  filteredGyms.map((gym, index) => (
                    <div key={index}
                      onClick={() => navigate(`/battle/${gym.userId}`)}
                      className="bg-[#202024] hover:bg-[#232326] rounded-3xl p-6 flex flex-col md:flex-row gap-6 transition-all duration-200 cursor-pointer group min-h-[200px]"
                    >
                      <div className="w-44 h-44 flex-shrink-0 mx-auto md:mx-0">
                        {gym.badgeImage ? (
                          <img src={gym.badgeImage} alt="Badge" className="w-full h-full object-cover rounded-[32px] shadow-lg group-hover:scale-[1.02] transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-[#26272B] rounded-[32px] flex items-center justify-center text-gray-600 text-xs font-medium">No Badge</div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between text-center md:text-left py-1">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-[#FAFAFA]">{gym.gymName}</h3>
                            <div className="text-sm text-[#A2A2AB] flex items-center justify-center md:justify-start gap-1.5">
                              <span>By {gym.twitter ? (
                                <a
                                  href={`https://x.com/${gym.twitter.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:underline hover:underline-offset-2 text-blue-400 transition-all relative z-10"
                                >
                                  {`@${gym.leaderName}` || 'Unknown'}
                                </a>
                              ) : (
                                <span className="text-[#A2A2AB]">{gym.leaderName || 'Unknown'}</span>
                              )}</span>
                              <span className="w-1 h-1 bg-[#A2A2AB] rounded-full"></span>
                              <div className="flex items-center gap-1">
                                <MapPin color="#FFADAD" size={12} strokeWidth={2} />
                                <span>{gym.location || 'Leaders'}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-[#F3F7FA] leading-relaxed line-clamp-2 md:line-clamp-3 max-w-2xl">
                            {gym.description || "No description provided for this gym challenge."}
                          </p>
                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-2 pt-4">
                          {gym.team && gym.team.map((pokemon, i) => {
                            if (!pokemon) return (
                              <div key={i} className="w-8 h-8 bg-[#26272B] rounded-full flex items-center justify-center text-[#52525B] text-[10px] border border-[#2E2F33]">?</div>
                            );
                            const imageUrl = `https://steady-gaufre-1267b2.netlify.app/${pokemon.pokedexId}.png`;
                            return (
                              <img
                                key={i}
                                src={imageUrl}
                                alt="pokemon"
                                className={`w-10 h-10 object-contain pixelated transition-opacity duration-200 ${pokemon.pokedexId
                                  ? 'brightness-0 opacity-100 group-hover:opacity-70'
                                  : 'opacity-70 group-hover:opacity-100'
                                  }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-[#52525B]">
                    <Search size={48} strokeWidth={1} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No gyms found</p>
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

export default Battle;