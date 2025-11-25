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
import BattlePokeball from "../assets/battle-pokeball.png";
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";
import BattleCardBack from "../assets/battle-cardback.png";

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
    const [hoveredCard, setHoveredCard] = useState(null);
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

    const LoadingLog = ({ messages }) => {
        const [index, setIndex] = useState(0);

        useEffect(() => {
            const interval = setInterval(() => {
                setIndex(prev => (prev + 1) % messages.length);
            }, 5000);
            return () => clearInterval(interval);
        }, [messages]);

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl backdrop-blur-md border bg-gray-800/40 border-gray-700 flex items-center gap-3"
            >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <p className="text-sm md:text-base text-gray-300">{messages[index]}</p>
            </motion.div>
        );
    };

    const [messageQueue, setMessageQueue] = useState([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [gameOverState, setGameOverState] = useState(null); // { winner: string, type: 'win' | 'loss' }

    // Process Message Queue
    useEffect(() => {
        if (messageQueue.length > 0 && !isProcessingQueue) {
            setIsProcessingQueue(true);
            const nextMessage = messageQueue[0];

            // Add to battle log
            setBattleLog(prev => [...prev, nextMessage]);

            // Remove from queue after delay
            setTimeout(() => {
                setMessageQueue(prev => prev.slice(1));
                setIsProcessingQueue(false);
            }, 1500); // 1.5s delay between messages
        }
    }, [messageQueue, isProcessingQueue]);

    // Helper to add messages to queue
    const queueMessages = (messages) => {
        setMessageQueue(prev => [...prev, ...messages]);
    };

    const startBattle = async () => {
        if (!currentUser) return toast.error("You must be logged in to battle");

        setBattleStatus('starting');
        // Initial loading state
        setBattleLog([{
            type: 'loading',
            messages: [
                'Connecting to Gym...',
                'Judge is entering the arena...',
                'Initializing battle protocol...',
                'Waiting for Gym Leader...'
            ]
        }]);

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

            // Clear loading log
            setBattleLog([]);

            // Queue sequence
            queueMessages([
                { type: 'referee', message: 'The judge has connected to the match...' },
                { type: 'system', message: 'The battle has begun!' },
                { type: 'narrative', message: data.introNarrative },
                { type: 'narrative', message: data.leaderMoveNarrative }
            ]);

            // Add options immediately after the last narrative (or queue them too if we want delay)
            // For options, it's better to show them after the narrative is done.
            // But since our queue logic adds to battleLog one by one, we can just queue the options too?
            // The current UI renders options only if it's the last item. 
            // So we should queue options as a special log type.
            if (data.playerOptions) {
                queueMessages([{ type: 'options', options: data.playerOptions }]);
            }

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

        // Optimistic update (Immediate feedback)
        if (choiceId) {
            const lastOptionsLog = battleLog.slice().reverse().find(l => l.type === 'options');
            const selectedOption = lastOptionsLog?.options?.find(o => o.id === choiceId);
            setBattleLog(prev => [...prev, { type: 'player', message: selectedOption?.narrative || selectedOption?.text || "Player Action" }]);
        } else {
            setBattleLog(prev => [...prev, { type: 'player', message: instruction }]);
        }

        // Show dynamic loading message
        setBattleLog(prev => [...prev, {
            type: 'loading',
            messages: [
                'Leader is thinking...',
                'Analyzing strategy...',
                'Predicting your move...',
                'Consulting Pokedex...',
                'Formulating counter-attack...'
            ]
        }]);

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

            // Remove the loading message immediately
            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));

            const newMessages = [];

            // 1. Add Player Narrative
            if (!choiceId && data.playerNarrative) {
                newMessages.push({ type: 'narrative', message: data.playerNarrative });
            }

            // 2. Add Leader Narrative
            if (data.leaderNarrative) {
                newMessages.push({ type: 'narrative', message: data.leaderNarrative });
            }

            // 3. Queue messages
            queueMessages(newMessages);

            // 4. Handle Game Over or Next Options
            if (data.gameOver) {
                setBattleStatus('ended');
                const isWin = data.winner === currentUser.uid;
                setGameOverState({
                    type: isWin ? 'win' : 'loss',
                    winner: data.winner
                });

                // Queue end message
                queueMessages([{ type: 'system', message: isWin ? 'Victory! You defeated the Gym Leader!' : 'Defeat! You were overwhelmed.' }]);

                if (isWin) {
                    toast.success("You won the badge!");
                } else {
                    toast.error("You were defeated!");
                }
            } else if (data.playerOptions) {
                queueMessages([{ type: 'options', options: data.playerOptions }]);
            }

        } catch (error) {
            console.error(error);
            toast.error(error.message);
            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));
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
            <button
                onClick={() => setIsNavbarOpen(true)}
                className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-[#1F1F22] hover:rounded-full cursor-pointer transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-label="Open navigation menu"
            >
                <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
            </button>
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
                                            {[1, 2, 3].map(i => <Zap key={i} size={12} fill="currentColor" />)}
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
                                                src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId || 1}${battleStatus === 'idle' ? ".png" : ".gif"}`}
                                                onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId || 1}.png`}
                                                alt="poke"

                                                className={`w-full h-full object-contain transition-all duration-1000 ${battleStatus === 'idle' ? 'brightness-0 opacity-70' : 'brightness-100 opacity-100'
                                                    }`}
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
                                    <img src={BattlePokeball} className="w-10 h-10" alt="Battle" />
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
                                                            src={`http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
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
                                                                                        onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
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

                                                    if (log.type === 'loading') {
                                                        return <LoadingLog key={index} messages={log.messages} />;
                                                    }

                                                    return (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`p-4 rounded-xl backdrop-blur-md border ${log.type === 'player' ? 'bg-blue-500/20 border-blue-500/50 ml-auto max-w-[80%]' :
                                                                log.type === 'narrative' ? 'bg-black/60 border-gray-700' :
                                                                    'bg-gray-800/40 border-gray-700'
                                                                }`}
                                                        >
                                                            <p className="text-sm md:text-base">{log.message}</p>
                                                        </motion.div>
                                                    );
                                                })
                                                }

                                                {/* Turn 1 Input (Text) */}
                                                {/* Show only if no options are present (meaning it's turn 1 or we are waiting for options) AND not sending AND not processing queue */}
                                                {!battleLog.some(l => l.type === 'options') && !sendingTurn && battleStatus === 'active' && messageQueue.length === 0 && !isProcessingQueue && (
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
                                                                            onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
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

                                {/* Game Over Overlay */}
                                <AnimatePresence>
                                    {gameOverState && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.8, y: 20 }}
                                                animate={{ scale: 1, y: 0 }}
                                                className={`bg-[#202024] border-2 ${gameOverState.type === 'win' ? 'border-yellow-500' : 'border-red-500'} rounded-2xl p-8 max-w-md w-full text-center shadow-2xl`}
                                            >
                                                <div className="flex justify-center mb-6">
                                                    {gameOverState.type === 'win' ? (
                                                        <Trophy size={64} className="text-yellow-500" />
                                                    ) : (
                                                        <Shield size={64} className="text-red-500" />
                                                    )}
                                                </div>

                                                <h2 className={`text-3xl font-black mb-2 ${gameOverState.type === 'win' ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {gameOverState.type === 'win' ? 'VICTORY!' : 'DEFEAT'}
                                                </h2>

                                                <p className="text-gray-300 mb-8">
                                                    {gameOverState.type === 'win'
                                                        ? "You have defeated the Gym Leader and earned the Badge!"
                                                        : "Your team was overwhelmed. Train harder and try again!"}
                                                </p>

                                                <div className="flex gap-4 justify-center">
                                                    <button
                                                        onClick={() => navigate('/gyms')}
                                                        className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold transition-colors"
                                                    >
                                                        Back to Gyms
                                                    </button>
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className={`px-6 py-3 rounded-xl font-bold text-black transition-colors ${gameOverState.type === 'win' ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-red-500 hover:bg-red-400'}`}
                                                    >
                                                        Rematch
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

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
                                <div className="flex gap-4 justify-center relative">
                                    {gymData?.team?.map((card, i) => {
                                        // Verifica se a batalha ainda não começou
                                        const isHidden = battleStatus === 'idle';

                                        return card ? (
                                            <div
                                                key={i}
                                                className="group relative w-20 aspect-[3/4] cursor-pointer"
                                                // ALTERAÇÃO 1: Só permite o hover se a carta não estiver escondida
                                                onMouseEnter={() => !isHidden && setHoveredCard(card)}
                                                onMouseLeave={() => setHoveredCard(null)}
                                            >
                                                <img
                                                    // ALTERAÇÃO 2: Se estiver escondida (idle), mostra o verso. Se não, mostra a carta.
                                                    src={isHidden
                                                        ? BattleCardBack
                                                        : (card.original ? `${card.original}/high.png` : card.image)
                                                    }
                                                    alt={isHidden ? "Hidden Card" : card.name}
                                                    className={`w-full h-full object-cover rounded-lg border border-[#26272B] transition-transform ${!isHidden ? 'group-hover:scale-105' : ''}`}
                                                    style={{ imageRendering: 'auto' }}
                                                    onError={(e) => {
                                                        // Fallback de erro apenas se não estivermos mostrando o verso
                                                        if (!isHidden && e.target.src !== card.image) {
                                                            e.target.src = card.image;
                                                        } else if (!isHidden) {
                                                            e.target.src = `http://steady-gaufre-1267b2.netlify.app/${card.pokedexId}.png`;
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div key={i} className="w-20 aspect-[3/4] bg-[#18181B] rounded-lg border border-[#26272B] flex items-center justify-center">
                                                <img src={BattleCardBack} className="w-10 opacity-20" alt="Empty Slot" />
                                            </div>
                                        );
                                    })}

                                    {/* Large Card Preview - Mantém igual, pois o hover está bloqueado acima */}
                                    <AnimatePresence>
                                        {hoveredCard && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[100] pointer-events-none origin-bottom"
                                                style={{ width: '400px', maxWidth: '90vw' }}
                                            >
                                                <div className="relative w-full rounded-2xl shadow-2xl bg-[#18181B] p-2 border border-[#26272B]">
                                                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#131316]">
                                                        <img
                                                            src={hoveredCard.image}
                                                            alt={hoveredCard.name}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => e.target.src = hoveredCard.original ? `${hoveredCard.original}/high.png` : `http://steady-gaufre-1267b2.netlify.app/${hoveredCard.pokedexId}.png`}
                                                        />
                                                    </div>
                                                    <div className="mt-3 px-1 pb-1">
                                                        <p className="text-white font-bold text-lg leading-tight">{hoveredCard.name}</p>
                                                        <p className="text-gray-500 text-sm">{hoveredCard.fullName?.split('#')[0] || hoveredCard.name}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
