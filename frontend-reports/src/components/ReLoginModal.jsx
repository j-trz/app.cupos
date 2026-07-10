import React, { useState } from 'react';
import { HiOutlineLockClosed, HiOutlineExclamationTriangle } from 'react-icons/hi2';

export default function ReLoginModal({ isOpen, onReLogin, onCancel }) {
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
    // La contraseña no se sanitiza para no corromper caracteres especiales
    const rawPassword = password.trim();
    
    if (!safeEmail || !rawPassword) {
      setError('Completa todos los campos.');
      return;
    }
    
    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    try {
      // Llamada a la API de login local
      const resp = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: safeEmail, password: rawPassword }),
        credentials: 'include',
      });
      
      const result = await resp.json();
      
      if (!resp.ok || !result.token) {
        setError(result.error || 'Credenciales incorrectas.');
      } else {
        // Login exitoso, actualizar token y cerrar modal
        onReLogin(result.token);
        setEmail('');
        setPassword('');
        setError('');
      }
    } catch {
      setError('Error de red. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fadeIn">
        
        {/* Icono de advertencia */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <HiOutlineExclamationTriangle size={32} className="text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-[#304D85] text-center">Sesión Expirada</h2>
          <p className="text-gray-600 text-center mt-2 text-sm">
            Tu sesión ha expirado. Ingresa tus credenciales para continuar sin perder tu trabajo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#304D85]">Email</label>
            <input
              type="email"
              className="w-full border border-[#d1d5db] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
              maxLength={80}
              placeholder="usuario@empresa.com"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#304D85]">Contraseña</label>
            <input
              type="password"
              className="w-full border border-[#d1d5db] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={80}
              placeholder="********"
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm font-semibold text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cerrar Sesión
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#2563eb] to-[#304D85] text-white rounded-xl py-3 px-4 font-semibold shadow-lg hover:from-[#304D85] hover:to-[#2563eb] transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <HiOutlineLockClosed size={16} className="mr-2" />
                  Continuar
                </span>
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          Tus datos y filtros se mantendrán tal como los dejaste
        </div>
      </div>
    </div>
  );
}