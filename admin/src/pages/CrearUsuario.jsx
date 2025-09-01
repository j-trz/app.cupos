import React, { useState } from "react";
import Swal from 'sweetalert2';

import { supabase } from '../supabaseClient';

export default function CrearUsuario() {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [agencia, setAgencia] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Crear usuario en Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { nombre, agencia },
      email_confirm: true
    });
    if (error) {
      setLoading(false);
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      return;
    }
    const userId = data.user?.id;
    // Crear perfil en profiles
    const { error: perfilError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      nombre,
      agencia,
      admin
    });
    setLoading(false);
    if (perfilError) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Usuario creado en Auth pero no en perfiles.' });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Usuario creado', text: 'El usuario fue creado correctamente.' });
    setEmail(""); setNombre(""); setAgencia(""); setPassword(""); setAdmin(false);
  };

  return (
    <form className="bg-white p-6 rounded shadow max-w-lg mx-auto" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-4 text-[#2c4b8b]">Crear Usuario</h2>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input type="text" className="w-full border px-3 py-2 rounded" value={nombre} onChange={e => setNombre(e.target.value)} required />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Agencia</label>
        <input type="text" className="w-full border px-3 py-2 rounded" value={agencia} onChange={e => setAgencia(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <input type="checkbox" id="admin" checked={admin} onChange={e => setAdmin(e.target.checked)} />
        <label htmlFor="admin" className="text-sm">¿Es administrador?</label>
      </div>
      <button type="submit" className="bg-[#2c4b8b] text-white px-6 py-2 rounded font-semibold" disabled={loading}>
        {loading ? "Creando..." : "Crear Usuario"}
      </button>
    </form>
  );
}
