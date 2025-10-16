
import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition, Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { 
  HiChevronDown, 
  HiOutlineUser, 
  HiOutlineUserGroup, 
  HiOutlineShieldCheck, 
  HiOutlineCheck,
  HiMiniXMark,   
} from "react-icons/hi2";
import AuthorizationService from '../services/authorizationService';
import AgencyService from '../services/agencyService';

const UsuarioForm = ({ open, onClose, onSave, usuario }) => {
  const [agencias, setAgencias] = useState([]);
  const roles = AuthorizationService.getAvailableRoles();
  
  const [email, setEmail] = useState(usuario?.email || "");
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [agencia, setAgencia] = useState(usuario?.agencia || "");
  const [agenciaPersonalizada, setAgenciaPersonalizada] = useState("");
  const [role, setRole] = useState(usuario?.role || AuthorizationService.ROLES.AGENCY_USER);
  const [password, setPassword] = useState("");
  const isEdit = !!usuario;

  // Cargar agencias activas desde la tabla public.agencies
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const options = await AgencyService.listActiveAgencyOptions();
        const names = (options || []).map(o => o.name).filter(Boolean);
        if (active) setAgencias(names);
      } catch {
        // no-op
      }
    })();
    return () => { active = false; };
  }, []);

  // Establecer agencia por defecto cuando cargue la lista (solo en creación)
  useEffect(() => {
    if (!isEdit && agencias.length > 0 && !agencia) {
      setAgencia(agencias[0]);
    }
  }, [agencias, isEdit]);

  // Mapeo de iconos para roles
  const roleIcons = {
    [AuthorizationService.ROLES.ADMIN]: HiOutlineShieldCheck,
    [AuthorizationService.ROLES.AGENCY_ADMIN]: HiOutlineUserGroup,
    [AuthorizationService.ROLES.AGENCY_USER]: HiOutlineUser
  };

  // Sincronizar estados cuando cambia la prop usuario
  useEffect(() => {
    if (usuario) {
      setEmail(usuario.email || "");
      setNombre(usuario.nombre || "");
      setAgencia(usuario.agencia || agencias[0]);
      // Migrar admin boolean a role para compatibilidad
      if (usuario.role) {
        setRole(usuario.role);
      } else if (usuario.admin) {
        setRole(AuthorizationService.ROLES.ADMIN);
      } else {
        setRole(AuthorizationService.ROLES.AGENCY_USER);
      }
      
      // Si la agencia no está en la lista, establecer como "Otra"
      if (usuario.agencia && !agencias.includes(usuario.agencia)) {
        setAgencia("Otra");
        setAgenciaPersonalizada(usuario.agencia);
      } else {
        setAgenciaPersonalizada("");
      }
    } else {
      // Resetear formulario para crear nuevo usuario
      setEmail("");
      setNombre("");
      setAgencia(agencias[0]);
      setAgenciaPersonalizada("");
      setRole(AuthorizationService.ROLES.AGENCY_USER);
      setPassword("");
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const agenciaFinal = agencia === "Otra" ? agenciaPersonalizada : agencia;
    await onSave({
      email,
      nombre,
      agencia: agenciaFinal,
      role,
      // Mantener admin para compatibilidad con código existente
      admin: role === AuthorizationService.ROLES.ADMIN,
      password
    });
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" open={open} onClose={onClose}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}><HiMiniXMark className="w-6 h-6" /></button>
            <h2 className="text-xl font-bold mb-4 text-[#2c4b8b]">{isEdit ? "Editar Usuario" : "Crear Usuario"}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input type="text" className="w-full border px-3 py-2 rounded" value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agencia</label>
                <div className="mx-auto" style={{ width: '415px' }}>
                  <Listbox value={agencia} onChange={setAgencia}>
                    <div className="relative mt-1">
                      <ListboxButton className="w-full border px-3 py-2 rounded bg-white text-left flex items-center justify-between">
                        <span>{agencia}</span>
                        <HiChevronDown className="w-5 h-5 text-gray-400 ml-2" aria-hidden="true" />
                      </ListboxButton>
                      <ListboxOptions anchor="bottom" className="absolute mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-10" style={{ width: '415px' }}>
                        {agencias.map((ag, idx) => (
                          <ListboxOption key={idx} value={ag} className="cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-blue-100">
                            {ag}
                          </ListboxOption>
                        ))}
                        <ListboxOption value="Otra" className="cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-blue-100">
                          Otra (escribir manualmente)
                        </ListboxOption>
                      </ListboxOptions>
                    </div>
                  </Listbox>
                  {agencia === "Otra" && (
                    <input
                      type="text"
                      className="w-full border px-3 py-2 rounded mt-2"
                      placeholder="Escribe el nombre de la agencia"
                      value={agenciaPersonalizada}
                      onChange={e => setAgenciaPersonalizada(e.target.value)}
                      required
                    />
                  )}
                </div>
                </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            )}
              <div>
                <label className="block text-sm font-medium mb-1">Rol del Usuario</label>
                <div className="mx-auto" style={{ width: '415px' }}>
                  <Listbox value={role} onChange={setRole}>
                    <div className="relative mt-1">
                      <ListboxButton className="w-full border px-3 py-2 rounded bg-white text-left flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {React.createElement(roleIcons[role], { className: "w-4 h-4" })}
                          <span>{AuthorizationService.getRoleDescription(role)}</span>
                        </div>
                        <HiChevronDown className="w-5 h-5 text-gray-400 ml-2" aria-hidden="true" />
                      </ListboxButton>
                      <ListboxOptions anchor="bottom" className="absolute mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-10" style={{ width: '415px' }}>
                        {roles.map((roleOption) => (
                          <ListboxOption
                            key={roleOption.value}
                            value={roleOption.value}
                            className="cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-blue-100"
                          >
                            <div className="flex items-center gap-2">
                              {React.createElement(roleIcons[roleOption.value], { className: "w-4 h-4" })}
                              <span>{roleOption.label}</span>
                            </div>
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </div>
                  </Listbox>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button type="button" className="bg-gray-200 text-[#2c4b8b] px-6 py-2 rounded font-semibold flex items-center gap-2 hover:bg-gray-300 transition" onClick={onClose}>
                  <HiMiniXMark className="w-5 h-5" /> Cerrar
                </button>
                <button type="submit" className="bg-[#2c4b8b] text-white px-6 py-2 rounded font-semibold flex items-center gap-2">
                  <HiOutlineCheck className="w-5 h-5" /> {isEdit ? "Guardar cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UsuarioForm;
