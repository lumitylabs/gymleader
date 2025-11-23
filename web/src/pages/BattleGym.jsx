import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Trophy, Zap, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { ref, onValue, get } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

function BattleGym() {
  const { gymId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);
  
  const [gymData, setGymData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [battleStatus, setBattleStatus] = useState('idle'); // idle, starting, active, ended
  const [battleLog, setBattleLog] = useState([]);
  const [playerInput, setPlayerInput] = useState("");
  const [sendingTurn, setSendingTurn] = useState(false);
  const [battleContext, setBattleContext] = useState(null);
  // Removed activePokemon state

  const scrollRef = useRef(null);

  const [userTeam, setUserTeam] = useState([]);

  // Helper to find mentioned pokemon in text
  const getMentionedPokemon = (text) => {
      if (!text || !userTeam.length) return userTeam;
      
      const normalizedText = text.toLowerCase();
      const mentioned = userTeam.filter(poke => {
          const name = (poke.name || '').toLowerCase();
          // Simple check: is the name in the text?
          // Also check for "EX", "V", etc if needed, but simple name check is a good start
          return normalizedText.includes(name.split(' ')[0]); // Match first word of name (e.g. "Charizard" from "Charizard EX")
      });
      
      return mentioned.length > 0 ? mentioned : userTeam; // Return all if none mentioned
  };

  // Get relevant pokemon for current state
  const relevantPokemon = (() => {
      const lastNarrative = battleLog.slice().reverse().find(l => l.type === 'narrative' || l.type === 'referee');
      return getMentionedPokemon(lastNarrative?.message);
  })();


  // Load Gym Data
  useEffect(() => {
    const gymRef = ref(db, `gyms/${gymId}`);
    const unsubscribe = onValue(gymRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGymData(data);
      } else {
        toast.error("Gym not found");
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gymId, navigate]);

  // Load User Team
  useEffect(() => {
    if (!currentUser) return;
    const userTeamRef = ref(db, `users/${currentUser.uid}/gym/team`);
    const unsubscribe = onValue(userTeamRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert object {0: {...}, 1: {...}} to array
            const teamArray = Object.values(data);
            setUserTeam(teamArray);
        }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Auto-scroll battle log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [battleLog]);

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  const startBattle = async () => {
    if (!currentUser) return toast.error("You must be logged in to battle");
    
    setBattleStatus('starting');
    // Initial loading state
    setBattleLog([{ type: 'system', message: 'The judge is connecting to the match...' }]);
    
    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gymId, 
          challengerId: currentUser.uid 
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start battle');

      setBattleContext(data.battleId);
      setBattleStatus('active');
      // Removed setActivePokemon
      
      // Update log with sequence
      setBattleLog(prev => [
        { type: 'referee', message: 'The judge has connected to the match...' },
        { type: 'system', message: 'The battle has begun!' },
        { type: 'narrative', message: data.introNarrative },
        { type: 'narrative', message: data.leaderMoveNarrative }
      ]);

    } catch (error) {
      console.error(error);
      toast.error(error.message);
      setBattleStatus('idle');
    }
  };

  const sendInstruction = async (choiceId = null) => {
    if ((!playerInput.trim() && !choiceId) || sendingTurn) return;
    
    const instruction = playerInput;
    setPlayerInput("");
    setSendingTurn(true);
    
    // Optimistic update
    if (choiceId) {
        // Find the selected option to get its pre-generated narrative
        const lastOptionsLog = battleLog.slice().reverse().find(l => l.type === 'options');
        const selectedOption = lastOptionsLog?.options?.find(o => o.id === choiceId);
        
        if (selectedOption && selectedOption.narrative) {
             setBattleLog(prev => [...prev, { type: 'player', message: selectedOption.narrative }]);
        } else {
             setBattleLog(prev => [...prev, { type: 'player', message: selectedOption?.text || "Player Action" }]);
        }
    } else {
        // Turn 1 text input - we don't have a narrative yet, so just show the input
        // actually, for turn 1, we might want to wait for the server to narrate it properly
        // but showing the input is good feedback.
        setBattleLog(prev => [...prev, { type: 'player', message: instruction }]);
    }

    // Show "Leader is thinking..." immediately after player move
    setBattleLog(prev => [...prev, { type: 'system', message: 'Leader is thinking...' }]);

    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/battle/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          battleId: battleContext,
          action: instruction,
          choiceId: choiceId,
          playerId: currentUser.uid
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process turn');

      // Remove the "Leader is thinking..." message (it's the last one)
      setBattleLog(prev => {
          const filtered = prev.filter(l => l.message !== 'Leader is thinking...');
          const newLogs = [];

          // 1. Add Player Narrative (Referee's interpretation of text input)
          if (!choiceId && data.playerNarrative) {
              newLogs.push({ type: 'narrative', message: data.playerNarrative });
          }

          // 2. Add Leader Narrative
          if (data.leaderNarrative) {
              newLogs.push({ type: 'narrative', message: data.leaderNarrative });
          }

          return [...filtered, ...newLogs];
      });
      
      // Removed setActivePokemon

      // 3. Add Player Options for NEXT turn
      if (data.playerOptions) {
          setBattleLog(prev => [...prev, { type: 'options', options: data.playerOptions }]);
      }
      
      if (data.gameOver) {
        setBattleStatus('ended');
        if (data.winner === currentUser.uid) {
            toast.success("You won the badge!");
        } else {
            toast.error("You were defeated!");
        }
      }

    } catch (error) {
      console.error(error);
      toast.error(error.message);
      // Remove thinking message on error
      setBattleLog(prev => prev.filter(l => l.message !== 'Leader is thinking...'));
    } finally {
      setSendingTurn(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#18181B] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[340px]' : 'lg:ml-0'} p-4 sm:p-8 flex flex-col items-center`}>
        <div className="max-w-6xl w-full space-y-6">
            
            {/* Header Card */}
            <div className="bg-[#202024] border border-[#26272B] rounded-2xl p-6 relative overflow-hidden">
                <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>

                <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
                    {/* Leader Avatar */}
                    <div className="w-24 h-24 rounded-full border-2 border-[#26272B] overflow-hidden bg-black">
                        <img src={gymData?.leaderImage || '/placeholder-leader.png'} alt={gymData?.leaderName} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold">{gymData?.gymName || 'Gym Name'}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mt-1">
                            <span>By @{gymData?.leaderName}</span>
                            <span>•</span>
                            <span>{gymData?.location || 'Kanto'}</span>
                        </div>
                        
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                            <div className="flex items-center gap-1 text-yellow-500">
                                <span className="text-sm font-bold">Difficult</span>
                                <div className="flex">
                                    {[1,2,3].map(i => <Zap key={i} size={12} fill="currentColor" />)}
                                </div>
                            </div>
                            <div className="text-sm text-gray-400">
                                Wins 3 de 5
                            </div>
                        </div>

                        {/* Pokemon Icons */}
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                            {gymData?.team?.map((poke, i) => poke && (
                                <div key={i} className="w-12 h-12">
                                    <img 
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${poke.pokedexId || 1}.gif`} 
                                        onError={(e) => e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokedexId || 1}.png`}
                                        alt="poke" 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Badge Reward */}
                    <div className="bg-gradient-to-r from-purple-900/50 to-purple-600/50 border border-purple-500/30 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-16 h-16">
                             <img src={gymData?.badgeImage || '/placeholder-badge.png'} alt="Badge" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Badge Reward</h3>
                            <p className="text-[10px] text-gray-400 max-w-[150px]">This Badge is an NFT and will be sent to your connected wallet upon victory!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                
                {/* Left: Battle Interface */}
                <div className="lg:col-span-2 bg-[#202024] border border-[#26272B] rounded-2xl overflow-hidden relative flex flex-col">
                    
                    {/* Background Image Layer */}
                    <div className="absolute inset-0 z-0 opacity-40">
                        <img src={gymData?.gymImage || '/placeholder-gym.png'} alt="Gym Background" className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Battle Content */}
                    <div className="relative z-10 flex-1 flex flex-col p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <img src="/assets/battle-pokeball.png" className="w-6 h-6" alt="Battle" />
                            <h2 className="font-bold text-xl">Battle Log</h2>
                        </div>

                        {battleStatus === 'idle' ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startBattle}
                                    className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-black text-2xl py-4 px-12 rounded-xl shadow-lg flex items-center gap-3"
                                >
                                    <Zap size={32} fill="currentColor" />
                                    FIGHT!
                                </motion.button>

                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-sm font-bold text-white drop-shadow-md">Your team</span>
                                    <div className="flex items-center gap-2">
                                        {userTeam.length > 0 ? userTeam.map((poke, i) => (
                                            <div key={i} className="w-12 h-12">
                                                <img 
                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokedexId}.png`} 
                                                    className="w-full h-full object-contain pixelated drop-shadow-md"
                                                    alt={poke.name || 'Pokemon'}
                                                />
                                            </div>
                                        )) : (
                                            <span className="text-xs text-gray-400">No team found</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 relative min-h-0">
                                {/* Chat Log */}
                                <SimpleBar scrollableNodeProps={{ ref: scrollRef }} style={{ position: 'absolute', inset: 0 }} className="pr-4">
                                    <div className="space-y-4 pb-4">
                                        {battleLog.map((log, index) => {
                                            if (log.type === 'options') {
                                                // Only render options if it's the last item in the log AND we are not currently sending a turn
                                                if (index === battleLog.length - 1 && !sendingTurn && battleStatus !== 'ended') {
                                                    return (
                                                        <motion.div 
                                                            key={index}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="bg-[#202024]/90 backdrop-blur-md border border-[#26272B] rounded-xl p-6 mt-4"
                                                        >
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="font-bold text-white">
                                                                    {relevantPokemon.length === 1 
                                                                        ? `Command ${relevantPokemon[0].name}`
                                                                        : "Command your Team"}
                                                                </h3>
                                                                <div className="flex gap-2">
                                                                    {relevantPokemon.map((poke, i) => (
                                                                        <div key={i} className="w-12 h-12">
                                                                            <img 
                                                                                src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${(poke.name || 'pikachu').toLowerCase().split(' ')[0]}.gif`}
                                                                                onError={(e) => e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokedexId}.png`}
                                                                                className="w-full h-full object-contain" 
                                                                                alt={poke.name} 
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-400 mb-3">Select your action</p>
                                                            <div className="space-y-2">
                                                                {log.options.map((option) => (
                                                                    <button
                                                                        key={option.id}
                                                                        onClick={() => sendInstruction(option.id)}
                                                                        className="w-full text-left bg-[#3E3D3E] hover:bg-[#4E4D4E] p-4 rounded-lg border border-transparent hover:border-gray-500 transition-all flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center text-xs text-gray-400 group-hover:border-white group-hover:text-white">
                                                                            {option.id}
                                                                        </div>
                                                                        <span className="text-sm text-gray-200 group-hover:text-white">{option.text}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }
                                                return null;
                                            }

                                            return (
                                                <motion.div 
                                                    key={index}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-4 rounded-xl backdrop-blur-md border ${
                                                        log.type === 'player' ? 'bg-blue-500/20 border-blue-500/50 ml-auto max-w-[80%]' :
                                                        log.type === 'narrative' ? 'bg-black/60 border-gray-700' :
                                                        'bg-gray-800/40 border-gray-700'
                                                    }`}
                                                >
                                                    <p className="text-sm md:text-base">{log.message}</p>
                                                </motion.div>
                                            );
                                        })}
                                        
                                        {/* Turn 1 Input (Text) */}
                                        {/* Show only if no options are present (meaning it's turn 1 or we are waiting for options) AND not sending */}
                                        {!battleLog.some(l => l.type === 'options') && !sendingTurn && battleStatus === 'active' && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-[#202024]/90 backdrop-blur-md border border-[#26272B] rounded-xl p-6 mt-4"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold text-white">
                                                        {relevantPokemon.length === 1 
                                                            ? `Emergency instruction for ${relevantPokemon[0].name}`
                                                            : "Command your Team"}
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        {relevantPokemon.map((poke, i) => (
                                                            <div key={i} className="w-12 h-12">
                                                                <img 
                                                                    src={`https://img.pokemondb.net/sprites/black-white/anim/normal/${(poke.name || 'pikachu').toLowerCase().split(' ')[0]}.gif`}
                                                                    onError={(e) => e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokedexId}.png`}
                                                                    className="w-full h-full object-contain" 
                                                                    alt={poke.name} 
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-3">Describe your instruction</p>
                                                <div className="space-y-3">
                                                    <textarea 
                                                        value={playerInput}
                                                        onChange={(e) => setPlayerInput(e.target.value)}
                                                        placeholder={`Ex: Joga uma waterfall na cabeça do onix`}
                                                        className="w-full bg-[#18181B] border border-[#26272B] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gray-500 resize-none h-24"
                                                    />
                                                    <div className="flex justify-end">
                                                        <button 
                                                            onClick={() => sendInstruction()}
                                                            className="bg-white text-black font-bold px-6 py-2 rounded-full hover:bg-gray-200 transition-colors text-sm"
                                                        >
                                                            Send
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}


                                    </div>
                                </SimpleBar>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Info & Opponent Team */}
                <div className="space-y-6 flex flex-col">
                    {/* Description */}
                    <div className="bg-[#202024] border border-[#26272B] rounded-2xl p-6 flex-1">
                        <h3 className="font-bold text-lg mb-4">Gym Description</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {gymData?.description || 'No description available.'}
                        </p>
                    </div>

                    {/* Opponent Team */}
                    <div className="bg-[#202024] border border-[#26272B] rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4">Opponent's Team</h3>
                        <div className="flex gap-4 justify-center">
                            {gymData?.team?.map((card, i) => card ? (
                                <div key={i} className="group relative w-20 aspect-[3/4] cursor-pointer">
                                    <img 
                                        src={card.image} 
                                        alt={card.name}
                                        className="w-full h-full object-cover rounded-lg border border-[#26272B] transition-transform group-hover:scale-105"
                                        onError={(e) => e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${card.pokedexId}.png`}
                                    />
                                    {/* Hover Zoom Effect */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block z-50">
                                        <img 
                                            src={card.image + '/high.png'} 
                                            alt={card.name}
                                            className="w-full rounded-xl shadow-2xl border-2 border-yellow-500 bg-[#202024]"
                                            onError={(e) => e.target.src = card.image} // Fallback
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div key={i} className="w-20 aspect-[3/4] bg-[#18181B] rounded-lg border border-[#26272B] flex items-center justify-center">
                                    <img src="/assets/battle-cardback.png" className="w-10 opacity-20" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}

export default BattleGym;
