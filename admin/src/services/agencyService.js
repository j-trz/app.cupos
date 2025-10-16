// Servicio de Agencias: CRUD + subida de logos (Supabase Storage)
import { supabaseWithHeaders as supabase } from "./supabaseConfig";

/**
 * Estructura de la tabla public.agencies:
 * - id (uuid), code (text, unique), name (text)
 * - email, phone, address, website, is_active (bool), logo_url, logo_path
 * - main_color (text HEX), text_color (text HEX), created_at, updated_at
 */
const BUCKET = "agency-logos";

// Utils
const sanitizeFileName = (name = "") =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

const ensureString = (v) =>
  typeof v === "string" ? v : v == null ? "" : String(v);

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

const getLogoPublicUrl = (path) => {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
};

/**
 * Sube un logo al bucket y retorna { path, url }
 * Requiere políticas: lectura pública y escritura por admin (definidas en migración)
 */
async function uploadLogo(file, { agencyId, agencyCode } = {}) {
  if (!file) return { path: null, url: null };

  const fileName = sanitizeFileName(file.name || "logo.png");
  const folder = ensureString(agencyId || agencyCode || "unassigned");
  const objectPath = `agencies/${folder}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "image/png",
    });

  if (error) {
    console.error("Error subiendo logo:", error);
    throw new Error(error.message || "No se pudo subir el logo");
  }

  const url = getLogoPublicUrl(objectPath);
  return { path: data?.path || objectPath, url };
}

/**
 * Lista de agencias (con búsqueda por code/name y filtro de activas)
 * @param {{ search?: string, activeOnly?: boolean, limit?: number, from?: number }} params
 */
async function listAgencies(params = {}) {
  const { search = "", activeOnly = false, limit = 200, from = 0 } = params;
  let query = supabase
    .from("agencies")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  const trimmed = search.trim();
  if (trimmed) {
    // or(name.ilike.%q%,code.ilike.%q%,address.ilike.%q%)
    const pattern = `%${trimmed}%`;
    query = query.or(
      `name.ilike.${pattern},code.ilike.${pattern},address.ilike.${pattern}`
    );
  }
  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  // Paginación simple
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("Error listando agencias:", error);
    throw new Error(error.message || "No se pudo listar agencias");
  }
  return {
    data: (data || []).map(normalizeAgency),
    total: count ?? (data || []).length,
  };
}

async function getAgencyById(id) {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Error obteniendo agencia:", error);
    throw new Error(error.message || "No se pudo obtener la agencia");
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

  const { data, error } = await supabase
    .from("agencies")
    .insert([
      {
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
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Error creando agencia:", error);
    throw new Error(error.message || "No se pudo crear la agencia");
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

  if (logoFile) {
    const { data: current } = await supabase
      .from("agencies")
      .select("code")
      .eq("id", id)
      .single();
    const upload = await uploadLogo(logoFile, {
      agencyId: id,
      agencyCode: current?.code,
    });
    payload.logo_path = upload.path || null;
    payload.logo_url = upload.url || null;
  }

  const { data, error } = await supabase
    .from("agencies")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error actualizando agencia:", error);
    throw new Error(error.message || "No se pudo actualizar la agencia");
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
    const { error } = await supabase.from("agencies").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando agencia (hard):", error);
      throw new Error(error.message || "No se pudo eliminar la agencia");
    }
    return { success: true };
  } else {
    const { data, error } = await supabase
      .from("agencies")
      .update({ is_active: false })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error desactivando agencia:", error);
      throw new Error(error.message || "No se pudo desactivar la agencia");
    }
    return normalizeAgency(data);
  }
}

/**
 * Retorna lista simple {id, code, name} (activas) para selects
 */
async function listActiveAgencyOptions() {
  const { data, error } = await supabase
    .from("agencies")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listando opciones de agencia:", error);
    throw new Error(error.message || "No se pudo listar agencias activas");
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
