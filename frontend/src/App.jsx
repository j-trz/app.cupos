import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Availability from './pages/Availability.jsx';
import Requests from './pages/Requests.jsx';
import Confirmations from './pages/Confirmations.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

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
          <Route path="*" element={<Navigate to="availability" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
