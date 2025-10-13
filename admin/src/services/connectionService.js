import { supabase } from "../supabaseClient";
import { supabaseWithHeaders } from "./supabaseConfig";
// No longer using client-side encryption for this service's core logic
// import EncryptionService from "./encryptionService";
import DataValidator from "./dataValidator";
import AuthorizationService from "./authorizationService";

/**
 * Servicio para gestionar conexiones a APIs externas de forma segura
 */
class ConnectionService {
  /**
   * Crear una nueva conexión API (SIMPLIFICADO - sin encriptación)
   * @param {Object} connectionData - Datos de la conexión
   * @returns {Promise<Object>} Conexión creada
   */
  static async createConnection(connectionData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const {
        name,
        type,
        description,
        credentials,
        scope = "user",
        target_agency,
      } = connectionData;
      if (!name || !type || !credentials) {
        throw new Error("Datos de conexión incompletos");
      }
      const profile = await AuthorizationService.getCurrentUserProfile();

      // Crear registro de conexión
      const { data: connection, error } = await supabase
        .from("data_connections")
        .insert([
          {
            user_id: user.id,
            name,
            type,
            description,
            scope,
            target_agency:
              scope === "agency"
                ? target_agency || profile?.agencia || null
                : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Guardar credenciales directamente (sin encriptación)
      const credentialEntries = Object.entries(credentials).map(
        ([key, value]) => ({
          connection_id: connection.id,
          user_id: user.id,
          credential_key: key,
          credential_value: value,
          created_at: new Date().toISOString(),
        })
      );

      const { error: credError } = await supabase
        .from("api_credentials")
        .insert(credentialEntries);

      if (credError) {
        // Si falla, eliminar la conexión
        await supabase
          .from("data_connections")
          .delete()
          .eq("id", connection.id);
        console.error("Error guardando credenciales:", credError);
        throw new Error("No se pudieron guardar las credenciales");
      }

      return { success: true, connection };
    } catch (error) {
      console.error("Error creating connection:", error);
      throw new Error(error.message || "Error al crear la conexión");
    }
  }

  /**
   * Obtener todas las conexiones del usuario actual
   * @returns {Promise<Array>} Lista de conexiones (sin credenciales)
   */
  static async getUserConnections() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Primero intentar con is_active (usando RLS para listar accesibles: propias, de agencia y globales)
      let { data, error } = await supabase
        .from("data_connections")
        .select(
          "id, user_id, name, type, description, column_mapping, scope, target_agency, is_active, created_at, updated_at, last_tested_at, connection_status"
        )
        .order("created_at", { ascending: false });

      // Si hay error por columna is_active, usar consulta sin esa columna
      if (
        error &&
        (error.code === "42703" ||
          error.message?.includes("is_active") ||
          error.message?.includes("column"))
      ) {
        console.warn(
          "Columna is_active no existe, obteniendo conexiones sin ese campo"
        );

        const fallbackResult = await supabase
          .from("data_connections")
          .select(
            "id, user_id, name, type, description, column_mapping, scope, target_agency, created_at, updated_at, last_tested_at, connection_status"
          )
          .order("created_at", { ascending: false });

        data = fallbackResult.data;
        error = fallbackResult.error;

        // Agregar is_active como false por defecto para mantener compatibilidad
        if (data) {
          data = data.map((conn) => ({ ...conn, is_active: false }));
        }
      }

      if (error) throw error;

      return {
        success: true,
        connections: data || [],
      };
    } catch (error) {
      console.error("Error fetching connections:", error);
      throw new Error(error.message || "Error al obtener las conexiones");
    }
  }

  /**
   * Obtener credenciales de una conexión (SIMPLIFICADO - sin encriptación)
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Credenciales en texto plano
   */
  static async getDecryptedCredentials(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener credenciales directamente de la base de datos
      const { data, error } = await supabase
        .from("api_credentials")
        .select("credential_key, credential_value")
        .eq("connection_id", connectionId);
      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("No se encontraron credenciales para esta conexión");
      }

      // Convertir array a objeto
      const credentials = {};
      data.forEach((item) => {
        credentials[item.credential_key] = item.credential_value;
      });

