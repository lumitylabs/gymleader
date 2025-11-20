import React from "react";
import { Search } from 'lucide-react';

export function SidebarSearch({ searchTerm, setSearchTerm }) {
  return (
    <div className="px-4 mb-2">
        <div className="bg-[#202024] flex items-center px-3 py-2 rounded-lg border border-[#26272B] focus-within:border-gray-600 transition-colors">
            <Search size={14} className="text-gray-500 mr-2"/>
            <input 
                type="text" 
                placeholder="Search" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-600"
            />
        </div>
    </div>
  );
}
