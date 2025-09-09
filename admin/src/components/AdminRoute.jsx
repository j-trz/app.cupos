import { Navigate } from "react-router-dom"; // eslint-disable-line no-unused-vars
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { isLoading, isInitialized, hasAdminAccess, isAuthenticated } = useAuth();

  // Mostrar loading solo durante la inicialización
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Verificando acceso...</div>
        </div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir si no tiene acceso de admin
  if (!hasAdminAccess()) {
    console.warn('User does not have admin privileges');
    return <Navigate to="/" replace />;
  }

  return children;
}
