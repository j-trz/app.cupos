import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useApproveProduct } from '../hooks/useProducts';
import { useCreateProduct as useCreateProductMutation } from '../hooks/useProducts';
import { Button } from '../components/ui/Button';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import ActionsOverflow from '../components/ui/ActionsOverflow.jsx';
import { Input } from '../components/ui/Input';
import Modal from '../components/Modal.jsx';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import ProductForm from '../components/ProductForm';
import ProductBulkUpload from '../components/ProductBulkUpload';
import BulkSelectionBar from '../components/ui/BulkSelectionBar.jsx';
import { Search, Plus, Edit, Trash2, Copy, CheckCircle2, Upload, ArrowRightLeft, Package, RotateCcw, MapPin, X, StickyNote, Share2, Download, Lock, RefreshCw, History, Clock, Columns3 } from 'lucide-react';
import TransferModal from '../components/TransferModal';
import ShareProductModal from '../components/ShareProductModal';
import TransferService from '../services/transferService';
import ProductService from '../services/productService';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../hooks/use-toast';
import { useAgencies } from '../hooks/useAgencies';
import { useAuth } from '../contexts/AuthContext';
import { formatDateOnly } from '../lib/dateOnly.js';
import ItineraryTable from '../components/ItineraryTable.jsx';
import BaggageFranchise from '../components/BaggageFranchise.jsx';
import { PRODUCT_IMPORT_COLUMNS } from '../lib/productImportSchema.js';

