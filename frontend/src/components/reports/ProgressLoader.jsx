import React from 'react';

const ProgressLoader = ({ message, progress = 0, showProgress = false, fullScreen = false }) => {
  const containerClass = fullScreen
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    : "flex items-center justify-center p-4";

  return (
    <div className={containerClass}>
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            {showProgress && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {message || 'Cargando...'}
            </h3>

            {showProgress && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-2">
              {progress < 30 && "🔄 Cargando datos desde caché..."}
              {progress >= 30 && progress < 60 && "📊 Procesando información..."}
              {progress >= 60 && progress < 90 && "📈 Generando gráficos..."}
              {progress >= 90 && "✅ Finalizando..."}
              {!showProgress && "💡 Los datos se cargan más rápido con el caché optimizado"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressLoader;