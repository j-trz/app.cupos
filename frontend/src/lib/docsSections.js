import { Calendar, Package, ArrowRightLeft, MessageSquare, Palette, Mail, BarChart3, Users, Building2, FileSearch, Settings, Zap } from 'lucide-react';

// Fuente única de las secciones de Documentación — la usa tanto el submenú
// del Sidebar (navegación) como Documentacion.jsx (contenido + prev/next),
// para que no se puedan desincronizar entre sí.
export const DOCS_SECTIONS = [
  { key: 'disponibilidad', label: 'Disponibilidad y Cupos', icon: Calendar, badge: 'Inicio de todo' },
  { key: 'reservas', label: 'Gestión de Reservas', icon: Calendar },
  { key: 'productos', label: 'Gestión de Productos', icon: Package, badge: 'Gestión', permission: 'PRODUCTS_VIEW' },
  { key: 'cesion', label: 'Cesión de Cupos', icon: ArrowRightLeft, badge: 'Gestión', permission: 'TRANSFERS_VIEW' },
  { key: 'ia', label: 'Asistente IA', icon: MessageSquare, badge: 'Nuevo' },
  { key: 'diseno', label: 'Diseño / White Label', icon: Palette, badge: 'Gestión', permission: 'WHITE_LABEL_VIEW' },
  { key: 'email', label: 'Configuración de Email', icon: Mail, badge: 'Gestión', permission: 'EMAIL_VIEW' },
  { key: 'plantillas-notificacion', label: 'Plantillas de Notificación', icon: Mail, badge: 'Gestión', permission: 'NOTIFICATION_TEMPLATES_VIEW' },
  { key: 'reportes', label: 'Reportes y Dashboard', icon: BarChart3, badge: 'Gestión', permission: 'REPORTS_VIEW' },
  { key: 'nominas', label: 'Gestión de Nóminas', icon: Users, badge: 'Gestión', permission: 'RESERVATIONS_VIEW' },
  { key: 'usuarios', label: 'Usuarios, Roles y Permisos', icon: Users, badge: 'Gestión', permission: 'USERS_VIEW' },
  { key: 'agencias', label: 'Gestión de Agencias', icon: Building2, badge: 'Solo superadmin', adminOnly: true },
  { key: 'logs', label: 'Logs y Auditoría', icon: FileSearch, badge: 'Solo superadmin', adminOnly: true },
  { key: 'panel-control', label: 'Panel de Control', icon: Settings, badge: 'Solo superadmin', adminOnly: true },
  { key: 'inicio-rapido', label: 'Guía de inicio rápido', icon: Zap },
];

// Secciones visibles para un usuario dado. `adminOnly` queda reservado para
// pantallas SIN permiso granular propio (gestión de agencias — ahora
// exclusiva del rol admin de sistema tras el bloqueo de administración de
// agencias —, logs, y el panel de control, que es un stub no funcional).
// Todo lo demás se resuelve igual que Sidebar.jsx filtra sus propios ítems:
// por el código de permiso real que habilita esa pantalla, no por rol
// literal — así agency_admin ve exactamente lo que puede usar.
export const visibleDocsSections = (can, isAdmin) => {
  return DOCS_SECTIONS.filter((s) => {
    if (s.adminOnly) return isAdmin;
    if (s.permission) return isAdmin || can(s.permission);
    return true;
  });
};

export const DEFAULT_DOCS_SECTION = DOCS_SECTIONS[0].key;
