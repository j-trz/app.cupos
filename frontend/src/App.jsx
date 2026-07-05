import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Availability from './pages/Availability.jsx';
import Requests from './pages/Requests.jsx';
import Confirmations from './pages/Confirmations.jsx';
import Profile from './pages/Profile.jsx';
import Products from './pages/Products.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import GestionAgencias from './pages/GestionAgencias.jsx';
import GestionUsuarios from './pages/GestionUsuarios.jsx';
import GestionReservas from './pages/GestionReservas.jsx';
import Notificaciones from './pages/Notificaciones.jsx';
import WhiteLabelConfig from './pages/WhiteLabelConfig.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx'; // New component for admin protection

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="availability" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="availability" element={<Availability />} />
          <Route path="requests" element={<Requests />} />
          <Route path="confirmations" element={<Confirmations />} />
          <Route path="profile" element={<Profile />} />
          {/* Admin-only routes */}
          <Route path="products" element={
            <AdminRoute>
              <Products />
            </AdminRoute>
          } />
          <Route path="settings" element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          } />
          <Route path="agencias" element={
            <AdminRoute>
              <GestionAgencias />
            </AdminRoute>
          } />
          <Route path="usuarios" element={
            <AdminRoute>
              <GestionUsuarios />
            </AdminRoute>
          } />
          <Route path="reservas" element={
            <AdminRoute>
              <GestionReservas />
            </AdminRoute>
          } />
          <Route path="notificaciones" element={
            <AdminRoute>
              <Notificaciones />
            </AdminRoute>
          } />
          <Route path="marca-blanca" element={
            <AdminRoute>
              <WhiteLabelConfig />
            </AdminRoute>
          } />
          <Route path="*" element={<Navigate to="availability" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;