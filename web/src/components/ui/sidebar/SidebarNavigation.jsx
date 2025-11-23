import React from "react";
import { House, Swords, Gem } from 'lucide-react';

export function SidebarNavigation({ navigate, location }) {
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: "Battle", path: "/battle", icon: <Swords size={20} /> },
    { label: "Badges", path: "/badges", icon: <Gem size={20} /> },
  ];

  return (
    <div className="px-5 py-4 flex flex-col gap-2 text-[#817676]">
      {/* Gym Button - Special Style */}
      <button
        onClick={() => navigate('/gym')}
        className={`flex py-2.5 px-4 gap-3 bg-[#202024] w-32 items-center rounded-full text-[#FAFAFA] text-[0.90em] border-[1px] border-[#26272B] cursor-pointer hover:bg-[#3B3B41] transition-all active:scale-95 duration-200`}
      >
        <House color="#94949C" height={24} width={24} strokeWidth={1.5} />
        Gym
      </button>

      {/* Other Items */}
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          className={`flex items-center gap-3 p-3.5 text-[0.90em] rounded-lg transition-all duration-200 active:scale-95 cursor-pointer w-full ${isActive(item.path)
            ? 'bg-[#26272B] text-white'
            : 'text-white hover:bg-[#1F1F22] font-normal'
            }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
