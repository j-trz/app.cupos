import React, { useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { Tooltip } from 'react-tooltip';
import FileUploadModal from './FileUploadModal.jsx';
import { UploadCloud } from 'react-feather';

export default function Layout({ children, filtrosAnclados, onLogout, onFilesUploaded }) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col w-full">
      <header
        className={`bg-[#304D85] text-white py-2 px-4 shadow flex items-center justify-between w-full transition-all duration-300${filtrosAnclados ? ' pl-80' : ''}`}
        style={filtrosAnclados ? { paddingLeft: '320px' } : {}}
      >
        <h1
          className={`text-lg font-bold tracking-tight transition-all duration-300${filtrosAnclados ? ' ml-2' : ''}`}
          style={filtrosAnclados ? { marginLeft: '0.5rem' } : {}}
        >
          Dashboard de Reportes
        </h1>
        {onLogout && (
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#2563eb] hover:bg-[#009CDD] text-white rounded-full shadow-lg p-2 flex items-center justify-center transition-all duration-200"
              data-tooltip-id="tt-upload"
              data-tooltip-content="Cargar archivos de datos"
              style={{ position: 'relative' }}
            >
              <UploadCloud size={18} />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 p-2 bg-gray-200 text-[#304D85] rounded-full font-semibold hover:bg-[#009CDD] hover:text-white transition text-sm"
              data-tooltip-id="tt-logout"
              data-tooltip-content="Cerrar sesión"
              style={{ position: 'relative' }}
            >
              <FiLogOut size={16} />
            </button>
            <FileUploadModal
              open={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              onFilesSelected={async (filesInfo) => {
                if (typeof onFilesUploaded === 'function') {
                  await onFilesUploaded(filesInfo);
                }
                setShowUploadModal(false);
              }}
            />
            <Tooltip
              id="tt-logout"
              place="bottom"
              style={{
                background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                padding: '6px 10px',
                zIndex: 2147483647,
                pointerEvents: 'auto'
              }}
              wrapperStyle={{ zIndex: 2147483647 }}
            />
            <Tooltip
              id="tt-upload"
              place="bottom"
              style={{
                background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                padding: '6px 10px',
                zIndex: 2147483647,
                pointerEvents: 'auto'
              }}
              wrapperStyle={{ zIndex: 2147483647 }}
            />
          </div>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center justify-start p-4 w-full">
        <div className="w-full mx-auto">
          {children}
        </div>
      </main>
      <footer className="bg-[#304D85] text-white py-1 px-4 text-center text-[10px] opacity-80 w-full">
        &copy; {new Date().getFullYear()} Jetmar Viajes. Todos los derechos reservados.
      </footer>
    </div>
  );
}
