import React, { useState } from "react";// eslint-disable-line no-unused-vars
import Layout from "../components/Layout";// eslint-disable-line no-unused-vars
import SecurityAdminPanel from "../components/SecurityAdminPanel";// eslint-disable-line no-unused-vars

/**
 * Página de administración de seguridad
 */
export default function Seguridad() {
  const [seccion, setSeccion] = useState("seguridad");

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <SecurityAdminPanel />
    </Layout>
  );
}