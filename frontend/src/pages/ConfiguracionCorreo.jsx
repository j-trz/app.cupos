import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useToast } from '../hooks/use-toast';

const ConfiguracionCorreo = () => {
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '',
    user: '',
    password: '',
    from: ''
  });
  
  const { toast } = useToast();

  const handleSaveConfig = () => {
    toast({
      title: 'Funcionalidad en desarrollo',
      description: 'La configuración de correo está en desarrollo',
    });
  };

  const handleTestConnection = () => {
    toast({
      title: 'Funcionalidad en desarrollo',
      description: 'La prueba de conexión está en desarrollo',
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Configuración de Correo</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Configuración SMTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Servidor SMTP</Label>
                <Input
                  id="host"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">Puerto</Label>
                <Input
                  id="port"
                  type="number"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                  placeholder="587"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Input
                id="user"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                placeholder="tu-correo@gmail.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({...smtpConfig, password: e.target.value})}
                placeholder="Contraseña de aplicación"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from">Dirección de origen</Label>
              <Input
                id="from"
                value={smtpConfig.from}
                onChange={(e) => setSmtpConfig({...smtpConfig, from: e.target.value})}
                placeholder="nombre@dominio.com"
              />
            </div>
            
            <div className="flex space-x-4 pt-4">
              <Button onClick={handleTestConnection}>
                Probar conexión
              </Button>
              <Button onClick={handleSaveConfig}>
                Guardar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfiguracionCorreo;