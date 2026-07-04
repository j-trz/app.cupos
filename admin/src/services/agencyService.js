// Servicio de Agencias: CRUD + subida de logos (Backend API)
import axios from "axios";

/**
 * Estructura de la tabla public.agencies:
 * - id (uuid), code (text, unique), name (text)
 * - email, phone, address, website, is_active (bool), logo_url, logo_path
 * - main_color (text HEX), text_color (text HEX), created_at, updated_at
 */
// No se necesita configuración de Supabase Storage

// Sincroniza el cliente de Storage con el token de la sesión actual
// No se necesita sincronización de autenticación con Supabase Storage
// Utils
const _sanitizeFileName = (name = "") =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

const ensureString = (v) =>
  typeof v === "string" ? v : v == null ? "" : String(v);

const sanitizeFolderName = (code = "") =>
  String(code || "unassigned")
    .trim()
    .replace(/[^\w-]+/g, "_");

const getFileExtension = (file) => {
  const name = ensureString(file?.name || "");
  const type = ensureString(file?.type || "");
  if (/png/i.test(type) || /\.png$/i.test(name)) return "png";
  if (/jpe?g/i.test(type) || /\.(jpe?g)$/i.test(name)) return "jpg";
  if (/webp/i.test(type) || /\.webp$/i.test(name)) return "webp";
  if (/svg\+xml/i.test(type) || /\.svg$/i.test(name)) return "svg";
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ext || "png";
};

const buildLogoObjectPath = (agencyCode, file) => {
  const folder = sanitizeFolderName(agencyCode);
  const ext = getFileExtension(file);
  return `agencies/${folder}/logo.${ext}`;
};

/**
 * Normaliza websites ingresados por el usuario:
 * - Si viene vacío → null
 * - Si no tiene protocolo → agrega https://
 * - Trim de espacios
 */
const normalizeWebsite = (website) => {
  if (!website) return null;
  const raw = String(website).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const normalizeAgency = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    address: row.address || null,
    website: row.website || null,
    is_active: row.is_active ?? true,
    logo_url: row.logo_url || null,
    logo_path: row.logo_path || null,
    main_color: row.main_color || null,
    text_color: row.text_color || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const getLogoPublicUrl = (path, version) => {
  if (!path) return null;
  const base = `http://localhost:3000/logos/${path}`;
  if (version == null) return base;
  return `${base}?v=${encodeURIComponent(version)}`;
};

/**
 * Sube un logo al bucket y retorna { path, url }
 * Requiere políticas: lectura pública y escritura por admin (definidas en migración)
 */
async function uploadLogo(file, { agencyId, agencyCode } = {}) {
  if (!file) return { path: null, url: null };

  // Garantizar que usamos el CODE de la agencia como carpeta
  let code = ensureString(agencyCode);
  if (!code && agencyId) {
    const response = await axios.get(`http://localhost:3000/agencies/${agencyId}`);
    const row = response.data;
    code = ensureString(row?.code);
  }
  if (!code) code = "unassigned";

  const folder = sanitizeFolderName(code);
  const objectPath = buildLogoObjectPath(code, file);

  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`http://localhost:3000/agencies/${agencyId}/logo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  const data = response.data;
  const error = response.status >= 400 ? response.statusText : null;

  if (error) {
    console.error("Error subiendo logo:", error);
    throw new Error(error.message || "No se pudo subir el logo");
  }

  // Limpiar cualquier otro archivo en la carpeta de la agencia (mantener solo el logo actual)
  try {
    // No se necesita limpieza de logos en el backend
  } catch (e) {
    console.warn("Ignorando error no crítico en limpieza de logos:", e);
  }

  // Guardar SIEMPRE la URL base (sin versión) en DB; el cache-busting se hace al LEER
  const url = getLogoPublicUrl(objectPath);
  return { path: data?.path || objectPath, url };
}

/**
 * Lista de agencias (con búsqueda por code/name y filtro de activas)
 * @param {{ search?: string, activeOnly?: boolean, limit?: number, from?: number }} params
 */
async function listAgencies(params = {}) {
  const { search = "", activeOnly = false, limit = 200, from = 0 } = params;
  const response = await axios.get(`http://localhost:3000/agencies`, {
    params: {
      search,
      activeOnly,
      limit,
      from
    }
  });
  const data = response.data.data;
  const total = response.data.total;
  if (response.status >= 400) {
    console.error("Error listando agencias:", response.statusText);
    throw new Error(response.statusText || "No se pudo listar agencias");
  }
  return {
    data: (data || []).map(normalizeAgency),
    total: total ?? (data || []).length,
  };
}

async function getAgencyById(id) {
  const response = await axios.get(`http://localhost:3000/agencies/${id}`);
  const data = response.data;
  const error = response.status >= 400 ? response.statusText : null;
  if (error) {
    console.error("Error obteniendo agencia:", error);
    throw new Error(error || "No se pudo obtener la agencia");
  }
  return normalizeAgency(data);
}

/**
 * Crea una agencia (opcionalmente sube logo)
 * @param {{code:string, name:string, email?:string, phone?:string, address?:string, website?:string, main_color?:string, text_color?:string, is_active?:boolean, logoFile?:File}} input
 */
