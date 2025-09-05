import React, { useEffect, useState, Fragment } from "react";
import Swal from 'sweetalert2';
import { FaUserShield, FaUserPlus, FaEllipsisV } from "react-icons/fa";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition } from '@headlessui/react';
import { supabase } from '../supabaseClient';
import Layout from '../components/Layout';
import UsuarioForm from '../components/UsuarioForm';

// Mueve la lógica y el estado aquí fuera del UsuarioForm
export default function GestionUsuarios() {
  const [seccion, setSeccion] = useState("gestion-usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error) setUsuarios(data || []);
    };
    fetchUsuarios();
  }, []);

  const handleCrear = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  const handleEditar = (usuario) => {
    setEditUser(usuario);
    setModalOpen(true);
  };

  const handleEliminar = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (confirm.isConfirmed) {
      setLoading(true);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
        setUsuarios(usuarios.filter(u => u.id !== id));
        Swal.fire('Eliminado', 'Usuario eliminado.', 'success');
      }
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    setLoading(true);
    if (editUser) {
      // Editar usuario
      const { error } = await supabase.from('profiles').update({
        nombre: data.nombre,
        agencia: data.agencia,
        admin: data.admin
      }).eq('id', editUser.id);
      if (!error) {
        setUsuarios(usuarios.map(u => u.id === editUser.id ? { ...u, ...data } : u));
        Swal.fire('Guardado', 'Usuario actualizado.', 'success');
      }
    } else {
      // Crear usuario en Auth y luego perfil
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      });
      if (signUpError) {
        Swal.fire('Error', 'No se pudo crear el usuario en Auth: ' + signUpError.message, 'error');
        setLoading(false);
        return;
      }
      const userId = signUpData && signUpData.user ? signUpData.user.id : null;
      if (!userId) {
        Swal.fire('Error', 'No se obtuvo el ID del usuario creado.', 'error');
        setLoading(false);
        return;
      }
      const perfil = {
        id: userId,
        email: data.email,
        nombre: data.nombre,
        agencia: data.agencia,
        admin: data.admin
      };
      // Verificar si ya existe el perfil
      const { data: existing, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      if (selectError && selectError.code !== 'PGRST116') {
        Swal.fire('Error', 'No se pudo consultar el perfil: ' + selectError.message, 'error');
        setLoading(false);
        return;
      }
      if (existing) {
        Swal.fire('Info', 'El perfil ya existe, no se creó duplicado.', 'info');
      } else {
        const { error: perfilError } = await supabase.from('profiles').insert([perfil]);
        if (!perfilError) {
          setUsuarios([...usuarios, perfil]);
          Swal.fire('Creado', 'Perfil creado correctamente.', 'success');
        } else if (perfilError.code === '23505') {
          Swal.fire('Info', 'El perfil ya existe, no se creó duplicado.', 'info');
        } else {
          Swal.fire('Error', 'No se pudo crear el perfil: ' + perfilError.message, 'error');
        }
      }
    }
    setModalOpen(false);
    setEditUser(null);
    setLoading(false);
  };

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#2c4b8b]">Gestión de Usuarios</h1>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#2c4b8b] text-white rounded-lg shadow hover:bg-[#1e355e] transition-colors"
            onClick={handleCrear}
          >
            <FaUserPlus className="w-5 h-5" />
            Crear Usuario
          </button>
        </div>
        <div>
          <div>
            <table className="w-full min-w-[900px] bg-white border-0 rounded-2xl shadow-xl">
                <thead>
                  <tr className="bg-[#2c4b8b] text-white">
                    <th className="px-6 py-4 text-lg font-semibold rounded-tl-2xl">Email</th>
                    <th className="px-6 py-4 text-lg font-semibold">Nombre</th>
                    <th className="px-6 py-4 text-lg font-semibold">Agencia</th>
                    <th className="px-6 py-4 text-lg font-semibold">Admin</th>
                    <th className="px-6 py-4 text-lg font-semibold rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr
                      key={u.id || u.email}
                      className={`last:border-b-0 cursor-pointer transition-all duration-150 ${selectedRow === u.id ? 'bg-[#e6f0fa]' : 'hover:bg-[#e6f0fa]'} group`}
                      style={{ height: '64px' }}
                      onClick={() => setSelectedRow(u.id)}
                    >
                      <td className="px-6 py-4 text-base whitespace-nowrap text-center">{u.email}</td>
                      <td className="px-6 py-4 text-base whitespace-nowrap text-center">{u.nombre}</td>
                      <td className="px-6 py-4 text-base whitespace-nowrap text-center">{u.agencia}</td>
                      <td className="px-6 py-4 text-center">
                        {u.admin ? <FaUserShield className="w-6 h-6 text-green-600 inline" /> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 flex gap-3 justify-center">
                        <Listbox value={null} onChange={action => { if(action==='edit') handleEditar(u); if(action==='delete') handleEliminar(u.id); }}>
                          <div className="relative">
                            <ListboxButton className="flex items-center px-3 py-2 rounded-lg bg-[#e6f0fa] hover:bg-[#2c4b8b] hover:text-white transition-colors shadow group-hover:bg-[#2c4b8b] group-hover:text-white">
                              <FaEllipsisV className="w-5 h-5" />
                            </ListboxButton>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                              <ListboxOptions className="absolute right-0 mt-1 w-36 bg-white shadow-lg rounded-xl py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-10">
                                <ListboxOption value="edit" className={({ active }) => `cursor-pointer select-none py-2 px-4 rounded ${active ? 'bg-[#e6f0fa] text-[#2c4b8b]' : 'text-gray-900'}`}>Editar</ListboxOption>
                                <ListboxOption value="delete" className={({ active }) => `cursor-pointer select-none py-2 px-4 rounded ${active ? 'bg-red-100 text-red-900' : 'text-gray-900'}`}>Eliminar</ListboxOption>
                              </ListboxOptions>
                            </Transition>
                          </div>
                        </Listbox>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Sin paginación, muestra todos los usuarios */}
          </div>
        <UsuarioForm open={modalOpen} onClose={() => { setModalOpen(false); setEditUser(null); }} onSave={handleSave} usuario={editUser} />
      </div>
    </Layout>
  );
}

