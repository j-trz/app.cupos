import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/use-toast';

const PanelControl = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAction = (action) => {
    toast({
      title: 'Funcionalidad en desarrollo',
      description: `La acción "${action}" está en desarrollo`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Panel de Control</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => handleAction('Monitoreo del Sistema')}>
                Monitoreo del Sistema
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/logs')}>
                Logs del Sistema
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Recursos del Sistema')}>
                Recursos del Sistema
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => navigate('/logs')}>
                Auditoría de Seguridad
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Políticas de Seguridad')}>
                Políticas de Seguridad
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Control de Acceso')}>
                Control de Acceso
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Backup y Restauración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => handleAction('Realizar Backup')}>
                Realizar Backup
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Restaurar desde Backup')}>
                Restaurar desde Backup
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Programar Backup')}>
                Programar Backup
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => handleAction('Configuración del Sistema')}>
                Configuración del Sistema
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Configuración de Red')}>
                Configuración de Red
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleAction('Configuración de Notificaciones')}>
                Configuración de Notificaciones
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PanelControl;