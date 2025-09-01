
import React, { useState, Fragment } from "react";
import { Dialog, Transition, Listbox, ListboxButton, ListboxOptions, ListboxOption, Switch } from '@headlessui/react';
import { FaCheck, FaTimes } from "react-icons/fa";
import { ChevronDownIcon } from '@heroicons/react/20/solid';

const UsuarioForm = ({ open, onClose, onSave, usuario }) => {
  const agencias = ["Avianca", "Latam", "Wingo", "Ultra", "Otra"];
  const [email, setEmail] = useState(usuario?.email || "");
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [agencia, setAgencia] = useState(usuario?.agencia || agencias[0]);
  const [admin, setAdmin] = useState(usuario?.admin || false);
  const [password, setPassword] = useState("");
  const isEdit = !!usuario;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ email, nombre, agencia, admin, password });
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" open={open} onClose={onClose}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}><FaTimes className="w-6 h-6" /></button>
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
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 ml-2" aria-hidden="true" />
                      </ListboxButton>
                      <ListboxOptions anchor="bottom" className="absolute mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-10" style={{ width: '415px' }}>
                        {agencias.map((ag, idx) => (
                          <ListboxOption key={idx} value={ag} className="cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-blue-100">
                            {ag}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </div>
                  </Listbox>
                </div>
              </div>
            <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow flex items-center justify-center" onClick={onClose} aria-label="Cerrar">
              <FaTimes className="w-6 h-6" />
            </button>
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium mb-1">Contraseña</label>
                  <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={admin}
                  onChange={setAdmin}
                  className={`${admin ? 'bg-blue-600' : 'bg-gray-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span className="sr-only">¿Es administrador?</span>
                  <span className={`${admin ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform bg-white rounded-full transition-transform`} />
                </Switch>
                <span className="text-sm">¿Es administrador?</span>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button type="button" className="bg-gray-200 text-[#2c4b8b] px-6 py-2 rounded font-semibold flex items-center gap-2 hover:bg-gray-300 transition" onClick={onClose}>
                  <FaTimes className="w-5 h-5" /> Cerrar
                </button>
                <button type="submit" className="bg-[#2c4b8b] text-white px-6 py-2 rounded font-semibold flex items-center gap-2">
                  <FaCheck className="w-5 h-5" /> {isEdit ? "Guardar cambios" : "Crear Usuario"}
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
