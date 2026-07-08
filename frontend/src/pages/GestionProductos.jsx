import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { useCreateProduct as useCreateProductMutation } from '../hooks/useProducts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import ProductForm from '../components/ProductForm';
import ProductBulkUpload from '../components/ProductBulkUpload';
import { Search, Plus, Edit, Trash2, Upload, ArrowRightLeft, Package } from 'lucide-react';
import TransferModal from '../components/TransferModal';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../hooks/use-toast';

const GestionProductos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [transferringProduct, setTransferringProduct] = useState(null);

  const { toast } = useToast();
  const { data: products, isLoading, isError } = useProducts({ search: searchTerm });
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const handleCreateProduct = async (productData) => {
    try {
      await createProductMutation.mutateAsync(productData);
      toast({
        title: 'Éxito',
        description: 'Producto creado correctamente',
      });
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el producto',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProduct = async (productData) => {
    try {
      await updateProductMutation.mutateAsync({ id: editingProduct.id, productData });
      toast({
        title: 'Éxito',
        description: 'Producto actualizado correctamente',
      });
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el producto',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await deleteProductMutation.mutateAsync(productId);
        toast({
          title: 'Éxito',
          description: 'Producto eliminado correctamente',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Error al eliminar el producto',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenTransfer = (product) => {
    setTransferringProduct(product);
    setIsTransferOpen(true);
  };

  const handleTransferComplete = () => {
    setIsTransferOpen(false);
    setTransferringProduct(null);
    // Recargar productos después de una cesión exitosa
    setSearchTerm(prev => prev);
  };

  const handleBulkUpload = async (file) => {
    try {
      // Aquí iría la lógica para subir el archivo
      console.log('Archivo a subir:', file);
      toast({
        title: 'Éxito',
        description: 'Productos subidos correctamente',
      });
      setIsBulkUploadOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al subir los productos',
        variant: 'destructive',
      });
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gestión de Productos" description="Administra los productos y servicios del sistema" icon={Package} />
        <Card>
          <div className="p-10 text-center text-red-600">Error al cargar los productos</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Productos"
        description="Administra los productos y servicios del sistema"
        icon={Package}
        action={
          <div className="flex flex-wrap gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Carga Masiva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Carga Masiva de Productos</DialogTitle>
                </DialogHeader>
                <ProductBulkUpload
                  onUpload={handleBulkUpload}
                  onCancel={() => setIsBulkUploadOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingProduct(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                  </DialogTitle>
                </DialogHeader>
                <ProductForm
                  onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                  onCancel={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                  }}
                  defaultValues={editingProduct || {}}
                  isEditing={!!editingProduct}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Tabla de productos */}
      {isLoading ? (
        <SkeletonTable columns={8} rows={5} />
      ) : products?.data && products.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Destino</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Compañía</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Precio / Neto</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Disp.</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Salida</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/10">
                      <td className="p-4 align-middle font-mono text-sm font-medium">{product.codigo_cupo}</td>
                      <td className="p-4 align-middle text-sm">{product.tipo_producto || '—'}</td>
                      <td className="p-4 align-middle font-medium">{product.destino}</td>
                      <td className="p-4 align-middle">{product.compania}</td>
                      <td className="p-4 align-middle">
                        <div className="text-sm">
                          <div>${product.precio ?? 0}</div>
                          <div className="text-muted-foreground text-xs">neto ${product.neto_1 ?? 0}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">{product.disponibilidad}</td>
                      <td className="p-4 align-middle text-sm">
                        {product.salida || product.fecha_salida
                          ? new Date(product.salida || product.fecha_salida).toLocaleDateString('es-UY')
                          : '—'}
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`px-2 py-1 rounded-full text-xs ${product.is_blocked_for_sale
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {product.is_blocked_for_sale ? 'Bloqueado' : 'Disponible'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTransfer(product)}
                            title="Ceder Disponibilidad"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Eliminar"
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
          title="No hay productos"
          description="No se encontraron productos en el sistema"
          icon="📦"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer producto
            </Button>
          }
        />
      )}

      {/* Modal de Cesión de Disponibilidad */}
      <TransferModal
        open={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferringProduct(null);
        }}
        product={transferringProduct}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  );
};

export default GestionProductos;