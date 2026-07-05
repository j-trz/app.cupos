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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formState, setFormState] = useState(emptyProduct);
  const [searchTerm, setSearchTerm] = useState('');

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
    setDialogOpen(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormState({ ...product });
    setDialogOpen(true);
  };

  const deleteProduct = async (product) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Esto eliminará el producto ${product.codigo_cupo}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await ProductService.deleteProduct(product.id);
          Swal.fire('Eliminado', 'El producto ha sido eliminado', 'success');
          fetchProducts();
        } catch (error) {
          Swal.fire('Error', error.message || 'No se pudo eliminar el producto', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await ProductService.updateProduct(editProduct.id, formState);
        Swal.fire('Éxito', 'Producto actualizado correctamente', 'success');
      } else {
        await ProductService.createProduct(formState);
        Swal.fire('Éxito', 'Producto creado correctamente', 'success');
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar el producto', 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.codigo_cupo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.compania?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [products, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">Gestiona los productos y cupos disponibles.</p>
        </div>
        <Button onClick={openCreate} className="border">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por código, destino o compañía..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
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
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    No hay productos encontrados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.codigo_cupo}</TableCell>
                    <TableCell>{product.destino}</TableCell>
                    <TableCell>{product.compania}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${Number(product.disponibilidad) > 5
                          ? 'bg-green-100 text-green-800'
                          : Number(product.disponibilidad) > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {product.disponibilidad}
                      </span>
                    </TableCell>
                    <TableCell>{product.fecha_salida || '—'}</TableCell>
                    <TableCell>{product.fecha_regreso || '—'}</TableCell>
                    <TableCell>{product.precio ? `$${product.precio}` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteProduct(product)}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
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
                  required
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
                  required
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="disponibilidad">Disponibilidad</Label>
                <Input
                  id="disponibilidad"
                  type="number"
                  name="disponibilidad"
                  value={formState.disponibilidad}
                  onChange={(e) => setFormState({ ...formState, disponibilidad: Number(e.target.value) })}
                  min="0"
                  max="999"
                  required
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
                  min="0"
                  step="0.01"
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
              <Button variant="secondary" type="button" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