const formatDate = formatDateOnly;

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GestionProductos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ agencia: '', destino: '', compania: '', temporada: '', tipo_producto: '', estado: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  // Datos con los que se precarga el modal al duplicar — a diferencia de
  // editingProduct, sigue siendo un alta nueva (handleCreateProduct), solo
  // que el formulario no arranca en blanco.
  const [duplicatingProduct, setDuplicatingProduct] = useState(null);
  const [transferringProduct, setTransferringProduct] = useState(null);
  const [sharingProduct, setSharingProduct] = useState(null);
  const [routeModalProduct, setRouteModalProduct] = useState(null);
  const [notesModalProduct, setNotesModalProduct] = useState(null);
  const [movementsModalProduct, setMovementsModalProduct] = useState(null);

  // Multi-selección
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDuplicating, setIsBulkDuplicating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: agencies = [] } = useAgencies();
  const { user, can } = useAuth();
  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code || '—';
  // scope=management: además del catálogo compartido y lo restringido a mi
  // agencia, también trae lo que YO cedí a otra agencia (source_agency) —
  // así la agencia cedente sigue viendo y gestionando lo que dio, aunque en
  // Disponibilidad (reserva real) ya no le aparezca.
  const { data: productsResult, isLoading, isError, isFetching } = useProducts({ search: searchTerm, scope: 'management' });

  // Cesiones salientes por producto — para la columna "Cedidos". Se fetchea
  // una vez (no es react-query, TransferService no tiene hook propio todavía)
  // y se agrupa por AvailabilityTransfer.ProductID (el producto ORIGEN, no el
  // espejo) para poder mostrar "cedido a X: N cupos" en la fila del producto
  // dueño sin tener que buscar la fila del espejo aparte.
  const [transfers, setTransfers] = useState([]);
  useEffect(() => {
    TransferService.listTransfers().then((data) => {
      setTransfers(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    }).catch(() => setTransfers([]));
  }, []);
  const cedidosByProductId = useMemo(() => {
    const map = {};
    transfers.forEach((t) => {
      const pid = String(t.product_id);
      if (!map[pid]) map[pid] = [];
      map[pid].push({ agencia: t.target_agency, cantidad: t.quantity, fecha: t.created_at });
    });
    return map;
  }, [transfers]);

  // El backend devuelve el array "pelado" (no { data: [...] }) — igual que
  // consumen /products el resto de las pantallas (Nóminas, Disponibilidad,
  // Reservas). Sin este fallback, products.data siempre daba undefined y la
  // tabla nunca se mostraba, aunque hubiera productos.
  const products = Array.isArray(productsResult)
    ? productsResult
    : Array.isArray(productsResult?.data)
      ? productsResult.data
      : [];

  // Opciones de los selects de filtro — se calculan sobre TODO el catálogo
  // (sin aplicar los filtros todavía), para que no se vayan achicando a
  // medida que el usuario filtra.
  const agenciaOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.agencia).filter(Boolean))).sort(),
    [products]
  );
  const destinoOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.destino).filter(Boolean))).sort(),
    [products]
  );
  const companiaOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.compania).filter(Boolean))).sort(),
    [products]
  );
  const temporadaOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.temporada).filter(Boolean))).sort(),
    [products]
  );
  const tipoOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.tipo_producto).filter(Boolean))).sort(),
    [products]
  );

  const hasActiveFilters = !!(filters.agencia || filters.destino || filters.compania || filters.temporada || filters.tipo_producto || filters.estado);
  const clearFilters = () => setFilters({ agencia: '', destino: '', compania: '', temporada: '', tipo_producto: '', estado: '' });

  // Mostrar/ocultar columnas de la tabla principal (30 columnas es demasiado
  // para escanear de una) — persistido para no rearmarlo cada sesión. La
  // columna Acciones no entra acá: siempre visible y fija a la izquierda.
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gestionProductos.hiddenColumns') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('gestionProductos.hiddenColumns', JSON.stringify(hiddenColumns));
  }, [hiddenColumns]);
  const isColumnVisible = (key) => !hiddenColumns.includes(key);
  const toggleColumn = (key) => setHiddenColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef(null);
  useEffect(() => {
    if (!isColumnsMenuOpen) return;
    const handleClickOutside = (e) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target)) {
        setIsColumnsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnsMenuOpen]);

  // Productos convertidos desde una Oportunidad que todavía no aprobó un
  // admin — se muestran aparte (ver sección "Pendientes de aprobación") y no
  // entran a la tabla principal ni a sus filtros.
  const pendingProducts = useMemo(() => products.filter((p) => p.pendiente_aprobacion), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.pendiente_aprobacion) return false;
      if (filters.agencia && p.agencia !== filters.agencia) return false;
      if (filters.destino && p.destino !== filters.destino) return false;
      if (filters.compania && p.compania !== filters.compania) return false;
      if (filters.temporada && p.temporada !== filters.temporada) return false;
      if (filters.tipo_producto && p.tipo_producto !== filters.tipo_producto) return false;
      if (filters.estado === 'bloqueado' && !p.is_blocked_for_sale) return false;
      if (filters.estado === 'disponible' && p.is_blocked_for_sale) return false;
      return true;
    });
  }, [products, filters]);

  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const approveProductMutation = useApproveProduct();
  const canApprove = can('PRODUCTS_APPROVE');

  const handleCreateProduct = async (productData) => {
    try {
      await createProductMutation.mutateAsync(productData);
      toast({
        title: 'Éxito',
        description: 'Producto creado correctamente',
      });
      setIsModalOpen(false);
      setEditingProduct(null);
      setDuplicatingProduct(null);
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
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProductMutation.mutateAsync(productId);
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Producto eliminado correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al eliminar el producto' });
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: `¿Eliminar ${selectedIds.length} productos?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    setIsBulkDeleting(true);
    try {
      await ProductService.bulkDeleteProducts(selectedIds);
      toast({ title: 'Éxito', description: `${selectedIds.length} productos eliminados.` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error al eliminar masivamente.', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDuplicate = async () => {
    const result = await Swal.fire({
      title: `¿Duplicar ${selectedIds.length} productos?`,
      text: 'Se crearán copias exactas con el cupo y tarifas originales.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Duplicar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setIsBulkDuplicating(true);
    try {
      await ProductService.bulkDuplicateProducts(selectedIds);
      toast({ title: 'Éxito', description: `${selectedIds.length} productos duplicados.` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error al duplicar masivamente.', variant: 'destructive' });
    } finally {
      setIsBulkDuplicating(false);
    }
  };

  const handleApproveProduct = async (product) => {
    const result = await Swal.fire({
      title: '¿Aprobar producto?',
      html: `<b>${product.codigo_cupo}</b> hacia ${product.destino} (${product.compania}) va a quedar disponible para reservar.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await approveProductMutation.mutateAsync(product.id);
      Swal.fire({ icon: 'success', title: 'Producto aprobado', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al aprobar el producto' });
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // Duplicar: abre el modal de alta (no edición) precargado con los datos
  // del producto original — se descartan los campos que identifican a ESE
  // producto puntual (id, código de cupo, vendidos, fechas de auditoría) y
  // los de cesión (no tiene sentido que la copia nazca ya restringida/cedida).
  const handleDuplicateProduct = (product) => {
    const { id, codigo_cupo, vendidos, created_at, updated_at, restricted_agency, source_agency, transfer_id, ...rest } = product;
    setEditingProduct(null);
    setDuplicatingProduct(rest);
    setIsModalOpen(true);
  };

  const handleOpenTransfer = (product) => {
    setTransferringProduct(product);
    setIsTransferOpen(true);
  };

  const handleTransferComplete = () => {
    setIsTransferOpen(false);
    setTransferringProduct(null);
    // Invalida la cache de React Query para que la tabla refleje la cesión al
    // instante — `setSearchTerm(prev => prev)` no servía porque con el mismo
    // valor React ni siquiera re-renderiza, y la queryKey (['products', filters])
    // nunca cambiaba, dejando la tabla con datos viejos hasta 5 minutos (staleTime).
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleOpenShare = (product) => {
    setSharingProduct(product);
    setIsShareOpen(true);
  };

  const handleShareChange = () => {
    // A diferencia de la cesión, compartir no cambia disponibilidad ni crea
    // filas nuevas — igual invalidamos por si otra agencia ya está mirando
    // el catálogo y necesita ver el producto aparecer/desaparecer.
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleReclaimTransfer = async (product) => {
    const maxQty = product.disponibilidad;
    const { value: quantity, isConfirmed } = await Swal.fire({
      title: 'Recuperar cupos cedidos',
      html: `Cedido a <b>${agencyName(product.restricted_agency)}</b>. Disponible para recuperar: <b>${maxQty}</b> cupos.`,
      input: 'number',
      inputLabel: 'Cantidad a recuperar',
      inputValue: maxQty,
      inputAttributes: { min: 1, max: maxQty, step: 1 },
      showCancelButton: true,
      confirmButtonText: 'Recuperar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        const n = Number(value);
        if (!value || Number.isNaN(n) || n < 1) return 'Ingresá una cantidad válida';
        if (n > maxQty) return `No podés recuperar más de ${maxQty} cupos`;
      },
    });
    if (!isConfirmed) return;
    try {
      const res = await TransferService.reclaimTransfer(product.id, Number(quantity));
      Swal.fire({
        icon: 'success',
        title: 'Cupos recuperados',
        text: `Se recuperaron ${res?.quantity ?? quantity} cupos.`,
        timer: 2000,
        showConfirmButton: false,
      });
      // Recargar productos al instante (ver comentario en handleTransferComplete)
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al recuperar el cupo' });
    }
  };

  const handleDownloadTemplate = () => {
    const headers = PRODUCT_IMPORT_COLUMNS.map((c) => c.key);
    const exampleRow = {
      codigo_cupo: '',
      agencia: agencies[0]?.code || 'AG001',
      destino: 'Cancún',
      compania: 'Aerolíneas Argentinas',
      disponibilidad: 10,
      cupo: 10,
      fecha_salida: '2026-12-01',
      fecha_regreso: '2026-12-10',
      precio: 1200,
      neto_1: 950,
      op: 50,
      ruta: '',
      pnr: '',
      ficha: '',
      temporada: 'Verano 2026',
      tipo_producto: 'Aereo',
      servicio: '',
      notas_externas: '',
      notas_internas: '',
      bloqueo_temporal_minutos: 60,
      carryon: 'TRUE',
      handbag: 'TRUE',
      checkedbag: 'FALSE',
      inf_fare: 100,
      chd_fare: 800,
    };

    const wb = XLSX.utils.book_new();
    const wsProducts = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Productos');

    const instructions = [
      { instruccion: 'Borrá la fila de ejemplo antes de importar (o dejala y se validará igual).' },
      { instruccion: 'Formato de fecha: YYYY-MM-DD (ej: 2026-12-01).' },
      { instruccion: 'Campos booleanos (carryon, handbag, checkedbag): TRUE o FALSE.' },
      { instruccion: 'tipo_producto debe ser: Aereo, Hotel o Crucero.' },
      { instruccion: `agencia debe ser el código de una agencia existente: ${agencies.map((a) => a.code).join(', ') || '(no hay agencias cargadas)'}` },
      { instruccion: 'codigo_cupo se autogenera si se deja vacío.' },
      { instruccion: 'Las filas con errores no se importan, pero no bloquean al resto del archivo.' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

    XLSX.writeFile(wb, 'plantilla-productos.xlsx');
  };

  // `rows` ya viene validado y normalizado por ProductBulkUpload (solo las
  // filas que pasaron validateProductRow) — acá solo se manda al backend.
  const handleBulkUpload = async (rows) => {
    const result = await ProductService.bulkCreateProducts(rows);
    // Refresca la tabla en segundo plano; el modal se queda abierto mostrando
    // el resumen de la importación (lo arma ProductBulkUpload) hasta que el
    // usuario lo cierra.
    queryClient.invalidateQueries({ queryKey: ['products'] });
    return result;
  };

  // Gestión de columnas visibles de la tabla principal (30 columnas es
  // demasiado para escanear de una — se pueden ocultar las que no importan
  // ahora mismo). Persistido en localStorage para no tener que rearmarlo
  // cada sesión. La columna Acciones no se lista acá: siempre está visible
  // y fija a la izquierda (sticky) mientras se scrollea horizontalmente.
  const productColumns = [
    { key: 'codigo', label: 'Código', cellClassName: 'font-mono text-xs font-medium', render: (p) => p.codigo_cupo },
    { key: 'tipo', label: 'Tipo', render: (p) => p.tipo_producto || '—' },
    { key: 'destino', label: 'Destino', cellClassName: 'font-medium text-slate-900', render: (p) => p.destino },
    { key: 'compania', label: 'Compañía', render: (p) => p.compania },
    {
      key: 'agencia', label: 'Agencia', cellClassName: 'font-medium text-slate-700',
      render: (p) => (p.agencia ? agencyName(p.agencia) : (
        <span className="text-red-500" title="Este producto no tiene agencia dueña asignada — hoy no lo ve ninguna agencia, solo el admin.">
          Sin agencia dueña
        </span>
      )),
    },
    {
      key: 'ruta', label: 'Ruta / Cabina / Hab.',
      render: (p) => (p.ruta ? (
        <button
          type="button"
          onClick={() => setRouteModalProduct(p)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          title="Ver detalle de la ruta"
        >
          <MapPin className="h-3 w-3" />
          Ruta
        </button>
      ) : <span className="text-slate-400">—</span>),
    },
    { key: 'pnr', label: 'PNR', render: (p) => p.pnr || '—' },
    { key: 'ficha', label: 'Ficha', render: (p) => p.ficha || '—' },
    { key: 'servicio', label: 'Servicio', render: (p) => p.servicio || '—' },
    {
      key: 'notas', label: 'Notas',
      render: (p) => ((p.notas_externas || p.notas_internas) ? (
        <button
          type="button"
          onClick={() => setNotesModalProduct(p)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          title="Ver notas"
        >
          <StickyNote className="h-3 w-3" />
          Notas
        </button>
      ) : <span className="text-slate-400">—</span>),
    },
    { key: 'temporada', label: 'Temporada', render: (p) => p.temporada || '—' },
    { key: 'disponibilidad', label: 'Disp.', render: (p) => p.disponibilidad },
    { key: 'cupo', label: 'Cupo', render: (p) => p.cupo || '—' },
    { key: 'salida', label: 'Salida', render: (p) => formatDate(p.fecha_salida) },
    { key: 'regreso', label: 'Regreso', render: (p) => formatDate(p.fecha_regreso) },
    { key: 'vencimiento_pago', label: 'Venc. Pago', render: (p) => formatDate(p.vencimiento_pago) },
    { key: 'nomination', label: 'Nómina', render: (p) => formatDate(p.nomination_date) },
    { key: 'emision', label: 'Emisión', render: (p) => formatDate(p.fecha_emision) },
    { key: 'gastos', label: 'Gastos', render: (p) => formatDate(p.fecha_gastos) },
    { key: 'bloqueo', label: 'Bloqueo (min)', render: (p) => p.bloqueo_temporal_minutos || '—' },
    { key: 'adt', label: 'ADT', render: (p) => formatMoney(p.precio) },
    { key: 'inf', label: 'INF', render: (p) => formatMoney(p.inf_fare) },
    { key: 'chd', label: 'CHD', render: (p) => formatMoney(p.chd_fare) },
    { key: 'neto1', label: 'Neto 1', render: (p) => formatMoney(p.neto_1) },
    { key: 'op_adt', label: 'OP ADT', render: (p) => formatMoney(p.op_adt) },
    { key: 'op_inf', label: 'OP INF', render: (p) => formatMoney(p.op_inf) },
    { key: 'op_chd', label: 'OP CHD', render: (p) => formatMoney(p.op_chd) },
    { key: 'equipaje', label: 'Equipaje', render: (p) => <BaggageFranchise item={p} /> },
    {
      key: 'estado', label: 'Estado',
      render: (p) => (
        <Badge variant={p.is_blocked_for_sale ? 'danger' : 'success'}>
          {p.is_blocked_for_sale ? 'Bloqueado' : 'Disponible'}
        </Badge>
      ),
    },
  ];

  // Guards después de TODOS los hooks (ver regla 5 de Gotchas y Reglas de
  // Oro) — antes estaba antes de varios useMemo/mutations, encontrado por la
  // auditoría del 2026-08-13 como violación crítica de reglas de hooks.
  if (!can('PRODUCTS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

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
            <Button
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
              disabled={isFetching}
              title="Actualizar catálogo"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Carga Masiva
            </Button>
            <Button size="sm" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        }
      />

      <Modal
        title="Carga Masiva de Productos"
        open={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        size="5xl"
      >
        <ProductBulkUpload
          onUpload={handleBulkUpload}
          onCancel={() => setIsBulkUploadOpen(false)}
        />
      </Modal>

      <Modal
        title={editingProduct ? 'Editar Producto' : duplicatingProduct ? 'Duplicar Producto' : 'Crear Nuevo Producto'}
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); setDuplicatingProduct(null); }}
        size="4xl"
      >
        <ProductForm
          onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
            setDuplicatingProduct(null);
          }}
          defaultValues={editingProduct || duplicatingProduct || {}}
          isEditing={!!editingProduct}
        />
      </Modal>

      {/* Productos convertidos desde una Oportunidad (ver GestionOportunidades.jsx)
          que todavía no aprobó un admin — apartados de la tabla principal, no
          reservables en Disponibilidad hasta que se aprueben acá. */}
      {pendingProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <div className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">
                Pendientes de aprobación ({pendingProducts.length})
              </h3>
            </div>
            <p className="mb-3 text-xs text-amber-700">
              Creados desde una oportunidad convertida a producto — no aparecen en Disponibilidad hasta que un admin los apruebe.
            </p>
            <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acciones</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Compañía</TableHead>
                    <TableHead>Agencia</TableHead>
                    <TableHead>Cupo</TableHead>
                    <TableHead>Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          {canApprove && (
                            <ActionIconButton icon={CheckCircle2} onClick={() => handleApproveProduct(product)} title="Aprobar" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" />
                          )}
                          <ActionIconButton icon={Edit} onClick={() => handleEditProduct(product)} title="Editar" />
                          <ActionIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteProduct(product.id)} title="Eliminar" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">{product.codigo_cupo}</TableCell>
                      <TableCell className="font-medium text-slate-900">{product.destino}</TableCell>
                      <TableCell>{product.compania}</TableCell>
                      <TableCell>{product.agencia ? agencyName(product.agencia) : '—'}</TableCell>
                      <TableCell>{product.cupo || '—'}</TableCell>
                      <TableCell>{formatDate(product.fecha_salida)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableComponent>
            </div>
          </div>
        </Card>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Agencia</label>
            <select
              value={filters.agencia}
              onChange={(e) => setFilters((f) => ({ ...f, agencia: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {agenciaOptions.map((a) => <option key={a} value={a}>{agencyName(a)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Destino</label>
            <select
              value={filters.destino}
              onChange={(e) => setFilters((f) => ({ ...f, destino: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {destinoOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Compañía</label>
            <select
              value={filters.compania}
              onChange={(e) => setFilters((f) => ({ ...f, compania: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {companiaOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Temporada</label>
            <select
              value={filters.temporada}
              onChange={(e) => setFilters((f) => ({ ...f, temporada: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {temporadaOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Tipo</label>
            <select
              value={filters.tipo_producto}
              onChange={(e) => setFilters((f) => ({ ...f, tipo_producto: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {tipoOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="disponible">Disponible</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
          <div className="relative ml-auto" ref={columnsMenuRef}>
            <Button variant="outline" size="sm" onClick={() => setIsColumnsMenuOpen((v) => !v)}>
              <Columns3 className="h-4 w-4 mr-2" />
              Columnas
            </Button>
            {isColumnsMenuOpen && (
              <div className="absolute right-0 z-30 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {productColumns.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={isColumnVisible(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      {isLoading ? (
        <SkeletonTable columns={8} rows={5} />
      ) : filteredProducts.length > 0 ? (
        <Card className="overflow-hidden">
          {/* containerClassName acota el alto y hace que el header/columna
              sticky sean relativos a este mismo contenedor con scroll — ver
              comentario en Table.jsx sobre por qué no envolver con otro div. */}
          <TableComponent containerClassName="max-h-[70vh]">
              <TableHeader className="sticky top-0 z-20 [&_th]:bg-slate-50">
                <TableRow>
                  <TableHead className="w-10 sticky left-0 z-30 bg-slate-50 border-r border-b border-slate-200">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredProducts.map(p => p.id));
                        else setSelectedIds([]);
                      }}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                  </TableHead>
                  <TableHead className="sticky left-10 z-30 bg-slate-50 border-r border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Acciones</TableHead>
                  {productColumns.filter((c) => isColumnVisible(c.key)).map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const tieneMovimientos = !!product.restricted_agency || !!product.source_agency
                    || (cedidosByProductId[String(product.id)] || []).length > 0;
                  return (
                  <TableRow key={product.id} className={`group ${selectedIds.includes(product.id) ? 'bg-blue-50/50' : ''}`}>
                    <TableCell className="w-10 sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 border-r border-b border-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(prev => [...prev, product.id]);
                          else setSelectedIds(prev => prev.filter(id => id !== product.id));
                        }}
                        className="rounded border-gray-300 w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="sticky left-10 z-10 bg-white group-hover:bg-slate-50/80 border-r border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-1">
                        <ActionIconButton icon={Edit} onClick={() => handleEditProduct(product)} title="Editar" />
                        <ActionIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteProduct(product.id)} title="Eliminar" />
                        <ActionsOverflow
                          items={[
                            { icon: Copy, label: 'Duplicar producto', onClick: () => handleDuplicateProduct(product) },
                            { icon: ArrowRightLeft, label: 'Ceder disponibilidad', onClick: () => handleOpenTransfer(product) },
                            // Compartir: visible/reservable por otras agencias sin forkear stock — solo el dueño (o admin) lo administra
                            (user.role === 'admin' || product.agencia === user.agencia) &&
                              { icon: Share2, label: 'Compartir con otras agencias', onClick: () => handleOpenShare(product) },
                            // Recuperar cupo cedido, solo si soy el cedente
                            product.restricted_agency && product.source_agency === user.agencia &&
                              { icon: RotateCcw, label: 'Recuperar cupo cedido', onClick: () => handleReclaimTransfer(product) },
                            // Movimientos: historial de cesiones/préstamos, solo si hay algo que mostrar
                            tieneMovimientos &&
                              { icon: History, label: 'Ver movimientos', onClick: () => setMovementsModalProduct(product) },
                          ]}
                        />
                      </div>
                    </TableCell>
                    {productColumns.filter((c) => isColumnVisible(c.key)).map((c) => (
                      <TableCell key={c.key} className={c.cellClassName}>{c.render(product)}</TableCell>
                    ))}
                  </TableRow>
                  );
                })}
              </TableBody>
            </TableComponent>
        </Card>
      ) : products.length > 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Ningún producto coincide con los filtros seleccionados."
          icon="🔍"
          action={
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
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

      <BulkSelectionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        entityLabel="producto"
        actions={[
          { label: 'Eliminar', icon: Trash2, variant: 'danger', onClick: handleBulkDelete, loading: isBulkDeleting },
          { label: 'Duplicar', icon: Copy, variant: 'primary', onClick: handleBulkDuplicate, loading: isBulkDuplicating }
        ]}
      />

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

      {/* Modal de Compartir (visibilidad multi-agencia, mismo stock) */}
      <ShareProductModal
        open={isShareOpen}
        onClose={() => {
          setIsShareOpen(false);
          setSharingProduct(null);
        }}
        product={sharingProduct}
        onShareChange={handleShareChange}
      />

      {/* Modal Ver Ruta */}
      {routeModalProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRouteModalProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Detalle de Ruta</h2>
                  <p className="text-sm text-slate-500">{routeModalProduct.codigo_cupo} — {routeModalProduct.destino}</p>
                </div>
              </div>
              <button onClick={() => setRouteModalProduct(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <ItineraryTable ruta={routeModalProduct.ruta} showCopyButton={true} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Ver Notas */}
      {notesModalProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setNotesModalProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <StickyNote className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notas del Producto</h2>
                  <p className="text-sm text-slate-500">{notesModalProduct.codigo_cupo} — {notesModalProduct.destino}</p>
                </div>
              </div>
              <button onClick={() => setNotesModalProduct(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notas externas (visibles para todas las agencias)</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  {notesModalProduct.notas_externas || 'Sin notas externas.'}
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notas internas (solo admin)</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
                  {notesModalProduct.notas_internas || 'Sin notas internas.'}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Movimientos: cesiones/préstamos de este cupo, con trazabilidad
          completa (a quién, cuánto, cuándo) en vez de badges apretados en la fila. */}
      {movementsModalProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setMovementsModalProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Movimientos del Cupo</h2>
                  <p className="text-sm text-slate-500">{movementsModalProduct.codigo_cupo} — {movementsModalProduct.destino}</p>
                </div>
              </div>
              <button onClick={() => setMovementsModalProduct(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Estado actual: si soy dueño/cedente, o receptor de un espejo */}
              {movementsModalProduct.restricted_agency && (user.role === 'admin' || user.agencia === movementsModalProduct.source_agency) && (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
                  <ArrowRightLeft className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-slate-700">
                    Actualmente <strong>prestado a {agencyName(movementsModalProduct.restricted_agency)}</strong> ({movementsModalProduct.disponibilidad} lugares).
                  </span>
                </div>
              )}
              {movementsModalProduct.source_agency && (user.role === 'admin' || user.agencia === movementsModalProduct.restricted_agency) && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <ArrowRightLeft className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-slate-700">
                    Este cupo es un <strong>préstamo recibido de {agencyName(movementsModalProduct.source_agency)}</strong>.
                  </span>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de cesiones salientes</h3>
                {(cedidosByProductId[String(movementsModalProduct.id)] || []).length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Agencia destino</th>
                          <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                          <th className="px-3 py-2 text-right font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cedidosByProductId[String(movementsModalProduct.id)].map((c, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-700">{agencyName(c.agencia)}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900">{c.cantidad}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{formatDate(c.fecha) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Este cupo no tiene cesiones registradas.</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GestionProductos;