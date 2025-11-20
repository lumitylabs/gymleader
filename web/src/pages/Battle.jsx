import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";
import { Menu } from 'lucide-react';
import { findPokemonId } from "../utils/pokemonMapping";

// Skeleton Component
const GymCardSkeleton = () => (
  <div className="bg-[#18181B] border border-[#26272B] rounded-2xl p-6 flex flex-col md:flex-row gap-6 animate-pulse">
    <div className="w-32 h-32 bg-[#26272B] rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-4">
      <div className="h-6 bg-[#26272B] rounded w-1/3" />
      <div className="h-4 bg-[#26272B] rounded w-1/4" />
      <div className="space-y-2">
        <div className="h-4 bg-[#26272B] rounded w-full" />
        <div className="h-4 bg-[#26272B] rounded w-5/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="w-10 h-10 bg-[#26272B] rounded-full" />
        <div className="w-10 h-10 bg-[#26272B] rounded-full" />
        <div className="w-10 h-10 bg-[#26272B] rounded-full" />
      </div>
    </div>
  </div>
);

function Battle() {
  const navigate = useNavigate();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  useEffect(() => {
    const gymsRef = ref(db, 'gyms');
    const unsubscribe = onValue(gymsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gymList = Object.values(data);
        setGyms(gymList);
      } else {
        setGyms([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredGyms = gyms.filter(gym => {
    const matchesSearch = 
      gym.gymName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.leaderName?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filtering Logic (Placeholder for now as we don't have explicit types yet)
    switch (activeTab) {
      case "All":
        return true;
      case "Gym Challenge":
        return true; // Assuming all user gyms are part of the challenge for now
      case "Leaders":
        return true; // Redundant with All for now
      case "Elite Four":
      case "Victory Road":
        return false; // No data for these yet
      default:
        return true;
    }
  });

  return (
    <div className="bg-[#09090B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
          onClick={() => setIsNavbarOpen(true)}
          className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-[#1F1F22] hover:rounded-full transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="Open navigation menu"
        >
          <Menu color="#A2A2AB" size={23} />
      </button>

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[340px]' : 'lg:ml-0'} p-4 sm:p-8`}>
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <h1 className="text-2xl font-bold text-white">Battle</h1>
             
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#26272B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
             </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Gym Challenge", "Victory Road", "Elite Four", "Leaders"].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab 
                        ? "bg-white text-black" 
                        : "bg-[#18181B] text-gray-400 hover:text-white hover:bg-[#26272B]"
                    }`}
                >
                    {tab}
                </button>
            ))}
          </div>

          {/* Gym List */}
          <div className="space-y-4">
            {loading ? (
                <>
                    <GymCardSkeleton />
                    <GymCardSkeleton />
                    <GymCardSkeleton />
                </>
            ) : filteredGyms.length > 0 ? (
                filteredGyms.map((gym, index) => (
                    <div key={index} className="bg-[#202024] hover:bg-[#232326]  rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-colors cursor-pointer group min-h-[200px]">
                        {/* Badge Image */}
                        <div className="w-44 h-44 flex-shrink-0 mx-auto md:mx-0">
                            {gym.badgeImage ? (
                                <img src={gym.badgeImage} alt="Badge" className="w-full h-full object-cover rounded-[40px] drop-shadow-lg transition-transform" />
                            ) : (
                                <div className="w-full h-full bg-[#26272B] rounded-[40px] flex items-center justify-center text-gray-600 text-xs">No Badge</div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between text-center md:text-left py-1">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white">Gym {gym.gymName}</h3>
                                    <div className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-1.5">
                                        <span>By {gym.twitter ? gym.twitter : gym.leaderName ? `@${gym.leaderName}` : 'Unknown'},</span>
                                        <div className="flex items-center gap-1">
                                            <MapPin size={14} className="text-gray-500" />
                                            <span>Kanto</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 leading-tight line-clamp-3">
                                    {gym.description}
                                </p>
                            </div>

                            {/* Team Preview */}
                            <div className="flex items-center justify-center md:justify-start gap-2 pt-4">
                                {gym.team && gym.team.map((pokemon, i) => {
                                    if (!pokemon) return (
                                        <div key={i} className="w-8 h-8 bg-[#26272B] rounded-full flex items-center justify-center text-gray-700 text-[10px]">?</div>
                                    );

                                    const imageUrl = `https://steady-gaufre-1267b2.netlify.app/${pokemon.pokedexId}.png`;

                                    return (
                                        <img 
                                            key={i} 
                                            src={imageUrl} 
                                            alt={pokemon.name} 
                                            className={`w-10 h-10 object-contain pixelated transition-opacity ${pokemon.pokedexId ? 'brightness-0 opacity-100 group-hover:opacity-70' : 'opacity-70 group-hover:opacity-100'}`}
                                            title={pokemon.name}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 text-gray-500">
                    No gyms found. Be the first to create one!
                </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default Battle;
