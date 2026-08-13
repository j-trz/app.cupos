import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import {
  Ticket, Search, Filter, RefreshCw, Eye, Ban, Send,
  CheckCircle2, Clock, XCircle, ArrowUpRight, Calendar,
  User, FileText, Plane, Building2, CreditCard, Info,
  ChevronDown
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import TableComponent from '../components/ui/Table.jsx';
import Modal from '../components/Modal.jsx';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

// ─── Helper format ────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

// ─── Estado badge ─────────────────────────────────────────────────────────────
const estadoBadge = {
  emitido: { label: 'Emitido', variant: 'info' },
  enviado_atlas: { label: 'Enviado a Atlas', variant: 'success' },
  void: { label: 'VOID', variant: 'error' },
};

// ─── Modal Boleto GDS ─────────────────────────────────────────────────────────
function TicketDetailModal({ ticket, onClose }) {
  if (!ticket) return null;
  const badge = estadoBadge[ticket.estado] || { label: ticket.estado, variant: 'default' };

  return (
    <Modal open={!!ticket} onClose={onClose} title="" size="lg">
      {/* Encabezado visual de boleto aéreo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2040 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '1.5rem 2rem',
        color: '#fff',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#93c5fd', fontWeight: 600, marginBottom: '0.25rem' }}>
              BOLETO ELECTRÓNICO — E-TICKET
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em', fontFamily: 'monospace' }}>
              {ticket.numero_ticket}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#93c5fd', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>PNR</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              {ticket.pnr || '—'}
            </div>
          </div>
        </div>

        {/* Ruta visual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>{ticket.ruta?.split('-')[0]?.trim() || '???'}</div>
            <div style={{ fontSize: '0.65rem', color: '#bfdbfe', letterSpacing: '0.05em' }}>ORIGEN</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.25)' }} />
            <Plane size={16} color="#bfdbfe" style={{ transform: 'rotate(45deg)' }} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.25)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>{ticket.ruta?.split('-')[1]?.trim() || '???'}</div>
            <div style={{ fontSize: '0.65rem', color: '#bfdbfe', letterSpacing: '0.05em' }}>DESTINO</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '0.8rem', color: '#bfdbfe', flexWrap: 'wrap' }}>
          {ticket.compania && <span>✈ {ticket.compania}</span>}
          {ticket.ficha && <span>Ficha: {ticket.ficha}</span>}
          <span>Emitido: {fmtDateTime(ticket.fecha_emision)}</span>
        </div>
      </div>

      {/* Cuerpo del boleto */}
      <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
        {/* Estado */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <Badge variant={badge.variant} style={{ fontSize: '0.8rem', padding: '0.3rem 1rem' }}>{badge.label}</Badge>
        </div>

        {/* Datos pasajero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <InfoField icon={User} label="Pasajero" value={ticket.pasajero_nombre} />
          <InfoField icon={FileText} label="Documento" value={ticket.pasajero_documento || '—'} />
          <InfoField icon={Building2} label="Agencia" value={ticket.agencia} />
          <InfoField icon={Calendar} label="Fecha de emisión" value={fmtDateTime(ticket.fecha_emision)} />
        </div>

        {/* Desglose tarifario */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            DESGLOSE TARIFARIO
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#475569' }}>Tarifa base</span>
            <span style={{ fontWeight: 600 }}>{fmtCurrency(ticket.tarifa)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#475569' }}>Impuestos</span>
            <span style={{ fontWeight: 600 }}>{fmtCurrency(ticket.impuestos)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0', fontSize: '1rem', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: '#0f172a' }}>{fmtCurrency(ticket.total)}</span>
          </div>
        </div>

        {/* Atlas status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          <span>Atlas: <strong style={{ color: ticket.atlas_status === 'enviado' ? '#16a34a' : ticket.atlas_status === 'error' ? '#dc2626' : '#d97706' }}>{ticket.atlas_status || 'pendiente'}</strong></span>
          {ticket.emisor_user && (
            <span>Emitido por: <strong>{ticket.emisor_user.nombre || ticket.emisor_user.email}</strong></span>
          )}
        </div>

        {/* Información de void */}
        {ticket.estado === 'void' && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.25rem', fontSize: '0.8rem' }}>⚠ Ticket Anulado (VOID)</div>
            <div style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
              Fecha: {fmtDateTime(ticket.fecha_void)}
              {ticket.void_user && ` · Por: ${ticket.void_user.nombre || ticket.void_user.email}`}
            </div>
            {ticket.motivo_void && (
              <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '0.25rem' }}>Motivo: {ticket.motivo_void}</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
        {Icon && <Icon size={11} />}{label.toUpperCase()}
      </div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function BandejaTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ─── Query tickets ──────────────────────────────────────────────────────────
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['tickets', estadoFilter],
    queryFn: () => ticketService.getTickets({ estado: estadoFilter || undefined })
      .then(r => r.data),
    staleTime: 30_000,
  });

  // ─── Void mutation ──────────────────────────────────────────────────────────
  const voidMutation = useMutation({
    mutationFn: ({ id, motivo }) => ticketService.voidTicket(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({ title: 'Ticket anulado', description: 'El ticket fue voideado exitosamente.' });
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

  // ─── Void handler ───────────────────────────────────────────────────────────
  const handleVoid = async (ticket) => {
    const result = await Swal.fire({
      title: `Anular Ticket ${ticket.numero_ticket}`,
      html: `
        <p style="margin-bottom:0.75rem;color:#475569;font-size:0.9rem;">Esta acción es irreversible. El ticket quedará registrado como <strong>VOID</strong> con auditoría completa.</p>
        <textarea id="motivo-void" class="swal2-textarea" placeholder="Motivo de anulación (requerido)" style="margin:0;resize:vertical;min-height:80px;"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Void',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      focusConfirm: false,
      preConfirm: () => {
        const motivo = document.getElementById('motivo-void')?.value?.trim();
        if (!motivo) {
          Swal.showValidationMessage('El motivo de anulación es requerido.');
          return false;
        }
        return motivo;
      },
    });
    if (result.isConfirmed && result.value) {
      voidMutation.mutate({ id: ticket.id, motivo: result.value });
    }
  };

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return tickets;
    const q = search.toLowerCase();
    return tickets.filter(t =>
      t.numero_ticket?.toLowerCase().includes(q) ||
      t.pnr?.toLowerCase().includes(q) ||
      t.pasajero_nombre?.toLowerCase().includes(q) ||
      t.pasajero_documento?.toLowerCase().includes(q) ||
      t.agencia?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: tickets.length,
    emitidos: tickets.filter(t => t.estado === 'emitido').length,
    enviados: tickets.filter(t => t.estado === 'enviado_atlas').length,
    void: tickets.filter(t => t.estado === 'void').length,
  }), [tickets]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '100%' }}>
      <PageHeader
        icon={Ticket}
        title="Bandeja de Tickets"
        description="Registro inmutable de boletos emitidos — lógica GDS"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total" value={stats.total} color="#0f172a" />
        <StatCard label="Emitidos" value={stats.emitidos} color="#2563eb" icon={<Clock size={14} />} />
        <StatCard label="Enviados Atlas" value={stats.enviados} color="#16a34a" icon={<CheckCircle2 size={14} />} />
        <StatCard label="Voideados" value={stats.void} color="#dc2626" icon={<XCircle size={14} />} />
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: '1rem', padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <Input
              placeholder="Buscar por ticket, PNR, pasajero..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', height: '2rem', fontSize: '0.875rem' }}
            />
          </div>

          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            style={{
              border: '1px solid #e4e4e7', borderRadius: '6px', padding: '0.375rem 0.625rem',
              fontSize: '0.8rem', color: '#18181b', background: '#fff', cursor: 'pointer',
              height: '2rem'
            }}
          >
            <option value="">Todos los estados</option>
            <option value="emitido">Emitidos</option>
            <option value="enviado_atlas">Enviados Atlas</option>
            <option value="void">Voideados</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => refetch()} style={{ height: '2rem' }}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Ticket size={48} className="text-slate-300" />}
            title="No hay tickets"
            description={estadoFilter ? `No hay tickets con estado "${estadoBadge[estadoFilter]?.label || estadoFilter}"` : 'La bandeja de tickets está vacía.'}
          />
        ) : (
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead>N° Ticket</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Pasajero</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead style={{ position: 'sticky', right: 0, background: '#fff' }}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ticket => {
                const badge = estadoBadge[ticket.estado] || { label: ticket.estado, variant: 'default' };
                const isVoid = ticket.estado === 'void';
                return (
                  <TableRow key={ticket.id} className="group" style={{ opacity: isVoid ? 0.65 : 1 }}>
                    <TableCell>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}>
                        {ticket.numero_ticket}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>
                        {ticket.pnr || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ticket.pasajero_nombre}</div>
                      {ticket.pasajero_documento && (
                        <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{ticket.pasajero_documento}</div>
                      )}
                    </TableCell>
                    <TableCell style={{ fontSize: '0.8rem' }}>{ticket.ruta || '—'}</TableCell>
                    <TableCell style={{ fontSize: '0.8rem' }}>{ticket.agencia}</TableCell>
                    <TableCell style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtCurrency(ticket.total)}</TableCell>
                    <TableCell style={{ fontSize: '0.75rem', color: '#52525b' }}>{fmtDate(ticket.fecha_emision)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell
                      className="group-hover:bg-slate-50/80"
                      style={{
                        position: 'sticky', right: 0,
                        background: 'inherit',
                        borderLeft: '1px solid #f1f5f9',
                        display: 'flex', gap: '0.4rem', alignItems: 'center'
                      }}
                    >
                      {/* Ver detalle */}
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        title="Ver boleto GDS"
                        style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}
                      >
                        <Eye size={15} />
                      </button>

                      {/* Void */}
                      {!isVoid && (
                        <button
                          onClick={() => handleVoid(ticket)}
                          title="Anular (Void)"
                          disabled={voidMutation.isPending}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                        >
                          <Ban size={15} />
                        </button>
                      )}

                      {/* Sync Atlas */}
                      {!isVoid && ticket.estado !== 'enviado_atlas' && (
                        <button
                          onClick={() => syncMutation.mutate(ticket.id)}
                          title="Sincronizar con Atlas"
                          disabled={syncMutation.isPending}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center' }}
                        >
                          <Send size={15} />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableComponent>
        )}
      </Card>

      {/* Modal detalle boleto */}
      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e4e4e7',
      borderRadius: '10px',
      padding: '0.875rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || '#0f172a', lineHeight: 1 }}>{value}</div>
    </div>
  );
}
