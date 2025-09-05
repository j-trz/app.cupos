
import { TbBellBolt, TbTicket } from 'react-icons/tb';
import { RiUserSettingsLine } from "react-icons/ri";
import { PiAirplaneInFlightFill } from "react-icons/pi";
import { MdApi } from "react-icons/md";


export const SECCIONES = [
  {
    id: 'disponibilidad',
    nombre: 'Disponibilidad',
    icono: PiAirplaneInFlightFill,
    ruta: '/admin/disponibilidad',
    descripcion: 'Consulta y visualización de disponibilidad.'
  },

  {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    icono: TbBellBolt,
    ruta: '/admin/solicitudes',
    descripcion: 'Gestión de solicitudes de reserva.'
  },
  {
    id: 'confirmaciones',
    nombre: 'Confirmaciones',
    icono: TbTicket,
    ruta: '/admin/confirmaciones',
    descripcion: 'Confirmación de reservas y cupos.'
  },
  {
    id: 'gestion-usuarios',
    nombre: 'Usuarios',
    icono: RiUserSettingsLine,
    ruta: '/admin/gestion-usuarios',
    descripcion: 'Administración y edición de usuarios.',
    soloAdmin: true
  },
  {
    id: 'gestion-conexiones',
    nombre: 'Conexiones API',
    icono: MdApi,
    ruta: '/admin/gestion-conexiones',
    descripcion: 'Gestión de conexiones a APIs externas.',
    soloAdmin: true
  }
];
