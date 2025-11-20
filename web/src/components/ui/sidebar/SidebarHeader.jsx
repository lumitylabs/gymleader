import React from "react";
import { ChevronsLeft } from 'lucide-react';

export function SidebarHeader({ setIsOpen, navigate }) {
  return (
    <div className="p-5 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
         <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <span className="font-bold text-white">G</span>
         </div>
         <span className="font-bold text-white text-lg tracking-tight">Gym Leader</span>
      </div>
      <button 
        onClick={() => setIsOpen(false)} 
        className="text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-[#26272B]"
      >
        <ChevronsLeft color="#86868E" size={17}/>
      </button>
    </div>
  );
}
