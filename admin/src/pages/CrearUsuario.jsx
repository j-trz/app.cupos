import { useState } from "react";
import Swal from 'sweetalert2';
import Layout from '../components/Layout'; // eslint-disable-line no-unused-vars
import UserService from '../services/userService';

export default function CrearUsuario() {
  const [seccion, setSeccion] = useState("crear-usuario");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [agencia, setAgencia] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validar datos antes de enviar
      const userData = { email, nombre, agencia, password, admin };
      const validationErrors = UserService.validateUserData(userData, false);
      
      if (validationErrors.length > 0) {
        setLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Datos inválidos',
          text: validationErrors.join(', ')
        });
        return;
      }

      // Crear usuario usando el servicio seguro
      const result = await UserService.createUser(userData);
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: result.message || 'El usuario fue creado correctamente.'
        });
        
        // Limpiar formulario
        setEmail("");
        setNombre("");
        setAgencia("");
        setPassword("");
        setAdmin(false);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo crear el usuario'
      });
    } finally {
      setLoading(false);
    }
  };

  // Lista de agencias válidas (hardcoded por ahora)
  const validAgencies = [
    "Agencia Central",
    "Agencia Norte",
    "Agencia Sur",
    "Agencia Este",
    "Agencia Oeste"
  ];

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full max-w-lg mx-auto">
        <form className="bg-white p-6 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-4 text-brand-primary">Crear Usuario</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input
          type="email"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:border-brand-primary"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Nombre *</label>
        <input
          type="text"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:border-brand-primary"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Agencia *</label>
        <select
          className="w-full border px-3 py-2 rounded focus:outline-none focus:border-brand-primary"
          value={agencia}
          onChange={e => setAgencia(e.target.value)}
          required
        >
          <option value="">Seleccionar agencia...</option>
          {validAgencies.map((ag, index) => (
            <option key={index} value={ag}>{ag}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Contraseña *</label>
        <input
          type="password"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:border-brand-primary"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="admin"
          checked={admin}
          onChange={e => setAdmin(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="admin" className="text-sm">¿Es administrador?</label>
      </div>
      
      <button
        type="submit"
        className="w-full bg-brand-primary text-white px-6 py-2 rounded font-semibold hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creando...
          </span>
        ) : (
          "Crear Usuario"
        )}
      </button>
      
          <p className="text-xs text-gray-500 mt-2">* Campos obligatorios</p>
        </form>
      </div>
    </Layout>
  );
}
