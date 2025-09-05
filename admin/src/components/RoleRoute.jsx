import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";// eslint-disable-line no-unused-vars
import AuthorizationService from '../services/authorizationService';

/**
 * Componente de ruta protegida por roles
 * Permite especificar uno o múltiples roles que pueden acceder
 */
export default function RoleRoute({ children, allowedRoles = [], requireAllRoles = false }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkRoleAccess = async () => {
      try {
        setError(null);
        
        // Si no se especifican roles, permitir acceso a usuarios autenticados
        if (!allowedRoles || allowedRoles.length === 0) {
          const profile = await AuthorizationService.getCurrentUserProfile();
          setHasAccess(!!profile);
          return;
        }

        // Obtener el rol del usuario actual
        const userRole = await AuthorizationService.getCurrentUserRole();
        
        // Verificar acceso según los roles permitidos
        let access = false;
        
        if (requireAllRoles) {
          // Requiere TODOS los roles (poco común, pero útil para casos especiales)
          access = allowedRoles.every(role => userRole === role);
        } else {
          // Requiere AL MENOS UNO de los roles (comportamiento normal)
          access = allowedRoles.includes(userRole);
        }

        setHasAccess(access);

        if (!access) {
          console.warn(`User with role '${userRole}' does not have access to this route. Required roles:`, allowedRoles);
        }
      } catch (error) {
        console.error('Error checking role access:', error);
        setHasAccess(false);
        setError('Error al verificar permisos de acceso');
      } finally {
        setLoading(false);
      }
    };

    checkRoleAccess();
  }, [allowedRoles, requireAllRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c4b8b] mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Verificando acceso...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Componente específico para rutas de solo administrador
 * Mantiene compatibilidad con AdminRoute existente
 */
export function AdminRoute({ children }) {
  return (
    <RoleRoute allowedRoles={[AuthorizationService.ROLES.ADMIN]}>
      {children}
    </RoleRoute>
  );
}

/**
 * Componente para rutas que requieren rol de administrador de agencia o superior
 */
export function AgencyAdminRoute({ children }) {
  return (
    <RoleRoute allowedRoles={[
      AuthorizationService.ROLES.ADMIN,
      AuthorizationService.ROLES.AGENCY_ADMIN
    ]}>
      {children}
    </RoleRoute>
  );
}

/**
 * Componente para rutas accesibles a cualquier usuario autenticado
 */
export function AuthenticatedRoute({ children }) {
  return (
    <RoleRoute allowedRoles={[]}>
      {children}
    </RoleRoute>
  );
}