import React from "react";
import { FaBars, FaCog, FaUsers } from "react-icons/fa";
import { GoSignOut } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

export default function Topbar({ setSidebarOpen }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro que deseas salir del panel?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#cc6200',
      cancelButtonColor: '#2c4b8b',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };
  return (
    <header className="flex items-center h-16 bg-white shadow px-6 z-20 relative">
      <button
        className="md:hidden mr-4 text-[#2c4b8b] focus:outline-none"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Abrir menú"
      >
        <FaBars size={24} />
      </button>
      <img src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/Je_logo-01.png" alt="Logo" className="h-10 mr-4 hidden md:block" />
      <span className="text-xl font-bold text-[#2c4b8b]">Panel cupos</span>
      <div className="ml-auto flex items-center gap-2 relative">
        <button className="text-red-600 hover:text-red-800" onClick={handleLogout}>
          <GoSignOut className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
