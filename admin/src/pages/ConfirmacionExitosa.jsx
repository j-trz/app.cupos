import React from "react";
import Layout from "../components/Layout";

export default function ConfirmacionExitosa() {
  return (
    <Layout seccion={""} setSeccion={() => {}}>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <img src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/logojetmar_png.png" alt="Jetmar" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#2c4b8b] mb-2">¡Correo confirmado!</h1>
          <p className="text-gray-700 mb-6">Tu correo electrónico ha sido verificado exitosamente.<br />Ya puedes iniciar sesión y disfrutar de todos los servicios.</p>
          <a href="/login" className="bg-[#2c4b8b] text-white px-6 py-2 rounded font-semibold shadow hover:bg-[#1e355e] transition">Ir a iniciar sesión</a>
        </div>
      </div>
    </Layout>
  );
}
