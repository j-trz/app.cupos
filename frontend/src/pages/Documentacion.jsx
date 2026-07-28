import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { TicketsPlane, MapPinHouse, BookOpen, Bot, ArrowRightLeft, MessageSquare, Users, Shield, BarChart3, Bell, Download, Database, AlertTriangle, CheckCircle, Info, Zap, Star, Clock, Search, FileText, User, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useWhiteLabel } from '../contexts/WhiteLabelContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { visibleDocsSections, DEFAULT_DOCS_SECTION } from '../lib/docsSections.js';

// ─── Encabezado estático de sección (ya no es un acordeón: cada sección es su
// propia ruta, así que no hace falta colapsar nada dentro del main) ─────────
function SectionHeader({ icon: Icon, title, badge }) {
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#3b82f6';
  return (
    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
      {Icon && (
        <span className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800" style={{ color: primaryColor }}>
          <Icon className="w-5.5 h-5.5" />
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
        {badge && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold border select-none tracking-wide"
            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor, borderColor: `${primaryColor}20` }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componentes de contenido rediseñados ──────────────────────────────────────
function DocParagraph({ children }) {
  return <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[13px]">{children}</p>;
}

function DocSubsection({ title, children, icon: Icon, color = 'blue' }) {
  const { config } = useWhiteLabel();
  const primary = config?.colors?.primary || '#3b82f6';
  const success = config?.colors?.success || '#10b981';
  const warning = config?.colors?.warning || '#f59e0b';
  const error = config?.colors?.error || '#ef4444';

  const colorMap = {
    blue: { border: primary, text: 'text-blue-600 dark:text-blue-400', borderLeft: 'border-l-blue-500' },
    green: { border: success, text: 'text-emerald-600 dark:text-emerald-400', borderLeft: 'border-l-emerald-500' },
    orange: { border: warning, text: 'text-amber-600 dark:text-amber-400', borderLeft: 'border-l-amber-500' },
    purple: { border: primary, text: 'text-indigo-600 dark:text-indigo-400', borderLeft: 'border-l-indigo-500' },
    red: { border: error, text: 'text-rose-600 dark:text-rose-400', borderLeft: 'border-l-rose-500' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 mb-5 shadow-sm border-l-4 ${c.borderLeft}`}
    >
      {title && (
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${c.text}`} />}
          {title}
        </h4>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function DocSteps({ steps }) {
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#3b82f6';

  return (
    <ol className="space-y-4 my-4">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3.5 text-[13px] text-zinc-600 dark:text-zinc-400">
          <span
            className="w-6 h-6 rounded-full text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {i + 1}
          </span>
          <span className="leading-relaxed pt-0.5 flex-1" dangerouslySetInnerHTML={{ __html: step }} />
        </li>
      ))}
    </ol>
  );
}

function DocList({ items, color = 'blue' }) {
  const { config } = useWhiteLabel();
  const primary = config?.colors?.primary || '#3b82f6';
  const success = config?.colors?.success || '#10b981';
  const warning = config?.colors?.warning || '#f59e0b';
  const error = config?.colors?.error || '#ef4444';

  const dotColors = {
    blue: primary,
    green: success,
    orange: warning,
    red: error,
  };

  const activeColor = dotColors[color] || primary;

  return (
    <ul className="space-y-3 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-[13px] text-zinc-600 dark:text-zinc-400">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 shadow-sm"
            style={{ backgroundColor: activeColor }}
          />
          <span className="leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}

function DocAlert({ type = 'info', children }) {
  const { config } = useWhiteLabel();
  const primary = config?.colors?.primary || '#3b82f6';
  const success = config?.colors?.success || '#10b981';
  const warning = config?.colors?.warning || '#f59e0b';
  const error = config?.colors?.error || '#ef4444';

  const styles = {
    info: { border: primary, bg: 'bg-blue-50/50 dark:bg-blue-950/10', text: 'text-zinc-800 dark:text-zinc-200', borderColor: 'border-blue-200 dark:border-blue-900/30', colorText: 'text-blue-600 dark:text-blue-400', Icon: Info },
    warning: { border: warning, bg: 'bg-amber-50/50 dark:bg-amber-950/10', text: 'text-zinc-800 dark:text-zinc-200', borderColor: 'border-amber-200 dark:border-amber-900/30', colorText: 'text-amber-600 dark:text-amber-400', Icon: AlertTriangle },
    success: { border: success, bg: 'bg-emerald-50/50 dark:bg-emerald-950/10', text: 'text-zinc-800 dark:text-zinc-200', borderColor: 'border-emerald-200 dark:border-emerald-900/30', colorText: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle },
    tip: { border: primary, bg: 'bg-indigo-50/50 dark:bg-indigo-950/10', text: 'text-zinc-800 dark:text-zinc-200', borderColor: 'border-indigo-200 dark:border-indigo-900/30', colorText: 'text-indigo-600 dark:text-indigo-400', Icon: Star },
  };

  const s = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${s.bg} ${s.borderColor} ${s.text} text-xs my-4 shadow-sm`}
    >
      <s.Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.colorText}`} />
      <div className="leading-relaxed flex-1">{children}</div>
    </div>
  );
}

function DocCode({ children }) {
  return (
    <code className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded text-[11px] font-mono border border-zinc-200/60 dark:border-zinc-700/50">
      {children}
    </code>
  );
}

function DocBadge({ status }) {
  const map = {
    bloqueo_temporal: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-900',
    procesando: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900',
    confirmado: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900',
    cancelado: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900',
    cedido: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  };
  return (
    <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold tracking-wide uppercase select-none shrink-0 ${
      map[status] || 'bg-zinc-50 text-zinc-700 border-zinc-200'
    }`}>
      {status}
    </span>
  );
}

// ─── Contenido de cada sección ────────────────────────────────────────────────

function DisponibilidadSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es la pantalla de Disponibilidad?" color="blue" icon={Info}>
        <DocParagraph>
          Es el catálogo de vuelos disponibles para reservar. Cada fila es un <strong>producto</strong>: un bloqueo de asientos en un vuelo específico,
          con destino, fechas, precio y cantidad de cupos restantes. Es el punto de partida para hacer cualquier reserva.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="¿Qué significan los íconos de equipaje?" color="green" icon={CheckCircle}>
        <DocList items={[
          '<strong>Cartera/Handbag</strong> — Equipaje de mano pequeño. Indicado con ícono verde si el producto lo incluye.',
          '<strong>Carry On</strong> — Equipaje de cabina mediano. Verde si incluido.',
          '<strong>Maleta/Checked Bag</strong> — Maleta en bodega. Verde si incluido. <span class="text-red-600 font-medium">Gris tachado = NO incluido.</span>',
        ]} />
        <DocAlert type="tip">
          Si ves los íconos en <strong>gris con tachado</strong>, ese vuelo <u>no incluye</u> ese tipo de equipaje. El pasajero deberá pagarlo por separado con la aerolínea.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="¿Cómo buscar el vuelo que necesito?" color="purple" icon={Search}>
        <DocList items={[
          'Escribí el destino, código de vuelo, compañía o nombre en el buscador superior.',
          'Filtrá por temporada con el selector de temporada.',
          'La tabla muestra automáticamente los productos con cupos disponibles.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Botón 'Ver Ruta' y 'Notas'" color="blue" icon={FileText}>
        <DocParagraph>
          Cada producto con vuelos cargados tiene un botón <strong>"Ruta"</strong> en la tabla. Al hacerle click abre un modal con el detalle completo del itinerario de vuelos:
          aerolínea, número de vuelo, aeropuertos origen/destino, horarios y cabina. También podés copiar el itinerario como imagen para enviarlo por WhatsApp o correo.
          De la misma forma, el botón <strong>"Notas"</strong> abre un modal con observaciones cargadas por el operador para ese producto.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="¿Cómo hacer una reserva desde acá?" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          'Encontrá el producto deseado en la tabla.',
          'Hacé click en el botón del carrito <strong>(reservar)</strong> en la columna de acciones.',
          'Se abre el formulario de reserva. Completá los datos de contacto y del pasajero.',
          'Si hay más de un pasajero, el sistema los gestiona de forma individual por ticket.',
          'Confirmá. El cupo queda en estado <strong>"bloqueo temporal"</strong> hasta que se confirme.',
        ]} />
        <DocAlert type="warning">
          El <strong>bloqueo temporal</strong> tiene un tiempo límite. Si no se confirma antes de que venza, el cupo se libera automáticamente y queda disponible para otra agencia.
        </DocAlert>
      </DocSubsection>
    </div>
  );
}

function ReservasSection({ isAdmin }) {
  return (
    <div className="space-y-4">
      <DocSubsection title="Estados de una reserva" color="blue" icon={Info}>
        <DocParagraph>Cada reserva tiene un estado que refleja su situación en el flujo de ventas:</DocParagraph>
        <div className="mt-3 space-y-2">
          {[
            { status: 'bloqueo_temporal', desc: 'Recién creada. El cupo está reservado temporalmente. Tiene fecha de vencimiento.' },
            { status: 'procesando', desc: 'El operador tomó la solicitud y está trabajando en la emisión del ticket.' },
            { status: 'confirmado', desc: 'Ticket emitido y todo listo. Reserva firme y válida.' },
            { status: 'cancelado', desc: 'Cancelada. El cupo fue liberado. No se puede revertir desde la UI.' },
            { status: 'cedido', desc: 'El cupo fue prestado por el operador a esta agencia. Aparece indicado especialmente.' },
          ].map(r => (
            <div key={r.status} className="flex items-start gap-3">
              <DocBadge status={r.status} />
              <span className="text-sm text-slate-600 dark:text-slate-300">{r.desc}</span>
            </div>
          ))}
        </div>
      </DocSubsection>

      {isAdmin ? (
        <>
          <DocSubsection title="Cómo editar una reserva (incluye datos del pasajero y ticket)" color="orange" icon={FileText}>
            <DocSteps steps={[
              'En Gestión de Reservas, hacé click en el ícono de <strong>lápiz (Editar)</strong> de la fila.',
              'Podés modificar los datos del pedido, del pasajero principal y su número de ticket, todo desde el mismo formulario.',
              'Si el pedido tiene más de un pasajero, el resto se edita individualmente desde <strong>Gestión de Nóminas</strong>.',
              'Guardá los cambios.',
            ]} />
          </DocSubsection>

          <DocSubsection title="Cómo agregar un documento contable (Ficha de Venta)" color="orange" icon={FileText}>
            <DocSteps steps={[
              'En la tabla de reservas, buscá la columna <strong>"Doc.Contable"</strong>.',
              'Si aparece <span class="text-orange-500 font-semibold">Pendiente</span>, hacé click en ese texto.',
              'Se abre un modal para ingresar el número de documento y la fecha de vencimiento.',
              'Guardá. El documento queda asociado a esa reserva y el estado cambia.',
            ]} />
            <DocAlert type="info">
              El sistema puede mostrar alertas automáticas cuando un documento está próximo a vencer (ej. 24 horas antes).
            </DocAlert>
          </DocSubsection>

          <DocSubsection title="Cómo asignar un Número de Ticket" color="green" icon={CheckCircle}>
            <DocSteps steps={[
              'Buscá al pasajero en la tabla.',
              'En la columna <strong>"Ticket"</strong>, si dice "Asignar", hacé click.',
              'Ingresá el número de ticket (generado por el GDS de la aerolínea) y el precio de venta si corresponde.',
              'Guardá. Una vez que el ticket tiene número, aparece el ícono <strong>azul de itinerario PDF</strong> en acciones.',
            ]} />
          </DocSubsection>
        </>
      ) : (
        <>
          <DocSubsection title="Cómo solicitar la cancelación de una reserva" color="orange" icon={AlertTriangle}>
            <DocSteps steps={[
              'Andá a <strong>Solicitudes</strong> (o <strong>Confirmaciones</strong> si ya está confirmada).',
              'Buscá la reserva y hacé click en <strong>"Solicitar cancelación"</strong>.',
              'El operador recibe el aviso y procesa la baja del cupo. No podés cancelarla vos mismo desde acá.',
            ]} />
          </DocSubsection>

          <DocSubsection title="Cómo agregar un documento contable (Ficha de Venta)" color="orange" icon={FileText}>
            <DocSteps steps={[
              'En <strong>Solicitudes</strong>, buscá la columna <strong>"Doc.Contable"</strong> de tu reserva.',
              'Si aparece <span class="text-orange-500 font-semibold">Pendiente</span>, hacé click en ese texto.',
              'Se abre un modal para ingresar el número de documento y la fecha de vencimiento.',
              'Guardá. El documento queda asociado a esa reserva y el estado cambia.',
            ]} />
            <DocAlert type="info">
              El sistema puede mostrar alertas automáticas cuando un documento está próximo a vencer (ej. 24 horas antes).
            </DocAlert>
          </DocSubsection>

          <DocSubsection title="Vencimiento del bloqueo temporal" color="green" icon={Clock}>
            <DocParagraph>
              Mientras una reserva está en estado <strong>bloqueo_temporal</strong>, en Solicitudes vas a ver una cuenta regresiva
              hasta que vence. Si se vence sin confirmarse, el cupo se libera automáticamente y hay que pedirle al operador que
              genere una nueva reserva.
            </DocParagraph>
          </DocSubsection>
        </>
      )}

      <DocSubsection title="Generar el Itinerario PDF (con marca de la agencia)" color="purple" icon={Download}>
        <DocSteps steps={[
          'Asegurate de que el pasajero tiene un Número de Ticket asignado' + (isAdmin ? '.' : ' (lo asigna el operador cuando emite el ticket).'),
          `En ${isAdmin ? 'la tabla de reservas' : 'Confirmaciones'}, hacé click en el ícono azul de <strong>documento</strong>.`,
          'Se abre el modal de Itinerario con el diseño de tu agencia: logo, colores, nombre.',
          'Hacé click en <strong>"Descargar PDF"</strong>. Se abre la ventana de impresión del navegador.',
          'Elegí "Guardar como PDF" o envialo directamente a la impresora.',
        ]} />
        {isAdmin && (
          <DocAlert type="tip">
            Los colores y el logo del itinerario se toman automáticamente del <strong>Diseño / White Label</strong> configurado por tu agencia. Para cambiarlos, ingresá a la sección de Diseño.
          </DocAlert>
        )}
      </DocSubsection>

      <DocSubsection title="Cupos cedidos o compartidos: ¿cómo los veo?" color="orange" icon={ArrowRightLeft}>
        <DocParagraph>
          Si el operador te prestó o compartió cupos de otra agencia, esas reservas aparecerán con un indicador
          <strong> "Cupo cedido de [Agencia]"</strong> o <strong>"Compartido — de [Agencia]"</strong> en la columna correspondiente.
          Esto te permite saber de dónde viene el cupo sin tener que consultar con el operador.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Solución de problemas frecuentes" color="red" icon={AlertTriangle}>
        <DocList color="red" items={isAdmin ? [
          '<strong>La reserva vence y no puedo confirmarla:</strong> contactá al operador para que extienda el bloqueo o cree una nueva reserva.',
          '<strong>No aparece el botón de PDF:</strong> verificá que el pasajero tenga un Número de Ticket asignado.',
          '<strong>"Error al crear la reserva":</strong> verificá que el producto tenga cupos disponibles y que tu agencia tenga acceso.',
          '<strong>No veo mis reservas:</strong> revisá el filtro de estado y el buscador — puede haber un filtro activo.',
        ] : [
          '<strong>La reserva vence y no puedo confirmarla:</strong> contactá al operador para que extienda el bloqueo o cree una nueva reserva.',
          '<strong>No aparece el botón de PDF:</strong> el ticket todavía no fue asignado por el operador — esperá la confirmación.',
          '<strong>"Error al crear la reserva":</strong> verificá que el producto tenga cupos disponibles.',
          '<strong>No veo mi reserva:</strong> revisá si ya fue confirmada — en ese caso está en <strong>Confirmaciones</strong>, no en Solicitudes.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function ProductosSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es un producto?" color="blue" icon={Info}>
        <DocParagraph>
          Un producto representa un <strong>bloqueo aéreo</strong>: un conjunto de asientos comprados al mayoreo en un vuelo específico.
          Tiene destino, compañía, fechas de salida y regreso, precio, cupos totales y cupos disponibles.
          También puede llevar información de equipaje, ruta detallada con escalas, número de PNR, servicio y notas.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Campos importantes" color="green" icon={CheckCircle}>
        <DocList items={[
          '<strong>Código de Cupo:</strong> identificador único del bloqueo (ej. CUN-2027-01).',
          '<strong>Disponibilidad:</strong> cupos restantes (no reservados). Se reduce con cada reserva.',
          '<strong>Cupo total:</strong> la cantidad original de asientos bloqueados.',
          '<strong>Ruta:</strong> itinerario de vuelos con escalas. Se usa para mostrar el modal de "Ver Ruta" y en el PDF.',
          '<strong>PNR:</strong> localizador del bloqueo en el GDS de la aerolínea.',
          '<strong>Servicio:</strong> texto libre que describe el servicio puntual (ej. Traslado, Seguro de viaje, Excursión).',
          '<strong>Notas externas:</strong> observaciones visibles para todas las agencias desde Disponibilidad.',
          '<strong>Notas internas:</strong> observaciones que solo ve el admin.',
          '<strong>Bloqueado para venta:</strong> si está activo, el producto no aparece en Disponibilidad.',
          '<strong>Equipaje:</strong> Handbag, Carry On, Checked Bag — cada uno es independiente.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Cómo cargar productos masivamente" color="purple" icon={Zap}>
        <DocSteps steps={[
          'Descargá la plantilla Excel desde el botón "Plantilla" en Gestión de Productos.',
          'Completá los datos de cada producto en las columnas correspondientes.',
          'Usá el botón <strong>"Importar"</strong> y seleccioná tu archivo.',
          'El sistema procesa fila por fila y muestra errores por fila si los hay.',
        ]} />
        <DocAlert type="info">
          El campo <strong>ruta</strong> en la carga masiva acepta JSON estructurado. Ver documentación de la API para el formato exacto.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Visibilidad del producto" color="orange" icon={AlertTriangle}>
        <DocParagraph>
          El campo <strong>"Bloqueado para venta"</strong> (toggle en el formulario del producto) controla si ese producto aparece
          en la pantalla de Disponibilidad. Si está bloqueado, las reservas que ya existen no se ven afectadas; solo deja de aparecer
          en el catálogo para nuevas reservas.
        </DocParagraph>
      </DocSubsection>
    </div>
  );
}

function CesionSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es la cesión de cupos?" color="blue" icon={Info}>
        <DocParagraph>
          El operador mayorista (owner) puede <strong>ceder (prestar) cupos</strong> de sus productos a otras agencias. Esto crea
          un producto "espejo" en la agencia destino, que puede usar esos cupos para hacer reservas con sus propios clientes.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Flujo completo de cesión" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          '<strong>El owner cede cupos:</strong> desde Gestión de Productos, usa el botón de Transferencia e indica agencia destino y cantidad de cupos.',
          'Se crea un producto espejo en la agencia destino con los cupos cedidos.',
          'La agencia receptora puede hacer reservas con esos cupos normalmente.',
          '<strong>El owner recupera cupos:</strong> desde Gestión de Productos puede hacer click en "Recuperar Cupo" para devolver el stock al producto original.',
        ]} />
      </DocSubsection>

      <DocSubsection title="¿Cómo lo ve cada agencia?" color="purple" icon={Users}>
        <DocList items={[
          '<strong>Owner (agencia que cede):</strong> ve la reserva con el badge "Cesión saliente" en la columna Cesión.',
          '<strong>Agencia receptora:</strong> ve la reserva con el badge "Cupo cedido de [Agencia Original]".',
          'Cada agencia ve SOLO sus propias reservas y productos.',
        ]} />
        <DocAlert type="tip">
          Si en tus reservas aparece el badge "Cupo cedido", significa que ese lugar fue prestado por el operador. El resto del flujo de reserva y ticket es idéntico.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Recuperar cupos cedidos" color="orange" icon={ArrowRightLeft}>
        <DocParagraph>
          Como owner, podés recuperar los cupos que cediste en cualquier momento, <strong>siempre que la agencia receptora no los haya reservado</strong>.
          Al recuperar, la disponibilidad del producto espejo vuelve al producto original para que puedas usarlos o cederlos a otra agencia.
        </DocParagraph>
        <DocAlert type="warning">
          Los cupos ya reservados por la agencia receptora <u>no se pueden recuperar</u>. Solo se recuperan los cupos disponibles (sin reserva activa).
        </DocAlert>
      </DocSubsection>
    </div>
  );
}

function IASection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Para qué sirve el Asistente IA?" color="blue" icon={Info}>
        <DocParagraph>
          El Asistente IA es un chat integrado que te permite <strong>consultar disponibilidad, crear reservas y gestionar tu trabajo
            usando lenguaje natural</strong>, como si hablaras con un colega. No necesitás saber qué botón presionar: simplemente
          describís lo que querés hacer.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="¿Cómo abrir el chat?" color="green" icon={MessageSquare}>
        <DocList items={[
          'Buscá el botón flotante <strong>azul</strong> en la esquina inferior derecha de la pantalla.',
          'Hacé click para abrir el panel del chat.',
          'Podés minimizarlo y seguirá escuchando en segundo plano durante tu sesión.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Cómo hacer una reserva con el IA" color="purple" icon={Zap}>
        <DocSteps steps={[
          'Decile al IA: <em>"Quiero reservar para Cancún"</em>.',
          'El IA busca automáticamente los productos disponibles y te muestra una lista numerada.',
          'Respondé con el número del vuelo que te interesa (ej: "1").',
          'Si tenés el DNI a mano, adjuntá una foto con el clip de adjuntos: el IA extrae nombre, apellido y documento automáticamente.',
          'Confirmá el resumen y el IA crea la reserva sin que tengas que llenar formularios.',
        ]} />
        <DocAlert type="tip">
          El IA guarda el contexto de la conversación. No repitas información que ya le diste. Si ya diste el nombre del pasajero, no lo vuelvas a escribir.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Leer documentos de identidad con el IA" color="green" icon={User}>
        <DocSteps steps={[
          'Hacé click en el ícono de clip (<strong>adjuntar</strong>) en el chat.',
          'Seleccioná una foto del DNI o pasaporte.',
          'El IA extrae todos los datos del pasajero automáticamente (nombre, apellido, documento, fecha de nacimiento, nacionalidad).',
          'Confirma los datos y los usa directamente para la reserva.',
        ]} />
        <DocAlert type="info">
          También podés usar el botón <strong>"Leer DNI"</strong> en la barra inferior del chat como atajo rápido.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Acciones que puede hacer el IA" color="orange" icon={Star}>
        <DocList items={[
          'Buscar productos disponibles por destino, fecha o compañía.',
          'Crear reservas con datos completos del pasajero.',
          'Ver tus reservas existentes.',
          '<strong>(Solo admins)</strong> Ver todas las reservas del sistema.',
          '<strong>(Solo admins)</strong> Confirmar o cancelar reservas.',
          'Buscar información de usuarios del sistema.',
        ]} />
        <DocAlert type="warning">
          El IA respeta los permisos de tu rol. Si sos agente, solo verás tus propias reservas aunque le pidas todas. El IA no puede saltarse las restricciones de seguridad.
        </DocAlert>
      </DocSubsection>
    </div>
  );
}

function DisenoSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es el White Label?" color="blue" icon={Info}>
        <DocParagraph>
          La sección de <strong>Diseño</strong> te permite personalizar completamente la apariencia del sistema con los colores,
          logo y tipografías de tu agencia. Esto hace que los itinerarios PDF, los emails y la UI del sistema lleven tu marca propia.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="¿Qué se puede configurar?" color="green" icon={CheckCircle}>
        <DocList items={[
          '<strong>Logo:</strong> el logo de tu agencia aparece en el encabezado y en los itinerarios PDF.',
          '<strong>Color primario:</strong> define el color de botones, encabezados y acentos en toda la app.',
          '<strong>Color secundario:</strong> usado en gradientes y elementos secundarios.',
          '<strong>Nombre de agencia:</strong> aparece en los itinerarios y en el encabezado del sistema.',
          '<strong>Email y eslógan:</strong> aparecen en el pie de los itinerarios PDF.',
          '<strong>Tipografías:</strong> elegí la fuente para títulos y textos del cuerpo.',
          '<strong>Presets:</strong> plantillas predefinidas para arrancar rápido.',
        ]} />
      </DocSubsection>

      <DocSubsection title="¿Cómo se aplica en los itinerarios PDF?" color="purple" icon={Download}>
        <DocParagraph>
          Al generar un itinerario PDF desde Gestión de Reservas, el sistema toma automáticamente:
        </DocParagraph>
        <DocList items={[
          'El <strong>logo</strong> de tu agencia para el encabezado.',
          'El <strong>color primario</strong> para los títulos, bordes y badges.',
          'El <strong>nombre, email y eslógan</strong> para el pie del itinerario.',
        ]} />
        <DocAlert type="tip">
          Si cambiás tu logo o colores, los próximos PDF generados ya reflejarán los cambios automáticamente.
        </DocAlert>
      </DocSubsection>
    </div>
  );
}

function EmailSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Para qué se usa el email?" color="blue" icon={Info}>
        <DocList items={[
          'Confirmación de nueva reserva (enviado al pasajero).',
          'Aviso de bloqueo temporal próximo a vencer.',
          'Reenvío manual de confirmación desde Gestión de Reservas.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Cómo configurar el servidor SMTP" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          'Ingresá a <strong>Configuración de Email</strong> en el menú lateral.',
          'Completá: Host SMTP, Puerto, Usuario, Contraseña, Encriptación (TLS/SSL).',
          'Usá el botón <strong>"Probar conexión"</strong> para verificar que los datos son correctos.',
          'Luego usá <strong>"Enviar email de prueba"</strong> para recibir un email real.',
          'Guardá la configuración.',
        ]} />
        <DocAlert type="info">
          Para Gmail, el puerto es <DocCode>587</DocCode> con TLS. Necesitás generar una <strong>"Contraseña de aplicación"</strong> en tu cuenta de Google.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Notificaciones en el sistema" color="orange" icon={Bell}>
        <DocParagraph>
          El sistema genera notificaciones internas para eventos importantes (reservas por vencer, nuevos cupos cedidos, etc.).
          Las notificaciones aparecen en el <strong>dropdown de la campana</strong> en el encabezado.
          Un <strong>punto rojo</strong> en tu avatar indica que hay notificaciones sin leer.
        </DocParagraph>
      </DocSubsection>
    </div>
  );
}

function ReportesSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="Dashboard principal" color="blue" icon={Info}>
        <DocParagraph>
          El Dashboard muestra un resumen ejecutivo en tiempo real: ventas totales, reservas activas, cupos disponibles y productos más vendidos.
          Es el primer lugar donde mirás para entender qué está pasando en el negocio.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Reportes avanzados" color="purple" icon={BarChart3}>
        <DocList items={[
          '<strong>Ventas por agencia:</strong> cuánto vendió cada agencia en el período.',
          '<strong>Evolución de pasajeros:</strong> tendencia histórica de cantidad de pasajeros.',
          '<strong>Destinos detallados:</strong> análisis por destino con métricas de ocupación.',
          '<strong>Top productos:</strong> ranking de los vuelos más vendidos.',
          '<strong>Alertas de riesgo:</strong> productos con baja ocupación que pueden perder rentabilidad.',
          '<strong>Cancelaciones:</strong> análisis de cancelaciones por período.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Exportar datos" color="green" icon={Download}>
        <DocList items={[
          'Desde cada módulo podés exportar la vista actual en <strong>CSV o Excel</strong>.',
          'Los reportes tienen su propio botón de exportación.',
          'El archivo generado respeta los filtros activos (solo exporta lo que estás viendo).',
        ]} />
      </DocSubsection>
    </div>
  );
}

function UsuariosSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="Roles del sistema" color="blue" icon={Shield}>
        <div className="space-y-2 mt-2">
          {[
            { role: 'admin', color: 'bg-red-100 text-red-800', desc: 'Acceso total al sistema. Ve todo, puede hacer todo.' },
            { role: 'agency_admin', color: 'bg-purple-100 text-purple-800', desc: 'Administrador de su agencia. Ve todas las reservas de su agencia, puede confirmar y cancelar.' },
            { role: 'agency_user', color: 'bg-blue-100 text-blue-800', desc: 'Agente de viajes. Ve y gestiona sus propias reservas. No puede ver reservas de otros agentes.' },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.color} flex-shrink-0 mt-0.5`}>{r.role}</span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{r.desc}</span>
            </div>
          ))}
        </div>
      </DocSubsection>

      <DocSubsection title="Cómo crear un usuario" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          'Ingresá a <strong>Gestión de Usuarios</strong>.',
          'Hacé click en <strong>"Nuevo Usuario"</strong>.',
          'Completá nombre, email, contraseña y asigná el rol correspondiente.',
          'Asigná la agencia a la que pertenece el usuario.',
          'Guardá. El usuario podrá ingresar de inmediato con las credenciales elegidas.',
        ]} />
        <DocAlert type="warning">
          El email del usuario es su nombre de usuario para ingresar. No puede cambiar su propio email sin ayuda del admin.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Permisos granulares" color="purple" icon={Shield}>
        <DocParagraph>
          Además de los roles base, podés asignar <strong>permisos granulares</strong> a cada usuario para habilitar o deshabilitar
          acciones específicas (ej: permitir confirmar reservas a un agente sin darle rol de admin).
          Esto se gestiona desde <strong>Gestión de Permisos</strong>.
        </DocParagraph>
      </DocSubsection>
    </div>
  );
}

function NominasSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es la nómina acá?" color="blue" icon={Info}>
        <DocParagraph>
          No es una nómina de sueldos: es el <strong>listado de pasajeros</strong> cargados en las reservas confirmadas de un producto (vuelo).
          Cada pasajero es su propio ticket individual, con sus propios datos de documento, precio de venta, neto y número de ticket
          — no se comparten entre pasajeros de una misma reserva.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Quién ve qué" color="purple" icon={Shield}>
        <DocParagraph>
          Ves la nómina de los productos de tu propia agencia, y también la de los productos que otra agencia te cedió por
          <strong> Cesión de Cupos</strong>. Un <DocCode>agency_admin</DocCode> ve toda la nómina de su agencia; un agente
          individual solo ve la de sus propias reservas.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Datos por pasajero" color="green" icon={CheckCircle}>
        <DocList items={[
          'Nombre, apellido, documento, fecha de nacimiento y nacionalidad.',
          '<strong>Tipo de pasajero</strong> (adulto, menor, infante).',
          '<strong>Número de ticket:</strong> se asigna cuando el operador emite el pasaje. Hasta entonces figura como pendiente.',
          '<strong>Doc contable:</strong> referencia del documento contable de esa venta.',
          'Precio de venta y neto — los valores económicos de ESE pasajero, no del pedido completo.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Editar y exportar" color="orange" icon={Download}>
        <DocList items={[
          'Podés editar los datos de un pasajero en cualquier momento desde su fila (por ejemplo, para completar el número de ticket cuando llega).',
          'La tabla es expandible: una fila por pasajero, con todos sus datos a la vista, no una fila por reserva.',
          'Exportá la nómina filtrada a Excel/CSV para enviarla al operador o para control interno.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function AgenciasSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué es una agencia?" color="blue" icon={Info}>
        <DocParagraph>
          Una agencia es la unidad organizativa que agrupa usuarios y reservas. Cada agencia tiene su propio código único
          (ej: <DocCode>AG001</DocCode>), nombre, email y color de identificación en el sistema.
          Los productos cedidos entre agencias se rastrean por código de agencia.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Cómo crear una agencia" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          'Ingresá a <strong>Gestión de Agencias</strong>.',
          'Hacé click en <strong>"Nueva Agencia"</strong>.',
          'Ingresá el código único, nombre, email, teléfono y color.',
          'Guardá. Luego podés asignarle usuarios desde Gestión de Usuarios.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function LogsSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué registra el sistema?" color="blue" icon={Info}>
        <DocParagraph>
          Cada acción importante queda registrada en el log de auditoría: quién hizo qué, cuándo y con qué datos.
          Esto permite rastrear problemas, errores y acciones de usuarios en cualquier momento.
        </DocParagraph>
        <DocList items={[
          'Creación, edición y eliminación de reservas.',
          'Confirmaciones y cancelaciones.',
          'Creación y modificación de productos.',
          'Accesos al sistema y cambios de contraseña.',
          'Cesiones y recuperaciones de cupos.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Filtros de logs" color="green" icon={Search}>
        <DocList items={[
          'Filtrá por <strong>usuario</strong> para ver todo lo que hizo un agente específico.',
          'Filtrá por <strong>fecha</strong> para acotar el rango de búsqueda.',
          'Filtrá por <strong>tipo de acción</strong> para ver solo creaciones, ediciones, etc.',
          'Exportá los logs filtrados en CSV para reportes de compliance.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function PanelControlSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="Backup del sistema" color="blue" icon={Database}>
        <DocSteps steps={[
          'Ingresá a <strong>Panel de Control → Backup</strong>.',
          'Hacé click en <strong>"Crear Backup"</strong> para generar un backup completo de la base de datos.',
          'Los backups anteriores aparecen en la lista. Podés descargarlos o restaurar desde uno.',
        ]} />
        <DocAlert type="warning">
          Restaurar desde un backup sobreescribe todos los datos actuales. Hacé siempre un backup nuevo antes de restaurar.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Cron y alertas automáticas" color="orange" icon={Clock}>
        <DocParagraph>
          El sistema tiene tareas automáticas (cron) que se ejecutan en segundo plano:
        </DocParagraph>
        <DocList items={[
          '<strong>Vencimiento de bloqueos:</strong> libera automáticamente cupos de reservas expiradas.',
          '<strong>Alertas de vencimiento:</strong> envía email de aviso 24 horas antes de que venza un documento contable.',
          '<strong>Notificaciones internas:</strong> genera avisos en el sistema para eventos críticos.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Seguridad" color="red" icon={Shield}>
        <DocList items={[
          'Autenticación mediante <strong>JWT</strong> con expiración configurable.',
          'Las contraseñas se guardan hasheadas con <strong>bcrypt</strong>, nunca en texto plano.',
          'Cada endpoint valida el rol y permisos del usuario antes de ejecutar.',
          'Los datos sensibles (neto 1, precios netos) no son visibles para agentes normales.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function PlantillasNotificacionSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="¿Qué son las plantillas de notificación?" color="blue" icon={Info}>
        <DocParagraph>
          Son plantillas de correo electrónico en formato HTML que el sistema utiliza para enviar notificaciones automáticas ante eventos clave.
          Permiten a los administradores personalizar el diseño, colores y contenido de cada comunicación utilizando variables dinámicas.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Variables dinámicas soportadas" color="green" icon={CheckCircle}>
        <DocParagraph>
          Las plantillas permiten insertar variables dinámicas entre llaves dobles (ej: <DocCode>{`{{nombre}}`}</DocCode>). El sistema las reemplazará automáticamente con los datos reales al enviar el correo:
        </DocParagraph>
        <DocList items={[
          '<strong>&#123;&#123;nombre&#125;&#125;</strong> — Nombre completo del destinatario del correo.',
          '<strong>&#123;&#123;pedido_id&#125;&#125;</strong> — Código único de reserva (ej: P12345).',
          '<strong>&#123;&#123;destino&#125;&#125;</strong> — Ciudad o aeropuerto de destino del vuelo.',
          '<strong>&#123;&#123;fecha_salida&#125;&#125;</strong> — Fecha y hora programada de la salida del vuelo.',
          '<strong>&#123;&#123;vence_at&#125;&#125;</strong> — Fecha y hora límite antes de la cual expira el bloqueo.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Cómo editar y probar una plantilla" color="purple" icon={Settings}>
        <DocSteps steps={[
          'Dirigite a <strong>Ajustes → Plantillas de Notificación</strong> en el menú lateral.',
          'Seleccioná la plantilla que querés modificar (ej: Confirmación de Reserva, Alerta de Vencimiento).',
          'Modificá el asunto y el cuerpo del mensaje en el editor HTML. Podés insertar variables dinámicas en cualquier parte.',
          'Hacé click en <strong>"Previsualizar"</strong> para ver en tiempo real cómo lucirá el correo en pantallas móviles y de escritorio.',
          'Hacé click en <strong>"Guardar"</strong> para registrar los cambios en la base de datos.',
        ]} />
      </DocSubsection>
    </div>
  );
}

function InicioRapidoSection() {
  return (
    <div className="space-y-4">
      <DocSubsection title="Si sos agente de viajes y acabás de entrar" color="green" icon={CheckCircle}>
        <DocSteps steps={[
          'Ingresá con tu email y contraseña. Si no tenés credenciales, pedíselas al administrador.',
          'En el <strong>Dashboard</strong> verás un resumen de tus reservas y cupos disponibles.',
          'Andá a <strong>Disponibilidad</strong> para ver los vuelos disponibles.',
          'Elegí un vuelo y hacé click en el carrito para reservar.',
          'Si tenés dudas, abrí el <strong>Chat IA</strong> y preguntá en lenguaje natural.',
        ]} />
      </DocSubsection>

      <DocSubsection title="Si sos administrador y acabás de instalar" color="purple" icon={Star}>
        <DocSteps steps={[
          'Configurá tu agencia en <strong>Gestión de Agencias</strong>.',
          'Configurá el servidor de email en <strong>Configuración de Email</strong>.',
          'Subí tu logo y colores en <strong>Diseño (White Label)</strong>.',
          'Creá los usuarios de tu equipo en <strong>Gestión de Usuarios</strong>.',
          'Cargá tus productos (cupos) en <strong>Gestión de Productos</strong>.',
          '¡Listo! Ya podés empezar a recibir reservas.',
        ]} />
      </DocSubsection>
    </div>
  );
}

const SECTION_CONTENT = {
  disponibilidad: DisponibilidadSection,
  reservas: ReservasSection,
  productos: ProductosSection,
  cesion: CesionSection,
  ia: IASection,
  diseno: DisenoSection,
  email: EmailSection,
  'plantillas-notificacion': PlantillasNotificacionSection,
  reportes: ReportesSection,
  nominas: NominasSection,
  usuarios: UsuariosSection,
  agencias: AgenciasSection,
  logs: LogsSection,
  'panel-control': PanelControlSection,
  'inicio-rapido': InicioRapidoSection,
};

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function Documentacion() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Secciones visibles para este usuario — oculta las que no le corresponden
  // por permiso real (ver docsSections.js) tanto de la navegación prev/next
  // como del acceso directo por URL, y además la de IA si su agencia la apagó.
  const sections = useMemo(
    () => visibleDocsSections(can, isAdmin).filter((s) => s.key !== 'ia' || user?.ai_habilitado !== false),
    [can, isAdmin, user?.ai_habilitado]
  );

  const currentIndex = sections.findIndex((s) => s.key === section);
  const current = sections[currentIndex];
  const Content = current ? SECTION_CONTENT[section] : null;
  const prev = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentación"
        description="El manual completo del sistema: todo lo que necesitás saber para trabajar sin capacitación previa."
        icon={BookOpen}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Barra de navegación lateral de la documentación para pantallas grandes */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 mb-2">Secciones</p>
            {sections.map((s) => {
              const Icon = s.icon;
              const active = s.key === section;
              return (
                <button
                  key={s.key}
                  onClick={() => navigate(`/documentacion/${s.key}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? '' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate flex-1">{s.label}</span>
                  {s.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
                      active
                        ? 'bg-white/20 border-white/20 text-white dark:bg-black/10 dark:border-black/10 dark:text-zinc-950'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    }`}>
                      {s.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Selector para móviles en la parte superior del contenido */}
          <div className="lg:hidden">
            <label htmlFor="docs-section-select" className="sr-only">Seleccionar sección</label>
            <select
              id="docs-section-select"
              value={section}
              onChange={(e) => navigate(`/documentacion/${e.target.value}`)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm focus:border-zinc-450 dark:focus:border-zinc-750 focus:outline-none"
            >
              {sections.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} {s.badge ? `(${s.badge})` : ''}
                </option>
              ))}
            </select>
          </div>

          {section === DEFAULT_DOCS_SECTION && (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-850 bg-gradient-to-br from-zinc-900 via-zinc-850 to-zinc-950 text-white shadow-lg p-8 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
              
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-2 ring-white/20 backdrop-blur-sm">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Manual del Sistema</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
                      Bienvenido al centro de documentación de la plataforma de <strong>Gestión de Cupos</strong>.
                      Aquí encontrarás instrucciones detalladas paso a paso para operar con éxito y sin necesidad de capacitación previa.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 pt-4">
                    {[
                      { icon: TicketsPlane, title: 'Cupos Aéreos', desc: 'Consultá disponibilidad y reservá al instante.' },
                      { icon: MapPinHouse, title: 'Agencias', desc: 'Operá de manera independiente y segura.' },
                      { icon: Bot, title: 'Asistente IA', desc: 'Asistencia en lenguaje natural y lectura de Documentos.' },
                    ].map((card, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center text-center rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:bg-white/10 transition-colors duration-200"
                      >
                        <card.icon className="h-5 w-5 text-zinc-300 mb-2" />
                        <div className="font-semibold text-sm leading-tight text-white">{card.title}</div>
                        <div className="text-xs text-zinc-400 mt-1">{card.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {Content ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm px-8 py-7">
              <SectionHeader icon={current.icon} title={current.label} badge={current.badge} />
              <Content isAdmin={isAdmin} />
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm px-8 py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Esa sección de documentación no existe o no tenés permisos.</p>
              <Link to={`/documentacion/${DEFAULT_DOCS_SECTION}`} className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold px-4 py-2 hover:bg-zinc-850 dark:hover:bg-zinc-200 transition-colors">
                Ir al inicio de la documentación
              </Link>
            </div>
          )}

          {/* Navegación prev/next entre secciones */}
          {Content && (
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/65">
              {prev ? (
                <button
                  onClick={() => navigate(`/documentacion/${prev.key}`)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {prev.label}
                </button>
              ) : <span />}
              {next && (
                <button
                  onClick={() => navigate(`/documentacion/${next.key}`)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors ml-auto"
                >
                  {next.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-400 dark:text-zinc-650 pt-6 pb-10 select-none">
        <p>Sistema de Gestión de Cupos de Viajes Aéreos — Documentación v3.0</p>
        <p className="mt-1">¿Algo no está claro? Abrí el Chat de IA para preguntar directamente al asistente.</p>
      </div>
    </div>
  );
}
