// SidebarSections.js
// Secciones adaptadas desde dashboard.html

import { TbHome, TbPlaneTilt, TbBellBolt, TbTicket, TbChartHistogram } from "react-icons/tb";

export const SECCIONES = [
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    icono: <TbHome />,
    ruta: '/dashboard',
    descripcion: 'Panel principal de administración.'
  },
  {
    id: 'cupos',
    nombre: 'Cargar Cupo',
    icono: <TbPlaneTilt />,
    ruta: '/cupos',
    descripcion: 'Carga y gestión de cupos aéreos.'
  },
  {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    icono: <TbBellBolt />,
    ruta: '/solicitudes',
    descripcion: 'Gestión de solicitudes de reserva.'
  },
  {
    id: 'confirmaciones',
    nombre: 'Confirmaciones',
    icono: <TbTicket />,
    ruta: '/confirmaciones',
    descripcion: 'Confirmación de reservas y cupos.'
  },
  {
    id: 'reportes',
    nombre: 'Reportería',
    icono: <TbChartHistogram />,
    ruta: '/reportes',
    descripcion: 'Reportes y estadísticas.'
  }
];
