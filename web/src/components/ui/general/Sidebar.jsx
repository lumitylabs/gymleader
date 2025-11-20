import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';

// Firebase
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../firebase/config";
import { ref, onValue } from "firebase/database";

// Components
import { SidebarHeader } from "../sidebar/SidebarHeader";
import { SidebarNavigation } from "../sidebar/SidebarNavigation";
import { SidebarSearch } from "../sidebar/SidebarSearch";
import { SidebarCollection } from "../sidebar/SidebarCollection";
import { UserAccount } from "../sidebar/UserAccount";
import { CardPreview } from "../sidebar/CardPreview";

function Sidebar({ isOpen, setIsOpen, handleMobileNavClick }) {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Preview State
  const [previewCard, setPreviewCard] = useState(null);
  const [mouseY, setMouseY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handlers
  const handleCardHover = (card, event) => {
    if (isDragging) return;
    setPreviewCard(card);
    setMouseY(event.clientY);
  };

  const handleCardLeave = (cardLeft) => {
    setPreviewCard((currentCard) => {
      if (currentCard === cardLeft) {
        return null;
      }
      return currentCard;
    });
  };

  const handleDragStart = () => {
    setIsDragging(true);
    setPreviewCard(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Firebase Listener
  useEffect(() => {
    if (!currentUser) return;
    const collectionRef = ref(db, `users/${currentUser.uid}/collection`);
    const unsubscribe = onValue(collectionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const cardsArray = Object.values(data).sort((a, b) => b.lastUpdated - a.lastUpdated);
        setCards(cardsArray);
      } else {
        setCards([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Refresh Function
  const handleRefresh = async () => {
    if (!currentUser || syncing) return;
    setSyncing(true);
    try {
      const promise = fetch(import.meta.env.VITE_SERVER_URL + '/api/sync-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid })
      });

      toast.promise(promise, {
        loading: 'Syncing collection...',
        success: 'Collection synced successfully!',
        error: 'Failed to sync collection',
      });

      await promise;
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setSyncing(false);
    }
  };

  const variants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.nav
        animate={isOpen ? "open" : "closed"}
        variants={variants}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed top-0 left-0 w-[340px] h-screen bg-[#131316] border-r border-[#26272B] font-inter flex flex-col z-40 select-none shadow-2xl"
      >
        <AnimatePresence>
          {previewCard && !isDragging && <CardPreview key={previewCard.token_address + previewCard.cardId} card={previewCard} topPos={mouseY} />}
        </AnimatePresence>

        <SidebarHeader setIsOpen={setIsOpen} navigate={navigate} />
        
        <SidebarNavigation navigate={navigate} location={location} />
        
        <SidebarSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        
        <SidebarCollection 
          cards={filteredCards}
          loading={loading}
          syncing={syncing}
          handleRefresh={handleRefresh}
          handleCardHover={handleCardHover}
          handleCardLeave={handleCardLeave}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
        />
        
        <UserAccount />
      </motion.nav>
    </>
  );
}

export default Sidebar;