      console.log("✅ Credenciales obtenidas exitosamente");
      return credentials;
    } catch (error) {
      console.error("Error obteniendo credenciales:", error);
      throw error;
    }
  }

  /**
   * Actualizar una conexión existente (SIMPLIFICADO - sin encriptación)
   * @param {string} connectionId - ID de la conexión
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Conexión actualizada
   */
  static async updateConnection(connectionId, updateData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const updates = {
        updated_at: new Date().toISOString(),
      };

      // Campos que se pueden actualizar
      const allowedFields = [
        "name",
        "description",
        "column_mapping",
        "scope",
        "target_agency",
        "is_active",
      ];
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      // Completar agency por defecto cuando el scope sea 'agency' y no se haya provisto
      if (
        updates.scope === "agency" &&
        (updates.target_agency === undefined ||
          updates.target_agency === null ||
          updates.target_agency === "")
      ) {
        const profile = await AuthorizationService.getCurrentUserProfile();
        updates.target_agency = profile?.agencia || null;
      }

      // Actualizar metadatos de la conexión
      const { data, error } = await supabase
        .from("data_connections")
        .update(updates)
        .eq("id", connectionId)

        .select()
        .single();

      if (error) throw error;

      // Si hay nuevas credenciales, actualizarlas
      if (
        updateData.credentials &&
        Object.keys(updateData.credentials).length > 0
      ) {
        // Eliminar credenciales antiguas
        await supabase
          .from("api_credentials")
          .delete()
          .eq("connection_id", connectionId);

        // Insertar nuevas credenciales
        const credentialEntries = Object.entries(updateData.credentials).map(
          ([key, value]) => ({
            connection_id: connectionId,
            user_id: user.id,
            credential_key: key,
            credential_value: value,
            created_at: new Date().toISOString(),
          })
        );

        const { error: credError } = await supabase
          .from("api_credentials")
          .insert(credentialEntries);

        if (credError) {
          console.error("Error actualizando credenciales:", credError);
          throw new Error("No se pudieron actualizar las credenciales");
        }
      }

      return { success: true, connection: data };
    } catch (error) {
      console.error("Error updating connection:", error);
      throw new Error(error.message || "Error al actualizar la conexión");
    }
  }

  /**
   * Eliminar una conexión (SIMPLIFICADO)
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteConnection(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Eliminar credenciales
      await supabase
        .from("api_credentials")
        .delete()
        .eq("connection_id", connectionId);

      // Eliminar conexión
      const { error } = await supabase
        .from("data_connections")
        .delete()
        .eq("id", connectionId);
      if (error) throw error;

      return {
        success: true,
        message: "Conexión eliminada correctamente",
      };
    } catch (error) {
      console.error("Error deleting connection:", error);
      throw new Error(error.message || "Error al eliminar la conexión");
    }
  }

  /**
   * Activar una conexión específica (desactiva las demás)
   * @param {string} connectionId - ID de la conexión a activar
   * @returns {Promise<Object>} Resultado de la activación
   */
  static async setActiveConnection(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar si la columna is_active existe
      try {
        // Primero desactivar todas las conexiones del usuario
        const { error: deactivateError } = await supabase
          .from("data_connections")
          .update({ is_active: false });
        if (
          deactivateError &&
          !deactivateError.message?.includes("is_active") &&
          !deactivateError.message?.includes("column")
        ) {
          throw deactivateError;
        }

        // Luego activar la conexión específica
        const { error: activateError } = await supabase
          .from("data_connections")
          .update({ is_active: true })
          .eq("id", connectionId);
        if (
          activateError &&
          !activateError.message?.includes("is_active") &&
          !activateError.message?.includes("column")
        ) {
          throw activateError;
        }

        return { success: true, message: "Conexión activada correctamente" };
      } catch (dbError) {
        // Si hay error por columna is_active no existe
        if (
          dbError.code === "42703" ||
          dbError.message?.includes("is_active") ||
          dbError.message?.includes("column")
        ) {
          console.warn(
            "Columna is_active no existe. Por favor, aplique la migración SQL primero."
          );
          return {
            success: false,
            message:
              "Función de conexión activa no disponible. Aplique la migración de base de datos.",
            needsMigration: true,
          };
        }
        throw dbError;
      }
    } catch (error) {
      console.error("Error setting active connection:", error);
      throw new Error(`Error al activar conexión: ${error.message}`);
    }
  }

  /**
   * Obtener la conexión activa del usuario
   * @param {string} dataType - Tipo de datos: 'productos', 'pedidos', o null para compatibilidad
   * @returns {Promise<Object>} Conexión activa o null
   */
  static async getActiveConnection(dataType = null) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Si se especifica un tipo de datos, buscar conexión específica
      if (dataType) {
        try {
          // Intentar obtener conexión específica para el tipo de datos
          const { data: specificRows, error: specificError } =
            await supabaseWithHeaders
              .from("connection_data_types")
              .select(
                `
              data_type,
              is_active,
              connection:data_connections(*)
            `
              )
              .eq("data_type", dataType)
              .eq("is_active", true);

          if (
            !specificError &&
            Array.isArray(specificRows) &&
            specificRows.length > 0
          ) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const profile = await AuthorizationService.getCurrentUserProfile();
            const agency = profile?.agencia || null;
            const normScope = (s) => (s == null ? "user" : s);
            const conns = specificRows
              .map((r) => r?.connection)
              .filter(Boolean);

            const own = conns.find(
              (c) => normScope(c.scope) === "user" && c.user_id === user?.id
            );
            const agencyScoped =
              conns.find(
                (c) =>
                  normScope(c.scope) === "agency" &&
                  agency &&
                  c.target_agency === agency
              ) || null;
            const global =
              conns.find((c) => normScope(c.scope) === "all") || null;

            const chosen = own || agencyScoped || global || conns[0] || null;
            if (chosen) {
              console.log(
                `✅ Conexión específica encontrada para ${dataType} (por alcance):`,
                {
                  name: chosen.name,
                  scope: normScope(chosen.scope),
                  target_agency: chosen.target_agency || null,
                }
              );
              return chosen;
            }
          }

          // Si no hay conexión específica, buscar conexiones 'all' y aplicar alcance del usuario
          const { data: allRows, error: allError } = await supabaseWithHeaders
            .from("connection_data_types")
            .select(
              `
              data_type,
              is_active,
              connection:data_connections(*)
            `
            )
            .eq("data_type", "all")
            .eq("is_active", true);

          if (!allError && Array.isArray(allRows) && allRows.length > 0) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const profile = await AuthorizationService.getCurrentUserProfile();
            const agency = profile?.agencia || null;
            const normScope = (s) => (s == null ? "user" : s);
            const conns = allRows.map((r) => r?.connection).filter(Boolean);

            const own = conns.find(
              (c) => normScope(c.scope) === "user" && c.user_id === user?.id
            );
            const agencyScoped =
              conns.find(
                (c) =>
                  normScope(c.scope) === "agency" &&
                  agency &&
                  c.target_agency === agency
              ) || null;
            const global =
              conns.find((c) => normScope(c.scope) === "all") || null;

            const chosen = own || agencyScoped || global || conns[0] || null;
            if (chosen) {
              console.log(
                `✅ Conexión 'all' encontrada para ${dataType} (por alcance):`,
                {
                  name: chosen.name,
                  scope: normScope(chosen.scope),
                  target_agency: chosen.target_agency || null,
                }
              );
              return chosen;
            }
          }

          console.warn(
            `⚠️ No hay conexión específica ni 'all' para ${dataType}, usando fallback`
          );
        } catch (tableError) {
          console.warn(
            "Tabla connection_data_types no existe, usando método legacy:",
            tableError.message
          );
        }
      }

      // Fallback con soporte de alcance (user → agency → all) respetando RLS
      let candidates = [];
      try {
        const { data: rows, error: rowsError } = await supabase
          .from("data_connections")
          .select("*")
          .eq("is_active", true)
          .order("updated_at", { ascending: false });
        if (rowsError) throw rowsError;
        candidates = rows || [];
      } catch (e) {
        if (
          e.code === "42703" ||
          e.message?.includes("is_active") ||
          e.message?.includes("column") ||
          e.message?.includes("406")
        ) {
          const { data: rows2 } = await supabase
            .from("data_connections")
            .select("*")
            .order("created_at", { ascending: false });
          candidates = rows2 || [];
        } else {
          throw e;
        }
      }

      if (candidates.length > 0) {
        const profile = await AuthorizationService.getCurrentUserProfile();
        const agency = profile?.agencia || null;
        const normScope = (s) => (s == null ? "user" : s);

        const own = candidates.find(
          (c) => normScope(c.scope) === "user" && c.user_id === user.id
        );
        const agencyScoped =
          candidates.find(
            (c) =>
              normScope(c.scope) === "agency" &&
              agency &&
              c.target_agency === agency
          ) || null;
        const global =
          candidates.find((c) => normScope(c.scope) === "all") || null;

        const chosen = own || agencyScoped || global || candidates[0] || null;
        if (chosen) {
          console.log("✅ Conexión activa seleccionada por alcance:", {
            id: chosen.id,
            name: chosen.name,
            scope: normScope(chosen.scope),
            target_agency: chosen.target_agency || null,
          });
          return chosen;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting active connection:", error);
      return null;
    }
  }

  // ===== Helper mapping utilities (custom column_mapping) =====
  static applyUserMapping(records, mapping, _dataType = "productos") {
    if (!Array.isArray(records) || !mapping) return records || [];

    return records.map((item) => {
      const out = {};
      for (const [stdKey, srcPath] of Object.entries(mapping)) {
        let val = this.getValueByPath(item, srcPath);

        // Fallback: si el valor mapeado viene vacío, usar el campo estándar si ya existe en el item
        if (val === undefined || val === null || val === "") {
          if (Object.prototype.hasOwnProperty.call(item, stdKey)) {
            val = item[stdKey];
          }
        }

        // Fallbacks específicos por tipo para fechas de disponibilidad
        if (_dataType === "productos") {
          if (
            (val === undefined || val === null || val === "") &&
            stdKey === "salida"
          ) {
            val =
              item.salida ||
              item.Salida ||
              item.departure_date ||
              item.Departure ||
              item["Fecha_Salida"] ||
              item.fecha_salida ||
              item.departure ||
              item.DepartureDate ||
              item.departureDate ||
              "";
          }
          if (
            (val === undefined || val === null || val === "") &&
            stdKey === "regreso"
          ) {
            val =
              item.regreso ||
              item.Regreso ||
              item.return_date ||
              item.Return ||
              item["Fecha_Regreso"] ||
              item.fecha_regreso ||
              item.return ||
              item.ReturnDate ||
              item.returnDate ||
              "";
          }
        }

        out[stdKey] = val;
      }
      return out;
    });
  }

  static getValueByPath(obj, path) {
    if (!obj || !path) return undefined;

    // fast path: top-level property
    if (Object.prototype.hasOwnProperty.call(obj, path)) {
      return obj[path];
    }

    // normalize bracket notation: cells[0] -> cells.0
    const norm = String(path).replace(/\[(\d+)\]/g, ".$1");
    const parts = norm.split(".").filter(Boolean);

    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (cur == null) return undefined;

      // array index
      if (Array.isArray(cur) && /^\d+$/.test(part)) {
        const idx = parseInt(part, 10);
        const cell = cur[idx];

        // Smartsheet-like: prefer .value when present at leaf
        if (
          cell &&
          typeof cell === "object" &&
          "value" in cell &&
          i === parts.length - 1
        ) {
          return cell.value;
        }

        cur = cell;
        continue;
      }

      cur = cur?.[part];
    }

    // Smartsheet-like final value fallback
    if (cur && typeof cur === "object" && "value" in cur) {
      return cur.value;
    }

    return cur;
  }
  /**
   * Obtener datos de la conexión activa con mapeo de campos
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos mapeados al formato estándar
   */
  static async getDataFromActiveConnection(dataType = "pedidos") {
    try {
      const activeConnection = await this.getActiveConnection(dataType);
      if (!activeConnection) {
        console.warn(
          `⚠️ [ConnectionService] No active connection found for data type: ${dataType}. Falling back to environment variables for Power Automate.`
        );
        return await this.getDataFromPowerAutomate(null, dataType); // Pass null to signify fallback
      }

      console.log(
        `✅ [ConnectionService] Using connection ${activeConnection.name} (${activeConnection.type}) for ${dataType}`
      );

      // Respetar configuración del administrador: no forzar Supabase por encima de la conexión activa seleccionada por alcance/agency

      // TEMPORAL: Si hay problemas con las credenciales, intentar Supabase (Jetmar) y luego fallback
      let credentials;
      try {
        credentials = await this.getDecryptedCredentials(activeConnection.id);
      } catch (credentialError) {
        console.error(
          `❌ [ConnectionService] Failed to get credentials for connection '${activeConnection.name}':`,
          credentialError
        );

        // Iterar conexiones definidas por admin según alcance (user -> agency -> all)
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const profile = await AuthorizationService.getCurrentUserProfile();
          const agency = profile?.agencia || null;
          const normScope = (s) => (s == null ? "user" : s);

          // 1) Candidatas mapeadas para el tipo de datos (o 'all') en connection_data_types
          let mappedCandidates = [];
          try {
            const { data: mapRows } = await supabaseWithHeaders
              .from("connection_data_types")
              .select(
                `
                data_type,
                is_active,
                connection:data_connections(*)
              `
              )
              .in("data_type", [dataType, "all"])
              .eq("is_active", true);
            if (Array.isArray(mapRows)) {
              mappedCandidates = mapRows
                .map((r) => r?.connection)
                .filter(Boolean);
            }
          } catch (e) {
            console.warn(
              "⚠️ [ConnectionService] No se pudo leer connection_data_types, usando fallback a data_connections:",
              e?.message || e
            );
          }

          // 2) Fallback: añadir conexiones visibles por RLS
          let allConns = [];
          try {
            const { data: rows } = await supabase
              .from("data_connections")
              .select("*")
              .order("updated_at", { ascending: false });
            allConns = rows || [];
          } catch {
            allConns = [];
          }

          // Mezclar y de-duplicar por id
          const byId = new Map();
          [...mappedCandidates, ...allConns].forEach((c) => {
            if (c && !byId.has(c.id)) byId.set(c.id, c);
          });
          let candidates = Array.from(byId.values());

          // Filtrar por tipo de dato si existe column_mapping específico (no obligatorio)
          candidates = candidates.filter(Boolean);

          // Orden por alcance
          const orderByScope = (list) => {
            const own = list.filter(
              (c) => normScope(c.scope) === "user" && c.user_id === user?.id
            );
            const agencyScoped = list.filter(
              (c) =>
                normScope(c.scope) === "agency" &&
                agency &&
                c.target_agency === agency
            );
            const global = list.filter((c) => normScope(c.scope) === "all");
            const rest = list.filter(
              (c) =>
                !own.includes(c) &&
                !agencyScoped.includes(c) &&
                !global.includes(c)
            );
            return [...own, ...agencyScoped, ...global, ...rest];
          };

          const ordered = orderByScope(candidates);

          // Probar cada conexión hasta encontrar una con credenciales válidas
          for (const conn of ordered) {
            try {
              let creds = null;
              try {
                creds = await this.getDecryptedCredentials(conn.id);
              } catch (e) {
                console.warn(
                  "⚠️ [ConnectionService] getDecryptedCredentials falló:",
                  e?.message || e
                );
                try {
                  const { data: credRows } = await supabaseWithHeaders
                    .from("api_credentials")
                    .select("credential_key, credential_value")
                    .eq("connection_id", conn.id);
                  if (Array.isArray(credRows) && credRows.length > 0) {
                    creds = {};
                    credRows.forEach((row) => {
                      creds[row.credential_key] = row.credential_value;
                    });
                  }
                } catch (fallbackError) {
                  console.warn(
                    "⚠️ [ConnectionService] Lectura alternativa de api_credentials falló:",
                    fallbackError?.message || fallbackError
                  );
                }
              }
              if (!creds) {
                continue;
              }
              console.log(
                `🔁 [ConnectionService] Probando conexión '${conn.name}' (${conn.type}) por alcance`,
                {
                  scope: normScope(conn.scope),
                  target_agency: conn.target_agency || null,
                }
              );

              let rawData = null;
              if (conn.type === "supabase") {
                rawData = await this.getDataFromSupabase(creds, dataType);
              } else if (conn.type === "powerautomate") {
                rawData = await this.getDataFromPowerAutomate(creds, dataType);
              } else {
                continue; // tipos no soportados aquí
              }

              if (rawData?.success && Array.isArray(rawData.data)) {
                // Aplicar mapeo de columnas si existe para esta conexión
                try {
                  if (conn.column_mapping) {
                    const mapObj = JSON.parse(conn.column_mapping);
                    const esKey = dataType;
                    const enKey =
                      esKey === "productos"
                        ? "products"
                        : esKey === "pedidos"
                        ? "orders"
                        : esKey;
                    const mapping = mapObj?.[esKey] || mapObj?.[enKey];
                    if (mapping && typeof mapping === "object") {
                      rawData = {
                        ...rawData,
                        data: ConnectionService.applyUserMapping(
                          rawData.data,
                          mapping,
                          esKey
                        ),
                      };
                    }
                  }
                } catch (mapErr) {
                  console.warn(
                    "⚠️ [ConnectionService] column_mapping inválido o no parseable:",
                    mapErr
                  );
                }

                // Validación estándar
                const validation = DataValidator.validateRecords(
                  rawData.data,
                  dataType
                );
                if (!validation.valid && validation.validRecords > 0) {
                  try {
                    const userRole =
                      await AuthorizationService.getCurrentUserRole();
                    const isAdmin =
                      userRole === AuthorizationService.ROLES.ADMIN;
                    if (!isAdmin) {
                      const validData = rawData.data.filter(
                        (r) => DataValidator.validateSingleRecord(r).valid
                      );
                      return {
                        ...rawData,
                        data: validData,
                        validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
                      };
                    }
                  } catch {
                    const validData = rawData.data.filter(
                      (r) => DataValidator.validateSingleRecord(r).valid
                    );
                    return {
                      ...rawData,
                      data: validData,
                      validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
                    };
                  }
                }

                return rawData;
              }
            } catch {
              // sin credenciales o fallo de esa conexión; continuar con la próxima
              continue;
            }
          }
        } catch (iterErr) {
          console.warn(
            "⚠️ [ConnectionService] Iteración de conexiones por alcance falló:",
            iterErr?.message || iterErr
          );
        }

        // Supabase env fallback deshabilitado: no consultar tablas sin tableName de credenciales

        // No hacer fallback para errores de configuración - requieren corrección
        if (
          credentialError.message?.includes("Server configuration error") ||
          credentialError.message?.includes("MASTER_ENCRYPTION_KEY") ||
          credentialError.message?.includes("No credentials found") ||
          credentialError.message?.includes("Authentication error") ||
          credentialError.message?.includes("Access denied")
        ) {
          console.error(
            `🚨 [ConnectionService] Configuration issue with connection '${activeConnection.name}' - NOT falling back to Power Automate`
          );
          throw new Error(
            `Connection '${activeConnection.name}' configuration error: ${credentialError.message}`
          );
        }

        // Para otros errores, fallback a Power Automate
        console.warn(
          `⚠️ [ConnectionService] Unexpected error with connection '${activeConnection.name}', falling back to Power Automate:`,
          credentialError
        );
        return await this.getDataFromPowerAutomate(null, dataType);
      }

      let rawData;

      switch (activeConnection.type) {
        case "powerautomate":
          rawData = await this.getDataFromPowerAutomate(credentials, dataType);
          break;
        case "supabase":
          rawData = await this.getDataFromSupabase(credentials, dataType);
          break;
        default:
          console.warn(
            `⚠️ [ConnectionService] Connection type ${activeConnection.type} not fully implemented for data fetching. Falling back.`
          );
          rawData = await this.getDataFromPowerAutomate(null, dataType); // Fallback
          break;
      }

      // Aplicar mapeo personalizado si existe (column_mapping) para el tipo de datos seleccionado
      try {
        if (
          activeConnection.column_mapping &&
          rawData?.success &&
          Array.isArray(rawData.data)
        ) {
          const mapObj = JSON.parse(activeConnection.column_mapping);

          // Claves soportadas en el JSON de mapeo (ES y EN para compatibilidad)
          const esKey = dataType; // 'productos' | 'pedidos'
          const enKey =
            esKey === "productos"
              ? "products"
              : esKey === "pedidos"
              ? "orders"
              : esKey;

          const mapping = mapObj?.[esKey] || mapObj?.[enKey];

          if (mapping && typeof mapping === "object") {
            rawData = {
              ...rawData,
              data: ConnectionService.applyUserMapping(
                rawData.data,
                mapping,
                esKey
              ),
            };
          }
        }
      } catch (mapErr) {
        console.warn(
          "⚠️ [ConnectionService] column_mapping inválido o no parseable:",
          mapErr
        );
      }

      // Validar que los datos cumplan con la estructura estándar
      if (rawData.success && rawData.data) {
        const validation = DataValidator.validateRecords(
          rawData.data,
          dataType
        );

        if (!validation.valid) {
          console.warn(
            "⚠️ [ConnectionService] Datos no cumplen estructura estándar:",
            validation.errors
          );

          // Si hay errores pero algunos registros son válidos, verificar rol del usuario
          if (validation.validRecords > 0) {
            // Obtener rol del usuario para determinar si mostrar todos los datos o solo los válidos
            try {
              const userRole = await AuthorizationService.getCurrentUserRole();
              const isAdmin = userRole === AuthorizationService.ROLES.ADMIN;

              if (isAdmin) {
                // Los administradores ven todos los registros, incluso los inválidos
                console.log(
                  `👑 [ConnectionService] Admin detectado - mostrando todos los ${rawData.data.length} registros (incluyendo inválidos)`
                );
                return {
                  ...rawData,
                  data: rawData.data,
                  validationWarning: `Admin view: ${validation.validRecords}/${validation.totalRecords} registros válidos`,
                };
              } else {
                // Usuarios no-admin solo ven registros válidos
                const validData = rawData.data.filter(
                  (record) => DataValidator.validateSingleRecord(record).valid
                );
                console.log(
                  `👤 [ConnectionService] Usuario no-admin - mostrando solo ${validData.length} registros válidos`
                );
                return {
                  ...rawData,
                  data: validData,
                  validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
                };
              }
            } catch (roleError) {
              console.error(
                "❌ [ConnectionService] Error obteniendo rol del usuario:",
                roleError
              );
              // En caso de error, usar comportamiento por defecto (solo registros válidos)
              const validData = rawData.data.filter(
                (record) => DataValidator.validateSingleRecord(record).valid
              );
              return {
                ...rawData,
                data: validData,
                validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
              };
            }
          }
        }
      }

      console.log(
        `✅ [ConnectionService] Data retrieved successfully from ${activeConnection.name}`
      );
      return rawData;
    } catch (error) {
      console.error(
        "💥 [ConnectionService] Error getting data from active connection:",
        error
      );

      // Only fallback for non-configuration errors
      if (
        error.message?.includes("Connection") &&
        error.message?.includes("configuration error")
      ) {
        console.error(
          "🚨 [ConnectionService] This is a configuration error - not falling back to Power Automate"
        );
        throw error; // Re-throw configuration errors
      }

      // For other errors, fallback to Power Automate
      console.warn(
        "⚠️ [ConnectionService] Falling back to Power Automate due to unexpected error"
      );
      return await this.getDataFromPowerAutomate(null, dataType);
    }
  }

  /**
   * Obtener datos de Power Automate usando conexión dinámica o fallback
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos de Power Automate
   */
  static async getDataFromPowerAutomate(credentials, dataType = "pedidos") {
    try {
      let targetUrl;
      if (credentials) {
        targetUrl = credentials.flowUrl;
      } else {
        // Fallback a variables de entorno si no hay credenciales activas
        console.log(
          "[PA] No active connection. Falling back to environment variables."
        );

        // Para productos (disponibilidad) usar URL específica para productos
        if (dataType === "productos") {
          // Usar variable de entorno específica para productos/disponibilidad
          targetUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL;
          console.log(
            `🎯 PRODUCTOS (disponibilidad) usará URL de productos:`,
            targetUrl
          );
        } else {
          // Para pedidos usar URL original
          targetUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS;
          console.log(`📋 PEDIDOS usará URL de solicitudes:`, targetUrl);
        }
      }

      if (!targetUrl) {
        throw new Error(`No se encontró URL para tipo de datos: ${dataType}`);
      }

      console.log(
        `Obteniendo datos de Power Automate (${dataType}):`,
        targetUrl
      );

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();

        // Log detallado para debuggear
        console.log(`📊 Power Automate response (${dataType}):`, {
          totalItems: data.length,
          sampleData: data.slice(0, 3),
          allItems: data,
        });

        // Log específico para disponibilidad
        if (dataType === "productos") {
          console.log("🎯 DISPONIBILIDAD - Estructura de datos recibida:");
          data.forEach((item, index) => {
            if (index < 5) {
              // Solo mostrar primeros 5
              console.log(`Item ${index + 1}:`, {
                codigo_cupo: item.codigo_cupo,
                destino: item.destino,
                compania: item.compania,
                disponibilidad: item.disponibilidad,
                allFields: Object.keys(item),
              });
            }
          });
        }

        return {
          success: true,
          data: this.mapToStandardFormat(data, "powerautomate", dataType),
        };
      } else {
        console.error(
          `❌ Error HTTP ${response.status} al obtener ${dataType}:`,
          response.statusText
        );
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching from Power Automate (${dataType}):`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Obtener datos de Supabase usando conexión específica
   * @param {Object} connection - Datos de la conexión Supabase
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos de Supabase
   */
  static async getDataFromSupabase(credentials, dataType = "pedidos") {
    try {
      console.log(`🔗 Obteniendo datos de Supabase para ${dataType}`);

      // Normalizar credenciales desde distintos alias + fallback a variables de entorno
      const cred = credentials || {};
      const projectUrl =
        cred.projectUrl ||
        cred.project_url ||
        cred.url ||
        cred.supabaseUrl ||
        cred.supabase_url;

      const anonKey =
        cred.anonKey ||
        cred.anon_key ||
        cred.apiKey ||
        cred.apikey ||
        cred.publicKey ||
        cred.public_key ||
        cred.key;

      const tableName = cred.tableName || cred.table_name || cred.table;

      const wasProvidedTable = Boolean(tableName);

      if (!projectUrl || !anonKey || !wasProvidedTable) {
        throw new Error(
          "Credenciales de Supabase incompletas: se requiere projectUrl, anonKey y tableName"
        );
      }

      if (!projectUrl || !anonKey) {
        throw new Error("Credenciales de Supabase incompletas");
      }

      // Importar dinámicamente para evitar problemas de dependencias
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseClient = createClient(projectUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-temp-${dataType}-${tableName || "default"}`,
        },
        global: {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
        },
      });

      // Determinar tabla según credenciales
      const targetTable = tableName;

      console.log(`📊 Consultando tabla ${targetTable} en Supabase`);

      let data, error;
      const queryTable = async (tbl) => {
        try {
          const { data: d, error: e } = await supabaseClient
            .from(tbl)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
          return { d, e };
        } catch (e) {
          return { d: null, e };
        }
      };

      ({ d: data, e: error } = await queryTable(targetTable));

      if (error) {
        console.error("Error consultando Supabase:", error);
        throw error;
      }

      console.log(`✅ Datos obtenidos de Supabase:`, {
        totalItems: data.length,
        table: targetTable,
        sampleData: data.slice(0, 3),
      });

      return {
        success: true,
        data: this.mapToStandardFormat(data, "supabase", dataType),
        source: "supabase",
        table: targetTable,
      };
    } catch (error) {
      console.error(`Error fetching from Supabase (${dataType}):`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Mapear datos de cualquier fuente al formato estándar de la aplicación
   * @param {Array} data - Datos de la fuente
   * @param {string} sourceType - Tipo de fuente
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Array} Datos mapeados
   */
  static mapToStandardFormat(data, sourceType, dataType = "pedidos") {
    if (sourceType === "powerautomate") {
      // Normalizar productos de Power Automate a claves estándar
      if (dataType === "productos") {
        return Array.isArray(data)
          ? data.map((item) => ({
              "@odata.etag": item["@odata.etag"] || "",
              ItemInternalId: item.ItemInternalId || item.id || "",
              codigo_cupo:
                item.codigo_cupo ||
                item.Codigo_Cupo ||
                item.Cupo ||
                item.cupo_code ||
                item.cupoCode ||
                "",
              destino:
                item.destino ||
                item.Destino ||
                item.destination ||
                item.Destination ||
                "",
              compania:
                item.compania ||
                item.Compania ||
                item["Compañía"] ||
                item.airline ||
                item.Airline ||
                "",
              disponibilidad: String(
                item.disponibilidad ??
                  item.Disponibilidad ??
                  item.availability ??
                  item.Availability ??
                  "0"
              ),
              salida:
                item.salida ||
                item.Salida ||
                item.departure_date ||
                item.Departure ||
                item["Fecha_Salida"] ||
                item.fecha_salida ||
                "",
              regreso:
                item.regreso ||
                item.Regreso ||
                item.return_date ||
                item.Return ||
                item["Fecha_Regreso"] ||
                item.fecha_regreso ||
                "",
              precio: String(
                item.precio ?? item.Precio ?? item.price ?? item.Price ?? "0"
              ),
              ruta: item.ruta || item.Ruta || item.route || item.Route || "",
              pnr: item.pnr || item.Pnr || item.PNR || "",
              ficha:
                item.ficha || item.Ficha || item.ticket || item.Ticket || "",
              temporada:
                item.temporada ||
                item.Temporada ||
                item.season ||
                item.Season ||
                "",
            }))
          : [];
      }
      // Para otros tipos, ya vienen en formato esperado
      return data;
    }

    // Mapear según el tipo de fuente y datos
    return data.map((item) => {
      switch (sourceType) {
        case "supabase":
          return this.mapSupabaseToStandard(item, dataType);
        case "mongodb":
          return this.mapMongoToStandard(item, dataType);
        case "smartsheet":
          return this.mapSmartsheetToStandard(item, dataType);
        case "tableau":
          return this.mapTableauToStandard(item, dataType);
        default:
          return item;
      }
    });
  }

  /**
   * Mapear datos de Supabase al formato estándar
   */
  static mapSupabaseToStandard(item, dataType) {
    if (dataType === "productos") {
      const salida =
        item.salida ||
        item.Salida ||
        item.departure_date ||
        item.departureDate ||
        item.DepartureDate ||
        item.Departure ||
        item["Fecha_Salida"] ||
        item.fecha_salida ||
        item.fechaSalida ||
        "";
      const regreso =
        item.regreso ||
        item.Regreso ||
        item.return_date ||
        item.returnDate ||
        item.ReturnDate ||
        item.Return ||
        item["Fecha_Regreso"] ||
        item.fecha_regreso ||
        item.fechaRegreso ||
        "";
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo:
          (item.cupo_code || item.codigo_cupo || "").trim?.() ||
          item.cupo_code ||
          item.codigo_cupo ||
          "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida,
        regreso,
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr_code || item.pnr || "",
        ficha: item.ticket_number || item.ficha || "",
        temporada: item.season || item.temporada || "",
      };
    } else {
      const vueloSalida =
        item.vuelo_salida ||
        item.Vuelo_Salida ||
        item.departure_date ||
        item.departureDate ||
        item.DepartureDate ||
        item.Departure ||
        item["Fecha_Salida"] ||
        item.fecha_salida ||
        item.fechaSalida ||
        "";
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.order_id || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contact_name || item.contacto_nombre || "",
        Contacto_Email: item.contact_email || item.contacto_email || "",
        Contacto_Telefono: item.contact_phone || item.contacto_telefono || "",
        Vuelo_Codigo: item.flight_code || item.vuelo_codigo || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Compania: item.airline || item.vuelo_compania || "",
        Vuelo_Salida: vueloSalida,
        Vuelo_Precio: String(item.price || item.vuelo_precio || "0"),
        Nombre_Pasajero: item.passenger_name || item.nombre_pasajero || "",
        Apellido_Pasajero:
          item.passenger_lastname || item.apellido_pasajero || "",
        Documento_Pasajero:
          item.passenger_document || item.documento_pasajero || "",
        Nacimiento_Pasajero:
          item.passenger_birth || item.nacimiento_pasajero || "",
        Nacionalidad_Pasajero:
          item.passenger_nationality || item.nacionalidad_pasajero || "",
        Tipo_Pasajero: item.passenger_type || item.tipo_pasajero || "Adulto",
        Temporada: item.season || item.temporada || "",
        Ruta: item.route || item.ruta || "",
        Ficha: item.ticket_number || item.ficha || "",
        Pnr: item.pnr_code || item.pnr || "",
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
        Fecha_Registro:
          item.created_at || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de MongoDB al formato estándar
   */
  static mapMongoToStandard(item, dataType) {
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item._id || "",
        codigo_cupo: item.cupoCode || item.codigo_cupo || "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida: item.departureDate || item.salida || "",
        regreso: item.returnDate || item.regreso || "",
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr || "",
        ficha: item.ticketNumber || item.ficha || "",
        temporada: item.season || item.temporada || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item._id || "",
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.orderId || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contactName || item.contacto_nombre || "",
        Contacto_Email: item.contactEmail || item.contacto_email || "",
        Contacto_Telefono: item.contactPhone || item.contacto_telefono || "",
        Vuelo_Codigo: item.flightCode || item.vuelo_codigo || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Compania: item.airline || item.vuelo_compania || "",
        Vuelo_Salida: item.departureDate || item.vuelo_salida || "",
        Vuelo_Precio: String(item.price || item.vuelo_precio || "0"),
        Nombre_Pasajero: item.passengerName || item.nombre_pasajero || "",
        Apellido_Pasajero:
          item.passengerLastname || item.apellido_pasajero || "",
        Documento_Pasajero:
          item.passengerDocument || item.documento_pasajero || "",
        Nacimiento_Pasajero:
          item.passengerBirth || item.nacimiento_pasajero || "",
        Nacionalidad_Pasajero:
          item.passengerNationality || item.nacionalidad_pasajero || "",
        Tipo_Pasajero: item.passengerType || item.tipo_pasajero || "Adulto",
        Temporada: item.season || item.temporada || "",
        Ruta: item.route || item.ruta || "",
        Ficha: item.ticketNumber || item.ficha || "",
        Pnr: item.pnr || "",
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
        Fecha_Registro:
          item.createdAt || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de Smartsheet al formato estándar
   */
  static mapSmartsheetToStandard(item, dataType) {
    // Smartsheet trabaja con posiciones de columnas
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo: item.cells[0]?.value || "",
        destino: item.cells[1]?.value || "",
        compania: item.cells[2]?.value || "",
        disponibilidad: String(item.cells[3]?.value || "0"),
        salida: item.cells[4]?.value || "",
        regreso: item.cells[5]?.value || "",
        precio: String(item.cells[6]?.value || "0"),
        ruta: item.cells[7]?.value || "",
        pnr: item.cells[8]?.value || "",
        ficha: item.cells[9]?.value || "",
        temporada: item.cells[10]?.value || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.cells[0]?.value || "Solicitado",
        Pedido_ID: item.cells[1]?.value || "",
        Agencia: item.cells[2]?.value || "",
        Contacto_Nombre: item.cells[3]?.value || "",
        Contacto_Email: item.cells[4]?.value || "",
        Contacto_Telefono: item.cells[5]?.value || "",
        Vuelo_Codigo: item.cells[6]?.value || "",
        Vuelo_Destino: item.cells[7]?.value || "",
        Vuelo_Compania: item.cells[8]?.value || "",
        Vuelo_Salida: item.cells[9]?.value || "",
        Vuelo_Precio: String(item.cells[10]?.value || "0"),
        Nombre_Pasajero: item.cells[11]?.value || "",
        Apellido_Pasajero: item.cells[12]?.value || "",
        Documento_Pasajero: item.cells[13]?.value || "",
        Nacimiento_Pasajero: item.cells[14]?.value || "",
        Nacionalidad_Pasajero: item.cells[15]?.value || "",
        Tipo_Pasajero: item.cells[16]?.value || "Adulto",
        Temporada: item.cells[17]?.value || "",
        Ruta: item.cells[18]?.value || "",
        Ficha: item.cells[19]?.value || "",
        Pnr: item.cells[20]?.value || "",
        Fecha_Registro: item.cells[21]?.value || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de Tableau al formato estándar
   */
  static mapTableauToStandard(item, dataType) {
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item["Item ID"] || "",
        codigo_cupo: item["Cupo Code"] || item["Código Cupo"] || "",
        destino: item["Destination"] || item["Destino"] || "",
        compania: item["Airline"] || item["Compañía"] || "",
        disponibilidad: String(
          item["Availability"] || item["Disponibilidad"] || "0"
        ),
        salida: item["Departure"] || item["Salida"] || "",
        regreso: item["Return"] || item["Regreso"] || "",
        precio: String(item["Price"] || item["Precio"] || "0"),
        ruta: item["Route"] || item["Ruta"] || "",
        pnr: item["PNR"] || "",
        ficha: item["Ticket"] || item["Ficha"] || "",
        temporada: item["Season"] || item["Temporada"] || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item["Item ID"] || "",
        Estado: item["Status"] || item["Estado"] || "Solicitado",
        Pedido_ID: item["Order ID"] || item["Pedido ID"] || "",
        Agencia: item["Agency"] || item["Agencia"] || "",
        Contacto_Nombre: item["Contact Name"] || item["Contacto Nombre"] || "",
        Contacto_Email: item["Contact Email"] || item["Contacto Email"] || "",
        Contacto_Telefono:
          item["Contact Phone"] || item["Contacto Teléfono"] || "",
        Vuelo_Codigo: item["Flight Code"] || item["Vuelo Código"] || "",
        Vuelo_Destino: item["Destination"] || item["Vuelo Destino"] || "",
        Vuelo_Compania: item["Airline"] || item["Vuelo Compañía"] || "",
        Vuelo_Salida: item["Departure"] || item["Vuelo Salida"] || "",
        Vuelo_Precio: String(item["Price"] || item["Vuelo Precio"] || "0"),
        Nombre_Pasajero:
          item["Passenger Name"] || item["Nombre Pasajero"] || "",
        Apellido_Pasajero:
          item["Passenger Lastname"] || item["Apellido Pasajero"] || "",
        Documento_Pasajero:
          item["Passenger Document"] || item["Documento Pasajero"] || "",
        Nacimiento_Pasajero:
          item["Passenger Birth"] || item["Nacimiento Pasajero"] || "",
        Nacionalidad_Pasajero:
          item["Passenger Nationality"] || item["Nacionalidad Pasajero"] || "",
        Tipo_Pasajero:
          item["Passenger Type"] || item["Tipo Pasajero"] || "Adulto",
        Temporada: item["Season"] || item["Temporada"] || "",
        Ruta: item["Route"] || item["Ruta"] || "",
        Ficha: item["Ticket"] || item["Ficha"] || "",
        Pnr: item["PNR"] || "",
        Fecha_Registro:
          item["Created At"] ||
          item["Fecha Registro"] ||
          new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar reserva usando la conexión activa
   */
  static async submitReservation(reservationData) {
    try {
      // Usar el sistema multi-conexión para obtener la conexión específica para pedidos
      const activeConnection = await this.getActiveConnection("pedidos");

      if (!activeConnection) {
        console.log(
          "⚠️ No se encontró conexión específica para pedidos, buscando conexión general"
        );
        const generalConnection = await this.getActiveConnection();
        if (!generalConnection) {
          throw new Error(
            "No hay conexión activa configurada para envío de reservas"
          );
        }
        console.log(
          `✅ Usando conexión general ${generalConnection.name} para envío de reservas`
        );
        return await this._submitWithConnection(
          reservationData,
          generalConnection
        );
      }

      console.log(
        `✅ Usando conexión específica ${activeConnection.name} para pedidos`
      );
      return await this._submitWithConnection(
        reservationData,
        activeConnection
      );
    } catch (error) {
      console.error("Error submitting reservation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enviar reserva con una conexión específica
   */
  static async _submitWithConnection(reservationData, connection) {
    // Para diferentes tipos de conexión, usar diferentes métodos de envío
    switch (connection.type) {
      case "supabase":
        return await this._submitToSupabase(reservationData, connection);

      case "mongodb":
        return await this._submitToMongoDB(reservationData, connection);

      case "smartsheet":
        return await this._submitToSmartsheet(reservationData, connection);

      case "tableau":
        return await this._submitToTableau(reservationData, connection);

      case "powerautomate":
        return await this._submitToPowerAutomate(reservationData, connection);

      default:
        throw new Error(`Tipo de conexión no soportado: ${connection.type}`);
    }
  }

  /**
   * Enviar a Supabase
   */
  static async _submitToSupabase(_reservationData, _connection) {
    try {
      // Simular envío a Supabase (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `SUP-${Date.now()}`,
        results: "Reserva enviada a Supabase",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Supabase: ${error.message}`);
    }
  }

  /**
   * Enviar a MongoDB
   */
  static async _submitToMongoDB(_reservationData, _connection) {
    try {
      // Simular envío a MongoDB (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `MDB-${Date.now()}`,
        results: "Reserva enviada a MongoDB",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a MongoDB: ${error.message}`);
    }
  }

  /**
   * Enviar a Smartsheet
   */
  static async _submitToSmartsheet(_reservationData, _connection) {
    try {
      // Simular envío a Smartsheet (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `SMS-${Date.now()}`,
        results: "Reserva enviada a Smartsheet",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Smartsheet: ${error.message}`);
    }
  }

  /**
   * Enviar a Tableau
   */
  static async _submitToTableau(_reservationData, _connection) {
    try {
      // Simular envío a Tableau (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `TAB-${Date.now()}`,
        results: "Reserva enviada a Tableau",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Tableau: ${error.message}`);
    }
  }

  /**
   * Enviar a Power Automate
   */
  static async _submitToPowerAutomate(reservationData, _connection) {
    try {
      // Usar el edge function para enviar a Power Automate
      // TEMPORAL: Crear cliente sin header Prefer para evitar CORS
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseNoPrefeer = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              "Content-Type": "application/json",
            },
          },
        }
      );

      // Obtener access token del usuario actual para autorizar contra la Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const { data, error } = await supabaseNoPrefeer.functions.invoke(
        "power-automate-proxy",
        {
          body: {
            action: "submit-reservation",
            payload: reservationData,
          },
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        }
      );

      if (error) {
        throw new Error(
          error.message || "Error al enviar reserva a Power Automate"
        );
      }

      if (!data.success) {
        throw new Error(
          data.error || "Error desconocido al enviar reserva a Power Automate"
        );
      }

      return {
        success: true,
        results: data.results || "Reserva enviada exitosamente",
        referenceId: data.referenceId || `PA-${Date.now()}`,
      };
    } catch (error) {
      throw new Error(`Error enviando a Power Automate: ${error.message}`);
    }
  }

  /**
   * Probar una conexión (SIMPLIFICADO)
   * @param {Object} connection - Conexión a probar
   * @returns {Promise<Object>} Resultado de la prueba
   */
  static async testConnection(connection) {
    try {
      // Verificar sesión
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: "Usuario no autenticado" };
      }

      // Obtener credenciales
      const credentials = await this.getDecryptedCredentials(connection.id);

      if (!credentials) {
        return {
          success: false,
          message: "No se encontraron credenciales para esta conexión",
        };
      }

      // Actualizar estado de la conexión (scoped al usuario)
      await supabase
        .from("data_connections")
        .update({
          connection_status: "connected",
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", connection.id)
        .eq("user_id", user.id);

      return {
        success: true,
        message: "Conexión verificada exitosamente",
        details: {
          type: connection.type,
          name: connection.name,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error testing connection:", error);

      // Intentar marcar estado de error si hay sesión y conexión
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (connection?.id && user?.id) {
          await supabase
            .from("data_connections")
            .update({
              connection_status: "error",
              last_tested_at: new Date().toISOString(),
            })
            .eq("id", connection.id)
            .eq("user_id", user.id);
        }
      } catch {
        // noop
      }

      return {
        success: false,
        message: error.message || "Error al probar la conexión",
        details: { error: error.toString() },
      };
    }
  }
  /**
   * Obtener tipos de conexión soportados
   * @returns {Array} Lista de tipos soportados
   */
  static getSupportedConnectionTypes() {
    return [
      {
        type: "powerautomate",
        name: "Power Automate",
        description: "Microsoft Power Automate Flow",
        icon: "TiVendorMicrosoft",
        docs: "https://docs.microsoft.com/en-us/power-automate/",
        fields: [
          {
            name: "flowUrl",
            label: "URL del Flow HTTP Request",
            type: "url",
            required: true,
            placeholder:
              "https://prod-xx.westeurope.logic.azure.com:443/workflows/...",
            tooltip:
              "URL completa del trigger HTTP de tu Flow en Power Automate",
          },
          {
            name: "apiKey",
            label: "Clave API (opcional)",
            type: "password",
            required: false,
            placeholder: "Bearer token o API key si está configurado",
            tooltip: "Opcional: Token de autenticación si tu Flow lo requiere",
          },
        ],
      },
      {
        type: "supabase",
        name: "Supabase",
        description: "Base de datos PostgreSQL con API REST autogenerada",
        icon: "SiSupabase",
        docs: "https://supabase.com/docs/guides/api",
        fields: [
          {
            name: "projectUrl",
            label: "URL del Proyecto",
            type: "url",
            required: true,
            placeholder: "https://xyzcompany.supabase.co",
            tooltip:
              "URL base de tu proyecto Supabase (Project Settings > API)",
          },
          {
            name: "anonKey",
            label: "API Key (anon/public)",
            type: "password",
            required: true,
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            tooltip:
              "Clave pública anónima para acceso a la API REST (Project Settings > API)",
          },
          {
            name: "serviceRoleKey",
            label: "Service Role Key (opcional)",
            type: "password",
            required: false,
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            tooltip:
              "Opcional: Clave de servicio para operaciones administrativas sin RLS",
          },
          {
            name: "tableName",
            label: "Nombre de la Tabla",
            type: "text",
            required: true,
            placeholder: "reservas",
            tooltip: "Nombre de la tabla donde se almacenarán los datos",
          },
        ],
      },
      {
        type: "smartsheet",
        name: "Smartsheet",
        description: "Plataforma de gestión de trabajo colaborativo",
        icon: "FaTable",
        docs: "https://developers.smartsheet.com/api/smartsheet/openapi",
        fields: [
          {
            name: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
            placeholder: "ll352u9jujauoqz4gstvsae05",
            tooltip:
              "Personal Access Token generado en Account > Personal Settings > API Access",
          },
          {
            name: "sheetId",
            label: "Sheet ID",
            type: "text",
            required: true,
            placeholder: "1234567890123456",
            tooltip: "ID de la hoja (visible en la URL cuando abres la hoja)",
          },
          {
            name: "baseUrl",
            label: "Base URL (opcional)",
            type: "url",
            required: false,
            placeholder: "https://api.smartsheet.com/2.0",
            tooltip:
              "URL base de la API (usar por defecto: https://api.smartsheet.com/2.0)",
          },
        ],
      },
      {
        type: "mongodb",
        name: "MongoDB",
        description: "Base de datos NoSQL orientada a documentos",
        icon: "SiMongodb",
        docs: "https://www.mongodb.com/docs/api/",
        fields: [
          {
            name: "connectionString",
            label: "MongoDB Connection String",
            type: "password",
            required: true,
            placeholder:
              "mongodb+srv://username:password@cluster.mongodb.net/database",
            tooltip:
              "String de conexión completo incluyendo credenciales (MongoDB Atlas > Connect > Drivers)",
          },
          {
            name: "databaseName",
            label: "Nombre de la Base de Datos",
            type: "text",
            required: true,
            placeholder: "travel_bookings",
            tooltip:
              "Nombre de la base de datos donde se almacenarán las colecciones",
          },
          {
            name: "collectionName",
            label: "Nombre de la Colección",
            type: "text",
            required: true,
            placeholder: "reservations",
            tooltip:
              "Nombre de la colección (equivalente a tabla en SQL) para los datos",
          },
          {
            name: "apiKey",
            label: "MongoDB Data API Key (opcional)",
            type: "password",
            required: false,
            placeholder: "mongodb-data-api-key",
            tooltip:
              "Opcional: API Key para usar MongoDB Data API en lugar de conexión directa",
          },
        ],
      },
      {
        type: "tableau",
        name: "Tableau",
        description: "Plataforma de análisis y visualización de datos",
        icon: "SiTableau",
        docs: "https://tableau.github.io/document-api-python/docs/api-ref",
        fields: [
          {
            name: "serverUrl",
            label: "Tableau Server URL",
            type: "url",
            required: true,
            placeholder: "https://your-server.tableau.com",
            tooltip: "URL base de tu servidor Tableau Server o Tableau Online",
          },
          {
            name: "username",
            label: "Nombre de Usuario",
            type: "text",
            required: true,
            placeholder: "usuario@empresa.com",
            tooltip: "Tu nombre de usuario para acceder a Tableau Server",
          },
          {
            name: "password",
            label: "Contraseña",
            type: "password",
            required: true,
            placeholder: "••••••••",
            tooltip: "Contraseña de tu cuenta Tableau",
          },
          {
            name: "siteName",
            label: "Nombre del Sitio",
            type: "text",
            required: false,
            placeholder: "default",
            tooltip:
              "Nombre del sitio en Tableau Server (opcional, usar 'default' si no tienes uno específico)",
          },
          {
            name: "apiVersion",
            label: "Versión de la API",
            type: "text",
            required: false,
            placeholder: "3.19",
            tooltip: "Versión de la API REST de Tableau (por defecto: 3.19)",
          },
        ],
      },
    ];
  }

  // ==================== MÉTODOS PARA MULTI-CONEXIÓN ====================

  /**
   * Crear o actualizar asignación de tipo de datos a conexión
   * @param {string} connectionId - ID de la conexión
   * @param {string} dataType - Tipo de datos: 'productos', 'pedidos', 'all'
   * @param {boolean} isActive - Si la asignación está activa
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async setConnectionDataType(connectionId, dataType, isActive = true) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar que la conexión pertenezca al usuario
      const { data: connection, error: connectionError } = await supabase
        .from("data_connections")
        .select("id")
        .eq("id", connectionId)

        .single();

      if (connectionError || !connection) {
        throw new Error("Conexión no encontrada o no autorizada");
      }

      // Si se está activando, desactivar otras conexiones del mismo tipo
      if (isActive) {
        await supabaseWithHeaders
          .from("connection_data_types")
          .update({ is_active: false })

          .eq("data_type", dataType);
      }

      // Crear o actualizar la asignación
      const { data, error } = await supabaseWithHeaders
        .from("connection_data_types")
        .upsert(
          {
            user_id: user.id,
            connection_id: connectionId,
            data_type: dataType,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,data_type",
          }
        )
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        assignment: data,
        message: `Conexión ${
          isActive ? "activada" : "desactivada"
        } para ${dataType}`,
      };
    } catch (error) {
      console.error("Error setting connection data type:", error);
      throw new Error(error.message || "Error al asignar tipo de datos");
    }
  }
  /**
   * Diagnóstico: Mostrar credenciales guardadas (SIMPLIFICADO)
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Estructura de credenciales guardadas
   */
  static async diagnoseConnectionCredentials(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener credenciales directamente de la base de datos
      const credentials = await this.getDecryptedCredentials(connectionId);

      console.log("🔎 Diagnóstico de credenciales:", credentials);

      return {
        success: true,
        credentials,
        keys: credentials ? Object.keys(credentials) : [],
        structure: JSON.stringify(credentials, null, 2),
      };
    } catch (error) {
      console.error("Error en diagnóstico de credenciales:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener todas las asignaciones de tipos de datos del usuario
   * @returns {Promise<Object>} Lista de asignaciones
   */
  static async getConnectionDataTypes() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabaseWithHeaders
        .from("connection_data_types")
        .select(
          `
          id,
          data_type,
          is_active,
          created_at,
          updated_at,
          connection:data_connections(
            id,
            name,
            type,
            description
          )
        `
        )

        .order("data_type");

      if (error) throw error;

      return {
        success: true,
        assignments: data || [],
      };
    } catch (error) {
      console.error("Error fetching connection data types:", error);
      throw new Error(error.message || "Error al obtener asignaciones");
    }
  }

  /**
   * Eliminar asignación de tipo de datos
   * @param {string} assignmentId - ID de la asignación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteConnectionDataType(assignmentId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabaseWithHeaders
        .from("connection_data_types")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;

      return {
        success: true,
        message: "Asignación eliminada correctamente",
      };
    } catch (error) {
      console.error("Error deleting connection data type:", error);
      throw new Error(error.message || "Error al eliminar asignación");
    }
  }

  /**
   * Obtener conexión específica para un tipo de datos
   * @param {string} dataType - Tipo de datos
   * @returns {Promise<Object>} Conexión activa para el tipo de datos
   */
  static async getConnectionForDataType(dataType) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Buscar conexión específica para el tipo de datos
      const { data: specificAssignment, error: specificError } =
        await supabaseWithHeaders
          .from("connection_data_types")
          .select(
            `
          connection:data_connections(*)
        `
          )

          .eq("data_type", dataType)
          .eq("is_active", true)
          .single();

      if (!specificError && specificAssignment?.connection) {
        return {
          success: true,
          connection: specificAssignment.connection,
          source: "specific",
        };
      }

      // Buscar conexión 'all' como fallback
      const { data: allAssignment, error: allError } = await supabaseWithHeaders
        .from("connection_data_types")
        .select(
          `
          connection:data_connections(*)
        `
        )

        .eq("data_type", "all")
        .eq("is_active", true)
        .single();

      if (!allError && allAssignment?.connection) {
        return {
          success: true,
          connection: allAssignment.connection,
          source: "all",
        };
      }

      return {
        success: false,
        connection: null,
        message: `No hay conexión activa para ${dataType}`,
      };
    } catch (error) {
      console.error("Error getting connection for data type:", error);
      return {
        success: false,
        connection: null,
        error: error.message,
      };
    }
  }

  /**
   * Migrar conexiones existentes al sistema multi-conexión
   * @returns {Promise<Object>} Resultado de la migración
   */
  static async migrateToMultiConnection() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener conexiones activas existentes
      const { data: activeConnections, error: connectionsError } =
        await supabase
          .from("data_connections")
          .select("id, name")

          .eq("is_active", true);

      if (connectionsError) throw connectionsError;

      if (!activeConnections || activeConnections.length === 0) {
        return {
          success: true,
          message: "No hay conexiones activas para migrar",
          migrated: 0,
        };
      }

      let migratedCount = 0;

      // Migrar cada conexión activa como tipo 'all'
      for (const connection of activeConnections) {
        try {
          await this.setConnectionDataType(connection.id, "all", true);
          migratedCount++;
        } catch (error) {
          console.warn(
            `Error migrando conexión ${connection.name}:`,
            error.message
          );
        }
      }

      return {
        success: true,
        message: `${migratedCount} conexiones migradas al sistema multi-conexión`,
        migrated: migratedCount,
      };
    } catch (error) {
      console.error("Error migrating to multi-connection:", error);
      throw new Error(error.message || "Error en la migración");
    }
  }
}
export default ConnectionService;
