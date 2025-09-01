import React, { useState } from "react";
import Layout from "../components/Layout";

export default function Solicitudes() {
  const [seccion, setSeccion] = useState("solicitudes");
  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-4">Solicitudes</h1>
        <p>Aquí se mostrarán las solicitudes realizadas por los usuarios.</p>
      </div>
    </Layout>
  );
}
