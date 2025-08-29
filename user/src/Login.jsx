import React, { useState } from "react";
import { FaUser, FaLock } from "react-icons/fa";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Aquí deberías integrar Supabase o tu backend de auth
    if (!email || !password) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }
    // Simulación de login exitoso
    setTimeout(() => {
      setLoading(false);
      if (email === "user@demo.com" && password === "user") {
        onLogin && onLogin();
      } else {
        setError("Credenciales incorrectas.");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2c4b8b] to-[#cc6200] font-montserrat">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-[#2c4b8b] mb-6">Iniciar sesión</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400"><FaUser /></span>
              <input
                type="email"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c4b8b]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400"><FaLock /></span>
              <input
                type="password"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c4b8b]"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <div className="text-red-600 text-center">{error}</div>}
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