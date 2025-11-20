import React from "react";
import { Wallet } from 'lucide-react';

export function SidebarNavigation({ navigate, location }) {
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: "Gym", path: "/gym", icon: <div className="w-5 h-5 border-2 border-current rounded-md" /> },
    { label: "Battle", path: "/battle", icon: <div className="w-5 h-5 border-2 border-current rounded-md rotate-45" /> },
    { label: "Badges", path: "/badges", icon: <div className="w-5 h-5 border-2 border-current rounded-full" /> },
    { label: "Wallets", path: "/wallets", icon: <Wallet size={20} /> },
  ];

  return (
    <div className="px-3 py-4 space-y-1">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive(item.path) 
              ? 'bg-[#26272B] text-white' 
              : 'text-gray-400 hover:text-white hover:bg-[#26272B]'
          }`}
        >
          {item.icon}
          <span className="font-medium text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
