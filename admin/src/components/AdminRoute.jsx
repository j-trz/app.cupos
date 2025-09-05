import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom"; // eslint-disable-line no-unused-vars
import UserService from '../services/userService';

export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setError(null);
        
        // Verificar permisos de administrador usando el servicio seguro
        const adminStatus = await UserService.isCurrentUserAdmin();
        setIsAdmin(adminStatus);

        if (!adminStatus) {
          console.warn('User does not have admin privileges');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setError('Error al verificar permisos');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Verificando acceso...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
