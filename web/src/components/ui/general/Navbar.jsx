import React from "react";
import logo from "../../../assets/logo.png";
import { Navigate } from "react-router-dom";
function Navbar() {
  return (
    <div className="flex items-center justify-between p-5 lg:px-10">
      <div className="flex justify-center items-center">
        <img src={logo} className="w-10 h-10" />
        <div className="flex flex-col font-mali text-white tracking-[-0.04em] font-medium">
          <span className="text-md font-bold leading-[1]">Gym</span>
          <span className="text-md font-light leading-[1]">Leader</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* 
          Botão "Discord" (Secundário)
        */}
        <a
          href="https://discord.com/channels/1174034150462861324/1444561443377909802"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-25 py-2 px-5 border-[#303136] border rounded-full text-white text-[0.92em] justify-center items-center cursor-pointer transition-all duration-200 active:scale-95 hover:bg-[#1F1F23] select-none"
        >
          Discord
        </a>

        {/* 
          Botão "Docs" (Primário)
          - A cor de hover foi alterada para bg-gray-200 para corresponder
            exatamente ao botão "Continue with MetaMask".
        */}
        <a
          href="https://github.com/lumitylabs/gymleader"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-30 py-2 px-5 bg-white text-[#131316] text-[0.92em] rounded-full justify-center items-center gap-2 cursor-pointer  transition-all active:scale-95 duration-200 hover:bg-[#E3E3E4] select-none"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}

export default Navbar;
