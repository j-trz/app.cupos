import { useEffect, useMemo, useState } from 'react';
import { Package, BarChart3, CheckCircle, XCircle, Plus, Edit3, Trash2, RefreshCw, Upload, Download, Tag, Filter, X } from 'lucide-react';
import ProductService from '../services/productService';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

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

const PLANTILLA_HEADERS = [
  'codigo_cupo', 'destino', 'compania', 'disponibilidad',
  'fecha_salida', 'fecha_regreso', 'precio', 'ruta', 'pnr', 'ficha',
  'temporada', 'neto_1', 'op', 'carryon', 'handbag', 'checkedbag', 'inf_fare',
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getAvailabilityVariant = (value) => {
  if (value > 5) return 'success';
  if (value > 0) return 'warning';
  return 'danger';
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formState, setFormState] = useState(emptyProduct);
  const [searchTerm, setSearchTerm] = useState('');
  const [temporadaFilter, setTemporadaFilter] = useState('Todas');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const items = await ProductService.listProducts();
      setProducts(items);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudieron cargar los productos' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchProducts();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Productos actualizados correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const temporadas = useMemo(() => {
    const set = new Set();
    products.forEach((item) => {
      if (item.temporada && item.temporada.trim()) {
        set.add(item.temporada.trim());
      }
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (temporadaFilter !== 'Todas') {
      result = result.filter((item) => (item.temporada || '').trim() === temporadaFilter);
    }
    if (searchTerm) {
      result = result.filter((product) =>
        product.codigo_cupo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.compania?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [products, temporadaFilter, searchTerm]);

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

  const closeDialog = () => {
    setDialogOpen(false);
    setEditProduct(null);
    setFormState(emptyProduct);
  };

  const deleteProduct = async (product) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Esto eliminará el producto ${product.codigo_cupo}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) {
      try {
        await ProductService.deleteProduct(product.id);
        Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El producto ha sido eliminado', timer: 1500, showConfirmButton: false });
        fetchProducts();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar el producto' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await ProductService.updateProduct(editProduct.id, formState);
        Swal.fire({ icon: 'success', title: 'Éxito', text: 'Producto actualizado correctamente', timer: 1500, showConfirmButton: false });
      } else {
        await ProductService.createProduct(formState);
        Swal.fire({ icon: 'success', title: 'Éxito', text: 'Producto creado correctamente', timer: 1500, showConfirmButton: false });
      }
      closeDialog();
      fetchProducts();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar el producto' });
    }
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Carga masiva ----
  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([PLANTILLA_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setBulkFile(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      Swal.fire({ icon: 'warning', title: 'Sin archivo', text: 'Seleccioná un archivo Excel (.xlsx o .xls) para subir.' });
      return;
    }
    setBulkUploading(true);
    try {
      await ProductService.bulkUploadProducts(bulkFile);
      Swal.fire({ icon: 'success', title: '¡Carga exitosa!', text: 'Los productos se cargaron correctamente.', timer: 2000, showConfirmButton: false });
      setBulkFile(null);
      setBulkModalOpen(false);
      await fetchProducts();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo procesar el archivo.' });
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Gestiona los productos y cupos disponibles. Editá, elimina o carga en masa."
        icon={Package}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkModalOpen(true)}
              title="Carga masiva de productos"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total productos"
          value={filteredProducts.length}
          description={temporadaFilter !== 'Todas' ? `Filtrado: ${temporadaFilter}` : 'Cantidad total de productos cargados.'}
        />
        <StatCard
          icon={CheckCircle}
          label="Disponibles"
          value={filteredProducts.filter((item) => Number(item.disponibilidad) > 0).length}
          description="Productos con cupos restantes."
        />
        <StatCard
          icon={XCircle}
          label="Agotados"
          value={filteredProducts.filter((item) => Number(item.disponibilidad) <= 0).length}
          description="Productos sin disponibilidad."
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Listado de productos</h2>
              <p className="text-sm text-slate-500">Revisá los valores de salida, regreso, temporada y gestioná cada producto.</p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Producto
            </Button>
          </div>

          {/* Buscador */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por código, destino o compañía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Filtros de temporada */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Temporada:</span>
            {temporadas.map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => setTemporadaFilter(temp)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${temporadaFilter === temp
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
              >
                {temp !== 'Todas' && <Tag className="h-3 w-3" />}
                {temp}
              </button>
            ))}
          </div>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Código Cupo</TableHead>
              <TableHead className="text-center">Destino</TableHead>
              <TableHead className="text-center">Compañía</TableHead>
              <TableHead className="text-center">Disponibilidad</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Regreso</TableHead>
              <TableHead className="text-center">Temporada</TableHead>
              <TableHead className="text-center">Ruta</TableHead>
              <TableHead className="text-center">Precio</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={10}>
                  Cargando productos...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={10}>
                  {temporadaFilter !== 'Todas'
                    ? `No hay productos para la temporada "${temporadaFilter}".`
                    : searchTerm
                      ? 'No hay productos que coincidan con la búsqueda.'
                      : 'No hay productos cargados.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="text-center font-medium">{product.codigo_cupo}</TableCell>
                  <TableCell className="text-center">{product.destino}</TableCell>
                  <TableCell className="text-center">{product.compania}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getAvailabilityVariant(Number(product.disponibilidad))}>
                      {product.disponibilidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatDate(product.fecha_salida)}</TableCell>
                  <TableCell className="text-center">{formatDate(product.fecha_regreso)}</TableCell>
                  <TableCell className="text-center">{product.temporada || '—'}</TableCell>
                  <TableCell className="text-center">{product.ruta || '—'}</TableCell>
                  <TableCell className="text-center">
                    {product.precio ? `$${Number(product.precio).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(product)} title="Editar producto">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(product)} title="Eliminar producto" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      {/* Modal de Crear/Editar Producto */}
      <Modal title={editProduct ? 'Editar Producto' : 'Nuevo Producto'} open={dialogOpen} onClose={closeDialog}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Código Cupo *</label>
              <input
                type="text"
                value={formState.codigo_cupo}
                onChange={(e) => handleFormChange('codigo_cupo', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej: CUPO-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Destino *</label>
              <input
                type="text"
                value={formState.destino}
                onChange={(e) => handleFormChange('destino', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej: Cancún"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Compañía *</label>
              <input
                type="text"
                value={formState.compania}
                onChange={(e) => handleFormChange('compania', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej: Aerolíneas"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Disponibilidad *</label>
              <input
                type="number"
                value={formState.disponibilidad}
                onChange={(e) => handleFormChange('disponibilidad', Number(e.target.value))}
                min="0"
                max="999"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Fecha Salida</label>
              <input
                type="date"
                value={formState.fecha_salida}
                onChange={(e) => handleFormChange('fecha_salida', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Fecha Regreso</label>
              <input
                type="date"
                value={formState.fecha_regreso}
                onChange={(e) => handleFormChange('fecha_regreso', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Precio</label>
              <input
                type="number"
                value={formState.precio}
                onChange={(e) => handleFormChange('precio', e.target.value)}
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ruta</label>
              <input
                type="text"
                value={formState.ruta}
                onChange={(e) => handleFormChange('ruta', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">PNR</label>
              <input
                type="text"
                value={formState.pnr}
                onChange={(e) => handleFormChange('pnr', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ficha</label>
              <input
                type="text"
                value={formState.ficha}
                onChange={(e) => handleFormChange('ficha', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Temporada</label>
              <input
                type="text"
                value={formState.temporada}
                onChange={(e) => handleFormChange('temporada', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej: Alta, Baja"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeDialog}>
              <X className="h-4 w-4 mr-1" />Cancelar
            </Button>
            <Button type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Carga Masiva */}
      <Modal title="Carga masiva de productos" open={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkFile(null); }}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600 mb-3">
              Subí un archivo Excel (.xlsx o .xls) con los productos. Descargá la plantilla para asegurar el formato correcto.
            </p>
            <Button variant="secondary" size="sm" onClick={descargarPlantilla}>
              <Download className="h-4 w-4 mr-2" />
              Descargar plantilla Excel
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              {bulkFile ? bulkFile.name : 'Arrastrá un archivo Excel o hacé clic para seleccionar'}
            </p>
            <p className="text-xs text-slate-400 mb-4">Formatos aceptados: .xlsx, .xls</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleBulkFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          {bulkFile && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
              <span className="text-sm text-slate-700 truncate max-w-xs">{bulkFile.name}</span>
              <button
                type="button"
                onClick={() => setBulkFile(null)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Quitar
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={() => { setBulkModalOpen(false); setBulkFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading}>
              <Upload className="h-4 w-4 mr-1" />
              {bulkUploading ? 'Subiendo...' : 'Subir archivo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
