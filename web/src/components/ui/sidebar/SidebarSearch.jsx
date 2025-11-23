import React from "react";
import { Search } from 'lucide-react';

export function SidebarSearch({ searchTerm, setSearchTerm }) {
  return (
    <div className="px-5 mx-2">
      <div className="bg-[#202024] flex items-center px-3 py-2.5 rounded-xl">
        <Search color="#FAFAFA" size={16} className="mr-2" />
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex items-centertext-[0.90em] bg-transparent border-none outline-none text-sm text-white w-full placeholder-[#9DA3AE]"
        />
      </div>
    </div>
  );
}
