import { query } from '../db.js';
import { sendTemplateEmail } from './emailService.js';

const DEFAULT_BLOCK_MINUTES = 60;

const parseJsonValue = (value, fallback) => {
  try {
    return typeof value === 'object' ? value : JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

export const getSystemSetting = async (key, fallback) => {
  const result = await query('SELECT value FROM system_settings WHERE key = $1 LIMIT 1', [key]);
  if (result.rows.length === 0) return fallback;
  return parseJsonValue(result.rows[0].value, fallback);
};

export const getProductById = async (productId) => {
  const result = await query('SELECT * FROM products WHERE id = $1', [productId]);
  return result.rows[0] || null;
};

export const serializeReservation = (reservation, isAdmin = false) => {
  const serialized = { ...reservation };
  if (!isAdmin) {
    delete serialized.neto_1;
  }
  return serialized;
};

const createNotification = async ({ type, title, message, data, targetUserId, targetRole }) => {
  await query(
    `INSERT INTO public.notifications (type, title, message, data, target_user_id, target_role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [type, title, message, JSON.stringify(data || {}), targetUserId || null, targetRole || null]
  );
};

const getAdminEmails = async () => {
  const result = await query("SELECT email FROM public.profiles WHERE role = 'admin' AND email IS NOT NULL");
  return result.rows.map((row) => row.email).filter(Boolean);
};

const getAgencyEmail = async (agencyCode) => {
  if (!agencyCode) return null;
  const result = await query('SELECT email FROM public.agencies WHERE code = $1 LIMIT 1', [agencyCode]);
  return result.rows[0]?.email || null;
};

const shouldSendExpirationEmail = async (product) => {
  const globalConfig = await getSystemSetting('temporary_block_expiration_email_enabled', { enabled: true });
  if (product?.email_warning_enabled === false) {
    return false;
  }
  return Boolean(globalConfig.enabled !== false);
};

const getBlockDurationMinutes = async (product) => {
  if (Number.isInteger(product?.bloqueo_temporal_minutos) && product.bloqueo_temporal_minutos > 0) {
    return product.bloqueo_temporal_minutos;
  }

  const globalValue = await getSystemSetting('default_temporary_block_minutes', { minutes: DEFAULT_BLOCK_MINUTES });
  return Number(globalValue?.minutes ?? DEFAULT_BLOCK_MINUTES);
};

const getLatestReservationData = (product, body) => {
  return {
    precio_venta: product.precio || 0,
    neto_1: product.neto_1 || 0,
    vuelo_precio: product.precio || 0,
    vuelo_codigo: body.vuelo_codigo || product.codigo_cupo || '',
    vuelo_destino: body.vuelo_destino || product.destino || '',
    vuelo_compania: body.vuelo_compania || product.compania || '',
    vuelo_salida: body.vuelo_salida || product.fecha_salida || null,
    nombre_pasajero: body.nombre_pasajero || '',
    apellido_pasajero: body.apellido_pasajero || '',
    documento_pasajero: body.documento_pasajero || '',
    nacimiento_pasajero: body.nacimiento_pasajero || null,
    nacionalidad_pasajero: body.nacionalidad_pasajero || null,
    tipo_pasajero: body.tipo_pasajero || null
  };
};

const normalizeReservationAgency = (body) => {
  if (body.agencia) return body.agencia;
  if (body.agency) return body.agency;
  return 'default';
};

const updateAlertRuleTriggeredMetadata = async (ruleId, availability) => {
  await query(
    `UPDATE alert_rules SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{last_triggered_availability}', to_jsonb($1::int), true), last_triggered_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [availability, ruleId]
  );
};

const resetAlertRuleTriggeredMetadata = async (ruleId) => {
  await query(
    `UPDATE alert_rules SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{last_triggered_availability}', NULL, true), last_triggered_at = NULL, updated_at = NOW() WHERE id = $1`,
    [ruleId]
  );
};

const evaluateAlertRulesForProduct = async (product, reservation) => {
  const rulesResult = await query('SELECT * FROM alert_rules WHERE product_id = $1 AND is_active = TRUE', [product.id]);
  const rules = rulesResult.rows;
  const availability = product.disponibilidad;
  const adminEmails = await getAdminEmails();
  const agencyEmail = await getAgencyEmail(reservation.agencia);
  const lowAvailabilityEmailEnabled = Boolean((await getSystemSetting('low_availability_email_enabled', { enabled: true })).enabled !== false);

  for (const rule of rules) {
    const lastTriggeredAvailability = rule.metadata?.last_triggered_availability ?? null;
    const shouldTrigger = availability <= rule.threshold_quantity && (lastTriggeredAvailability === null || lastTriggeredAvailability > rule.threshold_quantity);
    const shouldReset = availability > rule.threshold_quantity && lastTriggeredAvailability !== null;

    if (shouldReset) {
      await resetAlertRuleTriggeredMetadata(rule.id);
    }

    if (!shouldTrigger) {
      continue;
    }

    const message = `Quedan ${availability} lugares en el cupo ${product.codigo_cupo}. Umbral establecido en ${rule.threshold_quantity}.`;
    const title = 'Alerta de cupo bajo';
    const notificationData = {
      productId: product.id,
      productCode: product.codigo_cupo,
      availability,
      threshold: rule.threshold_quantity
    };

    if (rule.actions.includes('in_app_alert')) {
      await createNotification({
        type: 'low_availability',
        title,
        message,
        data: notificationData,
        targetRole: 'admin'
      });
      await createNotification({
        type: 'low_availability',
        title,
        message,
        data: notificationData,
        targetRole: 'agency_admin'
      });
    }

    if (rule.actions.includes('email_admin') && rule.send_email_to_admin && lowAvailabilityEmailEnabled) {
      for (const adminEmail of adminEmails) {
        try {
          await sendTemplateEmail('low_availability_alert', adminEmail, {
            product_code: product.codigo_cupo,
            availability,
            threshold: rule.threshold_quantity,
            product_destino: product.destino,
            product_compania: product.compania
          });
        } catch (error) {
          console.error('Error enviando low availability email a admin:', error.message);
        }
      }
    }

    if (rule.actions.includes('email_agency') && rule.send_email_to_agency && lowAvailabilityEmailEnabled && agencyEmail) {
      try {
        await sendTemplateEmail('low_availability_alert', agencyEmail, {
          product_code: product.codigo_cupo,
          availability,
          threshold: rule.threshold_quantity,
          product_destino: product.destino,
          product_compania: product.compania
        });
      } catch (error) {
        console.error('Error enviando low availability email a agencia:', error.message);
      }
    }

    if (rule.actions.includes('block_sale')) {
      await query('UPDATE products SET is_blocked_for_sale = TRUE, updated_at = NOW() WHERE id = $1', [product.id]);
    }

    await updateAlertRuleTriggeredMetadata(rule.id, availability);
  }
};

export const createTemporaryReservation = async ({ productId, createdBy, body }) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (product.is_blocked_for_sale) {
    throw new Error('Este cupo está bloqueado para venta.');
  }

  if (product.disponibilidad <= 0) {
    throw new Error('No hay disponibilidad suficiente para este paquete.');
  }

  const blockMinutes = await getBlockDurationMinutes(product);
  const bloque_at = new Date();
  const expiresAt = new Date(bloque_at.getTime() + blockMinutes * 60 * 1000);
  const reservationData = getLatestReservationData(product, body);
  const agencia = body.agencia || body.agencia || (body.agencia === undefined ? null : body.agencia);

  try {
    await query('BEGIN');

    const productUpdate = await query(
      'UPDATE products SET disponibilidad = disponibilidad - 1, updated_at = NOW() WHERE id = $1 AND disponibilidad > 0 RETURNING disponibilidad, is_blocked_for_sale',
      [productId]
    );

    if (productUpdate.rows.length === 0) {
      throw new Error('No se pudo reservar el cupo porque no hay disponibilidad.');
    }

    const updatedProduct = { ...product, disponibilidad: productUpdate.rows[0].disponibilidad };
  const reservationAgency = normalizeReservationAgency(body);
  const inserted = await query(
      `INSERT INTO reservations (
        product_id, created_by, estado, bloqueo_expira_at,
        precio_venta, neto_1, pedido_id, agencia, contacto_nombre, contacto_email,
        contacto_telefono, vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida,
        vuelo_precio, nombre_pasajero, apellido_pasajero, documento_pasajero,
        nacimiento_pasajero, nacionalidad_pasajero, tipo_pasajero,
        ficha_venta, doc_contable, doc_contable_expires_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'bloqueo_temporal', $3,
        $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        NOW(), NOW()
      ) RETURNING *`,
      [
        productId,
        createdBy,
        expiresAt,
        reservationData.precio_venta,
        reservationData.neto_1,
        body.pedido_id,
        reservationAgency,
        body.contacto_email,
        body.contacto_telefono || null,
        reservationData.vuelo_codigo,
        reservationData.vuelo_destino,
        reservationData.vuelo_compania,
        reservationData.vuelo_salida,
        reservationData.vuelo_precio,
        reservationData.nombre_pasajero,
        reservationData.apellido_pasajero,
        reservationData.documento_pasajero,
        reservationData.nacimiento_pasajero,
        reservationData.nacionalidad_pasajero,
        reservationData.tipo_pasajero,
        body.ficha_venta || null,
        body.doc_contable || null,
        new Date(expiresAt.getTime() + (24 * 60 * 60 * 1000))
      ]
    );

    const reservation = inserted.rows[0];

    await createNotification({
      type: 'reservation_blocked',
      title: 'Reserva en bloqueo temporal',
      message: `Tu reserva se bloqueó temporalmente y expirará en ${blockMinutes} minutos si no se confirma.`,
      data: { reservation_id: reservation.id, expires_at: reservation.bloqueo_expira_at },
      targetUserId: createdBy
    });

    const emailEnabled = await shouldSendExpirationEmail(product);
    if (emailEnabled) {
      try {
        await sendTemplateEmail('reservation_temporary_blocked', body.contacto_email, {
          nombre_usuario: body.contacto_nombre,
          product_code: product.codigo_cupo,
          product_destino: product.destino,
          expires_at: expiresAt.toISOString(),
          minutos_restantes: blockMinutes,
          precio_venta: reservation.precio_venta
        });
      } catch (error) {
        console.error('Error enviando email de bloqueo temporal:', error.message);
      }
    }

    await evaluateAlertRulesForProduct(updatedProduct, {
      ...body,
      agencia: body.agencia || 'default'
    });

    await query('COMMIT');
    return reservation;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
};

export const expireTemporaryReservations = async () => {
  const expiredReservations = await query(
    `SELECT * FROM reservations
     WHERE estado = 'bloqueo_temporal'
       AND bloqueo_expira_at IS NOT NULL
       AND bloqueo_expira_at <= NOW()`
  );

  const processedReservations = [];

  for (const reservation of expiredReservations.rows) {
    try {
      await query('BEGIN');

      const alreadyExpired = await query(
        `SELECT 1 FROM reservations WHERE id = $1 AND estado = 'expirada'`,
        [reservation.id]
      );

      if (alreadyExpired.rows.length > 0) {
        await query('COMMIT');
        continue;
      }

      await query(
        `UPDATE reservations SET estado = 'expirada', updated_at = NOW() WHERE id = $1`,
        [reservation.id]
      );

      if (reservation.product_id) {
        await query(
          `UPDATE products SET disponibilidad = disponibilidad + 1, updated_at = NOW() WHERE id = $1`,
          [reservation.product_id]
        );
      }

      await createNotification({
        type: 'reservation_expired',
        title: 'Reserva expirada',
        message: 'Tu bloqueo temporal venció y el cupo fue liberado.',
        data: { reservation_id: reservation.id },
        targetUserId: reservation.created_by
      });

      try {
        await sendTemplateEmail('reservation_expired', reservation.contacto_email, {
          nombre_usuario: reservation.contacto_nombre,
          product_code: reservation.product_id,
          product_destino: reservation.vuelo_destino,
          vuelo_codigo: reservation.vuelo_codigo
        });
      } catch (error) {
        console.error('Error enviando email de expiración de reserva:', error.message);
      }

      processedReservations.push(reservation.id);
      await query('COMMIT');
    } catch (err) {
      await query('ROLLBACK');
      console.error('Error expirando reserva temporal:', err.message);
    }
  }

  return processedReservations;
};

/**
 * Expirar reservas bloqueadas que no tienen doc_contable después del tiempo límite
 * Se llama desde un cron job separado
 */
export const expireReservationsWithoutDocContable = async () => {
  const expiredReservations = await query(
    `SELECT * FROM reservations
     WHERE estado = 'bloqueo_temporal'
       AND (doc_contable IS NULL OR doc_contable = '')
       AND doc_contable_expires_at IS NOT NULL
       AND doc_contable_expires_at <= NOW()`
  );

  const processedReservations = [];

  for (const reservation of expiredReservations.rows) {
    try {
      await query('BEGIN');

      const alreadyExpired = await query(
        `SELECT 1 FROM reservations WHERE id = $1 AND estado = 'expirada_sin_doc'`,
        [reservation.id]
      );

      if (alreadyExpired.rows.length > 0) {
        await query('COMMIT');
        continue;
      }

      // Actualizar estado a expirada_sin_doc (nuevo estado para reservas sin documento)
      await query(
        `UPDATE reservations SET estado = 'expirada_sin_doc', updated_at = NOW() WHERE id = $1`,
        [reservation.id]
      );

      // Liberar el cupo
      if (reservation.product_id) {
        await query(
          `UPDATE products SET disponibilidad = disponibilidad + 1, updated_at = NOW() WHERE id = $1`,
          [reservation.product_id]
        );
      }

      await createNotification({
        type: 'reservation_expired',
        title: 'Reserva expirada - Sin documento',
        message: 'Tu reserva venció porque no se agregó el documento contable a tiempo.',
        data: { reservation_id: reservation.id },
        targetUserId: reservation.created_by
      });

      try {
        await sendTemplateEmail('reservation_expired_no_doc', reservation.contacto_email, {
          nombre_usuario: reservation.contacto_nombre,
          product_code: reservation.product_id,
          product_destino: reservation.vuelo_destino,
          vuelo_codigo: reservation.vuelo_codigo,
          doc_contable_deadline: reservation.doc_contable_expires_at
        });
      } catch (error) {
        console.error('Error enviando email de expiración por documento:', error.message);
      }

      processedReservations.push(reservation.id);
      await query('COMMIT');
    } catch (err) {
      await query('ROLLBACK');
      console.error('Error expirando reserva sin documento:', err.message);
    }
  }

  return processedReservations;
};

export const confirmTemporaryReservation = async (reservationId) => {
  const reservationResult = await query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
  if (reservationResult.rows.length === 0) {
    throw new Error('Reserva no encontrada');
  }

  const reservation = reservationResult.rows[0];
  if (reservation.estado !== 'bloqueo_temporal') {
    throw new Error('Solo se puede confirmar una reserva con bloqueo temporal.');
  }

  await query('BEGIN');

  const updatedReservation = await query(
    `UPDATE reservations SET estado = 'bloqueo_permanente', bloqueo_expira_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [reservationId]
  );

  const confirmed = updatedReservation.rows[0];

  await createNotification({
    type: 'reservation_confirmed',
    title: 'Reserva confirmada',
    message: 'Tu reserva ha sido confirmada de forma permanente.',
    data: { reservation_id: reservationId },
    targetUserId: reservation.created_by
  });

  try {
    await sendTemplateEmail('reservation_confirmed', reservation.contacto_email, {
      nombre_usuario: reservation.contacto_nombre,
      solicitud_id: reservation.pedido_id,
      vuelo_codigo: reservation.vuelo_codigo,
      vuelo_destino: reservation.vuelo_destino,
      vuelo_compania: reservation.vuelo_compania,
      vuelo_salida: reservation.vuelo_salida,
      precio_venta: reservation.precio_venta
    });
  } catch (error) {
    console.error('Error enviando email de confirmación de reserva:', error.message);
  }

  await query('COMMIT');
  return confirmed;
};
