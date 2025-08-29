import React, { useState } from "react";
import Layout from "../components/Layout";

function DashboardSection() {
  return <h2 className="text-2xl font-bold text-[#2c4b8b] mb-4 animate-fade-in">Bienvenido al Dashboard</h2>;
}
function CuposSection() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-[#2c4b8b] mb-4">Cargar Cupo</h2>
      <p>Formulario para cargar cupos próximamente...</p>
    </div>
  );
}
function SolicitudesSection() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-[#2c4b8b] mb-4">Solicitudes</h2>
      <p>Listado de solicitudes próximamente...</p>
    </div>
  );
}
function ConfirmacionesSection() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-[#2c4b8b] mb-4">Confirmaciones</h2>
      <p>Gestión de confirmaciones próximamente...</p>
    </div>
  );
}
function ReportesSection() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-[#2c4b8b] mb-4">Reportería</h2>
      <p>Reportes y estadísticas próximamente...</p>
    </div>
  );
}

export default function Dashboard() {
  const [seccion, setSeccion] = useState("dashboard");

  function renderSection() {
    switch (seccion) {
      case "dashboard":
        return <DashboardSection />;
      case "cupos":
        return <CuposSection />;
      case "solicitudes":
        return <SolicitudesSection />;
      case "confirmaciones":
        return <ConfirmacionesSection />;
      case "reportes":
        return <ReportesSection />;
      default:
        return <DashboardSection />;
    }
  }

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      {renderSection()}
      <style>
        {`
        .animate-fade-in {
          animation: fadeIn 0.5s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px);}
          to { opacity: 1; transform: translateY(0);}
        }
        `}
      </style>
    </Layout>
  );
}