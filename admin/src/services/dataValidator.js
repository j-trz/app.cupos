/**
 * Validador de estructura de datos real para el sistema de cupos de vuelo
 * Basado en las estructuras de SharePoint/Power Automate
 */
class DataValidator {
  /**
   * Campos obligatorios para registros de pedidos (solicitudes/confirmaciones)
   */
  static requiredPedidosFields = [
    "Estado",
    "Pedido_ID",
    "Agencia",
    "Contacto_Nombre",
    "Vuelo_Destino",
    "Nombre_Pasajero",
    "Apellido_Pasajero",
    "Fecha_Registro",
  ];

  /**
   * Campos opcionales para registros de pedidos
   */
  static optionalPedidosFields = [
    "@odata.etag",
    "ItemInternalId",
    "Contacto_Email",
    "Contacto_Telefono",
    "Vuelo_Codigo",
    "Vuelo_Compania",
    "Vuelo_Salida",
    "Vuelo_Precio",
    "Documento_Pasajero",
    "Nacimiento_Pasajero",
    "Nacionalidad_Pasajero",
    "Tipo_Pasajero",
    "Temporada",
    "Ruta",
    "Ficha",
    "Pnr",
    "Neto_1",
    "Op",
  ];

  /**
   * Campos obligatorios para registros de productos (disponibilidad)
   */
  static requiredProductosFields = [
    "codigo_cupo",
    "destino",
    "compania",
    "disponibilidad",
    "precio",
  ];

  /**
   * Campos opcionales para registros de productos
   */
  static optionalProductosFields = [
    "@odata.etag",
    "ItemInternalId",
    "salida",
    "regreso",
    "fecha_salida",
    "fecha_regreso",
    "ruta",
    "pnr",
    "ficha",
    "temporada",
    "neto_1",
    "op",
    "carryon",
    "handbag",
    "checkedbag",
    "inf_fare",
  ];

  /**
   * Estados válidos para los registros
   */
  static validStates = ["Solicitado", "Confirmado", "Rechazado"];

  /**
   * Temporadas válidas (acepta variaciones)
   */
  static validSeasons = ["VERANO", "INVIERNO", "PRIMAVERA", "OTOÑO"];

  /**
   * Tipos de pasajero válidos
   */
  static validPassengerTypes = ["Adulto", "Niño", "Bebé"];

  /**
   * Códigos de nacionalidad válidos (algunos ejemplos)
   */
  static validNationalityCodes = [
    "UY",
    "AR",
    "BR",
    "CL",
    "PY",
    "BO",
    "PE",
    "CO",
    "VE",
    "EC",
    "ES",
    "PT",
    "UK",
    "GB",
    "FR",
    "DE",
    "IT",
    "NL",
    "BE",
    "CH",
    "AT",
    "AU",
    "NZ",
    "US",
    "CA",
    "MX",
    "JP",
    "CN",
    "IN",
    "RU",
    "ZA",
    "KR",
    "SG",
    "MY",
    "TH",
    "ID",
    "PH",
    "AE",
    "SA",
  ];

