import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, ArrowRightLeft, MessageSquare, Users, Shield, BarChart3, Bell, Download, Database, AlertTriangle, CheckCircle, Info, Zap, Star, Clock, Search, FileText, User, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useWhiteLabel } from '../contexts/WhiteLabelContext.jsx';
import { DOCS_SECTIONS, DEFAULT_DOCS_SECTION } from '../lib/docsSections.js';

// ─── Encabezado estático de sección (ya no es un acordeón: cada sección es su
// propia ruta, así que no hace falta colapsar nada dentro del main) ─────────
function SectionHeader({ icon: Icon, title, badge }) {
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#3b82f6';
  return (
    <div className="flex items-center gap-3 mb-5">
      {Icon && <span className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800" style={{ color: primaryColor }}>
        <Icon className="w-5 h-5" />
      </span>}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {badge && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold border select-none"
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
  return <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">{children}</p>;
}

function DocSubsection({ title, children, icon: Icon, color = 'blue' }) {
  const { config } = useWhiteLabel();
  const primary = config?.colors?.primary || '#3b82f6';
  const success = config?.colors?.success || '#10b981';
  const warning = config?.colors?.warning || '#f59e0b';
  const error = config?.colors?.error || '#ef4444';

  const colorMap = {
    blue: { border: primary, bg: `${primary}08` },
    green: { border: success, bg: `${success}08` },
    orange: { border: warning, bg: `${warning}08` },
    purple: { border: primary, bg: `${primary}08` },
    red: { border: error, bg: `${error}08` },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className="border-l-4 rounded-r-xl px-4 py-3 mb-4 shadow-sm border-opacity-70"
      style={{ borderColor: c.border, backgroundColor: c.bg }}
    >
      {title && (
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: c.border }} />}
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

function DocSteps({ steps }) {
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#3b82f6';

  return (
    <ol className="space-y-3 my-4">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="w-5.5 h-5.5 rounded-full text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {i + 1}
          </span>
          <span className="leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: step }} />
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
    <ul className="space-y-2 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 shadow-sm animate-pulse"
            style={{ backgroundColor: activeColor }}
          />
          <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
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
    info: { border: primary, bg: `${primary}10`, text: 'text-zinc-800 dark:text-zinc-200', Icon: Info },
    warning: { border: warning, bg: `${warning}10`, text: 'text-zinc-800 dark:text-zinc-200', Icon: AlertTriangle },
    success: { border: success, bg: `${success}10`, text: 'text-zinc-800 dark:text-zinc-200', Icon: CheckCircle },
    tip: { border: primary, bg: `${primary}10`, text: 'text-zinc-800 dark:text-zinc-200', Icon: Star },
  };

  const s = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${s.text} text-xs my-3 shadow-sm`}
      style={{ borderColor: s.border, backgroundColor: s.bg }}
    >
      <s.Icon className="w-4 h-4 flex-shrink-0 mt-0.5 animate-bounce-slow" style={{ color: s.border }} />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function DocCode({ children }) {
  return (
    <code className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded text-[11px] font-mono border border-zinc-200 dark:border-zinc-700/50">
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

function ReservasSection() {
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

      <DocSubsection title="Generar el Itinerario PDF (con marca de la agencia)" color="purple" icon={Download}>
        <DocSteps steps={[
          'Asegurate de que el pasajero tiene un Número de Ticket asignado.',
          'En la columna de acciones, hacé click en el ícono azul de <strong>documento</strong>.',
          'Se abre el modal de Itinerario con el diseño de tu agencia: logo, colores, nombre.',
          'Hacé click en <strong>"Descargar PDF"</strong>. Se abre la ventana de impresión del navegador.',
          'Elegí "Guardar como PDF" o envialo directamente a la impresora.',
        ]} />
        <DocAlert type="tip">
          Los colores y el logo del itinerario se toman automáticamente del <strong>Diseño / White Label</strong> configurado por tu agencia. Para cambiarlos, ingresá a la sección de Diseño.
        </DocAlert>
      </DocSubsection>

      <DocSubsection title="Cupos cedidos: ¿cómo los veo?" color="orange" icon={ArrowRightLeft}>
        <DocParagraph>
          Si el operador te prestó cupos de otra agencia, esas reservas aparecerán con el indicador <strong>"Cupo cedido de [Agencia]"</strong> en la columna Cesión.
          Esto te permite saber de dónde viene el cupo sin tener que consultar con el operador.
        </DocParagraph>
      </DocSubsection>

      <DocSubsection title="Solución de problemas frecuentes" color="red" icon={AlertTriangle}>
        <DocList color="red" items={[
          '<strong>La reserva vence y no puedo confirmarla:</strong> contactá al operador para que extienda el bloqueo o cree una nueva reserva.',
          '<strong>No aparece el botón de PDF:</strong> verificá que el pasajero tenga un Número de Ticket asignado.',
          '<strong>"Error al crear la reserva":</strong> verificá que el producto tenga cupos disponibles y que tu agencia tenga acceso.',
          '<strong>No veo mis reservas:</strong> revisá el filtro de estado y el buscador — puede haber un filtro activo.',
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
  reportes: ReportesSection,
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
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#3b82f6';
  const secondaryColor = config?.colors?.secondary || '#64748b';

  const currentIndex = DOCS_SECTIONS.findIndex((s) => s.key === section);
  const current = DOCS_SECTIONS[currentIndex];
  const Content = SECTION_CONTENT[section];
  const prev = currentIndex > 0 ? DOCS_SECTIONS[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < DOCS_SECTIONS.length - 1 ? DOCS_SECTIONS[currentIndex + 1] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Documentación"
        description="El manual completo del sistema: todo lo que necesitás saber para trabajar sin capacitación previa."
        icon={BookOpen}
      />

      {section === DEFAULT_DOCS_SECTION && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white shadow-md border border-zinc-200/10"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
        >
          {/* Decoración */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-xl" />
          <div className="pointer-events-none absolute -bottom-10 right-16 h-28 w-28 rounded-full bg-white/5 blur-xl" />

          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2 select-none">¿Qué es este sistema?</h2>
          <p className="text-white/90 text-sm leading-relaxed mb-6 max-w-3xl">
            Es una plataforma integral para la gestión de <strong>cupos aéreos</strong> (bloqueos de asientos en vuelos).
            Permite al operador mayorista cargar, distribuir y controlar sus cupos, y a las agencias minoristas hacer reservas
            para sus clientes de forma simple, automatizada y segura.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { icon: '✈️', title: 'Cupos', desc: 'Asientos bloqueados en vuelos a precio fijo.' },
              { icon: '🏢', title: 'Agencias', desc: 'Cada agencia ve y gestiona solo sus reservas.' },
              { icon: '🤖', title: 'IA integrada', desc: 'Asistente que procesa DNI y asiste en lenguaje natural.' },
            ].map(card => (
              <div
                key={card.title}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-200 hover:scale-[1.01] hover:shadow-sm"
              >
                <div className="text-2xl mb-1.5">{card.icon}</div>
                <div className="font-semibold text-sm leading-tight">{card.title}</div>
                <div className="text-xs text-white/80 mt-1">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Content ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-5">
          <SectionHeader icon={current.icon} title={current.label} badge={current.badge} />
          <Content />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Esa sección de documentación no existe.</p>
          <Link to={`/documentacion/${DEFAULT_DOCS_SECTION}`} className="text-sm font-medium text-blue-600 hover:underline">
            Ir al inicio de la documentación
          </Link>
        </div>
      )}

      {/* Navegación prev/next entre secciones */}
      {Content && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {prev ? (
            <button
              onClick={() => navigate(`/documentacion/${prev.key}`)}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {prev.label}
            </button>
          ) : <span />}
          {next && (
            <button
              onClick={() => navigate(`/documentacion/${next.key}`)}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ml-auto"
            >
              {next.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-zinc-400 dark:text-zinc-600 pt-6 pb-10 select-none">
        <p>Sistema de Gestión de Cupos de Viajes Aéreos — Documentación v2.1</p>
        <p className="mt-1">¿Algo no está claro? Abrí el Chat de IA para preguntar directamente al asistente.</p>
      </div>
    </div>
  );
}
