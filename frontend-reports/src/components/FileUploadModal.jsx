import React, { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { UploadCloud, CheckCircle, X } from 'react-feather';
/* import { supabase, uploadToBucket } from '../utils/supabaseClient'; */

export default function FileUploadModal({ open, onClose, onFilesSelected }) {
  const [cuposFile, setCuposFile] = useState(null);
  const [pasajerosFile, setPasajerosFile] = useState(null);
  const [error, setError] = useState('');
  const [dragCupos, setDragCupos] = useState(false);
  const [dragPasajeros, setDragPasajeros] = useState(false);
  const fileInputCupos = useRef();
  const fileInputPasajeros = useRef();

  const handleDrop = (e, setFile) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      setFile(file);
    }
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      setFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cuposFile || !pasajerosFile) {
      setError('Debes subir ambos archivos.');
      Swal.fire({
        icon: 'error',
        title: 'Faltan archivos',
        text: 'Debes subir ambos archivos para continuar.'
      });
      return;
    }
    setError('');
    try {
      let token = localStorage.getItem('token');
      if (!token) {
        Swal.fire({
          icon: 'error',
          title: 'No autenticado',
          text: 'Debes iniciar sesión para subir archivos.'
        });
        return;
      }

      // Verificar si el token está cerca de expirar y renovarlo
      try {
        const { supabase } = await import('../utils/supabaseClient');
        const session = await supabase.auth.getSession();
        if (session.data.session && session.data.session.access_token !== token) {
          token = session.data.session.access_token;
          localStorage.setItem('token', token);
          console.log('Token renovado antes del upload');
        }
      } catch {
        console.warn('No se pudo renovar el token, usando el existente');
      }
      const formData = new FormData();
      formData.append('cuposFile', cuposFile);
      formData.append('pasajerosFile', pasajerosFile);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const resp = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
<<<<<<< HEAD

=======
      
>>>>>>> main
      // Verificar si la respuesta es válida
      if (!resp.ok) {
        // Intentar parsear como JSON, si falla usar texto
        let errorMessage = 'Error al subir archivos';
        try {
          const result = await resp.json();
          errorMessage = result.error || errorMessage;
<<<<<<< HEAD

=======
          
>>>>>>> main
          // Si es error de token, activar modal de re-login
          if (resp.status === 401 && errorMessage.toLowerCase().includes('token')) {
            // Usar la función global para mostrar el modal de re-login
            if (window.detectTokenExpired) {
              window.detectTokenExpired({ message: errorMessage });
              return; // No mostrar error, el modal se encargará
            }
            errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.';
          }
        } catch {
          // Si no es JSON, obtener el texto (probablemente HTML de error)
          const text = await resp.text();
          if (resp.status === 404) {
            errorMessage = 'Endpoint de upload no encontrado. Verifica que el backend esté desplegado.';
          } else if (resp.status === 401) {
            // Usar la función global para mostrar el modal de re-login
            if (window.detectTokenExpired) {
              window.detectTokenExpired({ message: 'Token expirado' });
              return; // No mostrar error, el modal se encargará
            }
            errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.';
          } else if (resp.status >= 500) {
            errorMessage = 'Error interno del servidor. Intenta nuevamente.';
          } else {
            errorMessage = `Error ${resp.status}: ${text.substring(0, 100)}...`;
          }
        }
        throw new Error(errorMessage);
      }
<<<<<<< HEAD

=======
      
>>>>>>> main
      // Parsear respuesta exitosa
      const result = await resp.json();
      if (typeof onFilesSelected === 'function') {
        await onFilesSelected({
          cuposFile,
          pasajerosFile,
          cuposPath: result.cuposPath,
          pasajerosPath: result.pasajerosPath
        });
      }
      Swal.fire({
        icon: 'success',
        title: 'Carga exitosa',
        text: 'Los archivos se guardaron correctamente en tu equipo.'
      });
      onClose();
    } catch (err) {
      console.error('Error al subir archivos:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar',
        text: err?.message || 'Ocurrió un error al guardar los archivos.'
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 bg-opacity-40">
  <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          title="Cerrar"
        >
          <X size={28} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 font-bold"/>
        </button>
        <div className="flex flex-col items-center mb-6">
          <UploadCloud size={48} className="text-blue-500 mb-2" />
          <h2 className="text-2xl font-bold text-[#304D85] mb-2">Cargar archivos de datos</h2>
          <p className="text-gray-500 text-center mb-2">Arrastra o haz clic en cada área para subir <b>Gestion de Cupos JTT</b> y <b>Planilla de pasajeros - Cupos JT</b> (.xlsx)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Área drag & drop para Gestion de Cupos JTT */}
          <div
            className={`flex flex-col items-center justify-center border-2 rounded-lg p-5 cursor-pointer transition-colors ${dragCupos ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} ${cuposFile ? 'border-green-500' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragCupos(true); }}
            onDragLeave={e => { e.preventDefault(); setDragCupos(false); }}
            onDrop={e => { setDragCupos(false); handleDrop(e, setCuposFile); }}
            onClick={() => fileInputCupos.current.click()}
            title="Subir archivo Gestion de Cupos JTT"
          >
            {cuposFile ? (
              <>
                <CheckCircle size={32} className="text-green-500 mb-1" />
                <span className="text-sm text-green-700 font-semibold">{cuposFile.name}</span>
              </>
            ) : (
              <>
                {/* Ícono de Excel SVG */}
                <span className="mb-1">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#21A366"/>
                    <path d="M9 8C8.44772 8 8 8.44772 8 9V23C8 23.5523 8.44772 24 9 24H23C23.5523 24 24 23.5523 24 23V13.8284C24 13.2979 23.7893 12.7893 23.4142 12.4142L19.5858 8.58579C19.2107 8.21071 18.7021 8 18.1716 8H9Z" fill="#107C41"/>
                    <path d="M19 8V13C19 13.5523 19.4477 14 20 14H24" fill="#33C481"/>
                    <text x="11" y="22" fontSize="8" fontWeight="bold" fill="white" fontFamily="Arial, Helvetica, sans-serif">X</text>
                  </svg>
                </span>
                <span className="text-gray-500 text-sm">Arrastra o haz clic para subir <b>Gestion de Cupos JTT (.xlsx)</b></span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx"
              ref={fileInputCupos}
              style={{ display: 'none' }}
              onChange={e => handleFileChange(e, setCuposFile)}
            />
          </div>
          {/* Área drag & drop para Planilla de pasajeros */}
          <div
            className={`flex flex-col items-center justify-center border-2 rounded-lg p-5 cursor-pointer transition-colors ${dragPasajeros ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} ${pasajerosFile ? 'border-green-500' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragPasajeros(true); }}
            onDragLeave={e => { e.preventDefault(); setDragPasajeros(false); }}
            onDrop={e => { setDragPasajeros(false); handleDrop(e, setPasajerosFile); }}
            onClick={() => fileInputPasajeros.current.click()}
            title="Subir archivo Planilla de pasajeros - Cupos JT"
          >
            {pasajerosFile ? (
              <>
                <CheckCircle size={32} className="text-green-500 mb-1" />
                <span className="text-sm text-green-700 font-semibold">{pasajerosFile.name}</span>
              </>
            ) : (
              <>
                {/* Ícono de Excel SVG */}
                <span className="mb-1">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#21A366"/>
                    <path d="M9 8C8.44772 8 8 8.44772 8 9V23C8 23.5523 8.44772 24 9 24H23C23.5523 24 24 23.5523 24 23V13.8284C24 13.2979 23.7893 12.7893 23.4142 12.4142L19.5858 8.58579C19.2107 8.21071 18.7021 8 18.1716 8H9Z" fill="#107C41"/>
                    <path d="M19 8V13C19 13.5523 19.4477 14 20 14H24" fill="#33C481"/>
                    <text x="11" y="22" fontSize="8" fontWeight="bold" fill="white" fontFamily="Arial, Helvetica, sans-serif">X</text>
                  </svg>
                </span>
                <span className="text-gray-500 text-sm">Arrastra o haz clic para subir <b>Planilla de pasajeros - Cupos JT (.xlsx)</b></span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx"
              ref={fileInputPasajeros}
              style={{ display: 'none' }}
              onChange={e => handleFileChange(e, setPasajerosFile)}
            />
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-semibold text-lg shadow transition text-white ${cuposFile && pasajerosFile ? 'bg-[#2563eb] hover:bg-[#304D85]/90' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!(cuposFile && pasajerosFile)}
          >
            Subir y actualizar dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
