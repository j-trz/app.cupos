import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ConfirmacionExitosa from "./pages/ConfirmacionExitosa";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CrearUsuario from "./pages/CrearUsuario";
import GestionUsuarios from "./pages/GestionUsuarios";
import GestionConexiones from "./pages/GestionConexiones";
import Disponibilidad from "./pages/Disponibilidad";
import Solicitudes from "./pages/Solicitudes";
import Confirmaciones from "./pages/Confirmaciones";
import AdminRoute from "./components/AdminRoute";

function PrivateRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [isAuth, setIsAuth] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuth ? "/admin/disponibilidad" : "/login"} replace />}
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<Login onLogin={() => setIsAuth(true)} />} />
        <Route
          path="/confirmacion-exitosa"
          element={<ConfirmacionExitosa />}
        />
        <Route
          path="/admin/disponibilidad"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Disponibilidad />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/solicitudes"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Solicitudes />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/confirmaciones"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Confirmaciones />
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
          path="/admin/gestion-conexiones"
          element={
            <AdminRoute>
              <GestionConexiones />
            </AdminRoute>
          }
        />
        {/* Rutas de compatibilidad para redireccionar rutas antiguas */}
        <Route path="/disponibilidad" element={<Navigate to="/admin/disponibilidad" replace />} />
        <Route path="/solicitudes" element={<Navigate to="/admin/solicitudes" replace />} />
        <Route path="/confirmaciones" element={<Navigate to="/admin/confirmaciones" replace />} />
        <Route path="*" element={<Navigate to={isAuth ? "/admin/disponibilidad" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
