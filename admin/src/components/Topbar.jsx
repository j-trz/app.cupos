import React from "react";
import { FaBars, FaUserCircle } from "react-icons/fa";

export default function Topbar({ setSidebarOpen }) {
  return (
    <header className="flex items-center h-16 bg-white shadow px-6 z-20 relative">
      <button
        className="md:hidden mr-4 text-[#2c4b8b] focus:outline-none"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Abrir menú"
      >
        <FaBars size={24} />
      </button>
      <img src="/admin/img/icon.png" alt="Logo" className="h-10 mr-4 hidden md:block" />
      <span className="text-xl font-bold text-[#2c4b8b]">Panel Admin</span>
      <div className="ml-auto flex items-center gap-2">
        <FaUserCircle className="text-[#2c4b8b]" size={28} />
        <span className="text-[#2c4b8b] font-medium hidden sm:inline">Admin</span>
      </div>
    </header>
  );
}