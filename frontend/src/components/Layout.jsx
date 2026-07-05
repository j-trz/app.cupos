import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import SidebarProvider from './ui/SidebarProvider.jsx';
import SidebarTrigger from './ui/SidebarTrigger.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-100">
        <div className="flex min-h-screen">
          <Sidebar user={user} onLogout={handleLogout} />
          <main className="flex-1 p-8 xl:p-10">
            <div className="mx-auto max-w-[1440px]">
              <div className="mb-6 flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex-1" />
              </div>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
