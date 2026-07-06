import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { QueryClientProvider } from './lib/react-query';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ToastNotification from './components/ToastNotification';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GestionUsuarios from './pages/GestionUsuarios';
import GestionProductos from './pages/GestionProductos';
import GestionReservas from './pages/GestionReservas';
import GestionAgencias from './pages/GestionAgencias';
import GestionTemas from './pages/GestionTemas';
import GestionRoles from './pages/GestionRoles';
import GestionPermisos from './pages/GestionPermisos';
import ConfiguracionCorreo from './pages/ConfiguracionCorreo';
import PanelControl from './pages/PanelControl';
import Availability from './pages/Availability';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notificaciones from './pages/Notificaciones';
import Requests from './pages/Requests';
import Confirmations from './pages/Confirmations';
import Products from './pages/Products';
import WhiteLabelConfig from './pages/WhiteLabelConfig';
import EmailConfig from './pages/EmailConfig';
import AIConfig from './pages/AIConfig';
import TestPage from './pages/TestPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/globals.css';
import './i18n/i18n';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <Router>
              <div className="App">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/usuarios" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionUsuarios />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/productos" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionProductos />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/reservas" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionReservas />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/agencias" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionAgencias />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/temas" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionTemas />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/roles" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionRoles />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/permisos" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <GestionPermisos />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/correo" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <ConfiguracionCorreo />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/panel-control" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <PanelControl />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/availability" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Availability />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Profile />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Settings />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/notificaciones" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Notificaciones />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/requests" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Requests />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/confirmations" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Confirmations />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/products" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Products />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/marca-blanca" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <WhiteLabelConfig />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/email-config" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <EmailConfig />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/config-ia" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <AIConfig />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/test" 
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <TestPage />
                        </Layout>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Ruta para pruebas sin protección */}
                  <Route 
                    path="/test-public" 
                    element={
                      <Layout>
                        <TestPage />
                      </Layout>
                    } 
                  />
                </Routes>
                <ToastNotification />
              </div>
            </Router>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;