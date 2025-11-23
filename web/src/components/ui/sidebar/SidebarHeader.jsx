import React from "react";
import logo from "../../../assets/logo.png";
import { ChevronsLeft } from 'lucide-react';

export function SidebarHeader({ setIsOpen, navigate }) {
  return (
    <div className="p-5 pb-1 flex items-center justify-between">

      <div className="flex items-center gap-[1px] cursor-pointer" onClick={() => navigate("/")}>
        <img src={logo} className="w-10 h-10" />
        <div className="flex flex-col font-mali text-white tracking-[-0.04em] font-medium">
          <span className="text-md font-bold leading-[1]">Gym</span>
          <span className="text-md font-light leading-[1]">Leader</span>
        </div>
      </div>
      <button
        onClick={() => setIsOpen(false)}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#1F1F22] transition duration-200 cursor-pointer"
      >
        <ChevronsLeft color="#86868E" size={17} />
      </button>
    </div>
  );
}
