import React, { useState, useEffect } from "react";// eslint-disable-line no-unused-vars
import Topbar from "./Topbar";// eslint-disable-line no-unused-vars
import Sidebar from "./Sidebar";// eslint-disable-line no-unused-vars

export default function Layout({ children, seccion, setSeccion }) {
  // Persistir estado del sidebar en localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-100 font-['Montserrat'] flex flex-col">
      <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          seccion={seccion}
          setSeccion={setSeccion}
        />
        <main className="flex-1 p-8 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}