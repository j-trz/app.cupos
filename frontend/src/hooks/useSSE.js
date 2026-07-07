import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personalizado para conectar al servicio SSE (Server-Sent Events)
 * Permite recibir notificaciones en tiempo real desde el backend
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enabled - Si está habilitado (default: true)
 * @param {function} options.onNotification - Callback cuando llega una notificación
 * @param {function} options.onReservationUpdate - Callback cuando hay actualización de reserva
 * @param {function} options.onProductUpdate - Callback cuando hay actualización de producto
 * @param {function} options.onError - Callback cuando ocurre un error
 * @returns {Object} Estado y métodos del hook
 */
export function useSSE(options = {}) {
  const { user } = useAuth();
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 segundos

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [stats, setStats] = useState({ totalReceived: 0, lastReceivedAt: null });

  const {
    enabled = true,
    onNotification,
    onReservationUpdate,
    onProductUpdate,
    onError
  } = options;

  /**
   * Conecta al servicio SSE
   */
  const connect = useCallback(() => {
    if (!user || !enabled) return;

    // Limpiar conexión existente
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('api_token');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const sseUrl = `${baseUrl}/sse`;

    // Crear EventSource con headers (usando fetch con ReadableStream para SSE con auth)
    // Nota: EventSource nativo no soporta headers personalizados, 
    // así que usamos un polyfill con fetch
    const connectSSE = async () => {
      try {
        const response = await fetch(sseUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
          }
        });

        if (!response.ok) {
          // Errores 5xx = servidor no soporta SSE (ej: Vercel serverless). No reintentar.
          if (response.status >= 500) {
            return;
          }
          throw new Error(`Error de conexión SSE: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        eventSourceRef.current = { reader, controller: new AbortController() };
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Procesar el stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Procesar eventos completos (separados por doble salto de línea)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Mantener el último fragmento incompleto

          for (const eventText of events) {
            if (!eventText.trim()) continue;

            const lines = eventText.split('\n');
            let eventType = 'message';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                data += line.slice(5).trim();
              }
            }

            if (data) {
              try {
                const parsedData = JSON.parse(data);
                handleEvent(eventType, parsedData);
              } catch (e) {
                console.warn('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error connecting to SSE:', error);
        setIsConnected(false);
        
        if (onError) {
          onError(error);
        }

        // Intentar reconectar
        scheduleReconnect();
      }
    };

    connectSSE();
  }, [user, enabled, onNotification, onReservationUpdate, onProductUpdate, onError]);

  /**
   * Maneja los eventos recibidos del SSE
   */
  const handleEvent = useCallback((eventType, data) => {
    setLastEvent({ type: eventType, data, timestamp: new Date() });
    setStats(prev => ({
      totalReceived: prev.totalReceived + 1,
      lastReceivedAt: new Date()
    }));

    switch (eventType) {
      case 'connected':
        console.log('✅ SSE conectado:', data);
        break;

      case 'notification':
        if (onNotification) {
          onNotification(data);
        }
        break;

      case 'reservation_update':
      case 'reservation_created':
      case 'reservation_confirmed':
      case 'reservation_expired':
        if (onReservationUpdate) {
          onReservationUpdate({ type: eventType, ...data });
        }
        break;

      case 'product_update':
      case 'product_low_availability':
        if (onProductUpdate) {
          onProductUpdate({ type: eventType, ...data });
        }
        break;

      case 'heartbeat':
        // Mantener conexión viva
        break;

      default:
        console.log('SSE event received:', eventType, data);
    }
  }, [onNotification, onReservationUpdate, onProductUpdate]);

  /**
   * Programa un intento de reconexión
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Máximo de intentos de reconexión alcanzado');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

    console.log(`🔄 Reconectando SSE en ${delay}ms (intento ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  /**
   * Desconecta del servicio SSE
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      if (eventSourceRef.current.reader) {
        eventSourceRef.current.reader.cancel();
      }
      if (eventSourceRef.current.controller) {
        eventSourceRef.current.controller.abort();
      }
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Conectar cuando el componente se monta y el usuario está disponible
  useEffect(() => {
    if (user && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, enabled]);

  // Reconectar cuando la ventana recupera el foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && enabled && !isConnected) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, enabled, isConnected, connect]);

  return {
    isConnected,
    lastEvent,
    stats,
    connect,
    disconnect
  };
}

export default useSSE;
