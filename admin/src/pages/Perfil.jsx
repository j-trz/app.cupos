import React, { useState, useEffect } from "react";// eslint-disable-line no-unused-vars
import Layout from "../components/Layout";// eslint-disable-line no-unused-vars
import TwoFactorManager from "../components/TwoFactorManager";// eslint-disable-line no-unused-vars
import { FaEnvelope, FaBuilding } from "react-icons/fa";// eslint-disable-line no-unused-vars
import AuthorizationService from "../services/authorizationService";
import { HiOutlineUser, HiOutlineShieldCheck, HiOutlineCog6Tooth } from "react-icons/hi2";// eslint-disable-line no-unused-vars

/**
 * Página de perfil del usuario con gestión de seguridad
 */
export default function Perfil() {
  const [seccion, setSeccion] = useState("perfil");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const profile = await AuthorizationService.getCurrentUserProfile();

      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout seccion={seccion} setSeccion={setSeccion}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2c4b8b]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <HiOutlineUser className="text-[#2c4b8b]" />
            Mi Perfil
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu información personal y configuraciones de seguridad
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información del Usuario */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#2c4b8b] to-[#1e355e] px-6 py-8 text-white">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <HiOutlineUser className="text-3xl" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-center">
                  {userProfile?.full_name || userProfile?.nombre || "Usuario"}
                </h2>
                <p className="text-center text-blue-100 mt-1">
                  {AuthorizationService.getRoleDescription(userProfile?.role)}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <FaEnvelope className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Correo Electrónico</p>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                </div>

                {/* Agencia */}
                {userProfile?.agency && (
                  <div className="flex items-center gap-3">
                    <FaBuilding className="text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Agencia</p>
                      <p className="font-medium">{userProfile.agency}</p>
                    </div>
                  </div>
                )}

                {/* Rol */}
                <div className="flex items-center gap-3">
                  <HiOutlineCog6Tooth ooth className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Rol</p>
                    <p className="font-medium">
                      {AuthorizationService.getRoleDescription(userProfile?.role)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuraciones de Seguridad */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <HiOutlineShieldCheck className="text-[#2c4b8b] h-8 w-8" />
                  Configuraciones de Seguridad
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Gestiona la autenticación de doble factor para proteger tu cuenta
                </p>
              </div>

              <div className="p-6">
                {userProfile && (
                  <TwoFactorManager user={{ id: userProfile.id, email: userProfile.email }} />
                )}
              </div>
            </div>

            {/* Información de Seguridad */}
            <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <HiOutlineShieldCheck className="text-green-600 h-8 w-8" />
                Funciones de Seguridad Activas
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Bloqueo automático tras 3 intentos de login fallidos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Cierre de sesión automático tras 10 minutos de inactividad
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Autenticación de doble factor (2FA) obligatoria
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Registro completo de actividades de login
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}