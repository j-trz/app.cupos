import React from "react";// eslint-disable-line no-unused-vars
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';
import SecurityLogin from "../components/SecurityLogin";// eslint-disable-line no-unused-vars

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const handleLoginSuccess = async ({ user }) => {
    try {
      // Obtener perfil del usuario desde la base de datos
      const { data: perfilData, error: perfilError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfilError || !perfilData) {
        console.error('Error obteniendo perfil:', perfilError);
        return;
      }

      const perfil = perfilData;

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

  return <SecurityLogin onLoginSuccess={handleLoginSuccess} />;
}