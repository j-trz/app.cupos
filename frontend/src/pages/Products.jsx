import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, Package } from 'lucide-react';
import ProductService from '../services/productService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import Modal from '../components/Modal.jsx';

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
      <PageHeader
        title="Productos"
        description="Gestiona los cupos disponibles, precios, fechas y métricas de cada producto."
        icon={Package}
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        }
      />

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Lista de productos</h2>
            <p className="text-sm text-slate-500">Administra los cupos cargados en el sistema.</p>
          </div>
          <span className="text-sm text-slate-500">Total: {products.length}</span>
        </div>

        <Table className="p-6">
          <table className="min-w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead>Cupo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Compañía</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Regreso</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={8}>
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={8}>
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
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(product)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </Table>
      </Card>

      <Modal title={editProduct ? 'Editar producto' : 'Nuevo producto'} open={modalOpen} onClose={() => setModalOpen(false)}>
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