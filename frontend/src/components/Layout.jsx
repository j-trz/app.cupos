import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet context={{ user }} />
      </main>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />
    </div>
  );
}
