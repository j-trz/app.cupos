import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { SkeletonTable } from '../components/SkeletonTable';
import { EmptyState } from '../components/EmptyState';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const GestionTemas = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  // Simulando datos de temas
  const temas = [
    { id: 1, nombre: 'Tema Principal', descripcion: 'Tema por defecto del sistema', activo: true },
    { id: 2, nombre: 'Tema Oscuro', descripcion: 'Tema con modo oscuro', activo: true },
  ];

  const isLoading = false;

  const handleCreateTheme = () => {
    toast({
      title: 'Funcionalidad en desarrollo',
      description: 'La creación de temas está en desarrollo',
    });
  };

  const handleEditTheme = (theme) => {
    toast({
      title: 'Funcionalidad en desarrollo',
      description: 'La edición de temas está en desarrollo',
    });
  };

  const handleDeleteTheme = (themeId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este tema?')) {
      toast({
        title: 'Funcionalidad en desarrollo',
        description: 'La eliminación de temas está en desarrollo',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Temas</h1>
          <p className="text-muted-foreground">
            Administra los temas visuales del sistema
          </p>
        </div>
        <Button onClick={handleCreateTheme}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tema
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar temas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Tabla de temas */}
      {isLoading ? (
        <SkeletonTable columns={4} rows={5} />
      ) : temas && temas.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {temas.map((theme) => (
                    <tr key={theme.id} className="border-b hover:bg-muted/10">
                      <td className="p-4 align-middle font-medium">{theme.nombre}</td>
                      <td className="p-4 align-middle">{theme.descripcion}</td>
                      <td className="p-4 align-middle">
                        <span className={`px-2 py-1 rounded-full text-xs ${theme.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {theme.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTheme(theme)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTheme(theme.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No hay temas"
          description="No se encontraron temas en el sistema"
          icon="🎨"
          action={
            <Button onClick={handleCreateTheme}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer tema
            </Button>
          }
        />
      )}
    </div>
  );
};

export default GestionTemas;