import { useState, useEffect, useRef } from "react";
import { FaTimes, FaCheckDouble, FaEye, FaEyeSlash } from "react-icons/fa";
import { GoBell } from "react-icons/go";

import NotificationService from "../services/notificationService";

/**
 * Componente dropdown para mostrar notificaciones
 */
export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications();
    
    // Suscribirse a notificaciones en tiempo real
    let unsubscribe = () => {};
    
    const setupSubscription = async () => {
      try {
        unsubscribe = await NotificationService.subscribeToNotifications((newNotification) => {
          // Agregar nueva notificación al inicio de la lista
          setNotifications(prev => [
            {
              ...newNotification,
              data: NotificationService.safeParseJSON(newNotification.data)
            },
            ...prev.slice(0, 49) // Mantener solo las últimas 50
          ]);
          
          // Incrementar contador si no está leída (usar is_read del nuevo sistema)
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }

          // Mostrar notificación visual (opcional)
          showBrowserNotification(newNotification);
        });
      } catch (error) {
        console.warn("Error setting up notification subscription:", error);
      }
    };
    
    setupSubscription();

    return () => unsubscribe();
  }, []);

  /**
   * Cargar notificaciones desde el servidor
   */
  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await NotificationService.getNotifications(50);
      if (result.success) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } else {
        setError(result.error || "Error al cargar notificaciones");
      }
    } catch (err) {
      setError("Error al cargar notificaciones");
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Marcar notificación como leída
   */
  const markAsRead = async (notificationId) => {
    try {
      const result = await NotificationService.markAsRead(notificationId, true);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  /**
   * Alternar estado de lectura de una notificación
   */
  const toggleReadStatus = async (notificationId, currentReadStatus) => {
    try {
      const newReadStatus = !currentReadStatus;
      const result = await NotificationService.markAsRead(notificationId, newReadStatus);
      
      if (result.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? {
              ...n,
              is_read: newReadStatus,
              read_at: newReadStatus ? new Date().toISOString() : null
            } : n
          )
        );
        
        // Actualizar contador según el nuevo estado
        if (newReadStatus) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
          setUnreadCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Error toggling notification read status:", err);
    }
  };

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = async () => {
    try {
      const result = await NotificationService.markAllAsRead();
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  /**
   * Ocultar notificación (eliminar para el usuario actual)
   */
  const hideNotification = async (notificationId) => {
    try {
      const result = await NotificationService.hideNotification(notificationId, true);
      if (result.success) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Si la notificación no estaba leída, decrementar contador
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error("Error hiding notification:", err);
    }
  };

  /**
   * Mostrar notificación del navegador
   */
  const showBrowserNotification = (notification) => {
    if (Notification.permission === "granted") {
      new Notification(`${notification.icon} ${notification.title}`, {
        body: notification.message,
        icon: "/favicon.ico", // Usar el favicon de la app
        tag: notification.id, // Evitar duplicados
      });
    }
  };

  /**
   * Solicitar permisos para notificaciones del navegador
   */
  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  /**
   * Formatear tiempo relativo
   */
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Ahora";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  };

  /**
   * Obtener color según el tipo de notificación
   */
  const getNotificationColor = (color) => {
    const colors = {
      blue: "border-l-blue-500 bg-blue-50",
      green: "border-l-green-500 bg-green-50",
      orange: "border-l-orange-500 bg-orange-50",
      red: "border-l-red-500 bg-red-50",
      purple: "border-l-purple-500 bg-purple-50",
      gray: "border-l-gray-500 bg-gray-50",
    };

    return colors[color] || colors.blue;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestNotificationPermission();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none  rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <GoBell className="w-6 h-6" />
        
        {/* Badge de notificaciones no leídas */}
        {unreadCount > 0 && (
          <>
            {/* Punto rojo */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            {/* Contador */}
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-[#2c4b8b] hover:text-[#1a2952] font-medium"
                  title="Marcar todas como leídas"
                >
                  <FaCheckDouble className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2c4b8b] mx-auto"></div>
                <p className="mt-2 text-sm">Cargando notificaciones...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <p className="text-sm">{error}</p>
                <button
                  onClick={loadNotifications}
                  className="mt-2 text-sm text-[#2c4b8b] hover:text-[#1a2952]"
                >
                  Reintentar
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    getNotificationColor(notification.color, notification.priority)
                  } ${!notification.is_read ? "font-medium" : ""}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{notification.icon}</span>
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-[#2c4b8b] rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Toggle read/unread */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReadStatus(notification.id, notification.is_read);
                            }}
                            className="text-xs text-gray-400 hover:text-[#2c4b8b]"
                            title={notification.is_read ? "Marcar como no leída" : "Marcar como leída"}
                          >
                            {notification.is_read ? (
                              <FaEyeSlash className="w-3 h-3" />
                            ) : (
                              <FaEye className="w-3 h-3" />
                            )}
                          </button>
                          {/* Hide button (personal delete) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              hideNotification(notification.id);
                            }}
                            className="text-xs text-gray-400 hover:text-red-500"
                            title="Ocultar notificación"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button
                onClick={loadNotifications}
                className="text-sm text-[#2c4b8b] hover:text-[#1a2952] font-medium"
              >
                Actualizar notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}