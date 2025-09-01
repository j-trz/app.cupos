import React from "react";
import { Navigate } from "react-router-dom";
import { supabase } from '../supabaseClient';

export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data: perfil } = await supabase
        .from('profiles')
        .select('admin')
        .eq('id', user.id)
        .single();
      setIsAdmin(perfil?.admin === true);
      setLoading(false);
    };
    getProfile();
  }, []);

  if (loading) return <div className="p-8 text-center">Verificando acceso...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
