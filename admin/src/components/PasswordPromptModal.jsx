import React, { useState } from 'react';
import { useCredentials } from '../contexts/CredentialsContext';

const PasswordPromptModal = () => {
  const { isPrompting, handlePasswordSubmit, handlePasswordCancel } = useCredentials();
  const [password, setPassword] = useState('');

  if (!isPrompting) {
    return null;
  }

  const onSubmit = (e) => {
    e.preventDefault();
    if (password) {
      handlePasswordSubmit(password);
      setPassword('');
    }
  };

  const onCancel = () => {
    handlePasswordCancel();
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm mx-4">
        <form onSubmit={onSubmit}>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Se requiere la contraseña maestra</h2>
          <p className="mb-4 text-gray-600">
            Para realizar esta operación, por favor ingresa tu contraseña maestra para desencriptar las credenciales.
          </p>
          <div className="mb-4">
            <label htmlFor="master-password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Maestra
            </label>
            <input
              id="master-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Desencriptar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;
