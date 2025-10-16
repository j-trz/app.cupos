import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";// eslint-disable-line no-unused-vars
import clsx from "clsx";
import { SECCIONES } from "./SidebarSections.jsx";
import AuthorizationService from '../services/authorizationService';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ sidebarOpen, setSidebarOpen, seccion, setSeccion = () => {} }) {
  const { userRole } = useAuth();
  const [availableSections, setAvailableSections] = React.useState([]);
  const navigate = useNavigate();
  
  // Filtrar secciones según el rol
  const filterSectionsByRole = (role) => {
    return SECCIONES.filter(sec => {
      // Si no tiene restricción de rol, mostrar siempre
      if (!sec.soloAdmin && !sec.roles) return true;
      
      // Si tiene roles específicos definidos, verificar
      if (sec.roles && Array.isArray(sec.roles)) {
        return sec.roles.includes(role);
      }
      
      // Compatibilidad con soloAdmin (solo para admin)
      if (sec.soloAdmin) {
        return role === AuthorizationService.ROLES.ADMIN;
      }
      
      return true;
    });
  };

  // Actualizar secciones cuando cambie el rol del usuario
  React.useEffect(() => {
    if (userRole) {
      console.log('🔄 Sidebar: Actualizando secciones para rol:', userRole);
      const filteredSections = filterSectionsByRole(userRole);
      setAvailableSections(filteredSections);
    } else {
      // Mostrar solo secciones básicas si no hay rol
      const basicSections = SECCIONES.filter(sec => !sec.soloAdmin && !sec.roles);
      setAvailableSections(basicSections);
    }
  }, [userRole]);

  return (
    <aside
      className={clsx(
        "bg-[#2c4b8b] text-white transition-all duration-300 shadow flex flex-col relative group z-10",
        sidebarOpen ? "w-56" : "w-16",
        "min-h-screen"
      )}
    >
      <div className="flex flex-col items-center mt-8 space-y-4">
        {availableSections.map((sec) => {
          const Icon = sec.icono;
          return (
            <button
              key={sec.id}
              className={clsx(
                "sidebar-btn flex items-center w-full px-4 py-2 hover:text-[#cc6200] transition-colors rounded",
                seccion === sec.id ? "bg-[#1e355e] font-semibold" : ""
              )}
              onClick={() => {
                if (typeof setSeccion === 'function') {
                  setSeccion(sec.id);
                }
                navigate(sec.ruta);
              }}
            >
              <span className="text-3xl flex-shrink-0">{Icon && <Icon />}</span>
              <span className={clsx(
                "ml-4 transition-all duration-300 whitespace-nowrap",
                sidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden"
              )}>
                {sec.nombre}
              </span>
            </button>
          );
        })}
        
        {/* Mostrar rol actual en modo debug cuando sidebar esté abierto */}
        {sidebarOpen && import.meta.env.MODE === 'development' && (
          <>
            <div className="text-xs text-gray-300 mt-4 px-2">
              Rol: {AuthorizationService.getRoleDescription(userRole)}
            </div>
     
          </>
        )}
      </div>
      <div className="flex-1"></div>
      {/* Flecha tipo tab */}
      <button
        className="absolute index-0 text-white top-[14px] right-[-20px] w-[30px] h-[30px] rounded-r-full transform -translate-y-1/2 bg-[#2c4b8b] shadow-r p-1 z-10 transition-colors hidden md:block"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <FaChevronLeft className="text-xl" />
        ) : (
          <FaChevronRight className="text-xl" />
        )}
      </button>
    </aside>
  );
}