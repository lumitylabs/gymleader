import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/ui/general/Sidebar';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, animate } from 'framer-motion';
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";
import { useAuth } from "../contexts/AuthContext";

// --- COMPONENTES VISUAIS (CHAPLIN STYLE) ---

const FilterTag = ({ name, isActive, onClick }) => {
  // Estilo IDÊNTICO ao fornecido no exemplo do Chaplin
  const baseClasses = "flex items-center justify-center font-inter font-semibold text-[0.80em] p-[14px] px-4 rounded-xl cursor-pointer transition-colors whitespace-nowrap select-none";
  const activeClasses = "bg-[#FAFAFA] text-[#1C1C1F]";
  const inactiveClasses = "bg-[#26272B] text-[#A2A2AB] hover:text-white";

  return (
    <button className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`} onClick={() => onClick(name)}>
      {name}
    </button>
  );
};

// Componente FilterBar Completo (Com setas e scroll)
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

    // Drag logic
    const handleMouseDown = (e) => {
      isDragging.current = true;
      startX.current = e.pageX - container.offsetLeft;
      scrollLeftStart.current = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };
    const handleMouseLeave = () => { isDragging.current = false; container.style.cursor = 'grab'; container.style.userSelect = 'auto'; };
    const handleMouseUp = () => { isDragging.current = false; container.style.cursor = 'grab'; container.style.userSelect = 'auto'; };
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      container.scrollLeft = scrollLeftStart.current - walk;
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    checkScrollability();

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', checkScrollability);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleScrollByButton = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    animate(container.scrollLeft, newScrollLeft, {
      type: "spring", stiffness: 400, damping: 40,
      onUpdate: (latest) => { container.scrollLeft = latest; }
    });
  };

  return (
    <div className="relative w-full group">
      <div ref={scrollContainerRef} className="w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory cursor-grab">
        <div className="flex gap-2 py-2">
          {categories.map((category) => (
            <div key={category} className="snap-start">
              <FilterTag name={category} isActive={activeCategory === category} onClick={onCategorySelect} />
            </div>
          ))}
        </div>
      </div>
      {canScrollLeft && (
        <button onClick={() => handleScrollByButton('left')} className="absolute top-1/2 -left-2 z-20 h-full flex items-center justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-[#18181B] to-transparent cursor-pointer w-12">
          <ChevronLeft size={24} className="text-white/80" />
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => handleScrollByButton('right')} className="absolute top-1/2 -right-2 z-20 h-full flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-l from-[#18181B] to-transparent cursor-pointer w-12">
          <ChevronRight size={24} className="text-white/80" />
        </button>
      )}
    </div>
  );
}

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
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-black/40 hover:rounded-full cursor-pointer transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open navigation menu"
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'} p-4 sm:p-8`}>
        <div className="max-w-4xl mx-auto pb-20">

          {/* --- HEADER CORRIGIDO --- */}
          <div className="flex flex-col mb-8">

            {/* ROW 1: Desktop Title (Left) & Search (Right) */}
            {/* Mobile: Apenas Search aparece aqui */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              {/* TITULO DESKTOP: Padding Top/Left exato do Gym */}
              <h1 className="hidden md:block text-2xl font-bold text-white whitespace-nowrap pl-0 pt-1.5 lg:pt-0">
                Badges
              </h1>

              {/* SEARCH BAR */}
              {/* No mobile, adicionamos pl-12 para compensar o botão do menu */}
              <div className="relative w-full md:w-96 pl-12 md:pl-0">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2" color="#959BA5" size={16} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#202024] rounded-full pl-10 pr-4 py-4 text-sm placeholder:text-[#959BA5] focus:outline-none text-white"
                  />
                </div>
              </div>
            </div>

            {/* ROW 2: Mobile Title (Left aligned) */}
            {/* Adicionado pl-12 para alinhar com o botão menu visualmente */}
            <div className="md:hidden mt-5 pl-12">
              <h1 className="text-lg font-semibold text-[#FAFAFA]">
                Badges
              </h1>
            </div>

            {/* ROW 3: Filters (Full Chaplin Implementation) */}
            {/* No mobile, pl-12 para alinhar o inicio da lista com o titulo */}
            <div className="mt-4 md:mt-6 w-full pl-12 md:pl-0">
              <FilterBar
                activeCategory={filter}
                onCategorySelect={setFilter}
                categories={['All', 'Kanto', 'Leaders']}
              />
            </div>

          </div>

          {/* Grid de Conteúdo */}
          {loading ? (
            <div className="text-center text-gray-500 py-20">Loading badges...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBadges.map((badge) => (
                <motion.div
                  key={badge.gymId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#202024] rounded-3xl overflow-hidden border border-[#26272B] group hover:border-yellow-500/50 transition-colors"
                >
                  <div className="aspect-square bg-[#131316] relative p-4">
                    <img
                      src={badge.badgeImage}
                      alt={badge.gymName}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  </div>
                  <div className="p-4 border-t border-[#26272B]">
                    <h3 className="font-bold text-white mb-1 truncate">{badge.gymName}</h3>
                    <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                      <p className="truncate">
                        By <span className="text-blue-400">{badge.twitter ? `@${badge.twitter}` : badge.leaderName}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        <span>{badge.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredBadges.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-500">
                  No badges found. Go fight some Gym Leaders!
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default Badges;