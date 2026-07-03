import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Obtener disponibilidad de vuelos desde Power Automate
 */
export const getAvailability = async (req, res) => {
  try {
    const availabilityUrl = process.env.POWERAUTOMATE_GET_URL;
    if (!availabilityUrl) {
      console.error('❌ POWERAUTOMATE_GET_URL no configurada.');
      return res.status(500).json({ error: 'Configuración del servidor incompleta. URL de disponibilidad faltante.' });
    }

    console.log('🌐 Obteniendo disponibilidad de Power Automate...');
    const response = await fetch(availabilityUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error(`❌ Power Automate respondió con error HTTP ${response.status}`);
      return res.status(response.status).json({ error: `La solicitud a Power Automate falló: ${response.status}` });
    }

    const data = await response.json();
    console.log(`✅ Obtenidos ${data.length || 0} registros de disponibilidad`);

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Error obteniendo disponibilidad:', error);
    res.status(500).json({ error: 'Fallo al obtener datos de disponibilidad.', details: error.message });
  }
};

/**
 * Obtener solicitudes de cupo filtradas por agencia
 */
export const getRequests = async (req, res) => {
  try {
    const requestsUrl = process.env.POWERAUTOMATE_GET_REQUESTS_URL;
    if (!requestsUrl) {
      console.error('❌ POWERAUTOMATE_GET_REQUESTS_URL no configurada.');
      return res.status(500).json({ error: 'Configuración del servidor incompleta. URL de solicitudes faltante.' });
    }

    console.log('🌐 Obteniendo solicitudes de Power Automate...');
    const response = await fetch(requestsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error(`❌ Power Automate respondió con error HTTP ${response.status}`);
      return res.status(response.status).json({ error: `La solicitud a Power Automate falló: ${response.status}` });
    }

    let data = await response.json();

    // 1. Filtrar solo las que están en estado "Solicitado"
    data = data.filter(item => item.Estado === 'Solicitado');

    // 2. Filtrar por la agencia del usuario si no es administrador
    const userRole = req.user.role;
    const userAgency = req.user.agencia;

    if (userRole !== 'admin' && userAgency) {
      data = data.filter(item => item.Agencia === userAgency);
    }

    console.log(`✅ Obtenidas ${data.length} solicitudes después de filtrar.`);

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Error obteniendo solicitudes:', error);
    res.status(500).json({ error: 'Fallo al obtener datos de solicitudes.', details: error.message });
  }
};

/**
 * Obtener reservas confirmadas filtradas por agencia
 */
export const getConfirmations = async (req, res) => {
  try {
    const confirmationsUrl = process.env.POWERAUTOMATE_GET_CONFIRMATIONS_URL;
    if (!confirmationsUrl) {
      console.error('❌ POWERAUTOMATE_GET_CONFIRMATIONS_URL no configurada.');
      return res.status(500).json({ error: 'Configuración del servidor incompleta. URL de confirmaciones faltante.' });
    }

    console.log('🌐 Obteniendo confirmaciones de Power Automate...');
    const response = await fetch(confirmationsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error(`❌ Power Automate respondió con error HTTP ${response.status}`);
      return res.status(response.status).json({ error: `La solicitud a Power Automate falló: ${response.status}` });
    }

    let data = await response.json();

    // 1. Filtrar solo las confirmadas
    data = data.filter(item => item.Estado === 'Confirmado');

    // 2. Filtrar por la agencia del usuario si no es administrador
    const userRole = req.user.role;
    const userAgency = req.user.agencia;

    if (userRole !== 'admin' && userAgency) {
      data = data.filter(item => item.Agencia === userAgency);
    }

    console.log(`✅ Obtenidas ${data.length} confirmaciones después de filtrar.`);

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Error obteniendo confirmaciones:', error);
    res.status(500).json({ error: 'Fallo al obtener datos de confirmaciones.', details: error.message });
  }
};

/**
 * Enviar solicitud de reserva
 */
export const submitReservation = async (req, res) => {
  const { payload } = req.body;

  if (!payload || !payload.pedidoId || !payload.vuelo || !payload.pasajeros || !payload.contacto) {
    return res.status(400).json({
      error: 'Estructura de datos de reserva inválida.',
      details: 'Campos requeridos: pedidoId, vuelo, pasajeros, contacto.'
    });
  }

  const userRole = req.user.role;
  const userAgency = req.user.agencia;

  // Validar que el usuario no admin no intente reservar para otra agencia
  if (userRole !== 'admin' && userAgency && payload.contacto.agencia !== userAgency) {
    return res.status(403).json({ error: 'Prohibido. No puede solicitar reservas para otras agencias.' });
  }

  try {
    const postUrl = process.env.POWERAUTOMATE_SUBMIT_URL;
    if (!postUrl) {
      console.error('❌ POWERAUTOMATE_SUBMIT_URL no configurada.');
      return res.status(500).json({ error: 'Configuración del servidor incompleta. URL de envío de reservas faltante.' });
    }

    // Generar registros individuales por pasajero
    const reservationRecords = payload.pasajeros.map(pasajero => ({
      pedido_id: payload.pedidoId,
      agencia: payload.contacto.agencia,
      contacto_nombre: payload.contacto.nombre,
      contacto_email: payload.contacto.email,
      contacto_telefono: payload.contacto.telefono,
      vuelo_codigo: payload.vuelo.codigo_cupo,
      vuelo_destino: payload.vuelo.destino,
      vuelo_compania: payload.vuelo.compania,
      vuelo_salida: payload.vuelo.salida,
      vuelo_precio: String(payload.vuelo.precio),
      neto_1: String(payload.vuelo.neto_1 || '0'),
      op: String(payload.vuelo.op || '0'),
      temporada: payload.vuelo.temporada,
      pnr: payload.vuelo.pnr,
      ficha: payload.vuelo.ficha,
      ruta: payload.vuelo.ruta,
      nombre_pasajero: pasajero.nombre,
      apellido_pasajero: pasajero.apellido,
      documento_pasajero: pasajero.documento,
      nacimiento_pasajero: String(pasajero.nacimiento),
      nacionalidad_pasajero: pasajero.nacionalidad,
      tipo_pasajero: pasajero.tipo
    }));

    console.log(`🌐 Enviando ${reservationRecords.length} reservas a Power Automate...`);

    const results = [];
    for (const record of reservationRecords) {
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        results.push({ success: true, passenger: `${record.nombre_pasajero} ${record.apellido_pasajero}` });
      } else {
        const errorText = await response.text();
        console.error(`❌ Error enviando pasajero ${record.nombre_pasajero}: HTTP ${response.status} - ${errorText}`);
        results.push({
          success: false,
          passenger: `${record.nombre_pasajero} ${record.apellido_pasajero}`,
          error: `HTTP ${response.status}`,
          details: errorText
        });
      }
    }

    const allSuccessful = results.every(r => r.success);

    res.status(allSuccessful ? 200 : 207).json({
      success: allSuccessful,
      message: allSuccessful ? 'Todas las reservas se procesaron con éxito.' : 'Algunas reservas fallaron.',
      results
    });
  } catch (error) {
    console.error('❌ Error enviando reservas:', error);
    res.status(500).json({ error: 'Error al enviar reservas a Power Automate.', details: error.message });
  }
};
