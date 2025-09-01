
import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import clsx from "clsx";
import { SECCIONES } from "./SidebarSections.jsx";
import { supabase } from '../supabaseClient';
import { useNavigate } from "react-router-dom";

export default function Sidebar({ sidebarOpen, setSidebarOpen, seccion, setSeccion }) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const navigate = useNavigate();
  React.useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from('profiles')
        .select('admin')
        .eq('id', user.id)
        .single();
      setIsAdmin(perfil?.admin === true);
    };
    getProfile();
  }, []);
  return (
    <aside
      className={clsx(
        "bg-[#2c4b8b] text-white transition-all duration-300 shadow flex flex-col relative group z-10",
        sidebarOpen ? "w-56" : "w-16",
        "min-h-screen"
      )}
    >
      <div className="flex flex-col items-center mt-8 space-y-4">
        {SECCIONES.filter(sec => !sec.soloAdmin || isAdmin).map((sec) => {
          const Icon = sec.icono;
          return (
            <button
              key={sec.id}
              className={clsx(
                "sidebar-btn flex items-center w-full px-4 py-2 hover:text-[#cc6200] transition-colors rounded",
                seccion === sec.id ? "bg-[#1e355e] font-semibold" : ""
              )}
              onClick={() => {
                setSeccion(sec.id);
                navigate(sec.ruta);
              }}
            >
              <span className="text-3xl"><Icon /></span>
              <span className={clsx("ml-4 transition-all duration-200", sidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden md:inline")}> 
                {sec.nombre}
              </span>
            </button>
          );
        })}
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