import { Settings, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

export default function Administracion() {
  const { can } = useAuth();

  // Guard después de todos los hooks (ver regla 5 de Gotchas y Reglas de
  // Oro) — cuando esta página tenga hooks propios (queries, mutations),
  // van todos arriba de este if.
  if (!can('ADMINISTRACION_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración"
        description="Configuración general del sistema."
        icon={Settings}
      />

      <Card className="py-16 text-center text-sm text-slate-400">
        Todavía no hay nada configurado acá.
      </Card>
    </div>
  );
}
