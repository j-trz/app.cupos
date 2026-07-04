import React from "react";// eslint-disable-line no-unused-vars
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import SecurityLogin from "../components/SecurityLogin";// eslint-disable-line no-unused-vars

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const { syncApiAuth } = useAuth();

  const handleLoginSuccess = async ({ user }) => {
    try {
      const perfil = {
        id: user.id,
        email: user.email,
        role: user.role || 'agency_user',
        agency: user.agency || null,
        nombre: user.nombre || null,
        apellido: user.apellido || null,
        admin: user.admin || false,
      };

      // Sincronizar el contexto con el perfil del usuario
      syncApiAuth(perfil);

      console.log('✅ Perfil obtenido:', perfil);

      // Ejecutar callback de login si existe
      if (typeof onLogin === 'function') onLogin();

      // Navegar según el rol del usuario
      if (perfil.admin || perfil.role === 'admin') {
        navigate("/admin/disponibilidad"); // Panel admin
      } else {
        navigate("/admin/disponibilidad"); // Panel usuario
      }
    } catch (error) {
      console.error('Error en handleLoginSuccess:', error);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Columna izquierda: Formulario */}
      <div className="flex items-center justify-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-[#2c4b8b] rounded-full flex items-center justify-center ring-2 ring-[#2c4b8b]/10">
                <img
                  className="h-12 w-12 object-contain"
                  src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/Je_logo-02%20(1).png"
                  alt="Logo"
                />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#2c4b8b] leading-tight">Iniciar sesión</h2>
                <p className="mt-1 text-sm text-gray-600">Sistema de gestión de cupos</p>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-8">
            <div className="transform md:scale-110 origin-top-left">
              <SecurityLogin onLoginSuccess={handleLoginSuccess} fullPage={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha: Imagen */}
      <div className="hidden md:block relative">
        <img
          src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/embalaje-de-maletas-y-preparaciones-de-viaje.jpg"
          alt="Ilustración de inicio de sesión"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#808080]/40 to-black/40"></div>
      </div>
    </div>
  );
}