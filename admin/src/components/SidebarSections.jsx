
import { PiAirplaneInFlightFill } from "react-icons/pi";
import { HiOutlineShare , HiOutlineShieldCheck , HiOutlineCube , HiOutlineUser, HiOutlineUserGroup, HiOutlineBellAlert, HiOutlineTicket, HiOutlineBuildingOffice2 } from "react-icons/hi2";



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
    icono: HiOutlineBellAlert ,
    ruta: '/admin/solicitudes',
    descripcion: 'Gestión de solicitudes de reserva.'
  },
  {
    id: 'confirmaciones',
    nombre: 'Confirmaciones',
    icono: HiOutlineTicket ,
    ruta: '/admin/confirmaciones',
    descripcion: 'Confirmación de reservas y cupos.'
  },
  {
    id: 'perfil',
    nombre: 'Mi Perfil',
    icono: HiOutlineUser,
    ruta: '/admin/perfil',
    descripcion: 'Gestión de perfil personal y configuraciones de seguridad.'
  },
  {
    id: 'gestion-usuarios',
    nombre: 'Usuarios',
    icono: HiOutlineUserGroup ,
    ruta: '/admin/gestion-usuarios',
    descripcion: 'Administración y edición de usuarios.',
    soloAdmin: true
  },
  {
    id: 'gestion-agencias',
    nombre: 'Agencias',
    icono: HiOutlineBuildingOffice2,
    ruta: '/admin/gestion-agencias',
    descripcion: 'Administración de agencias y logos.',
    soloAdmin: true
  },
  {
    id: 'gestion-productos',
    nombre: 'Productos',
    icono: HiOutlineCube ,
    ruta: '/admin/gestion-productos',
    descripcion: 'CRUD de productos/cupos usando conexión API activa.',
    soloAdmin: true
  },

  {
    id: 'seguridad',
    nombre: 'Seguridad',
    icono: HiOutlineShieldCheck ,
    ruta: '/admin/seguridad',
    descripcion: 'Panel de administración de seguridad y 2FA.',
    soloAdmin: true
  }
];
