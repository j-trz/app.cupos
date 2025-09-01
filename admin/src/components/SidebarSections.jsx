
import { TbHome, TbPlaneTilt, TbBellBolt, TbTicket, TbChartHistogram } from 'react-icons/tb';
import { RiUserSettingsLine } from "react-icons/ri";

export const SECCIONES = [
  {
    id: 'disponibilidad',
    nombre: 'Disponibilidad',
    icono: TbHome,
    ruta: '/disponibilidad',
    descripcion: 'Consulta y visualización de disponibilidad.'
  },
  {
    id: 'cupos',
    nombre: 'Cargar Cupo',
    icono: TbPlaneTilt,
    ruta: '/cupos',
    descripcion: 'Carga y gestión de cupos aéreos.',
    soloAdmin: true
  },
  {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    icono: TbBellBolt,
    ruta: '/solicitudes',
    descripcion: 'Gestión de solicitudes de reserva.'
  },
  {
    id: 'confirmaciones',
    nombre: 'Confirmaciones',
    icono: TbTicket,
    ruta: '/confirmaciones',
    descripcion: 'Confirmación de reservas y cupos.'
  },
  {
    id: 'reportes',
    nombre: 'Reportería',
    icono: TbChartHistogram,
    ruta: '/reportes',
    descripcion: 'Reportes y estadísticas.',
    soloAdmin: true
  },
  {
    id: 'gestion-usuarios',
    nombre: 'Usuarios',
    icono: RiUserSettingsLine,
    ruta: '/admin/gestion-usuarios',
    descripcion: 'Administración y edición de usuarios.',
    soloAdmin: true
  }
];
