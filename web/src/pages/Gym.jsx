import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, ImagePlus, PenLine, ImageUp, X, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";
import cardsmenu_icon from "../assets/cardsmenu_icon.svg";
import empty_pokemon from "../assets/empty_pokemon.png";

import "simplebar-react/dist/simplebar.min.css";
import SimpleBar from 'simplebar-react';

function Gym() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isNavbarOpen, setIsNavbarOpen] = useState(window.innerWidth >= 1024);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    gymName: "",
    description: "",
    badgeId: "boulder",
    badgeImage: "",
    leaderName: "",
    leaderImage: "",
    gymImage: "",
    team: [null, null, null],
    strategy: "",
    twitter: ""
  });

  const [generating, setGenerating] = useState({
    gym: false,
    leader: false,
    badge: false
  });

  const fileInputRef = useRef(null);
  const [uploadType, setUploadType] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Validation Logic
  const getMissingFields = () => {
    const missing = [];
    if (!formData.gymName.trim()) missing.push("Gym Name");
    if (!formData.description.trim()) missing.push("Description");
    if (!formData.leaderName.trim()) missing.push("Leader Name");
    if (!formData.strategy.trim()) missing.push("Strategy");

    if (!formData.gymImage) missing.push("Gym Image");
    if (!formData.leaderImage) missing.push("Leader Image");
    if (!formData.badgeImage) missing.push("Badge Image");

    const teamCount = formData.team.filter(p => p !== null).length;
    if (teamCount < 3) missing.push(`Team (${teamCount}/3 Pokemon)`);

    return missing;
  };

  const missingFields = getMissingFields();
  const isSaveable = missingFields.length === 0;

  const tooltipMessage = (
    <div className="text-sm">
      <span className="font-semibold text-xs text-[#FAFAFA]">Missing required fields:</span>
      <ul className="list-disc list-inside text-xs text-left text-[#D0D0D0] mt-2 space-y-1">
        {missingFields.map(field => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </div>
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenu && !event.target.closest('.edit-menu-container')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const handleUploadClick = (type) => {
    setUploadType(type);
    setActiveMenu(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadType) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        if (uploadType === 'gym') setFormData(prev => ({ ...prev, gymImage: data.imageUrl }));
        if (uploadType === 'leader') setFormData(prev => ({ ...prev, leaderImage: data.imageUrl }));
        if (uploadType === 'badge') setFormData(prev => ({ ...prev, badgeImage: data.imageUrl }));
        setUploading(false);
        setUploadType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image: " + error.message);
      setUploading(false);
    }
  };

  const handleGenerateImage = async (type) => {
    if (!currentUser) return;
    if (!formData.gymName?.trim() || !formData.description?.trim()) {
      toast.error("Please enter a Gym Name and Description before generating images.");
      return;
    }
    if (type === 'leader' && !formData.leaderName?.trim()) {
      toast.error("Please enter a Leader Name before generating a leader image.");
      return;
    }
    setGenerating(prev => ({ ...prev, [type]: true }));
    setActiveMenu(null);
    try {
      let prompt = "";
      let name = "";
      let description = "";
      let category = "";
      if (type === 'gym') {
        name = formData.gymName;
        description = formData.description;
        category = "Pokemon Gym Environment, detailed background, atmospheric";
      } else if (type === 'leader') {
        name = formData.leaderName;
        description = "A Pokemon Gym Leader character portrait, anime style";
        category = "Character Portrait";
      } else if (type === 'badge') {
        name = formData.gymName + " Badge";
        description = "A shiny metal Pokemon Gym Badge, simple icon design, vector style";
        category = "Badge Icon";
      }
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      if (type === 'gym') setFormData(prev => ({ ...prev, gymImage: data.imageUrl }));
      if (type === 'leader') setFormData(prev => ({ ...prev, leaderImage: data.imageUrl }));
      if (type === 'badge') setFormData(prev => ({ ...prev, badgeImage: data.imageUrl }));
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate image: " + error.message);
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const gymRef = ref(db, `users/${currentUser.uid}/gym`);
    const unsubscribe = onValue(gymRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data,
          team: data.team && data.team.length ? data.team : [null, null, null]
        }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!isSaveable) {
      toast.error("Please fill all required fields before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/update-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, gymData: formData })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save gym data');
      toast.success("Gym saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  const renderImageMenu = (type) => (
    <div className="absolute bottom-3 left-full ml-2 z-30 bg-[#202024] rounded-xl p-1 flex flex-col gap-1 shadow-xl min-w-[200px]">
      <button
        onClick={() => handleGenerateImage(type)}
        disabled={generating[type]}
        className="flex items-center justify-between px-3 py-3 text-sm text-[#FAFAFA] hover:bg-[#2C2C30] rounded-lg transition-colors w-full disabled:opacity-50 cursor-pointer"
      >
        <span>{generating[type] ? "Generating..." : "Generate image"}</span>
        {generating[type] ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Wand2 size={14} />}
      </button>
      <button
        onClick={() => handleUploadClick(type)}
        className="flex items-center justify-between px-3 py-3 text-sm text-[#FAFAFA] hover:bg-[#2C2C30] rounded-lg transition-colors w-full cursor-pointer"
      >
        <span>Upload image</span>
        <ImageUp size={14} />
      </button>
    </div>
  );

  const isImageLoading = (type) => generating[type] || (uploading && uploadType === type);

  // ESTILO 1: Para imagens quadradas (Gym e Badge) - Usa valores negativos para sair da borda
  const editButtonStyle = "absolute -bottom-3 -right-3 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg cursor-pointer";

  // ESTILO 2 (CORREÇÃO): Para o Leader (Círculo) - Usa 'bottom-0 right-0' para "abraçar" a borda redonda
  const leaderEditButtonStyle = "absolute bottom-0 right-0 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg cursor-pointer";

  return (
    <div className="bg-[#18181B] h-screen w-full font-inter text-white flex overflow-hidden">

      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />

      <button
        onClick={() => setIsNavbarOpen(true)}
        className={`fixed top-5 left-2 z-20 p-2 rounded-full hover:bg-black/40 transition-all cursor-pointer ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <img src={cardsmenu_icon} className="h-6.5 w-6.5" alt="Menu" />
      </button>

      <div
        className={`hidden lg:block flex-shrink-0 bg-transparent transition-[width] duration-300 ease-in-out h-full ${isNavbarOpen ? 'w-[260px]' : 'w-0'}`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0 h-full relative flex flex-col">
        <SimpleBar style={{ height: '100%' }} className="w-full login-page-scrollbar">
          <main className="p-4 sm:p-8 w-full min-h-full">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">

              <div className="flex items-center justify-between pl-12 lg:pl-0 pt-1.5 lg:pt-0">
                <h1 className="text-lg font-semibold text-[#FAFAFA]">My Gym</h1>
                {error && <span className="text-red-400 text-sm">{error}</span>}
              </div>

              {/* Gym Info Section */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#FAFAFA]">Gym Name</label>
                    <div>
                      <input type="text" name="gymName" value={formData.gymName} onChange={handleInputChange} placeholder="e.g. Pewter City Gym" className="w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#FAFAFA] transition-colors placeholder:text-[#9DA3AE]" maxLength={20} />
                      <div className="w-full flex justify-end mt-1.5"><div className="text-xs text-[#767786] select-none">{formData.gymName.length}/20</div></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#FAFAFA]">Description</label>
                    <div>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe what your gym is like. Remember that the environment of your gym will be used during battles." className="w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#FAFAFA] transition-colors resize-none h-32 placeholder:text-[#767786]" maxLength={250} />
                      <div className="w-full flex justify-end mt-1"><div className="text-xs text-[#767786] select-none">{formData.description.length}/250</div></div>
                    </div>
                  </div>
                </div>

                <div className="relative group w-full max-w-[200px] max-h-[260px] md:mt-5 md:max-w-none aspect-square edit-menu-container">
                  <div className="absolute inset-0 rounded-xl overflow-hidden border-0.5 border-[#000] bg-[#202024]">
                    {isImageLoading('gym') ? <div className="w-full h-full flex items-center justify-center text-[#26272B]"><LoaderCircle size={48} className="animate-spin text-blue-500" /></div> : formData.gymImage ? <img src={formData.gymImage} alt="Gym Environment" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#26272B]"><ImagePlus size={48} /></div>}
                  </div>
                  {/* Usa o estilo padrão (quadrado) */}
                  <button onClick={() => setActiveMenu(activeMenu === 'gym' ? null : 'gym')} className={editButtonStyle}><PenLine size={20} /></button>
                  {activeMenu === 'gym' && renderImageMenu('gym')}
                </div>
              </section>

              {/* Badge Section */}
              <section className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#FAFAFA] block">Badge</label>
                <div className="flex items-start gap-6">
                  <div className="relative w-32 h-32 edit-menu-container">
                    <div className="absolute inset-0 bg-[#202024] rounded-2xl border-0.5 border-[#000] overflow-hidden flex items-center justify-center">
                      {isImageLoading('badge') ? <div className="text-[#26272B]"><LoaderCircle size={32} className="animate-spin text-blue-500" /></div> : formData.badgeImage ? <img src={formData.badgeImage} alt="Badge" className="w-full h-full object-cover" /> : <div className="text-[#26272B]"><ImagePlus size={32} /></div>}
                    </div>
                    {/* Usa o estilo padrão (quadrado) */}
                    <button onClick={() => setActiveMenu(activeMenu === 'badge' ? null : 'badge')} className={editButtonStyle}><PenLine size={20} /></button>
                    {activeMenu === 'badge' && renderImageMenu('badge')}
                  </div>
                </div>
              </section>

              {/* Leader Section */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#FAFAFA]">Leader Name</label>
                    <div><input type="text" name="leaderName" value={formData.leaderName} onChange={handleInputChange} placeholder="e.g. Brock" className="w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#FAFAFA] transition-colors placeholder:text-[#9DA3AE]" maxLength={20} /><div className="w-full flex justify-end mt-1.5"><div className="text-xs text-[#767786] select-none">{formData.leaderName.length}/20</div></div></div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#FAFAFA]">𝕏 / Twitter</label>
                    <div><input type="text" name="twitter" value={formData.twitter || ''} maxLength={25} onChange={handleInputChange} placeholder="@username" className="w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-1 focus:ring-[#FAFAFA] transition-colors placeholder:text-[#9DA3AE]" /></div>
                  </div>
                </div>
                <div className="relative w-32 h-32 md:ml-15 md:mt-6 md:w-40 md:h-40 flex-shrink-0 edit-menu-container">
                  <div className="absolute inset-0 rounded-full overflow-hidden border-0.5 border-[#000] bg-[#202024] flex items-center justify-center">
                    {isImageLoading('leader') ? <div className="text-[#26272B]"><LoaderCircle size={32} className="animate-spin text-blue-500" /></div> : formData.leaderImage ? <img src={formData.leaderImage} alt="Leader" className="w-full h-full object-cover" /> : <div className="text-[#26272B]"><ImagePlus size={32} /></div>}
                  </div>
                  {/* Usa o estilo específico para líder (leaderEditButtonStyle) */}
                  <button onClick={() => setActiveMenu(activeMenu === 'leader' ? null : 'leader')} className={leaderEditButtonStyle}><PenLine size={20} /></button>
                  {activeMenu === 'leader' && renderImageMenu('leader')}
                </div>
              </section>

              {/* Team Section */}
              <section className="flex flex-col gap-1.5">
                <div className="flex flex-col"><label className="text-sm font-medium mt-6 text-[#FAFAFA]">Pokémon Team</label><p className="text-[0.80em] font-regular text-[#A29FA7]">Drag three pokémon cards from your collection.</p></div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {[0, 1, 2].map((index) => (
                    <div key={index} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={(e) => { e.preventDefault(); const cardData = e.dataTransfer.getData("application/json"); if (cardData) { try { const card = JSON.parse(cardData); const isDuplicate = formData.team.some(existingCard => existingCard && existingCard.token_address === card.token_address); if (isDuplicate) { toast.error("This Pokémon is already in your team."); return; } setFormData(prev => { const newTeam = [...prev.team]; newTeam[index] = card; return { ...prev, team: newTeam }; }); } catch (err) { console.error("Failed to parse dropped card", err); } } }} className="aspect-[3/4] border-1 md:border-2 border-dashed border-[#3C3C3C] rounded-xl flex flex-col items-center justify-center hover:border-gray-500 transition-colors cursor-pointer group relative overflow-hidden">
                      {formData.team[index] ? (<> <img src={formData.team[index].image} alt={formData.team[index].name} className="h-full w-auto max-w-none" /> <button onClick={(e) => { e.stopPropagation(); setFormData(prev => { const newTeam = [...prev.team]; newTeam[index] = null; return { ...prev, team: newTeam }; }); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors cursor-pointer" > <X color="#FAFAFA" size={15} /> </button> </>) : (<div className="flex flex-col items-center justify-center"> <img src={empty_pokemon} alt="empty_pokemon" className="w-16 h-16 md:h-24 md:w-24 lg:h-40 lg:w-40" /> <span className="text-xs leading-3 md:text-sm text-[#3C3C3C] text-center px-2 md:leading-4">Choose a <b>Pokémon</b><br /> <b>drag</b> it here</span> </div>)}
                    </div>
                  ))}
                </div>
              </section>

              {/* Strategy Section */}
              <section className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#FAFAFA] block">Strategy</label>
                <div><textarea name="strategy" value={formData.strategy} onChange={handleInputChange} placeholder="Describe your strategy for your Pokémon team" className="w-full text-sm bg-transparent border border-[#3F3F46] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#FAFAFA] transition-colors resize-none h-40 placeholder:text-[#767786]" maxLength={400} /><div className="w-full flex justify-end mt-1"><div className="text-xs text-[#767786] select-none">{formData.strategy.length}/400</div></div></div>
              </section>

              <div className="flex justify-end">
                <div className="relative group">
                  <button onClick={handleSave} disabled={!isSaveable || saving} className={`px-8 py-2 rounded-full transition-colors duration-300 min-w-[135px] select-none ${isSaveable ? 'bg-[#FAFAFA] text-[#131316] cursor-pointer hover:bg-[#E4E4E5]' : 'bg-[#89898A] text-[#161618]'} ${saving && 'opacity-70 cursor-wait'}`}>
                    {saving ? (<div className="flex items-center justify-center gap-2"><span>Saving</span><LoaderCircle className="animate-spin" size={18} /></div>) : ("Save")}
                  </button>
                  {!isSaveable && (<div className="absolute bottom-full right-0 mb-2 w-max max-w-xs bg-[#26272B] rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-[#303136] shadow-lg">{tooltipMessage}<svg className="absolute text-[#26272B] h-2 w-full left-0 top-full rotate-180" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,255 127.5,127.5 255,255" /></svg></div>)}
                </div>
              </div>

            </div>
          </main>
        </SimpleBar>
      </div>
    </div>
  );
}

export default Gym;