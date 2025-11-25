import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from "../../../contexts/AuthContext";
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import Avatar from "../../../assets/avatar.png";

export function UserAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const menuRef = useRef(null);

  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { publicKey, connected: isSolanaConnected } = useWallet();
  const solanaAddress = publicKey ? publicKey.toBase58() : null;

  const formatAddress = (addr) => addr ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : "Not Connected";

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="pl-4 pr-6 py-2 relative" ref={menuRef}>
      <div className="border-t border-[#26272B] mb-2"></div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-[60px] left-4 right-6 bg-[#18181B] rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 bg-[#18181B] border-b border-[#26272B]">
              <p className="text-[10px] text-gray-500 font-bold mb-2">Active Wallets</p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${isEvmConnected ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'bg-gray-600'}`}></div>
                    <span>Beezie</span>
                  </div>
                  <span className="font-mono text-gray-500 text-[10px]">
                    {isEvmConnected ? formatAddress(evmAddress) : "Not Connected"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSolanaConnected ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'bg-gray-600'}`}></div>
                    <span>Collector</span>
                  </div>
                  <span className="font-mono text-gray-500 text-[10px]">
                    {isSolanaConnected ? formatAddress(solanaAddress) : "Not Connected"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={() => navigate('/wallets')}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-gray-200 rounded-lg hover:bg-[#26272B] transition-colors cursor-pointer"
              >
                <span>Wallets</span>
                <Wallet size={16} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-gray-200 rounded-lg hover:bg-[#26272B] transition-colors cursor-pointer"
              >
                <span>Logout</span>
                <LogOut size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full p-2 px-3 rounded-xl transition-colors cursor-pointer ${!isOpen ? 'hover:bg-[#202024] group' : ''}`}
      >
        <div className="relative">
          <img
            className={`w-10 h-10 rounded-full object-cover border border-[#26272B] transition-colors ${!isOpen ? 'group-hover:border-gray-500' : ''}`}
            src={Avatar}
            alt="User"
          />
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#131316] rounded-full ${isEvmConnected || isSolanaConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        </div>

        <div className="flex flex-col items-start items-center justify-center flex-grow min-w-0">
          <span className="font-inter font-medium text-sm text-white truncate w-full text-left leading-none">
            {currentUser?.displayName || "Trainer"}
          </span>
          <span className="font-inter text-xs text-gray-500 truncate w-full text-left">
            {currentUser?.email}
          </span>
        </div>

        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
