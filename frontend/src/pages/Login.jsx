import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import AuthService from '../services/authService';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';


export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await AuthService.login(email, password);
      if (result.success) {
        signIn(result.user);
        navigate('/availability');
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.error });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo iniciar sesión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-7 space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Bienvenido a Gestión de Cupos</h1>
          <p className="text-sm text-slate-500">Accede al sistema de reservas y consulta tus solicitudes desde un frontend limpio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Correo electrónico</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
