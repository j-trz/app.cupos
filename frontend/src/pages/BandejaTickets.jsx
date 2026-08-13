import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import clsx from 'clsx';
import {
  Ticket, Search, RefreshCw, Eye, Ban, Send,
  CheckCircle2, Clock, XCircle, Calendar,
  User, FileText, Plane, Building2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import TableComponent from '../components/ui/Table.jsx';
import Modal from '../components/Modal.jsx';
import { ticketService } from '../services/ticketService';
import { useToast } from '../hooks/use-toast';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

// Badge de estado — variantes existentes en components/ui/Badge.jsx (no
// "error", que no es una variante real y quedaba sin ningún color aplicado).
const estadoBadge = {
  emitido: { label: 'Emitido', variant: 'info' },
  enviado_atlas: { label: 'Enviado a Atlas', variant: 'success' },
  void: { label: 'VOID', variant: 'danger' },
};

// Modal de detalle del boleto — mismo Modal.jsx que el resto de la app (título
// + botón de cerrar estándar); el "look" de boarding pass queda como un panel
// destacado DENTRO del contenido, no reemplazando el chrome del modal.
function TicketDetailModal({ ticket, onClose }) {
  const badge = ticket ? (estadoBadge[ticket.estado] || { label: ticket.estado, variant: 'default' }) : null;

  return (
    <Modal open={!!ticket} onClose={onClose} title={ticket ? `Boleto ${ticket.numero_ticket}` : ''} size="lg">
      {ticket && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 to-slate-900 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 text-xs font-semibold tracking-widest text-blue-200">
                  BOLETO ELECTRÓNICO — E-TICKET
                </div>
                <div className="font-mono text-2xl font-extrabold">{ticket.numero_ticket}</div>
              </div>
              <div className="text-right">
                <div className="mb-1 text-xs tracking-wider text-blue-200">PNR</div>
                <div className="font-mono text-xl font-bold tracking-wide">{ticket.pnr || '—'}</div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold tracking-wide">{ticket.ruta?.split('-')[0]?.trim() || '???'}</div>
                <div className="text-[11px] tracking-wide text-blue-200">ORIGEN</div>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-px flex-1 bg-white/25" />
                <Plane className="h-4 w-4 rotate-45 text-blue-200" />
                <div className="h-px flex-1 bg-white/25" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold tracking-wide">{ticket.ruta?.split('-')[1]?.trim() || '???'}</div>
                <div className="text-[11px] tracking-wide text-blue-200">DESTINO</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-blue-100">
              {ticket.compania && <span>✈ {ticket.compania}</span>}
              {ticket.ficha && <span>Ficha: {ticket.ficha}</span>}
              <span>Emitido: {fmtDateTime(ticket.fecha_emision)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoField icon={User} label="Pasajero" value={ticket.pasajero_nombre} />
            <InfoField icon={FileText} label="Documento" value={ticket.pasajero_documento} />
            <InfoField icon={Building2} label="Agencia" value={ticket.agencia} />
            <InfoField icon={Calendar} label="Fecha de emisión" value={fmtDateTime(ticket.fecha_emision)} />
          </div>

          <Card className="p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Desglose tarifario</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tarifa base</span>
                <span className="font-semibold text-slate-900">{fmtCurrency(ticket.tarifa)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Impuestos</span>
                <span className="font-semibold text-slate-900">{fmtCurrency(ticket.impuestos)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{fmtCurrency(ticket.total)}</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Atlas:{' '}
              <strong className={clsx(
                ticket.atlas_status === 'enviado' ? 'text-emerald-600'
                  : ticket.atlas_status === 'error' ? 'text-red-600'
                  : 'text-amber-600'
              )}>
                {ticket.atlas_status || 'pendiente'}
              </strong>
            </span>
            {ticket.emisor_user && (
              <span>Emitido por: <strong className="text-slate-700">{ticket.emisor_user.nombre || ticket.emisor_user.email}</strong></span>
            )}
          </div>

          {ticket.estado === 'void' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="mb-1 text-xs font-semibold text-red-600">⚠ Ticket Anulado (VOID)</div>
              <div className="text-xs text-red-800">
                Fecha: {fmtDateTime(ticket.fecha_void)}
                {ticket.void_user && ` · Por: ${ticket.void_user.nombre || ticket.void_user.email}`}
              </div>
              {ticket.motivo_void && (
                <div className="mt-1 text-xs text-red-800">Motivo: {ticket.motivo_void}</div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900">{value || '—'}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, variant = 'default' }) {
  const colors = {
    default: 'text-slate-900',
    info: 'text-blue-600',
    success: 'text-emerald-600',
    danger: 'text-red-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {Icon && <Icon className={clsx('h-3.5 w-3.5', colors[variant])} />}
      </div>
      <div className={clsx('mt-1 text-2xl font-bold', colors[variant])}>{value}</div>
    </Card>
  );
}

export default function BandejaTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tickets', estadoFilter],
    queryFn: () => ticketService.getTickets({ estado: estadoFilter || undefined }).then((r) => r.data),
    staleTime: 30_000,
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, motivo, restoreStock }) => ticketService.voidTicket(id, motivo, restoreStock),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      // Si se devolvió el lugar al stock, el cupo cambió — refrescar también
      // el catálogo de productos (Gestión de Productos/Disponibilidad).
      if (variables?.restoreStock) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
      toast({
        title: 'Ticket anulado',
        description: variables?.restoreStock
          ? 'El ticket fue voideado y el lugar volvió al stock del cupo.'
          : 'El ticket fue voideado (void informativo, sin cambios en el stock).',
      });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Error al anular ticket.', variant: 'destructive' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id) => ticketService.syncTicketAtlas(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({ title: 'Sincronizado', description: 'Ticket sincronizado con Netviax Atlas.' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Error al sincronizar.', variant: 'destructive' });
    },
  });

  const handleVoid = async (ticket) => {
    const result = await Swal.fire({
      title: `Anular Ticket ${ticket.numero_ticket}`,
      html: `
        <p style="margin-bottom:0.75rem;color:#475569;font-size:0.9rem;text-align:left;">Esta acción es irreversible. El ticket quedará registrado como <strong>VOID</strong> con auditoría completa.</p>
        <div style="text-align:left;margin-bottom:0.75rem;">
          <label for="void-restore-stock" style="display:block;margin-bottom:0.35rem;font-size:0.85rem;font-weight:600;color:#334155;">¿Qué hacemos con el lugar?</label>
          <select id="void-restore-stock" class="swal2-select" style="width:100%;margin:0;">
            <option value="restore">Devolver al stock del cupo — el lugar vuelve a estar disponible</option>
            <option value="informativo">Void informativo — no modifica el stock (ej. corrección administrativa)</option>
          </select>
        </div>
        <textarea id="motivo-void" class="swal2-textarea" placeholder="Motivo de anulación (requerido)" style="margin:0;resize:vertical;min-height:80px;"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Void',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      focusConfirm: false,
      preConfirm: () => {
        const motivo = document.getElementById('motivo-void')?.value?.trim();
        const restoreStock = document.getElementById('void-restore-stock')?.value === 'restore';
        if (!motivo) {
          Swal.showValidationMessage('El motivo de anulación es requerido.');
          return false;
        }
        return { motivo, restoreStock };
      },
    });
    if (result.isConfirmed && result.value) {
      voidMutation.mutate({ id: ticket.id, motivo: result.value.motivo, restoreStock: result.value.restoreStock });
    }
  };

  const filtered = useMemo(() => {
    if (!search) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t) =>
      t.numero_ticket?.toLowerCase().includes(q) ||
      t.pnr?.toLowerCase().includes(q) ||
      t.pasajero_nombre?.toLowerCase().includes(q) ||
      t.pasajero_documento?.toLowerCase().includes(q) ||
      t.agencia?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const stats = useMemo(() => ({
    total: tickets.length,
    emitidos: tickets.filter((t) => t.estado === 'emitido').length,
    enviados: tickets.filter((t) => t.estado === 'enviado_atlas').length,
    void: tickets.filter((t) => t.estado === 'void').length,
  }), [tickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Ticket}
        title="Bandeja de Tickets"
        description="Registro inmutable de boletos emitidos — lógica GDS"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Emitidos" value={stats.emitidos} icon={Clock} variant="info" />
        <StatCard label="Enviados Atlas" value={stats.enviados} icon={CheckCircle2} variant="success" />
        <StatCard label="Voideados" value={stats.void} icon={XCircle} variant="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por ticket, PNR, pasajero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Todos los estados</option>
          <option value="emitido">Emitidos</option>
          <option value="enviado_atlas">Enviados Atlas</option>
          <option value="void">Voideados</option>
        </select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No hay tickets"
          description={estadoFilter ? `No hay tickets con estado "${estadoBadge[estadoFilter]?.label || estadoFilter}"` : 'La bandeja de tickets está vacía.'}
        />
      ) : (
        <Card>
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Acciones</TableHead>
                <TableHead>N° Ticket</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Pasajero</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ticket) => {
                const badge = estadoBadge[ticket.estado] || { label: ticket.estado, variant: 'default' };
                const isVoid = ticket.estado === 'void';
                return (
                  <TableRow key={ticket.id} className={isVoid ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <ActionIconButton icon={Eye} onClick={() => setSelectedTicket(ticket)} title="Ver boleto GDS" />
                        {!isVoid && (
                          <ActionIconButton icon={Ban} variant="danger" onClick={() => handleVoid(ticket)} title="Anular (Void)" />
                        )}
                        {!isVoid && ticket.estado !== 'enviado_atlas' && (
                          <ActionIconButton
                            icon={Send}
                            onClick={() => syncMutation.mutate(ticket.id)}
                            title="Sincronizar con Atlas"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-slate-900">{ticket.numero_ticket}</TableCell>
                    <TableCell className="font-mono text-xs font-medium text-blue-600">{ticket.pnr || '—'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{ticket.pasajero_nombre}</div>
                      {ticket.pasajero_documento && (
                        <div className="text-xs text-slate-500">{ticket.pasajero_documento}</div>
                      )}
                    </TableCell>
                    <TableCell>{ticket.ruta || '—'}</TableCell>
                    <TableCell>{ticket.agencia}</TableCell>
                    <TableCell className="font-medium">{fmtCurrency(ticket.total)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{fmtDate(ticket.fecha_emision)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableComponent>
        </Card>
      )}

      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  );
}
