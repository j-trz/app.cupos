import React, { createContext, useContext, useState, useEffect } from 'react';

// Traducciones
const translations = {
  es: {
    // Navegación
    dashboard: 'Panel',
    availability: 'Disponibilidad',
    requests: 'Solicitudes',
    confirmations: 'Confirmaciones',
    profile: 'Perfil',
    products: 'Productos',
    settings: 'Ajustes',
    agencies: 'Agencias',
    users: 'Usuarios',
    reservations: 'Reservas',
    notifications: 'Notificaciones',
    whiteLabel: 'Marca Blanca',
    emailConfig: 'Configuración de Email',
    aiConfig: 'Configuración de IA',
    permissions: 'Permisos',
    roles: 'Roles',

    // Botones y acciones
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Crear',
    update: 'Actualizar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    confirm: 'Confirmar',
    resend: 'Reenviar',
    created: 'creado',
    confirmed: 'confirmado',
    expired: 'expirado',
    select_option: 'Seleccionar opción',
    previous: 'Anterior',
    next: 'Siguiente',
    finish: 'Finalizar',
    
    // Campos de formulario
    username: 'Nombre de usuario',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    name: 'Nombre',
    role: 'Rol',
    agency: 'Agencia',
    status: 'Estado',
    date: 'Fecha',
    time: 'Hora',
    quantity: 'Cantidad',
    product: 'Producto',
    customer: 'Cliente',
    
    // Estados
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    expired: 'Expirado',
    
    // Mensajes
    welcome: 'Bienvenido',
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información',
    loading: 'Cargando...',
    noResults: 'No se encontraron resultados',
    areYouSure: '¿Estás seguro?',
    actionCannotBeUndone: 'Esta acción no se puede deshacer.',
    
    // Otros
    themeLight: 'Modo Claro',
    themeDark: 'Modo Oscuro',
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
    close: 'Cerrar',
    refresh: 'Actualizar',
    download: 'Descargar',
    upload: 'Subir',
    connected_to_real_time_notifications: 'Conectado a notificaciones en tiempo real',
    disconnected_from_notifications: 'Desconectado de notificaciones',
    low_availability: 'Baja Disponibilidad',
    product_updated: 'Producto Actualizado',
    navigation: 'Navegación',
    theme_change: 'Cambio de tema',
    language_change: 'Cambio de idioma',
    completed: 'Completado',
    
    // Búsqueda global
    search_results: 'Resultados de búsqueda',
    results_for: 'Resultados para',
    enter_search_term: 'Ingrese un término de búsqueda',
    
    // Atajos de teclado
    keyboard_shortcuts: 'Atajos de teclado',
    show_help: 'Mostrar ayuda',
    press_esc_to_close: 'Presione ESC para cerrar esta ventana',
    
    // Onboarding
    onboarding: 'Guía de Bienvenida',
    onboarding_welcome_message: 'Bienvenido al panel de administración. Esta guía le ayudará a familiarizarse con las principales funciones.',
    onboarding_navigation_message: 'Use la barra lateral para navegar entre las diferentes secciones del sistema.',
    onboarding_search_message: 'Utilice la función de búsqueda para encontrar rápidamente elementos específicos.',
    onboarding_theme_message: 'Cambie entre modo claro y oscuro según su preferencia.',
    onboarding_language_message: 'Cambie el idioma del sistema según sus preferencias.',
    onboarding_completed_message: '¡Ha completado la guía de bienvenida! Ahora está listo para usar el sistema.'
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    availability: 'Availability',
    requests: 'Requests',
    confirmations: 'Confirmations',
    profile: 'Profile',
    products: 'Products',
    settings: 'Settings',
    agencies: 'Agencies',
    users: 'Users',
    reservations: 'Reservations',
    notifications: 'Notifications',
    whiteLabel: 'White Label',
    emailConfig: 'Email Config',
    aiConfig: 'AI Config',
    permissions: 'Permissions',
    roles: 'Roles',

    // Buttons and actions
    login: 'Login',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    confirm: 'Confirm',
    resend: 'Resend',
    created: 'created',
    confirmed: 'confirmed',
    expired: 'expired',
    select_option: 'Select option',
    previous: 'Previous',
    next: 'Next',
    finish: 'Finish',
    
    // Form fields
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Name',
    role: 'Role',
    agency: 'Agency',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    quantity: 'Quantity',
    product: 'Product',
    customer: 'Customer',
    
    // Statuses
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    
    // Messages
    welcome: 'Welcome',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading...',
    noResults: 'No results found',
    areYouSure: 'Are you sure?',
    actionCannotBeUndone: 'This action cannot be undone.',
    
    // Others
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
    close: 'Close',
    refresh: 'Refresh',
    download: 'Download',
    upload: 'Upload',
    connected_to_real_time_notifications: 'Connected to real-time notifications',
    disconnected_from_notifications: 'Disconnected from notifications',
    low_availability: 'Low Availability',
    product_updated: 'Product Updated',
    navigation: 'Navigation',
    theme_change: 'Theme Change',
    language_change: 'Language Change',
    completed: 'Completed',
    
    // Global search
    search_results: 'Search Results',
    results_for: 'Results for',
    enter_search_term: 'Enter a search term',
    
    // Keyboard shortcuts
    keyboard_shortcuts: 'Keyboard Shortcuts',
    show_help: 'Show Help',
    press_esc_to_close: 'Press ESC to close this window',
    
    // Onboarding
    onboarding: 'Welcome Guide',
    onboarding_welcome_message: 'Welcome to the admin panel. This guide will help you familiarize yourself with the main functions.',
    onboarding_navigation_message: 'Use the sidebar to navigate between different sections of the system.',
    onboarding_search_message: 'Use the search function to quickly find specific items.',
    onboarding_theme_message: 'Switch between light and dark mode according to your preference.',
    onboarding_language_message: 'Change the system language according to your preferences.',
    onboarding_completed_message: 'You have completed the welcome guide! You are now ready to use the system.'
  }
};

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    // Obtener idioma preferido del localStorage o navegador
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale) {
      return savedLocale;
    }
    
    // Detectar idioma del navegador
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' || browserLang === 'en' ? browserLang : 'es';
  });

  const t = (key) => {
    const translation = translations[locale]?.[key];
    return translation || key; // Devuelve la clave si no se encuentra la traducción
  };

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  useEffect(() => {
    // Actualizar atributo lang del html
    document.documentElement.lang = locale;
  }, [locale]);

  const value = {
    locale,
    t,
    changeLocale
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};