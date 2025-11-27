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

    // Mention Logic States
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");

    // Refs for Scroll Sync (Highlighter)
    const textareaRef = useRef(null);
    const backdropRef = useRef(null);

    const messagesEndRef = useRef(null);
    const scrollRef = useRef(null);

    const [userTeam, setUserTeam] = useState([]);
    const [userGym, setUserGym] = useState(null);

    // Helper to find mentioned pokemon in text
    const getMentionedPokemon = (text) => {
        if (!text || !userTeam.length) return userTeam;

        const normalizedText = text.toLowerCase();
        const mentioned = userTeam.filter(poke => {
            const name = (poke.name || '').toLowerCase();
            return normalizedText.includes(name.split(' ')[0]);
        });

        return mentioned.length > 0 ? mentioned : userTeam;
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
                const teamArray = Object.values(data);
                setUserTeam(teamArray);
            }
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Check User Gym
    useEffect(() => {
        if (!currentUser) return;
        const userGymRef = ref(db, `users/${currentUser.uid}/gym`);
        const unsubscribe = onValue(userGymRef, (snapshot) => {
            const data = snapshot.val();
            setUserGym(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Auto-scroll battle log
    useEffect(() => {
        if (messagesEndRef.current) {
            setTimeout(() => {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }, 100);
        }
    }, [battleLog, playerInput, sendingTurn, battleStatus]);

    const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

    const [messageQueue, setMessageQueue] = useState([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [waitingForInteraction, setWaitingForInteraction] = useState(false);
    const [gameOverState, setGameOverState] = useState(null);
    const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

    // Process Message Queue
    useEffect(() => {
        if (messageQueue.length > 0 && !isProcessingQueue && !waitingForInteraction) {
            setIsProcessingQueue(true);
            const nextMessage = messageQueue[0];

            if (nextMessage.type === 'game_over') {
                setGameOverState(nextMessage.data);
                setIsGameOverModalOpen(true);

                if (nextMessage.data.type === 'win') {
                    toast.success("You won the badge!");
                } else {
                    toast.error("You were defeated!");
                }

                setMessageQueue(prev => prev.slice(1));
                setIsProcessingQueue(false);
                return;
            }

            setBattleLog(prev => [...prev, nextMessage]);
            setMessageQueue(prev => prev.slice(1));

            const isJudgeMessage = nextMessage.message && nextMessage.message.includes("The judge has connected");

            if ((nextMessage.type === 'narrative' || nextMessage.type === 'referee') && !isJudgeMessage) {
                setWaitingForInteraction(true);
                setIsProcessingQueue(false);
            } else {
                setTimeout(() => {
                    setIsProcessingQueue(false);
                }, 500);
            }
        }
    }, [messageQueue, isProcessingQueue, waitingForInteraction]);

    const handleContinue = () => {
        setWaitingForInteraction(false);
    };

    const queueMessages = (messages) => {
        setMessageQueue(prev => [...prev, ...messages]);
    };

    // --- MENTION LOGIC ---

    // Detect @ typing
    const handleInputChange = (e) => {
        const value = e.target.value;
        setPlayerInput(value);

        // Sync Scroll
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
        }

        // Check if the last word starts with @
        const lastWord = value.split(/[\s\n]+/).pop();
        if (lastWord && lastWord.startsWith('@')) {
            setShowMentions(true);
            // Remove @ and replace underscores with spaces for filtering
            setMentionFilter(lastWord.substring(1).replace(/_/g, ' ').toLowerCase());
        } else {
            setShowMentions(false);
        }
    };

    const handleScroll = (e) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Add mention to input (replaces spaces with underscores)
    const addMention = (poke) => {
        // Determine the name to insert
        // If enemy, prepend Enemy_ to the name
        const rawName = poke.name.replace(/ /g, '_');
        const finalName = poke.isEnemy ? `Enemy_${rawName}` : rawName;

        const words = playerInput.split(/([\s\n]+)/);
        const lastIndex = playerInput.lastIndexOf('@');
        const prefix = playerInput.substring(0, lastIndex);

        const newValue = prefix + `@${finalName} `;
        setPlayerInput(newValue);
        setShowMentions(false);

        if (textareaRef.current) textareaRef.current.focus();
    };

    // Handle click on Pokemon images to add mention
    const handleMentionClick = (name, isEnemy = false) => {
        if (!name) return;

        const rawName = name.replace(/ /g, '_');
        const finalName = isEnemy ? `Enemy_${rawName}` : rawName;

        setPlayerInput(prev => {
            const prefix = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + prefix + `@${finalName} `;
        });
        if (textareaRef.current) textareaRef.current.focus();
    };

    // Get combined list for mentions
    const getMentionList = () => {
        const enemies = (gymData?.team || []).map(p => ({ ...p, isEnemy: true }));
        const allies = (userTeam || []).map(p => ({ ...p, isEnemy: false }));
        const all = [...enemies, ...allies];

        if (!mentionFilter) return all;
        return all.filter(p => p.name.toLowerCase().includes(mentionFilter));
    };

    // --- HIGHLIGHTER LOGIC ---
    const renderHighlightedText = () => {
        if (!playerInput) return null;

        // Split by delimiters but keep them
        const parts = playerInput.split(/(@[\w_]+|\s+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                // Check if it starts with @Enemy_
                if (part.startsWith('@Enemy_')) {
                    return <span key={index} className="text-red-400">{part}</span>;
                }
                // Otherwise it's an ally (or just a random mention)
                return <span key={index} className="text-white">{part}</span>;
            }
            return <span key={index} className="text-white">{part}</span>;
        });
    };

    // --- END MENTION LOGIC ---

    const startBattle = async () => {
        if (!currentUser) return toast.error("You must be logged in to battle");

        if (!userGym || !userGym.gymName || !userGym.leaderName) {
            toast.error("You must configure your own Gym before battling!");
            return;
        }

        setBattleStatus('starting');
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
            setBattleLog([]);

            queueMessages([
                { type: 'referee', message: 'The judge has connected to the match. The battle has begun!' },
                { type: 'narrative', message: data.introNarrative },
                { type: 'narrative', message: data.leaderMoveNarrative }
            ]);

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

        let instruction = playerInput;

        // --- TRANSFORM INPUT (Process Mentions) ---
        if (!choiceId && instruction) {
            // 1. Replace Enemy Mentions: @Enemy_Name -> enemy Name
            // We look for the pattern @Enemy_Something
            instruction = instruction.replace(/@Enemy_([\w_]+)/g, (match, nameWithUnderscores) => {
                const realName = nameWithUnderscores.replace(/_/g, ' ');
                return `enemy ${realName}`;
            });

            // 2. Replace Ally Mentions: @Name -> Name
            // We look for remaining @Something (that isn't Enemy_)
            instruction = instruction.replace(/@([\w_]+)/g, (match, nameWithUnderscores) => {
                const realName = nameWithUnderscores.replace(/_/g, ' ');
                return realName;
            });
        }
        // ------------------------------------------

        setPlayerInput("");
        setShowMentions(false);
        setSendingTurn(true);

        if (choiceId) {
            const lastOptionsLog = battleLog.slice().reverse().find(l => l.type === 'options');
            const selectedOption = lastOptionsLog?.options?.find(o => o.id === choiceId);
            setBattleLog(prev => [...prev, { type: 'player', message: selectedOption?.text || "Player Action" }]);
        } else {
            // Show the raw input (with underscores) to the player, or the processed one?
            // Usually showing what they typed is better UX.
            setBattleLog(prev => [...prev, { type: 'player', message: playerInput }]);
        }

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
                    action: instruction, // Send the processed instruction (spaces restored, enemy prefix added)
                    choiceId: choiceId,
                    playerId: currentUser.uid
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to process turn');

            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));

            const newMessages = [];

            if (data.playerNarrative) {
                newMessages.push({ type: 'narrative', message: data.playerNarrative });
            }

            if (data.leaderNarrative) {
                newMessages.push({ type: 'narrative', message: data.leaderNarrative });
            }

            queueMessages(newMessages);

            if (data.gameOver) {
                setBattleStatus('ended');
                const isWin = data.winner === data.challengerId;

                queueMessages([{
                    type: 'game_over',
                    data: {
                        type: isWin ? 'win' : 'loss',
                        winner: data.winner
                    }
                }]);

                queueMessages([{ type: 'system', message: isWin ? 'Victory! You defeated the Gym Leader!' : 'Defeat! You were overwhelmed.' }]);

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
                                <img src={gymData?.leaderImage || '/placeholder-leader.png'} alt={gymData?.leaderName} className="w-full h-full object-cover bg-[#202024]" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold">{gymData?.gymName || 'Gym Name'}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mt-1">
                                    <span>By @{gymData?.leaderName}</span>
                                    <span>•</span>
                                    <span>
                                        {gymData.location
                                            ? `${gymData.location}${gymData.region ? `, ${gymData.region}` : ''}`
                                            : 'Leaders'
                                        }
                                    </span>
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <span className="text-sm font-bold">Difficult</span>
                                        <div className="flex">
                                            {[1, 2, 3].map(i => <Zap key={i} size={12} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        <span className="text-green-400 font-bold">{gymData?.stats?.wins || 0} Wins</span>
                                        <span className="mx-2">|</span>
                                        <span className="text-red-400 font-bold">{gymData?.stats?.losses || 0} Losses</span>
                                    </div>
                                </div>

                                {/* Pokemon Icons (Header) - Clickable for Mention */}
                                {/* Pokemon Icons (Header) */}
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                                    {gymData?.team?.map((poke, i) => poke && (
                                        <div
                                            key={i}
                                            className="w-12 h-12 cursor-pointer hover:scale-110 transition-transform"
                                            // ADICIONADO O TRUE AQUI
                                            onClick={() => handleMentionClick(poke.name, true)}
                                            title={`Click to mention @${poke.name}`}
                                        >
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
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <img src={BattlePokeball} className="w-10 h-10" alt="Battle" />
                                        <h2 className="font-bold text-xl">Battle Log</h2>
                                    </div>
                                    {gameOverState && !isGameOverModalOpen && (
                                        <button
                                            onClick={() => setIsGameOverModalOpen(true)}
                                            className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition-colors"
                                        >
                                            Show Result
                                        </button>
                                    )}
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
                                                        if (index === battleLog.length - 1 && !sendingTurn && battleStatus !== 'ended') {
                                                            return (
                                                                <motion.div
                                                                    key={index}
                                                                    initial={{ opacity: 0, y: 20 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="bg-black/60 backdrop-blur-md border border-gray-700 rounded-xl p-6 mt-4"
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
                                                                                        src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId}.gif`}
                                                                                        onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
                                                                                        className="w-full h-full object-contain"
                                                                                        alt={poke.name}
                                                                                        title={poke.name}
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
                                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                                            className={`p-4 rounded-xl backdrop-blur-md border ${log.type === 'player' ? 'bg-emerald-500/20 border-emerald-500/50 ml-auto max-w-[80%]' :
                                                                log.type === 'narrative' ? 'bg-black/60 border-gray-700' :
                                                                    'bg-gray-800/40 border-gray-700'
                                                                }`}
                                                        >
                                                            <p className="text-sm md:text-base">{log.message}</p>
                                                        </motion.div>
                                                    );
                                                })
                                                }

                                                {waitingForInteraction && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex justify-center w-full py-2"
                                                    >
                                                        <button
                                                            onClick={handleContinue}
                                                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-all animate-pulse cursor-pointer"
                                                        >
                                                            <span>Click to continue</span>
                                                            <ArrowLeft className="-rotate-90" size={12} />
                                                        </button>
                                                    </motion.div>
                                                )}

                                                {/* Turn 1 Input (Text) */}
                                                {!battleLog.some(l => l.type === 'options') && !sendingTurn && battleStatus === 'active' && messageQueue.length === 0 && !isProcessingQueue && !waitingForInteraction && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-black/60 backdrop-blur-md border border-gray-700 rounded-xl p-6 mt-4 relative"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="font-bold text-white">
                                                                {relevantPokemon.length === 1
                                                                    ? `Emergency instruction for ${relevantPokemon[0].name}`
                                                                    : "Command your Team"}
                                                            </h3>
                                                            <div className="flex gap-2">
                                                                {relevantPokemon.map((poke, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="w-12 h-12 cursor-pointer hover:scale-110 transition-transform"
                                                                        onClick={() => handleMentionClick(poke.name)}
                                                                        title={`Click to mention @${poke.name}`}
                                                                    >
                                                                        <img
                                                                            src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId}.gif`}
                                                                            onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
                                                                            className="w-full h-full object-contain"
                                                                            title={poke.name}
                                                                            alt={poke.name}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-3">Describe your instruction (Type @ to mention)</p>

                                                        <div className="relative w-full">
                                                            {/* Mention Dropdown */}
                                                            {showMentions && (
                                                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#27272A] border border-[#3F3F46] rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                                                                    {getMentionList().length > 0 ? (
                                                                        getMentionList().map((poke, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => addMention(poke)}
                                                                                className="w-full text-left px-4 py-2 hover:bg-[#3F3F46] flex items-center gap-2 transition-colors"
                                                                            >
                                                                                <img
                                                                                    src={`http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`}
                                                                                    className="w-6 h-6 object-contain"
                                                                                    alt=""
                                                                                />
                                                                                <span className={`text-sm font-medium ${poke.isEnemy ? 'text-red-400' : 'text-gray-200'}`}>
                                                                                    {poke.name.replace(/ /g, '_')}
                                                                                </span>
                                                                                {poke.isEnemy && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded ml-auto">Enemy</span>}
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-4 py-2 text-sm text-gray-500">No Pokemon found</div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Layered Input for Highlighting */}
                                                            <div className="relative h-24 w-full bg-[#18181B] border border-[#26272B] rounded-lg overflow-hidden">

                                                                {/* Backdrop (Highlighter) */}
                                                                <div
                                                                    ref={backdropRef}
                                                                    className="absolute inset-0 p-3 whitespace-pre-wrap break-words overflow-hidden text-sm font-sans pointer-events-none"
                                                                    aria-hidden="true"
                                                                >
                                                                    {renderHighlightedText()}
                                                                    {/* Add a space at the end to ensure cursor visibility at end of line */}
                                                                    <span className="opacity-0">.</span>
                                                                </div>

                                                                {/* Actual Input (Transparent) */}
                                                                <textarea
                                                                    ref={textareaRef}
                                                                    value={playerInput}
                                                                    onChange={handleInputChange}
                                                                    onScroll={handleScroll}
                                                                    placeholder={`Ex: Use Waterfall on @Onix!`}
                                                                    className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white p-3 text-sm font-sans resize-none focus:outline-none focus:border-gray-500"
                                                                    style={{ color: 'transparent' }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end mt-3">
                                                            <button
                                                                onClick={() => sendInstruction()}
                                                                className="bg-white text-black font-bold px-6 py-2 rounded-full hover:bg-gray-200 transition-colors text-sm"
                                                            >
                                                                Send
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}


                                            </div>
                                            <div ref={messagesEndRef} />
                                        </SimpleBar>
                                    </div>
                                )}

                                {/* Game Over Overlay */}
                                <AnimatePresence>
                                    {gameOverState && isGameOverModalOpen && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                                className="relative bg-[#18181B] border border-[#27272A] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
                                            >
                                                {/* Close Button */}
                                                <button
                                                    onClick={() => setIsGameOverModalOpen(false)}
                                                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-20"
                                                >
                                                    <div className="relative w-6 h-6">
                                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current rotate-45 transform -translate-y-1/2"></div>
                                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current -rotate-45 transform -translate-y-1/2"></div>
                                                    </div>
                                                </button>

                                                {/* Background Glow */}
                                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b ${gameOverState.type === 'win' ? 'from-yellow-500/20' : 'from-red-500/20'} to-transparent opacity-50 blur-3xl pointer-events-none`} />

                                                <div className="relative z-10 flex flex-col items-center">
                                                    {/* Icon / Badge */}
                                                    <div className="mb-6 relative">
                                                        {gameOverState.type === 'win' ? (
                                                            <>
                                                                <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full" />
                                                                <motion.div
                                                                    className="w-32 h-32 relative z-10"
                                                                >
                                                                    <img
                                                                        src={gymData?.badgeImage || '/placeholder-badge.png'}
                                                                        alt="Badge"
                                                                        className="w-full h-full object-contain drop-shadow-2xl"
                                                                    />
                                                                </motion.div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                                                                <Shield size={80} className="text-red-500 relative z-10 drop-shadow-lg" />
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h2 className={`text-4xl font-black tracking-tight mb-3 ${gameOverState.type === 'win' ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600' : 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700'}`}>
                                                        {gameOverState.type === 'win' ? 'VICTORY!' : 'DEFEAT'}
                                                    </h2>

                                                    {/* Description */}
                                                    <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-[260px]">
                                                        {gameOverState.type === 'win'
                                                            ? "Incredible! You've defeated the Gym Leader and claimed the Badge."
                                                            : "Your team was overwhelmed. Analyze the strategy and challenge again."}
                                                    </p>

                                                    {/* Buttons */}
                                                    <div className="flex flex-col gap-3 w-full">
                                                        <button
                                                            onClick={() => window.location.reload()}
                                                            className={`w-full py-3.5 rounded-xl font-bold text-black transition-all transform active:scale-95 shadow-lg ${gameOverState.type === 'win'
                                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 shadow-yellow-900/20'
                                                                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-900/20'
                                                                }`}
                                                        >
                                                            Rematch
                                                        </button>
                                                        <button
                                                            onClick={() => navigate('/battle')}
                                                            className="w-full py-3.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-medium transition-colors border border-[#3F3F46]"
                                                        >
                                                            Back to Gyms
                                                        </button>
                                                    </div>
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
                                        const isHidden = battleStatus === 'idle';

                                        return card ? (
                                            <div
                                                key={i}
                                                className="group relative w-20 aspect-[3/4] cursor-pointer"
                                                onMouseEnter={() => !isHidden && setHoveredCard(card)}
                                                onMouseLeave={() => setHoveredCard(null)}
                                                onClick={() => !isHidden && handleMentionClick(card.name, true)}
                                                title={!isHidden ? `Click to mention @${card.name}` : ''}
                                            >
                                                <img
                                                    src={isHidden
                                                        ? BattleCardBack
                                                        : (card.original ? `${card.original}/high.png` : card.image)
                                                    }
                                                    alt={isHidden ? "Hidden Card" : card.name}
                                                    className={`w-full h-full object-cover rounded-lg border border-[#26272B] transition-transform ${!isHidden ? 'group-hover:scale-105' : ''}`}
                                                    style={{ imageRendering: 'auto' }}
                                                    onError={(e) => {
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

                                    {/* Large Card Preview */}
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