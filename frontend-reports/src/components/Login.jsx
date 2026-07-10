import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://dashboard-cupos.onrender.com/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sanitiza el input para evitar inyección
  function sanitize(input) {
    return input.replace(/['";\\<>]/g, '').trim();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const safeEmail = sanitize(email);
    const safePassword = sanitize(password);
    if (!safeEmail || !safePassword) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      // Llamada a la API de login en producción
      const resp = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: safeEmail, password: safePassword }),
        credentials: 'include',
      });
      const result = await resp.json();
      if (!resp.ok || !result.token) {
        setError(result.error || 'Credenciales incorrectas.');
      } else {
        try {
          await supabase.auth.setSession({
            access_token: result.token,
            refresh_token: result.refresh_token
          });
          if (result.refresh_token) {
            localStorage.setItem('refresh_token', result.refresh_token);
          }
        } catch {
          // silencioso
        }
        onLogin(result.token);
      }
    } catch {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#304D85] via-[#2563eb] to-[#60a5fa]">
      <form onSubmit={handleSubmit} className="bg-white/90 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-[#e0e7ef] backdrop-blur flex flex-col items-center">
        <img src="/icon.ico" alt="Logo" className="w-20 h-20 mb-6 drop-shadow-lg" />
        <h2 className="text-xl font-bold mb-6 text-[#304D85] text-center">Iniciar sesión</h2>
        
        <div className="px-4 mb-4 w-full">
          <label className="block text-sm font-semibold mb-2 text-[#304D85]">Email</label>
          <input
            type="email"
            className="w-full border border-[#d1d5db] rounded-xl p-3 text-base focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
            maxLength={80}
            placeholder="usuario@empresa.com"
          />
        </div>
        <div className="px-4 mb-4 w-full">
          <label className="block text-sm font-semibold mb-2 text-[#304D85]">Contraseña</label>
          <input
            type="password"
            className="w-full border border-[#d1d5db] rounded-xl p-3 text-base focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={80}
            placeholder="********"
          />
        </div>
        {error && <div className="mb-4 text-red-600 text-sm font-semibold text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#2563eb] to-[#304D85] text-white rounded-full py-2 font-semibold shadow-lg hover:from-[#304D85] hover:to-[#2563eb] transition"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Ingresando...
            </span>
          ) : 'Ingresar'}
        </button>
        <div className="mt-6 text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Jetmar - Panel de Cupos
        </div>
      </form>
    </div>
  );
}
