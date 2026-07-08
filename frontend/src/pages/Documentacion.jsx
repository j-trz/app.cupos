import { useState } from 'react';
import { BookOpen, FileText, Code, Shield, Users, Package, Building2, BarChart3, Mail, Bell, ArrowRightLeft, Calendar, Settings, FileSearch, MessageSquare, User, Download, Database, Palette, Globe, Search, Keyboard, HelpCircle } from 'lucide-react';

const Documentacion = () => {
    const [activeSection, setActiveSection] = useState('reservas');

    const sections = [
        { id: 'reservas', title: 'Gestión de Reservas', icon: Calendar, description: 'Sistema completo para la gestión de reservas de vuelos' },
        { id: 'productos', title: 'Gestión de Productos', icon: Package, description: 'Administración de productos turísticos' },
        { id: 'agencias', title: 'Gestión de Agencias', icon: Building2, description: 'Administración de agencias de turismo' },
        { id: 'usuarios', title: 'Gestión de Usuarios', icon: Users, description: 'Administración de usuarios del sistema' },
        { id: 'roles', title: 'Roles y Permisos', icon: Shield, description: 'Control de acceso basado en roles (RBAC)' },
        { id: 'whitelabel', title: 'White Label', icon: Palette, description: 'Personalización de marca para agencias' },
        { id: 'email', title: 'Configuración de Email', icon: Mail, description: 'Configuración SMTP y plantillas de email' },
        { id: 'reportes', title: 'Reportes Avanzados', icon: BarChart3, description: 'Dashboard ejecutivo con métricas y análisis' },
        { id: 'notificaciones', title: 'Notificaciones', icon: Bell, description: 'Sistema de notificaciones en tiempo real' },
        { id: 'transferencias', title: 'Transferencias', icon: ArrowRightLeft, description: 'Transferencia de cupos entre agencias' },
        { id: 'disponibilidad', title: 'Disponibilidad y Cupos', icon: Calendar, description: 'Gestión de disponibilidad de productos' },
        { id: 'panel', title: 'Panel de Control', icon: Settings, description: 'Configuración general del sistema' },
        { id: 'logs', title: 'Logs del Sitio', icon: FileSearch, description: 'Visualización y gestión de logs' },
        { id: 'ia', title: 'Chat IA', icon: MessageSquare, description: 'Asistente de inteligencia artificial' },
        { id: 'perfil', title: 'Perfil de Usuario', icon: User, description: 'Gestión del perfil personal' },
        { id: 'export', title: 'Exportación de Datos', icon: Download, description: 'Exportación en CSV, Excel y PDF' },
        { id: 'auditoria', title: 'Auditoría', icon: Database, description: 'Sistema de auditoría de acciones' },
        { id: 'backup', title: 'Backup y Restauración', icon: Database, description: 'Respaldo y restauración del sistema' },
        { id: 'temas', title: 'Modo Oscuro/Claro', icon: Palette, description: 'Sistema de temas con cambio dinámico' },
        { id: 'i18n', title: 'Internacionalización', icon: Globe, description: 'Soporte multi-idioma' },
        { id: 'busqueda', title: 'Búsqueda Global', icon: Search, description: 'Búsqueda y filtros avanzados' },
        { id: 'atajos', title: 'Atajos de Teclado', icon: Keyboard, description: 'Atajos para mejorar productividad' },
        { id: 'onboarding', title: 'Onboarding', icon: HelpCircle, description: 'Guía interactiva para nuevos usuarios' },
    ];

    const sectionContent = {
        reservas: {
            title: 'Gestión de Reservas',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Reserva: Formulario completo con datos de pasajeros, productos y fechas', 'Editar Reserva: Modificación de reservas existentes con validaciones', 'Confirmar Reserva: Proceso de confirmación con validación de disponibilidad', 'Eliminar Pasajero: Eliminación individual de pasajeros de una reserva', 'Solicitar Cancelación: Flujo de cancelación con documento contable', 'Reenviar Email: Reenvío de confirmación por email', 'Actualizar Ticket: Modificación de datos de ticket por pasajero', 'Agregar Documento Contable: Adjuntar ficha de venta y documentos'] },
                { subtitle: 'Endpoints API', items: ['POST /api/reservations - Crear nueva reserva', 'GET /api/reservations - Listar todas las reservas', 'GET /api/reservations/:id - Obtener reserva por ID', 'PUT /api/reservations/:id - Actualizar reserva', 'DELETE /api/reservations/:id - Eliminar reserva', 'POST /api/reservations/:id/confirm - Confirmar reserva'] },
            ]
        },
        productos: {
            title: 'Gestión de Productos',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Producto: Formulario con datos de destino, fechas, precios y cupos', 'Editar Producto: Modificación de productos existentes', 'Eliminar Producto: Eliminación con confirmación', 'Carga Masiva: Importación de productos desde archivo Excel/CSV', 'Transferencia de Cupos: Transferir cupos entre agencias'] },
                { subtitle: 'Endpoints API', items: ['GET /api/products - Listar productos con filtros', 'GET /api/products/:id - Obtener producto por ID', 'POST /api/products - Crear producto', 'PUT /api/products/:id - Actualizar producto', 'DELETE /api/products/:id - Eliminar producto', 'POST /api/products/bulk - Carga masiva de productos'] },
            ]
        },
        agencias: {
            title: 'Gestión de Agencias',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Agencia: Registro de nuevas agencias con datos completos', 'Editar Agencia: Modificación de datos de agencia', 'Eliminar Agencia: Eliminación con validación de dependencias', 'Listar Agencias: Vista con filtros y búsqueda'] },
                { subtitle: 'Endpoints API', items: ['GET /api/agencies - Listar agencias', 'GET /api/agencies/:id - Obtener agencia por ID', 'POST /api/agencies - Crear agencia', 'PUT /api/agencies/:id - Actualizar agencia', 'DELETE /api/agencies/:id - Eliminar agencia'] },
            ]
        },
        usuarios: {
            title: 'Gestión de Usuarios',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Usuario: Registro de nuevos usuarios con rol y permisos', 'Editar Usuario: Modificación de datos y permisos', 'Eliminar Usuario: Eliminación con confirmación', 'Toggle Estado: Activar/desactivar usuario', 'Asignar Permisos: Configuración granular de permisos'] },
                { subtitle: 'Endpoints API', items: ['GET /api/users - Listar usuarios', 'GET /api/users/:id - Obtener usuario por ID', 'POST /api/users - Crear usuario', 'PUT /api/users/:id - Actualizar usuario', 'DELETE /api/users/:id - Eliminar usuario', 'PATCH /api/users/:id/toggle-status - Toggle estado activo/inactivo'] },
            ]
        },
        roles: {
            title: 'Gestión de Roles y Permisos',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Rol: Definición de nuevos roles con permisos', 'Editar Rol: Modificación de roles y permisos asociados', 'Eliminar Rol: Eliminación con validación', 'Asignar Permisos: Configuración granular de permisos por rol'] },
                { subtitle: 'Endpoints API', items: ['GET /api/roles - Listar roles', 'POST /api/roles - Crear rol', 'PUT /api/roles/:id - Actualizar rol', 'DELETE /api/roles/:id - Eliminar rol', 'GET /api/permissions - Listar permisos', 'POST /api/permissions - Crear permiso'] },
            ]
        },
        whitelabel: {
            title: 'Sistema de White Label',
            content: [
                { subtitle: 'Funcionalidades', items: ['Configuración de Identidad: Logo, nombre de agencia, favicon', 'Configuración de Colores: Paleta de colores personalizable', 'Configuración de Fuentes: Selección de tipografías', 'Configuración de Botones: Estilos, bordes, sombras', 'Vista Previa: Preview en tiempo real de los cambios', 'Presets: Plantillas predefinidas de configuración', 'Exportar/Importar: Guardar y cargar configuraciones'] },
                { subtitle: 'Endpoints API', items: ['GET /api/white-label - Obtener configuración', 'POST /api/white-label - Crear configuración', 'PUT /api/white-label/:id - Actualizar configuración', 'DELETE /api/white-label/:id - Eliminar configuración', 'GET /api/white-label/presets - Obtener presets'] },
            ]
        },
        email: {
            title: 'Configuración de Email',
            content: [
                { subtitle: 'Funcionalidades', items: ['Configuración SMTP: Host, puerto, usuario, contraseña, encriptación', 'Prueba de Conexión: Verificar configuración SMTP', 'Email de Prueba: Envío de email de prueba', 'Plantillas de Email: Personalización de templates HTML', 'Preview de Plantillas: Vista previa de emails'] },
                { subtitle: 'Endpoints API', items: ['GET /api/email-config - Obtener configuración', 'POST /api/email-config - Crear configuración', 'PUT /api/email-config/:id - Actualizar configuración', 'POST /api/email-config/test-connection - Probar conexión SMTP', 'POST /api/email-config/send-test - Enviar email de prueba'] },
            ]
        },
        reportes: {
            title: 'Sistema de Reportes Avanzados',
            content: [
                { subtitle: 'Funcionalidades', items: ['KPIs Principales: Ventas totales, reservas, pasajeros, ingresos', 'Ventas por Agencia: Distribución de ventas entre agencias', 'Evolución de Pasajeros: Tendencia histórica de pasajeros', 'Destinos Detallados: Análisis por destino con métricas', 'Evolución de Ingresos: Tendencia de ingresos en el tiempo', 'Ocupación: Heatmap de ocupación por producto/fecha', 'Top Productos: Ranking de productos más vendidos', 'Alertas de Riesgo: Productos con bajo rendimiento', 'Cancelaciones: Análisis de cancelaciones'] },
                { subtitle: 'Endpoints API', items: ['GET /api/reports/stats - Estadísticas generales', 'GET /api/reports/evolution-passengers - Evolución de pasajeros', 'GET /api/reports/agency-share - Participación por agencia', 'GET /api/reports/destinations-detail - Detalle por destino', 'GET /api/reports/evolution-revenue - Evolución de ingresos', 'GET /api/reports/occupancy - Ocupación', 'GET /api/reports/top-products - Top productos', 'GET /api/reports/risk-alerts - Alertas de riesgo', 'GET /api/reports/cancellations - Cancelaciones'] },
            ]
        },
        notificaciones: {
            title: 'Sistema de Notificaciones',
            content: [
                { subtitle: 'Funcionalidades', items: ['Notificaciones SSE: Notificaciones en tiempo real vía Server-Sent Events', 'Marcar como Leída: Gestión de estado de notificaciones', 'Eliminar Notificaciones: Limpieza de notificaciones antiguas', 'Contador de No Leídas: Badge con cantidad de notificaciones pendientes'] },
                { subtitle: 'Endpoints API', items: ['GET /api/notifications - Listar notificaciones', 'POST /api/notifications - Crear notificación', 'PUT /api/notifications/:id/read - Marcar como leída', 'DELETE /api/notifications/:id - Eliminar notificación', 'GET /api/notifications/unread-count - Contador de no leídas'] },
            ]
        },
        transferencias: {
            title: 'Sistema de Transferencias',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Transferencia: Solicitud de transferencia de cupos', 'Listar Transferencias: Vista de transferencias propias y recibidas', 'Aceptar/Rechazar: Flujo de aprobación de transferencias'] },
                { subtitle: 'Endpoints API', items: ['POST /api/transfers - Crear transferencia', 'GET /api/transfers - Listar transferencias', 'GET /api/transfers/user - Transferencias del usuario'] },
            ]
        },
        disponibilidad: {
            title: 'Disponibilidad y Cupos',
            content: [
                { subtitle: 'Funcionalidades', items: ['Consultar Disponibilidad: Búsqueda de disponibilidad por producto y fecha', 'Reservar desde Disponibilidad: Creación directa de reserva desde vista de disponibilidad', 'Cálculo de Tipos de Pasajero: Cálculo automático según edad y fecha de salida'] },
                { subtitle: 'Endpoints API', items: ['GET /api/availability - Consultar disponibilidad'] },
            ]
        },
        panel: {
            title: 'Panel de Control',
            content: [
                { subtitle: 'Funcionalidades', items: ['Configuración General: Parámetros globales del sistema', 'Gestión de Temas: Administración de temas visuales', 'Logs del Sistema: Visualización de logs'] },
            ]
        },
        logs: {
            title: 'Logs del Sitio',
            content: [
                { subtitle: 'Funcionalidades', items: ['Listar Logs: Vista de logs con filtros', 'Filtros Avanzados: Por fecha, usuario, tipo de acción', 'Exportar Logs: Descarga de logs en diferentes formatos'] },
            ]
        },
        ia: {
            title: 'Chat IA',
            content: [
                { subtitle: 'Funcionalidades', items: ['Chat Flotante: Widget de chat flotante en todas las páginas', 'Consultas Naturales: Preguntas en lenguaje natural', 'Acciones Automatizadas: Ejecución de acciones desde el chat', 'Historial de Conversaciones: Registro de chats anteriores'] },
                { subtitle: 'Endpoints API', items: ['POST /api/ai/chat - Enviar mensaje al chat IA', 'GET /api/ai/history - Obtener historial'] },
            ]
        },
        perfil: {
            title: 'Perfil de Usuario',
            content: [
                { subtitle: 'Funcionalidades', items: ['Ver Perfil: Visualización de datos del usuario', 'Editar Perfil: Modificación de datos personales', 'Cambiar Contraseña: Actualización de contraseña', 'Preferencias: Configuración de preferencias personales'] },
                { subtitle: 'Endpoints API', items: ['GET /api/auth/profile - Obtener perfil', 'PUT /api/auth/profile - Actualizar perfil'] },
            ]
        },
        export: {
            title: 'Exportación Masiva de Datos',
            content: [
                { subtitle: 'Funcionalidades', items: ['Formatos Soportados: CSV, Excel y PDF', 'Filtrado Previo: Exportación de datos filtrados', 'Entidades Soportadas: Reservas, productos, agencias, usuarios, logs'] },
                { subtitle: 'Endpoints API', items: ['GET /api/export/csv/:entityType - Exportar a CSV', 'GET /api/export/excel/:entityType - Exportar a Excel', 'GET /api/export/pdf/:entityType - Exportar a PDF'] },
            ]
        },
        auditoria: {
            title: 'Auditoría y Logs',
            content: [
                { subtitle: 'Funcionalidades', items: ['Registro Automático: Todas las acciones de usuarios se registran', 'Filtros Avanzados: Por fecha, usuario, tipo de acción', 'Paginación: Navegación por registros', 'Limpieza: Eliminación de logs antiguos'] },
                { subtitle: 'Endpoints API', items: ['GET /api/audit - Obtener logs de auditoría', 'DELETE /api/audit/cleanup - Limpiar logs antiguos'] },
            ]
        },
        backup: {
            title: 'Backup y Restauración',
            content: [
                { subtitle: 'Funcionalidades', items: ['Crear Backup: Generación de backup completo', 'Listar Backups: Vista de backups disponibles', 'Restaurar: Restauración desde backup', 'Descargar: Descarga de archivos de backup', 'Eliminar: Eliminación de backups antiguos'] },
                { subtitle: 'Endpoints API', items: ['POST /api/backup - Crear backup', 'GET /api/backup - Listar backups', 'POST /api/backup/restore - Restaurar desde backup', 'DELETE /api/backup/:filename - Eliminar backup', 'GET /api/backup/download/:filename - Descargar backup'] },
            ]
        },
        temas: {
            title: 'Modo Oscuro/Claro',
            content: [
                { subtitle: 'Funcionalidades', items: ['Toggle Global: Cambio entre modo claro y oscuro', 'Persistencia: Preferencia guardada en localStorage', 'Detección Automática: Detección de preferencia del sistema', 'Transiciones Suaves: Animaciones entre modos'] },
            ]
        },
        i18n: {
            title: 'Internacionalización (i18n)',
            content: [
                { subtitle: 'Funcionalidades', items: ['Soporte Multilenguaje: Español e inglés', 'Persistencia: Preferencia guardada en localStorage', 'Detección Automática: Detección de idioma del navegador', 'Más de 100 Términos: Traducciones completas'] },
            ]
        },
        busqueda: {
            title: 'Búsqueda Global y Filtros',
            content: [
                { subtitle: 'Funcionalidades', items: ['Búsqueda Global: Búsqueda en toda la aplicación', 'Atajo de Teclado: Ctrl+K para abrir búsqueda', 'Filtros Avanzados: Múltiples tipos de filtros', 'Visualización de Filtros: Filtros activos visibles'] },
            ]
        },
        atajos: {
            title: 'Atajos de Teclado',
            content: [
                { subtitle: 'Funcionalidades', items: ['Atajos Comunes: Ctrl+K (buscar), Ctrl+N (crear), Ctrl+S (guardar)', 'Ventana de Ayuda: Lista de atajos disponibles', 'Combinaciones Complejas: Soporte para atajos personalizados'] },
            ]
        },
        onboarding: {
            title: 'Onboarding Guiado',
            content: [
                { subtitle: 'Funcionalidades', items: ['Tutorial Paso a Paso: 6 pasos explicativos', 'Indicador de Progreso: Barra de progreso visual', 'Control de Flujo: Navegación anterior/siguiente', 'Opción de Cancelar: Salir del onboarding en cualquier momento'] },
            ]
        },
    };

    const currentSection = sectionContent[activeSection];

    return (
        <div className="flex h-full">
            {/* Sidebar de navegación */}
            <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Documentación</h2>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Guía completa del sistema
                    </p>
                </div>
                <nav className="p-2">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${activeSection === section.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{section.title}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Contenido principal */}
            <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
                <div className="max-w-4xl mx-auto p-8">
                    {/* Header de sección */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            {currentSection && (() => {
                                const Icon = sections.find(s => s.id === activeSection)?.icon || FileText;
                                return <Icon className="w-8 h-8 text-blue-600" />;
                            })()}
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                {currentSection?.title}
                            </h1>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            {sections.find(s => s.id === activeSection)?.description}
                        </p>
                    </div>

                    {/* Contenido de sección */}
                    {currentSection && (
                        <div className="space-y-8">
                            {currentSection.content.map((block, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                        <Code className="w-5 h-5 text-blue-600" />
                                        {block.subtitle}
                                    </h3>
                                    <ul className="space-y-2">
                                        {block.items.map((item, itemIdx) => (
                                            <li key={itemIdx} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        <p>{agency_name} - Sistema de Gestión de Cupos de Viajes Aéreos</p>
                        <p className="mt-1">© 2026 {agency_name} - Todos los derechos reservados</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Documentacion;
