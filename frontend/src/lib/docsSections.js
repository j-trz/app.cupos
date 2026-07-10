import { Calendar, Package, ArrowRightLeft, MessageSquare, Palette, Mail, BarChart3, Users, Building2, FileSearch, Settings, Zap } from 'lucide-react';

// Fuente única de las secciones de Documentación — la usa tanto el submenú
// del Sidebar (navegación) como Documentacion.jsx (contenido + prev/next),
// para que no se puedan desincronizar entre sí.
export const DOCS_SECTIONS = [
  { key: 'disponibilidad', label: 'Disponibilidad y Cupos', icon: Calendar, badge: 'Inicio de todo' },
  { key: 'reservas', label: 'Gestión de Reservas', icon: Calendar },
  { key: 'productos', label: 'Gestión de Productos', icon: Package, badge: 'Solo admins', adminOnly: true },
  { key: 'cesion', label: 'Cesión de Cupos', icon: ArrowRightLeft, badge: 'Solo admins', adminOnly: true },
  { key: 'ia', label: 'Asistente IA', icon: MessageSquare, badge: 'Nuevo' },
  { key: 'diseno', label: 'Diseño / White Label', icon: Palette, badge: 'Solo admins', adminOnly: true },
  { key: 'email', label: 'Configuración de Email', icon: Mail, badge: 'Solo admins', adminOnly: true },
  { key: 'reportes', label: 'Reportes y Dashboard', icon: BarChart3, badge: 'Solo admins', adminOnly: true },
  { key: 'usuarios', label: 'Usuarios, Roles y Permisos', icon: Users, badge: 'Solo admins', adminOnly: true },
  { key: 'agencias', label: 'Gestión de Agencias', icon: Building2, badge: 'Solo admins', adminOnly: true },
  { key: 'logs', label: 'Logs y Auditoría', icon: FileSearch, badge: 'Solo admins', adminOnly: true },
  { key: 'panel-control', label: 'Panel de Control', icon: Settings, badge: 'Solo admins', adminOnly: true },
  { key: 'inicio-rapido', label: 'Guía de inicio rápido', icon: Zap },
];

// Secciones visibles para un rol dado. `role === 'admin'` es el mismo
// predicado que ya usa Sidebar.jsx para mostrar sus propios accesos de
// admin, así el filtro de Documentación no queda desincronizado de qué
// puede ver/hacer el usuario en el resto de la app.
export const visibleDocsSections = (role) => {
  const isAdmin = role === 'admin';
  return DOCS_SECTIONS.filter((s) => isAdmin || !s.adminOnly);
};

export const DEFAULT_DOCS_SECTION = DOCS_SECTIONS[0].key;
