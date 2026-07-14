// Fuente única de los módulos del sistema de permisos granulares —
// antes vivía duplicado (y podía desincronizarse) en GestionRoles.jsx y
// GestionPermisos.jsx. Debe reflejar los módulos sembrados en
// backend-go/pkg/database/db.go (seedRBAC) para que el filtro/selector de
// módulo siempre tenga a dónde mapear los permisos reales.
export const MODULES = [
  { value: 'dashboard', label: 'Dashboard', icon: '📊' },
  { value: 'users', label: 'Usuarios', icon: '👥' },
  { value: 'agencies', label: 'Agencias', icon: '🏢' },
  { value: 'products', label: 'Productos', icon: '📦' },
  { value: 'groups', label: 'Grupos', icon: '🧳' },
  { value: 'reservations', label: 'Reservas', icon: '📅' },
  { value: 'transfers', label: 'Cesiones', icon: '🔄' },
  { value: 'notifications', label: 'Notificaciones', icon: '🔔' },
  { value: 'notification_templates', label: 'Plantillas de Notificación', icon: '✉️' },
  { value: 'settings', label: 'Ajustes Generales', icon: '⚙️' },
  { value: 'white_label', label: 'Diseño', icon: '🎨' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'ai', label: 'Inteligencia Artificial', icon: '🤖' },
  { value: 'logs', label: 'Logs del Sitio', icon: '📜' },
  { value: 'backup', label: 'Backups', icon: '💾' },
  { value: 'permissions', label: 'Permisos', icon: '🔐' },
  { value: 'roles', label: 'Roles', icon: '🛡️' },
  { value: 'reports', label: 'Reportes', icon: '📈' },
];

// Orden canónico de acciones para la matriz de permisos de GestionRoles.jsx —
// no todos los módulos tienen las 8, se muestra celda vacía si no existe.
export const ACTIONS = [
  { value: 'view', label: 'Ver' },
  { value: 'create', label: 'Crear' },
  { value: 'update', label: 'Editar' },
  { value: 'delete', label: 'Eliminar' },
  { value: 'confirm', label: 'Confirmar' },
  { value: 'export', label: 'Exportar' },
  { value: 'unlock', label: 'Desbloquear' },
  { value: 'assign', label: 'Asignar' },
];

export const getModuleLabel = (moduleValue) => MODULES.find((m) => m.value === moduleValue)?.label || moduleValue;
