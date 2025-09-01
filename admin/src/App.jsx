import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CrearUsuario from "./pages/CrearUsuario";
import GestionUsuarios from "./pages/GestionUsuarios";
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
          path="/disponibilidad"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Disponibilidad />
            </PrivateRoute>
          }
        />
        <Route
          path="/solicitudes"
          element={
            <PrivateRoute isAuth={isAuth}>
              <Solicitudes />
            </PrivateRoute>
          }
        />
        <Route
          path="/confirmaciones"
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
  <Route path="*" element={<Navigate to={isAuth ? "/disponibilidad" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
