import React from 'react';

const TestPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Página de Prueba</h2>
        <p className="text-gray-700 mb-4">¡Este contenido se está renderizando correctamente!</p>
        <div className="bg-blue-100 p-4 rounded border border-blue-300">
          <p>Este es un texto de prueba para confirmar que el contenido se muestra.</p>
          <p>Si ves este mensaje, el problema no está en el renderizado básico.</p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;