async function createAgency(input) {
  const {
    code,
    name,
    email = null,
    phone = null,
    address = null,
    website = null,
    main_color = null,
    text_color = null,
    is_active = true,
    logoFile = null,
  } = input || {};

  if (!code || !name) throw new Error("code y name son obligatorios");

  let logo_path = null;
  let logo_url = null;

  // Subir logo primero para poder guardar path/url en la fila
  if (logoFile) {
    const upload = await uploadLogo(logoFile, { agencyCode: code });
    logo_path = upload.path || null;
    logo_url = upload.url || null;
  }

  const normalizedWebsite = normalizeWebsite(website);
  const normalizedMainColor = normalizeHexColor(main_color);
  const normalizedTextColor = normalizeHexColor(text_color);

  const response = await axios.post(`http://localhost:3000/agencies`, {
    code,
    name,
    email,
    phone,
    address,
    website: normalizedWebsite,
    main_color: normalizedMainColor,
    text_color: normalizedTextColor,
    is_active,
    logo_path,
    logo_url,
  });
  const data = response.data;
  const error = response.status >= 400 ? response.statusText : null;
  if (error) {
    console.error("Error creando agencia:", error);
    throw new Error(error || "No se pudo crear la agencia");
  }
  return normalizeAgency(data);
}

/**
 * Actualiza una agencia (opcionalmente reemplaza el logo)
 * @param {string} id
 * @param {{code?:string, name?:string, email?:string, phone?:string, address?:string, website?:string, main_color?:string, text_color?:string, is_active?:boolean}} updates
 * @param {File|null} logoFile
 */
async function updateAgency(id, updates = {}, logoFile = null) {
  if (!id) throw new Error("id es obligatorio");

  const payload = { ...updates };

  // Normalizar website si viene en updates
  if (Object.prototype.hasOwnProperty.call(updates, "website")) {
    payload.website = normalizeWebsite(updates.website);
  }
  // Normalizar dirección si viene en updates
  if (Object.prototype.hasOwnProperty.call(updates, "address")) {
    const v = updates.address;
    payload.address = v == null ? null : String(v).trim() || null;
  }
  // Normalizar colores si vienen en updates
  if (Object.prototype.hasOwnProperty.call(updates, "main_color")) {
    payload.main_color = normalizeHexColor(updates.main_color);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "text_color")) {
    payload.text_color = normalizeHexColor(updates.text_color);
  }

  {
    // Obtener datos actuales si subimos nuevo logo o si cambia el código
    let current = null;
    if (logoFile || Object.prototype.hasOwnProperty.call(updates, "code")) {
      const response = await axios.get(`http://localhost:3000/agencies/${id}`);
      const res = response.data;
      current = res || null;
    }

    if (logoFile) {
      // Subida a ruta fija agencies/{CODE}/logo.{ext}, sobrescribiendo
      const upload = await uploadLogo(logoFile, {
        agencyId: id,
        agencyCode: current?.code || updates?.code,
      });
      payload.logo_path = upload.path || null;
      payload.logo_url = upload.url || null;
    } else if (
      Object.prototype.hasOwnProperty.call(updates, "code") &&
      current?.logo_path &&
      ensureString(updates.code).trim() &&
      ensureString(updates.code).trim() !== ensureString(current.code)
    ) {
      // No se necesita mover logos en el backend
    }
  }

  const response = await axios.put(`http://localhost:3000/agencies/${id}`, payload);
  const data = response.data;
  const error = response.status >= 400 ? response.statusText : null;
  if (error) {
    console.error("Error actualizando agencia:", error);
    throw new Error(error || "No se pudo actualizar la agencia");
  }
  return normalizeAgency(data);
}

/**
 * Eliminación de agencia
 * Por defecto es soft-delete (is_active=false). Para hard delete usar { hard: true }.
 */
async function deleteAgency(id, { hard = false } = {}) {
  if (!id) throw new Error("id es obligatorio");

  if (hard) {
    const response = await axios.delete(`http://localhost:3000/agencies/${id}`);
    if (response.status >= 400) {
      console.error("Error eliminando agencia (hard):", response.statusText);
      throw new Error(response.statusText || "No se pudo eliminar la agencia");
    }
    return { success: true };
  } else {
    const response = await axios.patch(`http://localhost:3000/agencies/${id}`, { is_active: false });
    const data = response.data;
    const error = response.status >= 400 ? response.statusText : null;
    if (error) {
      console.error("Error desactivando agencia:", error);
      throw new Error(error || "No se pudo desactivar la agencia");
    }
    return normalizeAgency(data);
  }
}

/**
 * Retorna lista simple {id, code, name} (activas) para selects
 */
async function listActiveAgencyOptions() {
  const response = await axios.get(`http://localhost:3000/agencies/active`);
  const data = response.data;
  const error = response.status >= 400 ? response.statusText : null;
  if (error) {
    console.error("Error listando opciones de agencia:", error);
    throw new Error(error || "No se pudo listar agencias activas");
  }
  return data || [];
}

const AgencyService = {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  uploadLogo,
  getLogoPublicUrl,
  listActiveAgencyOptions,
};

// Utils - normalizador de color HEX
const normalizeHexColor = (color) => {
  if (!color) return null;
  const raw = String(color).trim();
  if (!raw) return null;
  const val = raw.startsWith("#") ? raw : `#${raw}`;
  return val.toUpperCase();
};

export default AgencyService;
