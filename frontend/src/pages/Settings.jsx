import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, X, Palette, Globe, Clock, Bot } from 'lucide-react';
import ApiClient from '../services/apiClient';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await ApiClient.get('/settings');
      // Backend returns array or object with key-value pairs
      if (Array.isArray(result)) {
        const obj = {};
        result.forEach(s => { obj[s.key] = s.value; });
        setSettings(obj);
      } else if (result?.settings) {
        setSettings(result.settings);
      } else if (result && typeof result === 'object') {
        setSettings(result);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Swal.fire('Error', 'No se pudieron cargar las configuraciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Save each setting individually via PUT /settings/:key
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        await ApiClient.put(`/settings/${key}`, { key, value });
      }
      Swal.fire('Guardado', 'Configuraciones guardadas correctamente', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      Swal.fire('Error', 'No se pudieron guardar las configuraciones', 'error');
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return <div className="p-6">Cargando configuraciones...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Administra las configuraciones generales y de diseño del sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Configuración General
            </CardTitle>
            <CardDescription>
              Configuraciones básicas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site_name">Nombre del Sitio</Label>
              <Input
                id="site_name"
                value={settings.site_name || ''}
                onChange={(e) => handleChange('site_name', e.target.value)}
                placeholder="Nombre del sitio"
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Email de Contacto</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="Email de contacto"
              />
            </div>
            <div>
              <Label htmlFor="support_phone">Teléfono de Soporte</Label>
              <Input
                id="support_phone"
                value={settings.support_phone || ''}
                onChange={(e) => handleChange('support_phone', e.target.value)}
                placeholder="Teléfono de soporte"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reservations Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Configuración de Reservas
            </CardTitle>
            <CardDescription>
              Parámetros para el flujo de reservas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bloqueo_minutos_default">Tiempo de bloqueo por defecto (minutos)</Label>
              <Input
                id="bloqueo_minutos_default"
                type="number"
                min="1"
                value={settings.bloqueo_minutos_default || '60'}
                onChange={(e) => handleChange('bloqueo_minutos_default', e.target.value)}
                placeholder="60"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tiempo que una reserva permanece bloqueada antes de expirar si no se confirma
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Asistente IA
            </CardTitle>
            <CardDescription>
              Parámetros del chat con el asistente IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ai_historial_horas">Retención de historial de chat (horas)</Label>
              <Input
                id="ai_historial_horas"
                type="number"
                min="1"
                value={settings.ai_historial_horas || '4'}
                onChange={(e) => handleChange('ai_historial_horas', e.target.value)}
                placeholder="4"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tiempo que se conserva el historial de mensajes de una sesión de chat antes de borrarse automáticamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Diseño
            </CardTitle>
            <CardDescription>
              Personaliza la apariencia del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="brand_color">Color de Marca</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="brand_color"
                  value={settings.brand_color || '#3b82f6'}
                  onChange={(e) => handleChange('brand_color', e.target.value)}
                  className="h-10 w-10 border border-input rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.brand_color || '#3b82f6'}
                  onChange={(e) => handleChange('brand_color', e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                type="url"
                value={settings.logo_url || ''}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="URL del logo"
              />
            </div>
            <div>
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input
                id="favicon_url"
                type="url"
                value={settings.favicon_url || ''}
                onChange={(e) => handleChange('favicon_url', e.target.value)}
                placeholder="URL del favicon"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}