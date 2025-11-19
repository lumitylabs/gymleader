import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Save, Upload, Wand2, ArrowLeft, Menu as MenuIcon, ImagePlus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/ui/general/Sidebar";

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
    badgeId: "boulder", // Placeholder ID
    badgeImage: "",
    leaderName: "",
    leaderImage: "",
    gymImage: "",
    team: [null, null, null], // 3 slots
    strategy: "",
    twitter: ""
  });

  const [generating, setGenerating] = useState({
    gym: false,
    leader: false,
    badge: false
  });

  const fileInputRef = React.useRef(null);
  const [uploadType, setUploadType] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Close menus when clicking outside
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
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      };
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image: " + error.message);
      setUploading(false);
    }
  };

  const handleGenerateImage = async (type) => {
    if (!currentUser) return;

    if (!formData.gymName?.trim() || !formData.description?.trim()) {
      alert("Please enter a Gym Name and Description before generating images.");
      return;
    }

    if (type === 'leader' && !formData.leaderName?.trim()) {
      alert("Please enter a Leader Name before generating a leader image.");
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
        body: JSON.stringify({
          name,
          description,
          category
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      // Update state with new image URL
      if (type === 'gym') setFormData(prev => ({ ...prev, gymImage: data.imageUrl }));
      if (type === 'leader') setFormData(prev => ({ ...prev, leaderImage: data.imageUrl }));
      if (type === 'badge') setFormData(prev => ({ ...prev, badgeImage: data.imageUrl }));

    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate image: " + error.message);
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  };

  // Load data from Firebase Realtime Database
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
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/api/update-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          gymData: formData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save gym data');
      }

      // Success feedback (could be a toast)
      // alert("Gym saved successfully!"); 
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMobileNavClick = () => { if (window.innerWidth < 1024) setIsNavbarOpen(false); };

  const renderImageMenu = (type) => (
    <div className="absolute bottom-0 left-full ml-2 z-30 bg-[#18181B] border border-[#26272B] rounded-xl p-1 flex flex-col gap-1 shadow-xl min-w-[160px]">
        <button 
            onClick={() => handleGenerateImage(type)}
            disabled={generating[type]}
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-[#26272B] hover:text-white rounded-lg transition-colors w-full text-left disabled:opacity-50"
        >
            {generating[type] ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"/> : <Wand2 size={14} />}
            {generating[type] ? "Generating..." : "Generate image"}
        </button>
        <button 
            onClick={() => handleUploadClick(type)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-[#26272B] hover:text-white rounded-lg transition-colors w-full text-left"
        >
            <ImageIcon size={14} />
            Upload Image
        </button>
    </div>
  );

  const isImageLoading = (type) => generating[type] || (uploading && uploadType === type);

  return (
    <div className="bg-[#18181B] min-h-screen font-inter text-white flex">
      <Sidebar isOpen={isNavbarOpen} setIsOpen={setIsNavbarOpen} handleMobileNavClick={handleMobileNavClick} />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*" 
      />

      <button
          onClick={() => setIsNavbarOpen(true)}
          className={`fixed top-5 left-2 z-20 p-2 rounded-full cursor-pointer hover:bg-[#1F1F22] transition-opacity ${isNavbarOpen && window.innerWidth < 1024 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="Open navigation menu"
        >
          <MenuIcon color="#A2A2AB" size={23} />
      </button>

      <main className={`flex-1 transition-all duration-300 ease-in-out ${isNavbarOpen ? 'lg:ml-[340px]' : 'lg:ml-0'} p-4 sm:p-8`}>
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#26272B] rounded-full transition-colors lg:hidden">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-white">My Gym</h1>
             </div>
             {error && <span className="text-red-400 text-sm">{error}</span>}
          </div>

          {/* Gym Info Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gym Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Inputs */}
                <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Gym Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="gymName"
                                value={formData.gymName}
                                onChange={handleInputChange}
                                placeholder="e.g. Pewter City Gym"
                                className="w-full bg-[#202024] border border-[#26272B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                maxLength={20}
                            />
                            <span className="absolute right-3 bottom-3 text-xs text-gray-600">{formData.gymName.length}/20</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Description</label>
                        <div className="relative">
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe what your gym is like. Remember that the environment of your gym will be used during battles."
                                className="w-full bg-[#202024] border border-[#26272B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none h-32"
                                maxLength={250}
                            />
                            <span className="absolute right-3 bottom-3 text-xs text-gray-600">{formData.description.length}/250</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Image */}
                <div className="relative group aspect-video md:aspect-auto md:h-full edit-menu-container">
                     <div className="absolute inset-0 rounded-xl overflow-hidden border border-[#26272B] bg-[#202024]">
                         {isImageLoading('gym') ? (
                            <div className="w-full h-full flex items-center justify-center text-[#26272B]">
                                <Loader2 size={48} className="animate-spin text-blue-500" />
                            </div>
                         ) : formData.gymImage ? (
                            <img 
                                src={formData.gymImage} 
                                alt="Gym Environment" 
                                className="w-full h-full object-cover"
                            />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#26272B]">
                                <ImagePlus size={48} />
                            </div>
                         )}
                     </div>
                     
                     <div className="absolute bottom-2 right-2 z-20">
                        <button 
                            onClick={() => setActiveMenu(activeMenu === 'gym' ? null : 'gym')}
                            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg"
                        >
                            <Edit2 size={14} />
                        </button>
                        {activeMenu === 'gym' && renderImageMenu('gym')}
                     </div>
                </div>
            </div>
          </section>

          <hr className="border-[#26272B]" />

          {/* Badge Section */}
          <section className="space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Badge</h2>
             <div className="flex items-start gap-6">
                <div className="relative w-32 h-32 edit-menu-container">
                    <div className="absolute inset-0 bg-[#202024] rounded-2xl border border-[#26272B] overflow-hidden flex items-center justify-center">
                        {isImageLoading('badge') ? (
                            <div className="text-[#26272B]">
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                            </div>
                        ) : formData.badgeImage ? (
                            <img 
                                src={formData.badgeImage} 
                                alt="Badge" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-[#26272B]">
                                <ImagePlus size={32} />
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute bottom-2 right-2 z-20">
                        <button 
                            onClick={() => setActiveMenu(activeMenu === 'badge' ? null : 'badge')}
                            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg"
                        >
                            <Edit2 size={14} />
                        </button>
                        {activeMenu === 'badge' && renderImageMenu('badge')}
                    </div>
                </div>
             </div>
          </section>

          <hr className="border-[#26272B]" />

          {/* Leader Section */}
          <section className="space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Leader</h2>
             <div className="flex flex-col-reverse md:flex-row gap-6 items-start">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-sm text-gray-400">Leader Name</label>
                    <div className="relative">
                        <input
                            type="text"
                            name="leaderName"
                            value={formData.leaderName}
                            onChange={handleInputChange}
                            placeholder="e.g. Brock"
                            className="w-full bg-[#202024] border border-[#26272B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            maxLength={20}
                        />
                        <span className="absolute right-3 bottom-3 text-xs text-gray-600">{formData.leaderName.length}/20</span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <label className="text-sm text-gray-400">Twitter / X Handle</label>
                         <div className="relative">
                            <input
                                type="text"
                                name="twitter"
                                value={formData.twitter || ''}
                                onChange={handleInputChange}
                                placeholder="@user"
                                className="w-full bg-[#202024] border border-[#26272B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 edit-menu-container">
                    <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-[#26272B] bg-[#202024] flex items-center justify-center">
                        {isImageLoading('leader') ? (
                            <div className="text-[#26272B]">
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                            </div>
                        ) : formData.leaderImage ? (
                            <img 
                                src={formData.leaderImage} 
                                alt="Leader" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-[#26272B]">
                                <ImagePlus size={32} />
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-2 right-2 z-20">
                        <button 
                            onClick={() => setActiveMenu(activeMenu === 'leader' ? null : 'leader')}
                            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg"
                        >
                            <Edit2 size={14} />
                        </button>
                        {activeMenu === 'leader' && renderImageMenu('leader')}
                    </div>
                </div>
             </div>
          </section>

          <hr className="border-[#26272B]" />

          {/* Team Section */}
          <section className="space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Team</h2>
             <p className="text-xs text-gray-500">Drag three Pokémon card from your collection</p>
             
             <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                    <div 
                        key={index} 
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const cardData = e.dataTransfer.getData("application/json");
                            if (cardData) {
                                try {
                                    const card = JSON.parse(cardData);
                                    
                                    // Check for duplicates
                                    const isDuplicate = formData.team.some(existingCard => 
                                        existingCard && existingCard.token_address === card.token_address
                                    );

                                    if (isDuplicate) {
                                        alert("This Pokémon is already in your team.");
                                        return;
                                    }

                                    setFormData(prev => {
                                        const newTeam = [...prev.team];
                                        newTeam[index] = card;
                                        return { ...prev, team: newTeam };
                                    });
                                } catch (err) {
                                    console.error("Failed to parse dropped card", err);
                                }
                            }
                        }}
                        className="aspect-[3/4] bg-[#202024] border-2 border-dashed border-[#26272B] rounded-xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:border-gray-500 transition-colors cursor-pointer group relative overflow-hidden"
                    >
                        {formData.team[index] ? (
                            <>
                                <img 
                                    src={formData.team[index].image} 
                                    alt={formData.team[index].name} 
                                    className="h-full w-auto max-w-none"
                                />
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFormData(prev => {
                                            const newTeam = [...prev.team];
                                            newTeam[index] = null;
                                            return { ...prev, team: newTeam };
                                        });
                                    }}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                >
                                    <div className="w-3 h-3 flex items-center justify-center">x</div>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded-full bg-[#26272B] flex items-center justify-center group-hover:bg-[#303036] transition-colors">
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-500"></div>
                                </div>
                                <span className="text-[10px] text-center px-2">Choose a Pokémon<br/>drag it here</span>
                            </>
                        )}
                    </div>
                ))}
             </div>
          </section>

          <hr className="border-[#26272B]" />

          {/* Strategy Section */}
          <section className="space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Strategy</h2>
             <div className="relative">
                <textarea
                    name="strategy"
                    value={formData.strategy}
                    onChange={handleInputChange}
                    placeholder="Describe your strategy for your Pokémon team"
                    className="w-full bg-[#202024] border border-[#26272B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none h-40"
                    maxLength={400}
                />
                <span className="absolute right-3 bottom-3 text-xs text-gray-600">{formData.strategy.length}/400</span>
             </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-4 pb-20">
             <button 
                onClick={handleSave}
                disabled={saving}
                className={`bg-white text-black font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                {saving ? (
                    <>Saving...</>
                ) : (
                    <>Save</>
                )}
             </button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Gym;
