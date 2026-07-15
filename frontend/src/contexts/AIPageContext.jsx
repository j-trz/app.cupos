import { createContext, useContext, useRef, useState, useCallback } from 'react';

const AIPageContext = createContext(null);

// Contexto global para que el Asistente IA sepa en qué pantalla está el
// usuario (para responder preguntas sobre lo que ve) y pueda ejecutar
// acciones reales en esa pantalla (abrir el modal de reserva, completar el
// formulario de pasajeros) — ver ai_handler.go (PageContextInput, UIAction).
export function AIPageProvider({ children }) {
  const [pageContext, setPageContextState] = useState(null); // { page, visibleItems }
  // Los handlers de acción viven en un ref (no en estado) porque cambian con
  // cada render de la página que los registra y no necesitan disparar un
  // re-render propio — solo los lee AIChatWindow al despachar una acción.
  const actionHandlersRef = useRef({});

  const setPageContext = useCallback((ctx) => {
    setPageContextState(ctx);
  }, []);

  const clearPageContext = useCallback(() => {
    setPageContextState(null);
    actionHandlersRef.current = {};
  }, []);

  // Las páginas llaman esto (típicamente en un useEffect) para exponer los
  // callbacks que ejecutan cada tipo de acción. Devuelve una función de
  // limpieza para usar en el cleanup del useEffect.
  const registerActionHandlers = useCallback((handlers) => {
    actionHandlersRef.current = handlers || {};
    return () => {
      actionHandlersRef.current = {};
    };
  }, []);

  // AIChatWindow llama esto con los `ui_actions` que vienen en la respuesta
  // del backend. Si la página actual no registró un handler para algún tipo
  // de acción, esa acción puntual simplemente se ignora (no hay pantalla que
  // la pueda ejecutar en este momento).
  const dispatchUIActions = useCallback((actions) => {
    if (!Array.isArray(actions) || actions.length === 0) return;
    actions.forEach((action) => {
      if (!action || !action.type) return;
      const handlers = actionHandlersRef.current;
      if (action.type === 'open_reservation_modal' && typeof handlers.openReservationModal === 'function') {
        handlers.openReservationModal(action.payload?.product_id);
      } else if (action.type === 'fill_passenger_form' && typeof handlers.fillPassengers === 'function') {
        handlers.fillPassengers(action.payload?.passengers || []);
      }
    });
  }, []);

  const value = {
    pageContext,
    setPageContext,
    clearPageContext,
    registerActionHandlers,
    dispatchUIActions,
  };

  return <AIPageContext.Provider value={value}>{children}</AIPageContext.Provider>;
}

export function useAIPageContext() {
  const ctx = useContext(AIPageContext);
  if (!ctx) {
    throw new Error('useAIPageContext debe usarse dentro de AIPageProvider');
  }
  return ctx;
}
