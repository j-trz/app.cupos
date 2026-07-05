import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if user has admin role
    if (user && user.role) {
      setIsAdmin(user.role === 'admin');
    } else {
      // If user doesn't have role property, try to get it from profile
      const checkUserRole = async () => {
        try {
          // In a real implementation, we would fetch the full user profile
          // For now, we'll check if role exists in user object
          setIsAdmin(user?.role === 'admin');
        } catch (error) {
          console.error('Error checking user role:', error);
          setIsAdmin(false);
        } finally {
          setChecked(true);
        }
      };
      
      checkUserRole();
    }
    
    if (user?.role) {
      setChecked(true);
    }
  }, [user]);

  if (!checked) {
    // Loading state while checking user role
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/availability" replace />;
  }

  return children;
}