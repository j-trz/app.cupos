import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '../schemas';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Checkbox } from './ui/Checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';

const ProductForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  defaultValues = {}, 
  isEditing = false 
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre_producto: defaultValues.nombre_producto || '',
      descripcion: defaultValues.descripcion || '',
      categoria: defaultValues.categoria || '',
      precio_venta: defaultValues.precio_venta || 0,
      stock_disponible: defaultValues.stock_disponible || 0,
      fecha_inicio: defaultValues.fecha_inicio || '',
      fecha_fin: defaultValues.fecha_fin || '',
      activo: defaultValues.activo ?? true
    }
  });

  const watchedActive = watch('activo');

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Producto' : 'Crear Producto'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Actualizar la información del producto' 
            : 'Agregar un nuevo producto al catálogo'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_producto">Nombre del Producto *</Label>
            <Input id="nombre_producto" {...register('nombre_producto')} />
            {errors.nombre_producto && (
              <p className="text-sm text-red-500">{errors.nombre_producto.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" {...register('descripcion')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Input id="categoria" {...register('categoria')} />
              {errors.categoria && (
                <p className="text-sm text-red-500">{errors.categoria.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_venta">Precio de Venta *</Label>
              <Input 
                id="precio_venta" 
                type="number" 
                step="0.01"
                {...register('precio_venta', { valueAsNumber: true })}
              />
              {errors.precio_venta && (
                <p className="text-sm text-red-500">{errors.precio_venta.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_disponible">Stock Disponible *</Label>
              <Input 
                id="stock_disponible" 
                type="number" 
                {...register('stock_disponible', { valueAsNumber: true })}
              />
              {errors.stock_disponible && (
                <p className="text-sm text-red-500">{errors.stock_disponible.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="activo">Estado</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={watchedActive}
                  onCheckedChange={(checked) => setValue('activo', checked)}
                />
                <Label htmlFor="activo">Producto Activo</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
              <Input 
                id="fecha_inicio" 
                type="date" 
                {...register('fecha_inicio')}
              />
              {errors.fecha_inicio && (
                <p className="text-sm text-red-500">{errors.fecha_inicio.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha de Fin *</Label>
              <Input 
                id="fecha_fin" 
                type="date" 
                {...register('fecha_fin')}
              />
              {errors.fecha_fin && (
                <p className="text-sm text-red-500">{errors.fecha_fin.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProductForm;