import React, { useState, useEffect } from 'react';
import Sidebar from '../components/ui/general/Sidebar';
import { Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";

import { useAuth } from "../contexts/AuthContext";

function Badges() {
  const { currentUser } = useAuth();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All'); // All, Kanto, Leaders

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
    // Add more filters as needed
    return matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white font-sans selection:bg-yellow-500/30">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-[#1F1F22] hover:rounded-full cursor-pointer transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open navigation menu"
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[340px]' : 'lg:ml-0'} p-4 sm:p-8`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header & Search */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold tracking-tight">Badges</h1>
              
              {/* Search Bar */}
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#26272B] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {['All', 'Kanto', 'Leaders'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === f 
                      ? 'bg-white text-black' 
                      : 'bg-[#18181B] text-gray-400 hover:text-white border border-[#26272B]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Badges Grid */}
          {loading ? (
            <div className="text-center text-gray-500 py-20">Loading badges...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredBadges.map((badge) => (
                <motion.div 
                  key={badge.gymId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#18181B] rounded-3xl overflow-hidden border border-[#26272B] group hover:border-yellow-500/50 transition-colors"
                >
                  {/* Badge Image Container */}
                  <div className="aspect-square bg-[#131316] relative">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                    
                    <img 
                      src={badge.badgeImage} 
                      alt={badge.gymName} 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Badge Info */}
                  <div className="p-5 bg-black/40 border-t border-[#26272B]">
                    <h3 className="font-bold text-white mb-1">{badge.gymName}</h3>
                    <div className="flex flex-col gap-0.5 text-sm text-gray-400">
                      <p>
                        By <span className="text-blue-400">{badge.twitter ? `@${badge.twitter}` : badge.leaderName}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
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
