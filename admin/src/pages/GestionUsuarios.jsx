import { useEffect, useState, Fragment } from "react";
import Swal from 'sweetalert2';
import { FaUserShield, FaUserPlus, FaEllipsisV, FaSync, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition } from '@headlessui/react';
import UserService from '../services/userService';
import Layout from '../components/Layout';
import UsuarioForm from '../components/UsuarioForm';

export default function GestionUsuarios() {
  const [seccion, setSeccion] = useState("gestion-usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Estados para paginación y filtros
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchUsuarios();
  }, [pagination.page, searchTerm, sortBy, sortOrder]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const result = await UserService.listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
      
      if (result.success) {
        setUsuarios(result.users || []);
        setPagination(result.pagination);
      } else {
        throw new Error('Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los usuarios: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

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
      try {
        setLoading(true);
        const result = await UserService.deleteUser(id);
        if (result.success) {
          // Refrescar la lista completa para mantener la paginación correcta
          await fetchUsuarios();
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: result.message || 'Usuario eliminado correctamente'
          });
        } else {
          throw new Error(result.error || 'Error al eliminar usuario');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el usuario: ' + error.message
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data) => {
    try {
      setLoading(true);
      
      // Validar datos antes de enviar
      const validationErrors = UserService.validateUserData(data, !!editUser);
      if (validationErrors.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Datos no válidos',
          html: validationErrors.map(error => `• ${error}`).join('<br>')
        });
        return;
      }

      if (editUser) {
        // Editar usuario
        const result = await UserService.updateUser({
          id: editUser.id,
          nombre: data.nombre,
          agencia: data.agencia,
          admin: data.admin,
          role: data.role
        });
        
        if (result.success) {
          setUsuarios(usuarios.map(u => u.id === editUser.id ? { ...u, ...data } : u));
          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: result.message || 'Usuario actualizado correctamente'
          });
        } else {
          throw new Error(result.error || 'Error al actualizar usuario');
        }
      } else {
        // Crear usuario
        const result = await UserService.createUser({
          email: data.email,
          password: data.password,
          nombre: data.nombre,
          agencia: data.agencia,
          admin: data.admin,
          role: data.role
        });
        
        if (result.success) {
          // Refrescar la lista de usuarios para obtener los datos completos
          await fetchUsuarios();
          Swal.fire({
            icon: 'success',
            title: 'Creado',
            text: result.message || 'Usuario creado correctamente'
          });
        } else {
          throw new Error(result.error || 'Error al crear usuario');
        }
      }
      
      setModalOpen(false);
      setEditUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el usuario: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset a la primera página
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPagination(prev => ({ ...prev, page: 1 })); // Reset a la primera página
  };

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#2c4b8b]">Gestión de Usuarios</h1>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition-colors"
              onClick={fetchUsuarios}
              disabled={loading}
              title="Refrescar lista"
            >
              <FaSync className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#2c4b8b] text-white rounded-lg shadow hover:bg-[#1e355e] transition-colors"
              onClick={handleCrear}
              disabled={loading}
            >
              <FaUserPlus className="w-5 h-5" />
              Crear Usuario
            </button>
          </div>
        </div>
        
        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o agencia..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Mostrando {usuarios.length} de {pagination.total} usuarios</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <FaSync className="animate-spin text-4xl text-[#2c4b8b] mx-auto mb-4" />
            <p className="text-gray-500">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-[800px]">
            <table className="w-full min-w-[900px] bg-white border-0 rounded-2xl shadow-xl">
              <thead>
                <tr className="bg-[#2c4b8b] text-white">
                  <th className="px-6 py-4 text-lg font-semibold text-center rounded-tl-2xl">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center justify-center gap-2 hover:text-blue-200 transition-colors mx-auto"
                    >
                      Email
                      {sortBy === 'email' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-lg font-semibold text-center">
                    <button
                      onClick={() => handleSort('nombre')}
                      className="flex items-center justify-center gap-2 hover:text-blue-200 transition-colors mx-auto"
                    >
                      Nombre
                      {sortBy === 'nombre' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-lg font-semibold text-center">
                    <button
                      onClick={() => handleSort('agencia')}
                      className="flex items-center justify-center gap-2 hover:text-blue-200 transition-colors mx-auto"
                    >
                      Agencia
                      {sortBy === 'agencia' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-lg font-semibold text-center">
                    <button
                      onClick={() => handleSort('admin')}
                      className="flex items-center justify-center gap-2 hover:text-blue-200 transition-colors mx-auto"
                    >
                      Admin
                      {sortBy === 'admin' && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-lg font-semibold text-center rounded-tr-2xl">Acciones</th>
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
        )}

        {/* Controles de paginación */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  pagination.hasPrevPage
                    ? 'border-[#2c4b8b] text-[#2c4b8b] hover:bg-[#2c4b8b] hover:text-white'
                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              
              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNumber;
                  if (pagination.totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNumber = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNumber = pagination.totalPages - 4 + i;
                  } else {
                    pageNumber = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        pagination.page === pageNumber
                          ? 'bg-[#2c4b8b] text-white border-[#2c4b8b]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  pagination.hasNextPage
                    ? 'border-[#2c4b8b] text-[#2c4b8b] hover:bg-[#2c4b8b] hover:text-white'
                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                Siguiente
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        <UsuarioForm 
          open={modalOpen} 
          onClose={() => { setModalOpen(false); setEditUser(null); }} 
          onSave={handleSave} 
          usuario={editUser} 
        />
      </div>
    </Layout>
  );
}
