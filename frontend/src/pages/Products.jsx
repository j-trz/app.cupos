import { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import ProductService from '../services/productService';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/shadcn-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/shadcn-dialog';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';
import Modal from '../components/Modal';

const emptyProduct = {
  codigo_cupo: '',
  destino: '',
  compania: '',
  disponibilidad: 0,
  fecha_salida: '',
  fecha_regreso: '',
  precio: '',
  ruta: '',
  pnr: '',
  ficha: '',
  temporada: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formState, setFormState] = useState(emptyProduct);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const items = await ProductService.getProducts();
      setProducts(items);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar los productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditProduct(null);
    setFormState(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormState({ ...product });
    setModalOpen(true);
  };

  const handleDelete = async (product) => {
    const result = await Swal.fire({
      title: 'Eliminar producto',
      text: `¿Eliminar cupo ${product.codigo_cupo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await ProductService.deleteProduct(product.id);
      Swal.fire('Eliminado', 'Producto eliminado correctamente', 'success');
      fetchProducts();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo eliminar el producto', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formState, disponibilidad: Number(formState.disponibilidad) };
      if (editProduct) {
        await ProductService.updateProduct(editProduct.id, payload);
        Swal.fire('Actualizado', 'Producto actualizado correctamente', 'success');
      } else {
        await ProductService.createProduct(payload);
        Swal.fire('Creado', 'Producto creado correctamente', 'success');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar el producto', 'error');
    }
  };

  const fields = useMemo(
    () => [
      { name: 'codigo_cupo', label: 'Cupo' },
      { name: 'destino', label: 'Destino' },
      { name: 'compania', label: 'Compañía' },
      { name: 'disponibilidad', label: 'Disponibilidad', type: 'number' },
      { name: 'fecha_salida', label: 'Fecha salida', type: 'date' },
      { name: 'fecha_regreso', label: 'Fecha regreso', type: 'date' },
      { name: 'precio', label: 'Precio' },
      { name: 'ruta', label: 'Ruta' },
      { name: 'pnr', label: 'PNR' },
      { name: 'ficha', label: 'Ficha' },
      { name: 'temporada', label: 'Temporada' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-muted-foreground">
            Administra los productos y su disponibilidad en el sistema.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {products.length} {products.length === 1 ? 'producto' : 'productos'} registrados
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código Cupo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Compañía</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead>Fecha Salida</TableHead>
                <TableHead>Fecha Regreso</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Ficha</TableHead>
                <TableHead>Temporada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.codigo_cupo}</TableCell>
                    <TableCell>{product.destino}</TableCell>
                    <TableCell>{product.compania}</TableCell>
                    <TableCell>{product.disponibilidad}</TableCell>
                    <TableCell>{product.fecha_salida || '—'}</TableCell>
                    <TableCell>{product.fecha_regreso || '—'}</TableCell>
                    <TableCell>{product.precio ? `$${product.precio}` : '—'}</TableCell>
                    <TableCell>{product.ruta || '—'}</TableCell>
                    <TableCell>{product.pnr || '—'}</TableCell>
                    <TableCell>{product.ficha || '—'}</TableCell>
                    <TableCell>{product.temporada || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Modal  open={modalOpen} onOpenChange={setModalOpen}> 
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codigo_cupo">Código Cupo</Label>
                  <Input
                    id="codigo_cupo"
                    type="text"
                    name="codigo_cupo"
                    value={formState.codigo_cupo}
                    onChange={(e) => setFormState({ ...formState, codigo_cupo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="destino">Destino</Label>
                  <Input
                    id="destino"
                    type="text"
                    name="destino"
                    value={formState.destino}
                    onChange={(e) => setFormState({ ...formState, destino: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="compania">Compañía</Label>
                  <Input
                    id="compania"
                    type="text"
                    name="compania"
                    value={formState.compania}
                    onChange={(e) => setFormState({ ...formState, compania: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="disponibilidad">Disponibilidad</Label>
                  <Input
                    id="disponibilidad"
                    type="number"
                    name="disponibilidad"
                    value={formState.disponibilidad}
                    onChange={(e) => setFormState({ ...formState, disponibilidad: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_salida">Fecha Salida</Label>
                  <Input
                    id="fecha_salida"
                    type="date"
                    name="fecha_salida"
                    value={formState.fecha_salida}
                    onChange={(e) => setFormState({ ...formState, fecha_salida: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_regreso">Fecha Regreso</Label>
                  <Input
                    id="fecha_regreso"
                    type="date"
                    name="fecha_regreso"
                    value={formState.fecha_regreso}
                    onChange={(e) => setFormState({ ...formState, fecha_regreso: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    name="precio"
                    value={formState.precio}
                    onChange={(e) => setFormState({ ...formState, precio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ruta">Ruta</Label>
                  <Input
                    id="ruta"
                    type="text"
                    name="ruta"
                    value={formState.ruta}
                    onChange={(e) => setFormState({ ...formState, ruta: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pnr">PNR</Label>
                  <Input
                    id="pnr"
                    type="text"
                    name="pnr"
                    value={formState.pnr}
                    onChange={(e) => setFormState({ ...formState, pnr: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ficha">Ficha</Label>
                  <Input
                    id="ficha"
                    type="text"
                    name="ficha"
                    value={formState.ficha}
                    onChange={(e) => setFormState({ ...formState, ficha: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="temporada">Temporada</Label>
                  <Input
                    id="temporada"
                    type="text"
                    name="temporada"
                    value={formState.temporada}
                    onChange={(e) => setFormState({ ...formState, temporada: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="block">
                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                <input
                  type={field.type || 'text'}
                  name={field.name}
                  value={formState[field.name] ?? ''}
                  onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}