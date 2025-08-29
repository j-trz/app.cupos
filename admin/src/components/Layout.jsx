import React, { useState } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function Layout({ children, seccion, setSeccion }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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