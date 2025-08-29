import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// Protección simple: simula sesión en memoria
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
          element={
            <PrivateRoute isAuth={isAuth}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<Login onLogin={() => setIsAuth(true)} />} />
        <Route path="*" element={<Navigate to={isAuth ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
