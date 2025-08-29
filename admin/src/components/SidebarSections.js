// SidebarSections.js
// Secciones adaptadas desde dashboard.html

export const SECCIONES = [
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    icono: 'home', // Puedes usar el nombre del icono para react-icons o SVG
    ruta: '/dashboard',
    descripcion: 'Panel principal de administración.'
  },
  {
    id: 'cupos',
    nombre: 'Cargar Cupo',
    icono: 'plane-tilt',
    ruta: '/cupos',
    descripcion: 'Carga y gestión de cupos aéreos.'
  },
  {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    icono: 'bell-bolt',
    ruta: '/solicitudes',
    descripcion: 'Gestión de solicitudes de reserva.'
  },
  {
    id: 'confirmaciones',
    nombre: 'Confirmaciones',
    icono: 'ticket',
    ruta: '/confirmaciones',
    descripcion: 'Confirmación de reservas y cupos.'
  },
  {
    id: 'reportes',
    nombre: 'Reportería',
    icono: 'chart-histogram',
    ruta: '/reportes',
    descripcion: 'Reportes y estadísticas.'
  }
];
