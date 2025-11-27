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

// --- HELPER: Get Pokemon Data for GIFs (NORMALIZED MATCHING) ---
const getPokemonDataByName = (tagName, userTeam, gymTeam) => {
    if (!tagName) return null;

    let processedTag = tagName;

    if (processedTag.endsWith("'s")) {
        processedTag = processedTag.slice(0, -2);
    }

    const cleanTag = processedTag.replace(/[@_ \-']/g, '').toLowerCase();

    const findInList = (list) => {
        return list?.find(p => {
            if (!p.name) return false;
            const cleanName = p.name.replace(/[@_ \-']/g, '').toLowerCase();
            return cleanName === cleanTag;
        });
    };

    const userPoke = findInList(userTeam);
    if (userPoke) return { ...userPoke, isEnemy: false };

    const gymPoke = findInList(gymTeam);
    if (gymPoke) return { ...gymPoke, isEnemy: true };

    return null;
};

// --- COMPONENT: Message Renderer (Text -> GIFs) ---
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
                                    onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${pokeData.pokedexId}.png`}
                                    alt={pokeData.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onPlaySound) onPlaySound(pokeData.pokedexId);
                                    }}
                                    className="w-7 h-7 object-contain select-none cursor-pointer hover:scale-125 transition-transform"
                                />
                                <span className="text-xs font-bold tracking-wide">
                                    {pokeData.name}
                                </span>
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

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
            className="p-4 rounded-xl backdrop-blur-md bg-yellow-500/5 flex items-center gap-3"
        >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-200/50"></div>
            <p className="text-sm md:text-base text-amber-100 font-medium">{messages[index]}</p>
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
    const [battleStatus, setBattleStatus] = useState('idle');
    const [battleLog, setBattleLog] = useState([]);
    const [playerInput, setPlayerInput] = useState("");
    const [sendingTurn, setSendingTurn] = useState(false);
    const [battleContext, setBattleContext] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    // Mention Logic States
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [mentionCursorIndex, setMentionCursorIndex] = useState(0);

    // Refs for Scroll Sync (Highlighter)
    const textareaRef = useRef(null);
    const backdropRef = useRef(null);

    const messagesEndRef = useRef(null);
    const scrollRef = useRef(null);

    const [userTeam, setUserTeam] = useState([]);
    const [userGym, setUserGym] = useState(null);

    // --- AUDIO LOGIC START ---
    const audioCache = useRef({});

    const playPokemonSound = (pokedexId) => {
        if (!pokedexId) return;

        let audio = audioCache.current[pokedexId];

        if (!audio) {
            audio = new Audio(`https://mellifluous-gecko-cbaceb.netlify.app/${pokedexId}.ogg`);
            audio.volume = 0.3;
            audioCache.current[pokedexId] = audio;
        }

        audio.currentTime = 0;
        audio.play().catch(err => console.error("Erro ao reproduzir som:", err));
    };

    useEffect(() => {
        const preloadList = [];

        if (userTeam && userTeam.length > 0) {
            preloadList.push(...userTeam);
        }

        if (gymData && gymData.team) {
            preloadList.push(...gymData.team);
        }

        preloadList.forEach(poke => {
            if (poke && poke.pokedexId && !audioCache.current[poke.pokedexId]) {
                const audio = new Audio(`https://mellifluous-gecko-cbaceb.netlify.app/${poke.pokedexId}.ogg`);
                audio.volume = 0.3;
                audio.preload = 'auto';
                audioCache.current[poke.pokedexId] = audio;
            }
        });
    }, [userTeam, gymData]);
    // --- AUDIO LOGIC END ---

    const getMentionedPokemon = (text) => {
        if (!text || !userTeam.length) return userTeam;
        const normalizedText = text.toLowerCase();
        const mentioned = userTeam.filter(poke => {
            const name = (poke.name || '').toLowerCase();
            return normalizedText.includes(name.split(' ')[0]);
        });
        return mentioned.length > 0 ? mentioned : userTeam;
    };

    const relevantPokemon = (() => {
        const lastNarrative = battleLog.slice().reverse().find(l => l.type === 'narrative' || l.type === 'referee');
        return getMentionedPokemon(lastNarrative?.message);
    })();

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

    useEffect(() => {
        if (messagesEndRef.current) {
            setTimeout(() => {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }, [battleLog, playerInput, sendingTurn, battleStatus]);

    const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

    const [messageQueue, setMessageQueue] = useState([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [waitingForInteraction, setWaitingForInteraction] = useState(false);
    const [gameOverState, setGameOverState] = useState(null);
    const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

    useEffect(() => {
        if (messageQueue.length > 0 && !isProcessingQueue && !waitingForInteraction) {
            setIsProcessingQueue(true);
            const nextMessage = messageQueue[0];

            if (nextMessage.type === 'game_over') {
                setGameOverState(nextMessage.data);
                setIsGameOverModalOpen(true);
                if (nextMessage.data.type === 'win') toast.success("You won the badge!");
                else toast.error("You were defeated!");
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

    const handleContinue = () => setWaitingForInteraction(false);
    const queueMessages = (messages) => setMessageQueue(prev => [...prev, ...messages]);

    const getMentionList = () => {
        const enemies = (gymData?.team || []).map(p => ({ ...p, isEnemy: true }));
        const allies = (userTeam || []).map(p => ({ ...p, isEnemy: false }));
        const all = [...enemies, ...allies];
        if (!mentionFilter) return all;
        return all.filter(p => p.name.toLowerCase().includes(mentionFilter));
    };

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

    const handleScroll = (e) => {
        if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop;
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

        setPlayerInput(prev => {
            const prefix = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + prefix + `@${finalName} `;
        });
        if (textareaRef.current) textareaRef.current.focus();
    };

    const renderHighlightedText = () => {
        if (!playerInput) return null;
        const parts = playerInput.split(/(@[\w_']+|\s+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                if (part.startsWith('@Enemy_')) return <span key={index} className="text-red-400">{part}</span>;
                return <span key={index} className="text-green-400">{part}</span>;
            }
            return <span key={index} className="text-white">{part}</span>;
        });
    };

    const startBattle = async () => {
        if (!currentUser) return toast.error("You must be logged in to battle");
        if (!userGym || !userGym.gymName || !userGym.leaderName) {
            toast.error("You must configure your own Gym before battling!");
            return;
        }

        setBattleStatus('starting');
        setBattleLog([{
            type: 'loading',
            messages: ['Connecting to Gym...', 'Judge is entering the arena...', 'Initializing battle protocol...', 'Waiting for Gym Leader...']
        }]);

        try {
            const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId, challengerId: currentUser.uid })
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
            instruction = instruction.replace(/@Enemy_([\w_]+)/g, (match, nameWithUnderscores) => {
                const realName = nameWithUnderscores.replace(/_/g, ' ');
                return `enemy ${realName}`;
            });
            instruction = instruction.replace(/@([\w_]+)/g, (match, nameWithUnderscores) => {
                const realName = nameWithUnderscores.replace(/_/g, ' ');
                return realName;
            });
        }

        setPlayerInput("");
        setShowMentions(false);
        setSendingTurn(true);

        if (choiceId) {
            const lastOptionsLog = battleLog.slice().reverse().find(l => l.type === 'options');
            const selectedOption = lastOptionsLog?.options?.find(o => o.id === choiceId);
            setBattleLog(prev => [...prev, { type: 'player', message: selectedOption?.text || "Player Action" }]);
        } else {
            setBattleLog(prev => [...prev, { type: 'player', message: playerInput }]);
        }

        setBattleLog(prev => [...prev, {
            type: 'loading',
            messages: ['Leader is thinking...', 'Analyzing strategy...', 'Predicting your move...', 'Consulting Pokedex...', 'Formulating counter-attack...']
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

            setBattleLog(prev => prev.filter(l => l.type !== 'loading'));

            const newMessages = [];
            if (data.playerNarrative) newMessages.push({ type: 'narrative', message: data.playerNarrative });
            if (data.leaderNarrative) newMessages.push({ type: 'narrative', message: data.leaderNarrative });
            queueMessages(newMessages);

            if (data.gameOver) {
                setBattleStatus('ended');
                const isWin = data.winner === data.challengerId;
                queueMessages([{ type: 'game_over', data: { type: isWin ? 'win' : 'loss', winner: data.winner } }]);
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

    if (loading) return <div className="min-h-screen bg-[#18181B] flex items-center justify-center text-white">Loading...</div>;

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
            <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[340px]' : 'lg:ml-0'} p-4 sm:p-8 flex flex-col items-center`}>
                <div className="max-w-6xl w-full space-y-6">

                    {/* Header Card */}
                    <div className="bg-[#202024] rounded-2xl p-6 relative overflow-hidden">

                        <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
                            <div className="w-24 h-24 rounded-full border-2 border-[#26272B] overflow-hidden bg-black">
                                <img src={gymData?.leaderImage || '/placeholder-leader.png'} alt={gymData?.leaderName} className="w-full h-full object-cover bg-[#202024]" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-xl font-semibold">{gymData?.gymName || 'Gym Name'}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mt-1">
                                    <span>By @{gymData?.leaderName}</span>
                                    <span>•</span>
                                    <span>{gymData.location ? `${gymData.location}${gymData.region ? `, ${gymData.region}` : ''}` : 'Leaders'}</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <span className="text-sm font-bold">Difficult</span>
                                        <div className="flex">{[1, 2, 3].map(i => <Zap key={i} size={12} fill="currentColor" />)}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span className="text-green-400 font-md">{gymData?.stats?.wins || 0} Wins</span>
                                        <span className="text-red-400 font-md">{gymData?.stats?.losses || 0} Losses</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                                    {gymData?.team?.map((poke, i) => poke && (
                                        <div
                                            key={i}
                                            className="w-12 h-12 cursor-pointer hover:scale-110 transition-transform"
                                            onClick={() => {
                                                playPokemonSound(poke.pokedexId);
                                                handleMentionClick(poke.name, true);
                                            }}
                                            title={`Click to mention @${poke.name}`}
                                        >
                                            <img
                                                src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId || 1}${battleStatus === 'idle' ? ".png" : ".gif"}`}
                                                onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId || 1}.png`}
                                                alt="poke"
                                                className={`w-full h-full object-contain transition-all duration-1000 ${battleStatus === 'idle' ? 'brightness-0 opacity-70' : 'brightness-100 opacity-100'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-900/50 to-purple-600/50 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-16 h-16">
                                    <img src={gymData?.badgeImage || '/placeholder-badge.png'} alt="Badge" className="w-full h-full object-contain drop-shadow-lg" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Badge Reward</h3>
                                    <p className="text-[10px] text-gray-400 max-w-[150px]">This Badge is an NFT and will be sent to your connected wallet upon victory!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

                        {/* Left: Battle Interface */}
                        <div className="lg:col-span-2 bg-[#202024] rounded-2xl overflow-hidden relative flex flex-col">
                            <div className="absolute inset-0 z-0 opacity-40">
                                <img src={gymData?.gymImage || '/placeholder-gym.png'} alt="Gym Background" className="w-full h-full object-cover" />
                            </div>

                            <div className="relative z-10 flex-1 flex flex-col p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <img src={BattlePokeball} className="w-10 h-10" alt="Battle" />
                                        <h2 className="font-bold text-xl">Battle Log</h2>
                                    </div>
                                    {gameOverState && !isGameOverModalOpen && (
                                        <button onClick={() => setIsGameOverModalOpen(true)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors">Show Result</button>
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
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <h3 className="font-bold text-white">{relevantPokemon.length === 1 ? `Command ${relevantPokemon[0].name}` : "Command your Team"}</h3>
                                                                        <div className="flex gap-2">
                                                                            {relevantPokemon.map((poke, i) => (
                                                                                <div key={i} className="w-17 h-17 cursor-pointer" onClick={() => playPokemonSound(poke.pokedexId)}>
                                                                                    <img src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId}.gif`} onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`} className="w-full h-full object-contain" alt={poke.name} />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm text-gray-400 mb-3">Select your action</p>
                                                                    <div className="space-y-2">
                                                                        {log.options.map((option) => (
                                                                            <button key={option.id} onClick={() => sendInstruction(option.id)} className="w-full text-left bg-[#3E3D3E] hover:bg-[#4E4D4E] p-4 rounded-lg transition-all flex items-center gap-3 group">
                                                                                <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center text-xs text-gray-400 group-hover:border-white group-hover:text-white flex-shrink-0">{option.id}</div>
                                                                                <span className="text-sm text-gray-200 group-hover:text-white w-full">
                                                                                    <MessageRenderer text={option.text} userTeam={userTeam} gymTeam={gymData?.team} onPlaySound={playPokemonSound} />
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        }
                                                        return null;
                                                    }

                                                    if (log.type === 'loading') return <LoadingLog key={index} messages={log.messages} />;

                                                    let containerStyle = 'bg-gray-800/40';
                                                    if (log.type === 'player') containerStyle = 'bg-emerald-500/10 ml-auto max-w-[80%]';
                                                    else if (log.type === 'narrative') containerStyle = 'bg-black/60';
                                                    else if (log.type === 'referee') containerStyle = 'bg-yellow-500/5 text-amber-100';

                                                    return (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                                            className={`p-4 rounded-xl backdrop-blur-md ${containerStyle}`}
                                                        >
                                                            <p className="text-sm md:text-base">
                                                                <MessageRenderer text={log.message} userTeam={userTeam} gymTeam={gymData?.team} onPlaySound={playPokemonSound} />
                                                            </p>
                                                        </motion.div>
                                                    );
                                                })}

                                                {waitingForInteraction && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center w-full py-2">
                                                        <button onClick={handleContinue} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-all animate-pulse cursor-pointer">
                                                            <span>Click to continue</span>
                                                            <ArrowLeft className="-rotate-90" size={12} />
                                                        </button>
                                                    </motion.div>
                                                )}

                                                {!battleLog.some(l => l.type === 'options') && !sendingTurn && battleStatus === 'active' && messageQueue.length === 0 && !isProcessingQueue && !waitingForInteraction && (
                                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 backdrop-blur-md rounded-xl p-6 mt-4 relative">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className=" text-[#fafafa] font-semibold">{relevantPokemon.length === 1 ? `Emergency instruction for ${relevantPokemon[0].name}` : "Command your Team"}</h3>
                                                            <div className="flex gap-2">
                                                                {relevantPokemon.map((poke, i) => (
                                                                    <div key={i} className="w-17 h-17 cursor-pointer hover:scale-110 transition-transform"
                                                                        onClick={() => {
                                                                            playPokemonSound(poke.pokedexId);
                                                                            handleMentionClick(poke.name);
                                                                        }}
                                                                        title={`Click to mention @${poke.name}`}
                                                                    >
                                                                        <img src={`https://sweet-cendol-f4d090.netlify.app/${poke.pokedexId}.gif`} onError={(e) => e.target.src = `http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`} className="w-full h-full object-contain" title={poke.name} alt={poke.name} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-3"></p>

                                                        <div className="relative w-full">
                                                            {showMentions && (
                                                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#27272A] rounded-lg shadow-xl overflow-hidden z-50">
                                                                    <SimpleBar style={{ maxHeight: '192px' }}>
                                                                        {getMentionList().length > 0 ? (
                                                                            getMentionList().map((poke, idx) => (
                                                                                <button
                                                                                    key={idx}
                                                                                    onClick={() => addMention(poke)}
                                                                                    className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${idx === mentionCursorIndex ? 'bg-[#3F3F46]' : 'hover:bg-[#3F3F46]'}`}
                                                                                >
                                                                                    <img src={`http://steady-gaufre-1267b2.netlify.app/${poke.pokedexId}.png`} className="w-6 h-6 object-contain" alt="" />
                                                                                    <span className={`text-sm font-medium ${poke.isEnemy ? 'text-red-400' : 'text-green-200'}`}>{poke.name.replace(/ /g, '_')}</span>
                                                                                    {poke.isEnemy && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded ml-auto">Enemy</span>}
                                                                                </button>
                                                                            ))
                                                                        ) : <div className="px-4 py-2 text-sm text-gray-500">No Pokemon found</div>}
                                                                    </SimpleBar>
                                                                </div>
                                                            )}

                                                            <div className="relative h-24 w-full bg-[#18181B]/80 rounded-lg overflow-hidden">
                                                                <div ref={backdropRef} className="absolute inset-0 p-3 whitespace-pre-wrap break-words overflow-hidden text-sm font-sans pointer-events-none" aria-hidden="true">
                                                                    {renderHighlightedText()}
                                                                    <span className="opacity-0">.</span>
                                                                </div>
                                                                <textarea
                                                                    ref={textareaRef}
                                                                    value={playerInput}
                                                                    onChange={handleInputChange}
                                                                    onKeyDown={handleKeyDown}
                                                                    onScroll={handleScroll}
                                                                    placeholder={`Describe your instruction (Type @ to mention)`}
                                                                    className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white p-3 text-sm font-sans resize-none focus:outline-none placeholder-gray-500"
                                                                    style={{ color: 'transparent' }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end mt-3">
                                                            <button onClick={() => sendInstruction()} className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-200 transition-colors text-sm">Send</button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                            <div ref={messagesEndRef} />
                                        </SimpleBar>
                                    </div>
                                )}

                                <AnimatePresence>
                                    {gameOverState && isGameOverModalOpen && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-[#18181B] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden">
                                                <button onClick={() => setIsGameOverModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-20">
                                                    <div className="relative w-6 h-6">
                                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current rotate-45 transform -translate-y-1/2"></div>
                                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current -rotate-45 transform -translate-y-1/2"></div>
                                                    </div>
                                                </button>
                                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b ${gameOverState.type === 'win' ? 'from-yellow-500/20' : 'from-red-500/20'} to-transparent opacity-50 blur-3xl pointer-events-none`} />
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <div className="mb-6 relative">
                                                        {gameOverState.type === 'win' ? (
                                                            <>
                                                                <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full" />
                                                                <motion.div className="w-32 h-32 relative z-10"><img src={gymData?.badgeImage || '/placeholder-badge.png'} alt="Badge" className="w-full h-full object-contain drop-shadow-2xl" /></motion.div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                                                                <Shield size={80} className="text-red-500 relative z-10 drop-shadow-lg" />
                                                            </>
                                                        )}
                                                    </div>
                                                    <h2 className={`text-4xl font-black tracking-tight mb-3 ${gameOverState.type === 'win' ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600' : 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700'}`}>{gameOverState.type === 'win' ? 'VICTORY!' : 'DEFEAT'}</h2>
                                                    <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-[260px]">{gameOverState.type === 'win' ? "Incredible! You've defeated the Gym Leader and claimed the Badge." : "Your team was overwhelmed. Analyze the strategy and challenge again."}</p>
                                                    <div className="flex flex-col gap-3 w-full">
                                                        <button onClick={() => window.location.reload()} className={`w-full py-3.5 rounded-xl font-bold text-black transition-all transform active:scale-95 shadow-lg ${gameOverState.type === 'win' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 shadow-yellow-900/20' : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-900/20'}`}>Rematch</button>
                                                        <button onClick={() => navigate('/battle')} className="w-full py-3.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-medium transition-colors">Back to Gyms</button>
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
                            <div className="bg-[#202024] rounded-2xl p-6 flex-1">
                                <h3 className="font-bold text-lg mb-4">Gym Description</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{gymData?.description || 'No description available.'}</p>
                            </div>
                            <div className="bg-[#202024] rounded-2xl p-6">
                                <h3 className="font-bold text-lg mb-4">Opponent's Team</h3>
                                <div className="flex gap-4 justify-center relative">
                                    {gymData?.team?.map((card, i) => {
                                        const isHidden = battleStatus === 'idle';
                                        return card ? (
                                            <div key={i} className="group relative w-20 cursor-pointer"
                                                onMouseEnter={() => !isHidden && setHoveredCard(card)}
                                                onMouseLeave={() => setHoveredCard(null)}
                                                onClick={() => {
                                                    if (!isHidden) {
                                                        playPokemonSound(card.pokedexId);
                                                        handleMentionClick(card.name, true);
                                                    }
                                                }}
                                                title={!isHidden ? `Click to mention @${card.name}` : ''}
                                            >
                                                <img src={isHidden ? BattleCardBack : (card.original ? `${card.original}/high.png` : card.image)} alt={isHidden ? "Hidden Card" : card.name} className={`w-full h-full object-cover rounded-lg transition-transform ${!isHidden ? 'group-hover:scale-105' : ''}`} style={{ imageRendering: 'auto' }} onError={(e) => { if (!isHidden && e.target.src !== card.image) e.target.src = card.image; else if (!isHidden) e.target.src = `http://steady-gaufre-1267b2.netlify.app/${card.pokedexId}.png`; }} />
                                            </div>
                                        ) : <div key={i} className="w-20 bg-[#18181B] rounded-lg flex items-center justify-center"><img src={BattleCardBack} className="w-10 opacity-20" alt="Empty Slot" /></div>;
                                    })}
                                    <AnimatePresence>
                                        {hoveredCard && (
                                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[100] pointer-events-none origin-bottom" style={{ width: '400px', maxWidth: '90vw' }}>
                                                <div className="relative w-full rounded-2xl shadow-2xl bg-[#18181B] p-2">
                                                    <div className="relative w-full overflow-hidden rounded-xl bg-[#131316]"><img src={hoveredCard.image} alt={hoveredCard.name} className="w-full h-full object-contain" onError={(e) => e.target.src = hoveredCard.original ? `${hoveredCard.original}/high.png` : `http://steady-gaufre-1267b2.netlify.app/${hoveredCard.pokedexId}.png`} /></div>
                                                    <div className="mt-3 px-1 pb-1"><p className="text-white font-bold text-lg leading-tight">{hoveredCard.name}</p><p className="text-gray-500 text-sm">{hoveredCard.fullName?.split('#')[0] || hoveredCard.name}</p></div>
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