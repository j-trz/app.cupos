import { Calendar, Package, ArrowRightLeft, MessageSquare, Palette, Mail, BarChart3, Users, Building2, FileSearch, Settings, Zap } from 'lucide-react';

// Fuente única de las secciones de Documentación — la usa tanto el submenú
// del Sidebar (navegación) como Documentacion.jsx (contenido + prev/next),
// para que no se puedan desincronizar entre sí.
export const DOCS_SECTIONS = [
  { key: 'disponibilidad', label: 'Disponibilidad y Cupos', icon: Calendar, badge: 'Inicio de todo' },
  { key: 'reservas', label: 'Gestión de Reservas', icon: Calendar },
  { key: 'productos', label: 'Gestión de Productos', icon: Package },
  { key: 'cesion', label: 'Cesión de Cupos', icon: ArrowRightLeft, badge: 'Importante' },
  { key: 'ia', label: 'Asistente IA', icon: MessageSquare, badge: 'Nuevo' },
  { key: 'diseno', label: 'Diseño / White Label', icon: Palette },
  { key: 'email', label: 'Configuración de Email', icon: Mail },
  { key: 'reportes', label: 'Reportes y Dashboard', icon: BarChart3 },
  { key: 'usuarios', label: 'Usuarios, Roles y Permisos', icon: Users, badge: 'Solo admins' },
  { key: 'agencias', label: 'Gestión de Agencias', icon: Building2, badge: 'Solo admins' },
  { key: 'logs', label: 'Logs y Auditoría', icon: FileSearch, badge: 'Solo admins' },
  { key: 'panel-control', label: 'Panel de Control', icon: Settings, badge: 'Solo admins' },
  { key: 'inicio-rapido', label: 'Guía de inicio rápido', icon: Zap },
];

export const DEFAULT_DOCS_SECTION = DOCS_SECTIONS[0].key;
