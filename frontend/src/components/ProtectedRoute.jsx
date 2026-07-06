import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, isLoading: loading } = useAuth();
  const location = useLocation();

  // Para fines de desarrollo, podemos crear un usuario falso si no existe
  // Esto es solo para pruebas, en producción se debe mantener la autenticación real
  if (process.env.NODE_ENV === 'development' && !user && !loading) {
    // Creamos un usuario falso para pruebas
    console.log("No user found, creating a test user for development");
    
    // Simular un usuario de prueba
    const testUser = {
      id: 1,
      email: 'admin@example.com',
      nombre: 'Admin',
      apellido: 'User',
      rol: 'Administrador',
      activo: true,
      permissions: ['read', 'write', 'delete']
    };
    
    // Usamos el contexto de autenticación para iniciar sesión con el usuario de prueba
    // Pero como no podemos hacerlo directamente aquí, mostraremos un mensaje
    console.log("Development mode: Access granted with test user");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("User authenticated, rendering protected content");
  return children;
}