import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // eslint-disable-line no-unused-vars
import { AuthProvider, useAuth } from "./contexts/AuthContext"; // eslint-disable-line no-unused-vars
import ConfirmacionExitosa from "./pages/ConfirmacionExitosa"; // eslint-disable-line no-unused-vars

import Dashboard from "./pages/Dashboard"; // eslint-disable-line no-unused-vars
import Login from "./pages/Login"; // eslint-disable-line no-unused-vars
import CrearUsuario from "./pages/CrearUsuario"; // eslint-disable-line no-unused-vars
import GestionUsuarios from "./pages/GestionUsuarios"; // eslint-disable-line no-unused-vars
import GestionConexiones from "./pages/GestionConexiones"; // eslint-disable-line no-unused-vars
import GestionProductos from "./pages/GestionProductos"; // eslint-disable-line no-unused-vars
import Disponibilidad from "./pages/Disponibilidad"; // eslint-disable-line no-unused-vars
import Solicitudes from "./pages/Solicitudes"; // eslint-disable-line no-unused-vars
import Confirmaciones from "./pages/Confirmaciones"; // eslint-disable-line no-unused-vars
import Seguridad from "./pages/Seguridad"; // eslint-disable-line no-unused-vars
import Perfil from "./pages/Perfil"; // eslint-disable-line no-unused-vars
import { ensurePowerAutomateConnection } from "./utils/ensurePowerAutomateConnection";
import ReservationService from "./services/reservationService";

// Componente para rutas privadas
function PrivateRoute({ children }) { // eslint-disable-line no-unused-vars
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Componente para rutas de admin
function AdminRoute({ children }) { // eslint-disable-line no-unused-vars
  const { isAuthenticated, hasAdminAccess, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasAdminAccess()) {
    return <Navigate to="/admin/disponibilidad" replace />;
  }
  
  return children;
}

// Componente de rutas principal
function AppRoutes() { // eslint-disable-line no-unused-vars
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  // Ejecutar configuraciones una vez cuando la app se inicializa
  useEffect(() => {
    if (isInitialized) {
      const timer = setTimeout(() => {
        ensurePowerAutomateConnection();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // Mostrar loader mientras se inicializa
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/admin/disponibilidad" : "/login"} replace />}
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/confirmacion-exitosa"
          element={<ConfirmacionExitosa />}
        />
        <Route
          path="/admin/disponibilidad"
          element={
            <PrivateRoute>
              <Disponibilidad />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/solicitudes"
          element={
            <PrivateRoute>
              <Solicitudes />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/confirmaciones"
          element={
            <PrivateRoute>
              <Confirmaciones />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/crear-usuario"
          element={
            <AdminRoute>
              <CrearUsuario />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/gestion-usuarios"
          element={
            <AdminRoute>
              <GestionUsuarios />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/gestion-productos"
          element={
            <AdminRoute>
              <GestionProductos />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/gestion-conexiones"
          element={
            <AdminRoute>
              <GestionConexiones />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/seguridad"
          element={
            <AdminRoute>
              <Seguridad />
            </AdminRoute>
          }
        />
        {/* Rutas de compatibilidad para redireccionar rutas antiguas */}
        <Route path="/disponibilidad" element={<Navigate to="/admin/disponibilidad" replace />} />
        <Route path="/solicitudes" element={<Navigate to="/admin/solicitudes" replace />} />
        <Route path="/confirmaciones" element={<Navigate to="/admin/confirmaciones" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/admin/disponibilidad" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Componente App principal con AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