  /**
   * Validar un array completo de registros
   * @param {Array} records - Array de registros a validar
   * @param {string} type - Tipo de registro: 'pedidos' o 'productos'
   * @returns {Object} Resultado de la validación
   */
  static validateRecords(records, type = "pedidos") {
    if (!Array.isArray(records)) {
      return {
        valid: false,
        errors: ["Los datos deben ser un array"],
        validRecords: 0,
        totalRecords: 0,
      };
    }

    const errors = [];
    let validRecords = 0;

    records.forEach((record, index) => {
      const recordValidation = this.validateSingleRecord(record, type);
      if (recordValidation.valid) {
        validRecords++;
      } else {
        errors.push(
          `Registro ${index + 1}: ${recordValidation.errors.join(", ")}`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      validRecords,
      totalRecords: records.length,
      validationRate:
        records.length > 0 ? (validRecords / records.length) * 100 : 0,
    };
  }

  /**
   * Validar un solo registro
   * @param {Object} record - Registro a validar
   * @param {string} type - Tipo de registro: 'pedidos' o 'productos'
   * @returns {Object} Resultado de la validación
   */
  static validateSingleRecord(record, type = "pedidos") {
    const errors = [];

    if (!record || typeof record !== "object") {
      return {
        valid: false,
        errors: ["El registro debe ser un objeto"],
      };
    }

    // Seleccionar campos obligatorios según el tipo
    const requiredFields =
      type === "productos"
        ? this.requiredProductosFields
        : this.requiredPedidosFields;

    // Validar campos obligatorios
    requiredFields.forEach((field) => {
      if (
        !Object.prototype.hasOwnProperty.call(record, field) ||
        record[field] === null ||
        record[field] === undefined ||
        record[field] === ""
      ) {
        errors.push(`Campo obligatorio faltante o vacío: ${field}`);
      }
    });

    // Validaciones específicas para pedidos
    if (type === "pedidos") {
      // Validar estado
      if (record.Estado && !this.validStates.includes(record.Estado)) {
        errors.push(
          `Estado inválido: ${
            record.Estado
          }. Debe ser uno de: ${this.validStates.join(", ")}`
        );
      }

      // Validar tipo de pasajero
      if (
        record.Tipo_Pasajero &&
        !this.validPassengerTypes.includes(record.Tipo_Pasajero)
      ) {
        errors.push(
          `Tipo de pasajero inválido: ${
            record.Tipo_Pasajero
          }. Debe ser uno de: ${this.validPassengerTypes.join(", ")}`
        );
      }

      // Validar email si está presente
      if (record.Contacto_Email && !this.isValidEmail(record.Contacto_Email)) {
        errors.push(`Email inválido: ${record.Contacto_Email}`);
      }

      // Validar fecha de registro
      if (record.Fecha_Registro && !this.isValidDate(record.Fecha_Registro)) {
        errors.push(`Fecha de registro inválida: ${record.Fecha_Registro}`);
      }

      // Validar precio (debe ser numérico aunque se almacene como string)
      if (record.Vuelo_Precio && isNaN(parseFloat(record.Vuelo_Precio))) {
        errors.push(
          `Precio de vuelo debe ser numérico: ${record.Vuelo_Precio}`
        );
      }

      // Validar nacionalidad si está presente (más flexible)
      if (record.Nacionalidad_Pasajero) {
        const nationality = record.Nacionalidad_Pasajero.trim();
        // Aceptar códigos ISO y nombres de países comunes
        const isValidNationality =
          this.validNationalityCodes.includes(nationality) ||
          this.isValidNationalityName(nationality);

        if (!isValidNationality) {
          // Solo advertir, no rechazar el registro
          console.warn(`Nacionalidad no estándar encontrada: ${nationality}`);
        }
      }
    }

    // Validaciones específicas para productos
    if (type === "productos") {
      // Validar disponibilidad (debe ser numérico aunque se almacene como string)
      if (record.disponibilidad && isNaN(parseInt(record.disponibilidad))) {
        errors.push(
          `Disponibilidad debe ser numérica: ${record.disponibilidad}`
        );
      }

      // Validar precio (debe ser numérico aunque se almacene como string)
      if (record.precio && isNaN(parseFloat(record.precio))) {
        errors.push(`Precio debe ser numérico: ${record.precio}`);
      }

      // Validar que disponibilidad sea positiva
      if (record.disponibilidad && parseInt(record.disponibilidad) < 0) {
        errors.push(
          `Disponibilidad debe ser positiva: ${record.disponibilidad}`
        );
      }
    }

    // Validar temporada (flexible para diferentes formatos)
    if (record.Temporada || record.temporada) {
      const temporada = record.Temporada || record.temporada;
      const hasValidSeason = this.validSeasons.some((season) =>
        temporada.toUpperCase().includes(season)
      );
      if (!hasValidSeason) {
        errors.push(`Temporada no reconocida: ${temporada}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar formato de fecha ISO 8601
   * @param {string} dateString - Fecha en string
   * @returns {boolean} Si la fecha es válida
   */
  static isValidDate(dateString) {
    if (!dateString || typeof dateString !== "string") return false;

    // Intentar parsear la fecha
    const date = new Date(dateString);

    // Verificar que sea una fecha válida
    if (isNaN(date.getTime())) return false;

    // Verificar formato básico ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
    const isoRegex =
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3,7})?([+-]\d{2}:\d{2}|Z)?)?$/;
    return isoRegex.test(dateString);
  }

  /**
   * Validar formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} Si el email es válido
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generar reporte de validación
   * @param {Object} validationResult - Resultado de validateRecords
   * @returns {string} Reporte legible
   */
  static generateValidationReport(validationResult) {
    const { valid, errors, validRecords, totalRecords, validationRate } =
      validationResult;

    let report = `=== REPORTE DE VALIDACIÓN DE DATOS ===\n\n`;
    report += `Total de registros: ${totalRecords}\n`;
    report += `Registros válidos: ${validRecords}\n`;
    report += `Tasa de validación: ${validationRate.toFixed(1)}%\n`;
    report += `Estado general: ${valid ? "VÁLIDO" : "INVÁLIDO"}\n\n`;

    if (errors.length > 0) {
      report += `ERRORES ENCONTRADOS:\n`;
      errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
    } else {
      report += `✅ Todos los registros cumplen con la estructura estándar.\n`;
    }

    return report;
  }

  /**
   * Limpiar y normalizar un registro para cumplir con el estándar
   * @param {Object} record - Registro a limpiar
   * @param {string} type - Tipo de registro: 'pedidos' o 'productos'
   * @returns {Object} Registro limpio
   */
  static cleanRecord(record, type = "pedidos") {
    const cleaned = {};

    // Seleccionar campos según el tipo
    const requiredFields =
      type === "productos"
        ? this.requiredProductosFields
        : this.requiredPedidosFields;
    const optionalFields =
      type === "productos"
        ? this.optionalProductosFields
        : this.optionalPedidosFields;

    // Copiar campos obligatorios
    requiredFields.forEach((field) => {
      cleaned[field] = record[field] || "";
    });

    // Copiar campos opcionales si existen
    optionalFields.forEach((field) => {
      if (record[field] !== undefined && record[field] !== null) {
        cleaned[field] = record[field];
      }
    });

    // Normalizar estado para pedidos
    if (
      type === "pedidos" &&
      cleaned.Estado &&
      !this.validStates.includes(cleaned.Estado)
    ) {
      cleaned.Estado = "Solicitado"; // Valor por defecto
    }

    // Asegurar que las fechas estén en formato correcto
    if (cleaned.Fecha_Registro && !this.isValidDate(cleaned.Fecha_Registro)) {
      cleaned.Fecha_Registro = new Date().toISOString();
    }

    return cleaned;
  }

  /**
   * Validar estructura POST para crear solicitud
   * @param {Object} postData - Datos del POST
   * @returns {Object} Resultado de la validación
   */
  static validatePostStructure(postData) {
    const requiredPostFields = [
      "pedido_id",
      "contacto_nombre",
      "agencia",
      "vuelo_destino",
      "nombre_pasajero",
      "apellido_pasajero",
    ];

    const errors = [];

    if (!postData || typeof postData !== "object") {
      return {
        valid: false,
        errors: ["Los datos POST deben ser un objeto"],
      };
    }

    requiredPostFields.forEach((field) => {
      if (!postData[field] || postData[field].trim() === "") {
        errors.push(`Campo POST obligatorio faltante: ${field}`);
      }
    });

    // Validar email si está presente
    if (
      postData.contacto_email &&
      !this.isValidEmail(postData.contacto_email)
    ) {
      errors.push(`Email POST inválido: ${postData.contacto_email}`);
    }

    // Validar precio si está presente
    if (postData.vuelo_precio && isNaN(parseFloat(postData.vuelo_precio))) {
      errors.push(`Precio POST debe ser numérico: ${postData.vuelo_precio}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar nombres de nacionalidad comunes (más flexible)
   * @param {string} nationality - Nombre de nacionalidad
   * @returns {boolean} Si es una nacionalidad válida
   */
  static isValidNationalityName(nationality) {
    const validNames = [
      "Uruguayo",
      "Uruguaya",
      "Uruguay",
      "Argentino",
      "Argentina",
      "Argentina",
      "Brasileño",
      "Brasileña",
      "Brasil",
      "Brazil",
      "Chileno",
      "Chilena",
      "Chile",
      "Paraguayo",
      "Paraguaya",
      "Paraguay",
      "Boliviano",
      "Boliviana",
      "Bolivia",
      "Peruano",
      "Peruana",
      "Perú",
      "Peru",
      "Colombiano",
      "Colombiana",
      "Colombia",
      "Venezolano",
      "Venezolana",
      "Venezuela",
      "Ecuatoriano",
      "Ecuatoriana",
      "Ecuador",
      "Español",
      "Española",
      "España",
      "Spain",
      "Estadounidense",
      "Americano",
      "Americana",
      "Estados Unidos",
      "USA",
      "US",
      "Canadiense",
      "Canadá",
      "Canada",
      "Mexicano",
      "Mexicana",
      "México",
      "Mexico",
    ];

    return validNames.some(
      (name) => name.toLowerCase() === nationality.toLowerCase()
    );
  }
}

export default DataValidator;
