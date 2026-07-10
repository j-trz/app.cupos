import React from 'react';

const LoadingSpinner = ({ message = "Cargando datos...", fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 bg-opacity-50 flex items-center justify-center z-30">
        <div className="text-center">
          {/* Spinner principal */}
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-2 border-indigo-300 rounded-full animate-ping mx-auto mt-2"></div>
          </div>
          
          {/* Mensaje */}
          <div className="text-lg font-semibold text-gray-700 mb-2">{message}</div>
          <div className="text-sm text-gray-500">Por favor espera...</div>
          
          {/* Barra de progreso animada */}
          <div className="w-64 h-2 bg-gray-200 rounded-full mt-6 mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
          </div>
          
          {/* Puntos animados */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Loader compacto para componentes individuales
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
        </div>
        <div className="text-sm font-medium text-gray-600">{message}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;