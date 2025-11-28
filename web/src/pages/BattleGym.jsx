import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import BattlePokeball from "../assets/battle-pokeball.png";
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";
import BattleCardBack from "../assets/battle-cardback.png";
import HoloBadge from "../components/HoloBadge";

// --- IMPORTS DE ASSETS (PREVIEW E LOGOS) ---
import PsaLogo from "../assets/graders/psa.png";
import CgcLogo from "../assets/graders/cgc.png";
import SgcLogo from "../assets/graders/sgc.png";
import TagLogo from "../assets/graders/tag.png";

import BeezieLogo from "../assets/beezie_logo.svg";
import CollectorLogo from "../assets/collector_logo.svg";
import OakLogo from "../assets/oak_logo.svg";

const GRADER_IMAGES = {
    psa: PsaLogo, cgc: CgcLogo, sgc: SgcLogo, tag: TagLogo
};

/* =========================================================================
   HELPER: NORMALIZAÇÃO E BUSCA DE DADOS
   ========================================================================= */
const getPokemonDataByName = (tagName, userTeam, gymTeam) => {
    if (!tagName) return null;
    let processedTag = tagName.endsWith("'s") ? tagName.slice(0, -2) : tagName;
    const cleanTag = processedTag.replace(/[@_ \-']/g, '').toLowerCase();

    const findInList = (list) => list?.find(p => {
        if (!p.name) return false;
        return p.name.replace(/[@_ \-']/g, '').toLowerCase() === cleanTag;
    });

    const userPoke = findInList(userTeam);
    if (userPoke) return { ...userPoke, isEnemy: false };
    const gymPoke = findInList(gymTeam);
    if (gymPoke) return { ...gymPoke, isEnemy: true };
    return null;
};

/* =========================================================================
   COMPONENTE: MESSAGE RENDERER
   ========================================================================= */
const MessageRenderer = ({ text, userTeam, gymTeam, onPlaySound }) => {
    if (!text) return null;
    const parts = text.split(/(@(?:Enemy_)?[\w\u00C0-\u00FF']+)/g);

    return (
        <span className="break-words leading-loose">
            {parts.map((part, index) => {
                if (part.startsWith('@')) {
                    const isEnemyMention = part.startsWith('@Enemy_');
                    const rawName = isEnemyMention ? part.replace('@Enemy_', '') : part.replace('@', '');
                    const pokeData = getPokemonDataByName(rawName, userTeam, gymTeam);

                    if (pokeData) {
                        const badgeStyle = pokeData.isEnemy
                            ? "bg-red-500/10 border-red-500/20 text-red-300"
                            : "bg-green-500/10 border-green-500/20 text-green-200";

                        return (
                            <span
                                key={index}
                                className={`inline-flex items-center gap-1.5 align-middle mx-1 my-1 px-1.5 py-0.5 rounded-md border ${badgeStyle} transition-colors hover:bg-opacity-20`}
                                title={pokeData.name}
                            >
                                <img
                                    src={`https://sweet-cendol-f4d090.netlify.app/${pokeData.pokedexId}.gif`}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `http://steady-gaufre-1267b2.netlify.app/${pokeData.pokedexId}.png`;
                                    }}
                                    alt={pokeData.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onPlaySound) onPlaySound(pokeData.pokedexId);
                                    }}
                                    className="w-7 h-7 object-contain select-none cursor-pointer hover:scale-125 transition-transform"
                                />
                                <span className="text-xs font-bold tracking-wide">{pokeData.name}</span>
                            </span>
                        );
                    }
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

/* =========================================================================
   COMPONENTE: LOADING LOG
   ========================================================================= */
const LoadingLog = ({ messages }) => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setIndex(prev => (prev + 1) % messages.length), 5000);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl backdrop-blur-md bg-yellow-500/5 flex items-center gap-3"
        >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-200/50"></div>
            <p className="text-sm md:text-base text-amber-100 font-medium">{messages[index]}</p>
        </motion.div>
    );
};

/* =========================================================================
   COMPONENTE PRINCIPAL: BATTLE GYM
   ========================================================================= */
function BattleGym() {
    const { gymId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Layout State
    const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);

    // Data State
    const [gymData, setGymData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userTeam, setUserTeam] = useState([]);
    const [userGym, setUserGym] = useState(null);

    // Battle State
    const [battleStatus, setBattleStatus] = useState('idle');
    const [battleLog, setBattleLog] = useState([]);
    const [battleContext, setBattleContext] = useState(null);
    const [sendingTurn, setSendingTurn] = useState(false);

    // Interaction State
    const [playerInput, setPlayerInput] = useState("");
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Mention State
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [mentionCursorIndex, setMentionCursorIndex] = useState(0);

    // Refs
    const textareaRef = useRef(null);
    const backdropRef = useRef(null);
    const messagesEndRef = useRef(null);
    const scrollRef = useRef(null);
    const audioCache = useRef({});

    // Queue State
    const [messageQueue, setMessageQueue] = useState([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [waitingForInteraction, setWaitingForInteraction] = useState(false);
    const [gameOverState, setGameOverState] = useState(null);
    const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

    /* --- AUDIO --- */
    const playPokemonSound = (pokedexId) => {
        if (!pokedexId) return;
        let audio = audioCache.current[pokedexId];
        if (!audio) {
            audio = new Audio(`https://mellifluous-gecko-cbaceb.netlify.app/${pokedexId}.ogg`);
            audio.volume = 0.3;
            audioCache.current[pokedexId] = audio;
        }
        audio.currentTime = 0;
        audio.play().catch(err => console.error("Audio Error:", err));
    };

    useEffect(() => {
        const preloadList = [...(userTeam || []), ...(gymData?.team || [])];
        preloadList.forEach(poke => {
            if (poke?.pokedexId && !audioCache.current[poke.pokedexId]) {
                const audio = new Audio(`https://mellifluous-gecko-cbaceb.netlify.app/${poke.pokedexId}.ogg`);
                audio.volume = 0.3;
                audio.preload = 'auto';
                audioCache.current[poke.pokedexId] = audio;
            }
        });
    }, [userTeam, gymData]);

    /* --- DATA FETCHING --- */
    useEffect(() => {
        const gymRef = ref(db, `gyms/${gymId}`);
        const unsubscribe = onValue(gymRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setGymData(data);
            else { toast.error("Gym not found"); navigate('/'); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [gymId, navigate]);

    useEffect(() => {
        if (!currentUser) return;
        const userTeamRef = ref(db, `users/${currentUser.uid}/gym/team`);
        const unsubscribe = onValue(userTeamRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setUserTeam(Object.values(data));
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const userGymRef = ref(db, `users/${currentUser.uid}/gym`);
        const unsubscribe = onValue(userGymRef, (snapshot) => setUserGym(snapshot.val()));
        return () => unsubscribe();
    }, [currentUser]);

    /* --- QUEUE & SCROLL --- */
    useEffect(() => {
        if (messagesEndRef.current) {
            setTimeout(() => messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        }
    }, [battleLog, playerInput, sendingTurn, battleStatus]);

    useEffect(() => {
        if (messageQueue.length > 0 && !isProcessingQueue && !waitingForInteraction) {
            setIsProcessingQueue(true);
            const nextMessage = messageQueue[0];

            if (nextMessage.type === 'game_over') {
                setGameOverState(nextMessage.data);
                setIsGameOverModalOpen(true);
                if (nextMessage.data.type === 'win') toast.success("You won!");
                else toast.error("Defeated!");
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
                setTimeout(() => setIsProcessingQueue(false), 500);
            }
        }
    }, [messageQueue, isProcessingQueue, waitingForInteraction]);

    /* --- HELPERS --- */
    const getMentionedPokemon = (text) => {
        if (!text || !userTeam.length) return userTeam;
        const normalizedText = text.toLowerCase();
        const mentioned = userTeam.filter(poke => {
            const name = (poke.name || '').toLowerCase();
            return normalizedText.includes(name.split(' ')[0]);
        });
        return mentioned.length > 0 ? mentioned : userTeam;
    };

    const getMentionList = () => {
        const enemies = (gymData?.team || []).map(p => ({ ...p, isEnemy: true }));
        const allies = (userTeam || []).map(p => ({ ...p, isEnemy: false }));
        const all = [...enemies, ...allies];
        return mentionFilter ? all.filter(p => p.name.toLowerCase().includes(mentionFilter)) : all;
    };

    const relevantPokemon = (() => {
        const lastNarrative = battleLog.slice().reverse().find(l => l.type === 'narrative' || l.type === 'referee');
        return getMentionedPokemon(lastNarrative?.message);
    })();

    /* --- INPUT HANDLERS --- */
    const handleInputChange = (e) => {
        const value = e.target.value;
        const selectionStart = e.target.selectionStart;
        setPlayerInput(value);
        if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop;

        const textBeforeCursor = value.slice(0, selectionStart);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbol !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                setShowMentions(true);
                setMentionFilter(textAfterAt.toLowerCase());
                setMentionCursorIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const addMention = (poke) => {
        if (!poke) return;
        const rawName = poke.name.replace(/ /g, '_');
        const finalName = poke.isEnemy ? `Enemy_${rawName}` : rawName;
        const selectionStart = textareaRef.current.selectionStart;
        const textBeforeCursor = playerInput.slice(0, selectionStart);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbol !== -1) {
            const prefix = playerInput.slice(0, lastAtSymbol);
            const suffix = playerInput.slice(selectionStart);
            const newValue = `${prefix}@${finalName} ${suffix}`;
            setPlayerInput(newValue);
            setShowMentions(false);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newCursorPos = lastAtSymbol + finalName.length + 2;
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (showMentions) {
            const list = getMentionList();
            if (e.key === 'Enter') {
                e.preventDefault();
                if (list.length > 0) addMention(list[mentionCursorIndex]);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionCursorIndex(prev => (prev + 1) % list.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionCursorIndex(prev => (prev - 1 + list.length) % list.length);
            } else if (e.key === 'Escape') {
                setShowMentions(false);
            }
        }
    };

    const handleMentionClick = (name, isEnemy = false) => {
        if (!name) return;
        const rawName = name.replace(/ /g, '_');
        const finalName = isEnemy ? `Enemy_${rawName}` : rawName;
        setPlayerInput(prev => `${prev}${prev.length && !prev.endsWith(' ') ? ' ' : ''}@${finalName} `);
        if (textareaRef.current) textareaRef.current.focus();
    };

    /* --- BATTLE LOGIC --- */
    const startBattle = async () => {
        if (!currentUser) return toast.error("You must be logged in");
        if (!userGym || !userGym.gymName) {
            toast.error("Configure your Gym first!");
            return;
        }

        setBattleStatus('starting');
        setBattleLog([{ type: 'loading', messages: ['Connecting...', 'Judge entering...', 'Battle protocol init...'] }]);

        try {
            const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId, challengerId: currentUser.uid })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to start');

            setBattleContext(data.battleId);
            setBattleStatus('active');
            setBattleLog([]);
            queueMessages([
                { type: 'referee', message: 'The judge has connected to the match. The battle has begun!' },
                { type: 'narrative', message: data.introNarrative },
                { type: 'narrative', message: data.leaderMoveNarrative }
            ]);
            if (data.playerOptions) queueMessages([{ type: 'options', options: data.playerOptions }]);

        } catch (error) {
            console.error(error);
            toast.error(error.message);
            setBattleStatus('idle');
        }
    };

    const sendInstruction = async (choiceId = null) => {
        if ((!playerInput.trim() && !choiceId) || sendingTurn) return;

        let instruction = playerInput;
        if (!choiceId && instruction) {
            instruction = instruction.replace(/@Enemy_([\w_]+)/g, (_, n) => `enemy ${n.replace(/_/g, ' ')}`);
            instruction = instruction.replace(/@([\w_]+)/g, (_, n) => n.replace(/_/g, ' '));
        }

        setPlayerInput("");
        setShowMentions(false);
        setSendingTurn(true);

        if (choiceId) {
            const lastOptionsLog = battleLog.slice().reverse().find(l => l.type === 'options');
            const selectedOption = lastOptionsLog?.options?.find(o => o.id === choiceId);
            setBattleLog(prev => [...prev, { type: 'player', message: selectedOption?.text || "Option Selected" }]);
        } else {
            setBattleLog(prev => [...prev, { type: 'player', message: playerInput }]);
        }

        setBattleLog(prev => [...prev, { type: 'loading', messages: ['Thinking...', 'Analyzing...', 'Countering...'] }]);

        try {
            const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/battle/turn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battleContext, action: instruction, choiceId, playerId: currentUser.uid })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed turn');

            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));
            const newMessages = [];
            if (data.playerNarrative) newMessages.push({ type: 'narrative', message: data.playerNarrative });
            if (data.leaderNarrative) newMessages.push({ type: 'narrative', message: data.leaderNarrative });
            queueMessages(newMessages);

            if (data.gameOver) {
                setBattleStatus('ended');
                const isWin = data.winner === data.challengerId;
                queueMessages([{ type: 'game_over', data: { type: isWin ? 'win' : 'loss', winner: data.winner } }]);
                queueMessages([{ type: 'system', message: isWin ? 'Victory!' : 'Defeat!' }]);
            } else if (data.playerOptions) {
                queueMessages([{ type: 'options', options: data.playerOptions }]);
            }
        } catch (error) {
            toast.error(error.message);
            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));
        } finally {
            setSendingTurn(false);
        }
    };

    const queueMessages = (messages) => setMessageQueue(prev => [...prev, ...messages]);
    const handleContinue = () => setWaitingForInteraction(false);

    if (loading) return <div className="min-h-screen bg-[#18181B] flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">
            <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={() => window.innerWidth < 1024 && setIsNavbarOpen(false)} />

            <button
                onClick={() => setIsNavbarOpen(true)}
                className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-black/40 transition-all ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
            </button>

            {/* --- CORREÇÃO DO LAYOUT SHIFT --- */}
            {/* Elemento espaçador "fantasma" que empurra o conteúdo suavemente via Flexbox, igual ao Gym.js */}
            <div
                className={`hidden lg:block flex-shrink-0 bg-transparent transition-[width] duration-300 ease-in-out h-full ${isNavbarOpen ? 'w-[260px]' : 'w-0'}`}
                aria-hidden="true"
            />

            {/* Container Principal com flex-1 e min-w-0 para evitar overflow */}
            <div className="flex-1 min-w-0 h-full relative flex flex-col">
                {/* AQUI ESTÁ A ALTERAÇÃO: Adicionado 'login-page-scrollbar' */}
                <SimpleBar style={{ height: '100%' }} className="w-full login-page-scrollbar">
                    <main className="p-4 sm:p-8 flex flex-col items-center">
                        <div className="max-w-6xl w-full space-y-6">

                            {/* HEADER */}
                            <div className="bg-[#202024] rounded-2xl p-6 relative overflow-hidden">
                                <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
                                    <div className="w-24 h-24 rounded-full border-2 border-[#26272B] overflow-hidden bg-black shrink-0">
                                        <img src={gymData?.leaderImage || '/placeholder-leader.png'} alt="Leader" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h1 className="text-xl font-semibold">{gymData?.gymName || 'Gym Name'}</h1>
                                        <div className="flex justify-center md:justify-start gap-2 text-gray-400 text-sm mt-1">
                                            <span>By @{gymData?.leaderName}</span>
                                            <span>•</span>
                                            <span>{gymData?.location || 'PvP'}</span>
                                        </div>
                                        <div className="flex justify-center md:justify-start gap-4 mt-3">
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <span className="text-sm font-bold">Difficult</span>
                                                <div className="flex">{[1, 2, 3].map(i => <Zap key={i} size={12} fill="currentColor" />)}</div>
                                            </div>
                                            <div className="flex gap-2 text-sm text-gray-400">
                                                <span className="text-green-400">{gymData?.stats?.wins || 0} Wins</span>
                                                <span className="text-red-400">{gymData?.stats?.losses || 0} Losses</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-purple-900/50 to-purple-600/50 rounded-xl p-4 flex items-center gap-4 shrink-0">
                                        <div className="w-20 h-20 md:w-32 md:h-32">
                                            {gymData?.badgeImage ? <HoloBadge imageUrl={gymData.badgeImage} holo={gymData.holo || 1} /> : <div className="text-xs text-center text-gray-500">No Badge</div>}
                                        </div>
                                        <div className="hidden sm:block">
                                            <h3 className="font-bold text-sm">Badge Reward</h3>
                                            <p className="text-[10px] text-gray-400 max-w-[150px]">NFT sent to your wallet on victory.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GRID */}
                            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[600px]">

                                {/* RIGHT COL (Mobile First) */}
                                <div className="flex flex-col gap-4 order-1 lg:order-2 lg:h-full">
                                    <div className="bg-[#202024] rounded-2xl p-6 h-auto lg:h-[48%] flex flex-col min-h-0 shrink-0">
                                        <h3 className="font-semibold text-lg mb-3 shrink-0">Gym Description</h3>
                                        <div className="text-gray-400 text-sm leading-relaxed flex-1 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                                            {gymData?.description || 'No description available.'}
                                        </div>
                                    </div>

                                    {/* OPPONENT TEAM - FIXED PREVIEW */}
                                    <div className="bg-[#202024] rounded-2xl p-6 h-auto lg:flex-1 flex flex-col relative lg:overflow-visible">
                                        <h3 className="font-semibold text-lg mb-3 shrink-0">Opponent's Team</h3>
                                        <div className="w-full flex-1 flex items-center justify-center">
                                            <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 content-start">
                                                {gymData?.team?.map((card, i) => {
                                                    const isHidden = battleStatus === 'idle';
                                                    const isHovered = hoveredIndex === i;
                                                    const graderKey = card?.grader ? card.grader.toLowerCase() : "";

                                                    let PlatformBadge = null;
                                                    if (card?.tag === 'OAK GIFT') {
                                                        PlatformBadge = <div className="flex items-center gap-1 bg-gradient-to-r from-[#161A1C] to-[#78313B] rounded-full px-2 py-1 h-5 shrink-0"><img src={OakLogo} className="w-3" alt="" /><span className="text-[9px] font-bold">OAK GIFT</span></div>;
                                                    } else if (card?.chain === 'flow') {
                                                        PlatformBadge = <div className="flex items-center gap-1 bg-gradient-to-r from-[#131316] to-[#575765] rounded-full px-2 py-1 h-5 shrink-0"><img src={BeezieLogo} className="w-3" alt="" /><span className="text-[9px] font-bold">beezie</span></div>;
                                                    } else if (card?.chain === 'solana') {
                                                        PlatformBadge = <div className="flex items-center gap-1 bg-gradient-to-r from-[#121212] to-[#2B1E14] rounded-full px-2 py-1 h-5 shrink-0"><img src={CollectorLogo} className="w-3" alt="" /><span className="text-[9px] font-bold">COLLECTOR</span></div>;
                                                    }

                                                    return card ? (
                                                        <div
                                                            key={i}
                                                            className={`group relative w-full aspect-[2.5/3.5] cursor-pointer isolate hover:z-50`}
                                                            onMouseEnter={() => !isHidden && setHoveredIndex(i)}
                                                            onMouseLeave={() => setHoveredIndex(null)}
                                                            onClick={() => {
                                                                if (!isHidden) {
                                                                    playPokemonSound(card.pokedexId);
                                                                    handleMentionClick(card.name, true);
                                                                }
                                                            }}
                                                        >
                                                            <img
                                                                src={isHidden ? BattleCardBack : (card.original ? `${card.original}/high.png` : card.image)}
                                                                alt={card.name}
                                                                className={`w-full h-full object-cover rounded-lg transition-transform duration-300 ${!isHidden ? 'group-hover:scale-105' : ''} shadow-lg relative z-10 will-change-transform`}
                                                                onError={(e) => { e.target.onerror = null; if (!isHidden) e.target.src = card.image || `http://steady-gaufre-1267b2.netlify.app/${card.pokedexId}.png`; }}
                                                            />

                                                            <AnimatePresence>
                                                                {isHovered && !isHidden && (
                                                                    <motion.div
                                                                        key={`tooltip-${i}`}
                                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                                        // FIXED: Bottom-0 prevents shifting/scrollbar. Right-110% puts it over the log (safe).
                                                                        className="absolute bottom-0 right-[110%] z-[9999] pointer-events-none hidden lg:block origin-bottom-right"
                                                                        style={{ width: '360px' }}
                                                                    >
                                                                        <div className="relative bg-[#18181B] p-2 rounded-2xl shadow-2xl border border-[#26272B]">
                                                                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#131316]">
                                                                                <img src={card.image} alt={card.name} className="w-full h-full object-contain" />
                                                                            </div>
                                                                            <div className="mt-3 px-1 pb-1 flex justify-between items-center">
                                                                                <div>
                                                                                    <p className="text-white font-bold text-lg leading-tight truncate max-w-[150px]">{card.name}</p>
                                                                                    <p className="text-gray-500 text-sm">{card.cardId ? `#${card.cardId}` : ''}</p>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {PlatformBadge}
                                                                                    {GRADER_IMAGES[graderKey] && (
                                                                                        <div className="bg-white/10 p-1 rounded-md h-6 w-6 flex items-center justify-center">
                                                                                            <img src={GRADER_IMAGES[graderKey]} alt="" className="w-full h-full object-contain" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="absolute bottom-10 -right-2 w-4 h-4 bg-[#18181B] border-t border-r border-[#26272B] rotate-45"></div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    ) : (
                                                        <div key={i} className="w-full aspect-[2.5/3.5] bg-[#18181B] rounded-lg border border-white/5 flex items-center justify-center">
                                                            <img src={BattleCardBack} className="w-10 opacity-20" alt="Empty" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* LEFT COL (Battle Log) */}
                                <div className="bg-[#202024] rounded-2xl overflow-hidden relative flex flex-col order-2 lg:order-1 lg:col-span-2 h-[600px] lg:h-full">
                                    <div className="absolute inset-0 z-0 opacity-40">
                                        <img src={gymData?.gymImage || '/placeholder-gym.png'} alt="BG" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="relative z-10 flex-1 flex flex-col p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <img src={BattlePokeball} className="w-10 h-10" alt="Battle" />
                                                <h2 className="font-bold text-xl">Battle Log</h2>
                                            </div>
                                            {gameOverState && !isGameOverModalOpen && <button onClick={() => setIsGameOverModalOpen(true)} className="text-xs bg-white/10 px-3 py-1 rounded-full">Result</button>}
                                        </div>

                                        {battleStatus === 'idle' ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <motion.button whileHover={{ scale: 1.05 }} onClick={startBattle} className="bg-[#FACC15] hover:bg-[#EAB308] text-[#131316] font-black text-2xl py-4 px-12 rounded-full shadow-lg flex items-center gap-3">
                                                    <Zap size={32} /> FIGHT!
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 relative min-h-0">
                                                <SimpleBar scrollableNodeProps={{ ref: scrollRef }} style={{ position: 'absolute', inset: 0 }} className="pr-4">
                                                    <div className="space-y-4 pb-4">
                                                        {battleLog.map((log, index) => {
                                                            if (log.type === 'options') {
                                                                if (index === battleLog.length - 1 && !sendingTurn && battleStatus !== 'ended') {
                                                                    return (
                                                                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 backdrop-blur-md rounded-xl p-6 mt-4">
                                                                            <h3 className="font-bold mb-4">{relevantPokemon.length === 1 ? `Command ${relevantPokemon[0].name}` : "Command Team"}</h3>
                                                                            <div className="space-y-2">
                                                                                {log.options.map((opt) => (
                                                                                    <button key={opt.id} onClick={() => sendInstruction(opt.id)} className="w-full text-left bg-[#3E3D3E] hover:bg-[#4E4D4E] p-4 rounded-lg flex items-center gap-3 group">
                                                                                        <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center text-xs group-hover:border-white">{opt.id}</div>
                                                                                        <span className="text-sm"><MessageRenderer text={opt.text} userTeam={userTeam} gymTeam={gymData?.team} onPlaySound={playPokemonSound} /></span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                }
                                                                return null;
                                                            }
                                                            if (log.type === 'loading') return <LoadingLog key={index} messages={log.messages} />;

                                                            const style = log.type === 'player' ? 'bg-emerald-500/10 ml-auto max-w-[80%]' : log.type === 'referee' ? 'bg-yellow-500/5 text-amber-100' : 'bg-black/60';
                                                            return (
                                                                <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl backdrop-blur-md ${style}`}>
                                                                    <MessageRenderer text={log.message} userTeam={userTeam} gymTeam={gymData?.team} onPlaySound={playPokemonSound} />
                                                                </motion.div>
                                                            );
                                                        })}

                                                        {waitingForInteraction && (
                                                            <div className="flex justify-center w-full py-2">
                                                                <button onClick={handleContinue} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-xs px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                                                                    <span>Continue</span> <ArrowLeft className="-rotate-90" size={12} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {!battleLog.some(l => l.type === 'options') && !sendingTurn && battleStatus === 'active' && !messageQueue.length && !waitingForInteraction && (
                                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 backdrop-blur-md rounded-xl p-6 mt-4 relative">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <h3 className="font-semibold">Command</h3>
                                                                    <div className="flex gap-2">
                                                                        {relevantPokemon.map((poke, i) => (
                                                                            <img key={i} src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId}.gif`} className="w-10 h-10 object-contain cursor-pointer" onClick={() => handleMentionClick(poke.name)} alt="" />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="relative">
                                                                    {showMentions && (
                                                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#27272A] rounded-lg shadow-xl z-50">
                                                                            <SimpleBar style={{ maxHeight: '192px' }}>
                                                                                {getMentionList().map((poke, idx) => (
                                                                                    <button key={idx} onClick={() => addMention(poke)} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${idx === mentionCursorIndex ? 'bg-[#3F3F46]' : 'hover:bg-[#3F3F46]'}`}>
                                                                                        <span className="text-sm font-medium">{poke.name}</span>
                                                                                    </button>
                                                                                ))}
                                                                            </SimpleBar>
                                                                        </div>
                                                                    )}
                                                                    <div className="relative h-24 w-full bg-[#18181B]/80 rounded-lg overflow-hidden">
                                                                        <textarea ref={textareaRef} value={playerInput} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type instruction..." className="absolute inset-0 w-full h-full bg-transparent p-3 text-sm resize-none focus:outline-none text-white" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end mt-3"><button onClick={() => sendInstruction()} className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold">Send</button></div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <div ref={messagesEndRef} />
                                                </SimpleBar>
                                            </div>
                                        )}

                                        <AnimatePresence>
                                            {gameOverState && isGameOverModalOpen && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181B] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
                                                        <button onClick={() => setIsGameOverModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                                                        <h2 className={`text-4xl font-black mb-3 ${gameOverState.type === 'win' ? 'text-yellow-500' : 'text-red-500'}`}>{gameOverState.type === 'win' ? 'VICTORY!' : 'DEFEAT'}</h2>
                                                        <div className="flex flex-col gap-3 mt-8">
                                                            <button onClick={() => window.location.reload()} className="w-full py-3 bg-white text-black rounded-xl font-bold">Rematch</button>
                                                            <button onClick={() => navigate('/battle')} className="w-full py-3 bg-[#27272A] text-white rounded-xl">Back</button>
                                                        </div>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </SimpleBar>
            </div>
        </div>
    );
}

export default BattleGym;