import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { useCreateProduct as useCreateProductMutation } from '../hooks/useProducts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import ProductForm from '../components/ProductForm';
import ProductBulkUpload from '../components/ProductBulkUpload';
import { Search, Plus, Edit, Trash2, Upload, ArrowRightLeft, Package } from 'lucide-react';
import TransferModal from '../components/TransferModal';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../hooks/use-toast';
import { useAgencies } from '../hooks/useAgencies';
import { formatDateOnly } from '../lib/dateOnly.js';

const formatDate = formatDateOnly;

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GestionProductos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [transferringProduct, setTransferringProduct] = useState(null);

  const { toast } = useToast();
  const { data: agencies = [] } = useAgencies();
  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code || '—';
  // scope=management: además del catálogo compartido y lo restringido a mi
  // agencia, también trae lo que YO cedí a otra agencia (source_agency) —
  // así la agencia cedente sigue viendo y gestionando lo que dio, aunque en
  // Disponibilidad (reserva real) ya no le aparezca.
  const { data: productsResult, isLoading, isError } = useProducts({ search: searchTerm, scope: 'management' });
  // El backend devuelve el array "pelado" (no { data: [...] }) — igual que
  // consumen /products el resto de las pantallas (Nóminas, Disponibilidad,
  // Reservas). Sin este fallback, products.data siempre daba undefined y la
  // tabla nunca se mostraba, aunque hubiera productos.
  const products = Array.isArray(productsResult)
    ? productsResult
    : Array.isArray(productsResult?.data)
      ? productsResult.data
      : [];
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
      ) : products.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <TableComponent>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>{'Ruta / Cabina / Hab.'}</TableHead>
                  <TableHead>PNR</TableHead>
                  <TableHead>Ficha</TableHead>
                  <TableHead>Temporada</TableHead>
                  <TableHead>Disp.</TableHead>
                  <TableHead>Cupo</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Regreso</TableHead>
                  <TableHead>Bloqueo (min)</TableHead>
                  <TableHead>Precio ADT</TableHead>
                  <TableHead>Precio INF</TableHead>
                  <TableHead>Precio CHD</TableHead>
                  <TableHead>Neto 1</TableHead>
                  <TableHead>OP</TableHead>
                  <TableHead>Equipaje</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs font-medium">{product.codigo_cupo}</TableCell>
                    <TableCell>{product.tipo_producto || '—'}</TableCell>
                    <TableCell className="font-medium text-slate-900">{product.destino}</TableCell>
                    <TableCell>{product.compania}</TableCell>
                    <TableCell>
                      {product.restricted_agency || product.source_agency ? (
                        <div className="flex flex-col gap-1">
                          {product.restricted_agency && (
                            <Badge variant="outline" className="w-fit text-[10px]">
                              Prestado a {agencyName(product.restricted_agency)}
                            </Badge>
                          )}
                          {product.source_agency && (
                            <span className="text-[10px] text-slate-400">
                              Cedido por {agencyName(product.source_agency)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Catálogo general</span>
                      )}
                    </TableCell>
                    <TableCell>{product.ruta || '—'}</TableCell>
                    <TableCell>{product.pnr || '—'}</TableCell>
                    <TableCell>{product.ficha || '—'}</TableCell>
                    <TableCell>{product.temporada || '—'}</TableCell>
                    <TableCell>{product.disponibilidad}</TableCell>
                    <TableCell>{product.cupo || '—'}</TableCell>
                    <TableCell>{formatDate(product.fecha_salida)}</TableCell>
                    <TableCell>{formatDate(product.fecha_regreso)}</TableCell>
                    <TableCell>{product.bloqueo_temporal_minutos || '—'}</TableCell>
                    <TableCell>{formatMoney(product.precio)}</TableCell>
                    <TableCell>{formatMoney(product.inf_fare)}</TableCell>
                    <TableCell>{formatMoney(product.chd_fare)}</TableCell>
                    <TableCell>{formatMoney(product.neto_1)}</TableCell>
                    <TableCell>{formatMoney(product.op)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.carryon && <Badge variant="secondary" className="text-[10px]">Carry-on</Badge>}
                        {product.handbag && <Badge variant="secondary" className="text-[10px]">Handbag</Badge>}
                        {product.checkedbag && <Badge variant="secondary" className="text-[10px]">Checked</Badge>}
                        {!product.carryon && !product.handbag && !product.checkedbag && '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_blocked_for_sale ? 'danger' : 'success'}>
                        {product.is_blocked_for_sale ? 'Bloqueado' : 'Disponible'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenTransfer(product)} title="Ceder Disponibilidad">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableComponent>
          </div>
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