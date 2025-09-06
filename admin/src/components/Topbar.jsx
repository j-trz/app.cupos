import { useState, useEffect } from "react";
import { FaBars } from "react-icons/fa";
import { GoSignOut } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import AuthorizationService from '../services/authorizationService';
import NotificationDropdown from './NotificationDropdown';

export default function Topbar({ setSidebarOpen }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Cargar información del usuario al montar el componente
  useEffect(() => {
    loadUserInfo();
  }, []);

  /**
   * Cargar información del usuario actual
   */
  const loadUserInfo = async () => {
    try {
      const profile = await AuthorizationService.getCurrentUserProfile();
      if (profile) {
        // Priorizar el campo 'nombre' de la tabla profiles
        const displayName = profile.nombre || profile.full_name || profile.email?.split('@')[0] || "Usuario";
        setUserName(displayName);
      } else {
        setUserName("Usuario");
      }
    } catch (error) {
      console.error("Error loading user info:", error);
      setUserName("Usuario");
    } finally {
      setLoading(false);
    }
  };

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
      <img
        src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/Je_logo-01.png"
        alt="Logo"
        className="h-10 mr-4 hidden md:block"
      />
      <span className="text-xl font-bold text-[#2c4b8b]">Panel cupos</span>
      
      {/* Área central con saludo personalizado */}
      <div className="flex-1 flex justify-center items-center">
        {!loading && (
          <span className="text-lg text-gray-700 font-medium hidden lg:block">
            👋 Hola, <span className="text-[#2c4b8b]">{userName}</span>
          </span>
        )}
        {loading && (
          <div className="hidden lg:block">
            <div className="animate-pulse flex items-center space-x-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        )}
      </div>

      {/* Área derecha con notificaciones y logout */}
      <div className="ml-auto flex items-center gap-3 relative">
        {/* Componente de notificaciones */}
        <NotificationDropdown />
        
        {/* Saludo compacto para pantallas medianas */}
        {!loading && (
          <span className="text-sm text-gray-600 hidden md:block lg:hidden">
            Hola, {userName}
          </span>
        )}
        
        {/* Botón de logout */}
        <button
          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <GoSignOut className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
