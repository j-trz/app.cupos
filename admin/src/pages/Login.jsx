import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!email || !password) {
      setLoading(false);
      await Swal.fire({ icon: 'error', title: 'Campos requeridos', text: 'Completa todos los campos.' });
      return;
    }
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginError) {
      setLoading(false);
      await Swal.fire({ icon: 'error', title: 'Error de acceso', html: `<pre>${JSON.stringify(loginError, null, 2)}</pre>` });
      return;
    }
    // Consultar perfil del usuario
    const user = data?.user;
    if (!user) {
      setLoading(false);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener el usuario.' });
      return;
    }

    // Obtener perfil del usuario desde la base de datos
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfilData) {
      setLoading(false);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener el perfil del usuario.' });
      return;
    }

    const perfil = perfilData;

    // Si todo ok, navega
    if (typeof onLogin === 'function') onLogin();
    if (perfil.admin) {
      navigate("/dashboard"); // Panel admin
    } else {
      navigate("/disponibilidad"); // Panel usuario
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2c4b8b] to-[#93d5e8] font-montserrat">
      <div className="bg-white/80 rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex justify-center mb-6"><img className="h-[100px] w-[100px]" src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/Je_logo-01.png" alt="Logo" /></div>
        <h2 className="text-xl font-bold text-center text-[#2c4b8b] mb-6">Iniciar sesión</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-[#2c4b8b] mb-1">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#2c4b8b]"><FaUser /></span>
              <input
                type="email"
                className="w-full pl-10 pr-3 py-2 border text-[#2c4b8b] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c4b8b]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#2c4b8b] mb-1">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#2c4b8b]"><FaLock /></span>
              <input
                type="password"
                className="w-full pl-10 pr-3 py-2 border text-[#2c4b8b] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c4b8b]"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          {/* Los errores ahora se muestran con SweetAlert2 */}
          <button
            type="submit"
            className="w-full bg-[#2c4b8b] hover:bg-[#1e355e] text-white font-semibold py-2 rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}