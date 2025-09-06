/**
 * Validador de Variables de Entorno
 * Valida que todas las variables críticas estén definidas al iniciar la aplicación
 */

// Variables de entorno requeridas
const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

// Variables de entorno opcionales con valores por defecto
const OPTIONAL_ENV_VARS = {
  VITE_APP_NAME: "Admin Panel",
  VITE_APP_VERSION: "1.0.0",
  VITE_APP_ENVIRONMENT: "development",
  VITE_ENABLE_ANALYTICS: "false",
  VITE_DEBUG_MODE: "false",
  VITE_STRICT_MODE: "true",
  VITE_API_TIMEOUT: "10000",
  VITE_MAX_RETRY_ATTEMPTS: "3",
  VITE_MAX_CONNECTIONS: "10",
  VITE_CONNECTION_TIMEOUT: "30000",
  VITE_ENCRYPTION_KEY_LENGTH: "32",
  VITE_PBKDF2_ITERATIONS: "100000",
};

/**
 * Valida que las variables de entorno requeridas estén definidas
 * @returns {Object} Resultado de la validación
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const config = {};

  // Validar variables requeridas
  REQUIRED_ENV_VARS.forEach((varName) => {
    const value = import.meta.env[varName];
    if (!value) {
      errors.push(`Variable de entorno requerida faltante: ${varName}`);
    } else {
      config[varName] = value;
    }
  });

  // Configurar variables opcionales con valores por defecto
  Object.entries(OPTIONAL_ENV_VARS).forEach(([varName, defaultValue]) => {
    const value = import.meta.env[varName];
    if (!value) {
      warnings.push(
        `Variable de entorno opcional no definida: ${varName}, usando valor por defecto: ${defaultValue}`
      );
      config[varName] = defaultValue;
    } else {
      config[varName] = value;
    }
  });

  // Validaciones específicas
  if (
    config.VITE_SUPABASE_URL &&
    !config.VITE_SUPABASE_URL.startsWith("https://")
  ) {
    errors.push("VITE_SUPABASE_URL debe usar HTTPS");
  }

  if (
    config.VITE_SUPABASE_ANON_KEY &&
    config.VITE_SUPABASE_ANON_KEY.length < 100
  ) {
    warnings.push(
      "VITE_SUPABASE_ANON_KEY parece ser muy corto, verificar que sea correcto"
    );
  }

  // Validar timeouts
  const timeout = parseInt(config.VITE_API_TIMEOUT);
  if (isNaN(timeout) || timeout < 1000) {
    warnings.push("VITE_API_TIMEOUT debe ser un número mayor a 1000ms");
    config.VITE_API_TIMEOUT = "10000";
  }

  const retries = parseInt(config.VITE_MAX_RETRY_ATTEMPTS);
  if (isNaN(retries) || retries < 1 || retries > 10) {
    warnings.push("VITE_MAX_RETRY_ATTEMPTS debe estar entre 1 y 10");
    config.VITE_MAX_RETRY_ATTEMPTS = "3";
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Obtiene la configuración completa de la aplicación
 * @returns {Object} Configuración de la aplicación
 */
export function getAppConfig() {
  const validation = validateEnvironment();

  if (!validation.isValid) {
    console.error("❌ Errores de configuración de entorno:", validation.errors);
    throw new Error("Configuración de entorno inválida");
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️ Advertencias de configuración:", validation.warnings);
  }

  return {
    // Supabase
    supabase: {
      url: validation.config.VITE_SUPABASE_URL,
      anonKey: validation.config.VITE_SUPABASE_ANON_KEY,
    },

    // Power Automate (opcionales)
    powerAutomate: {
      getUrl: import.meta.env.VITE_POWERAUTOMATE_GET_URL,
      postUrl: import.meta.env.VITE_POWERAUTOMATE_POST_URL,
      getUrlSS: import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS,
    },

    // Configuración de la aplicación
    app: {
      name: validation.config.VITE_APP_NAME,
      version: validation.config.VITE_APP_VERSION,
      environment: validation.config.VITE_APP_ENVIRONMENT,
      debug: validation.config.VITE_DEBUG_MODE === "true",
      strictMode: validation.config.VITE_STRICT_MODE === "true",
      enableAnalytics: validation.config.VITE_ENABLE_ANALYTICS === "true",
    },

    // Configuración de API
    api: {
      timeout: parseInt(validation.config.VITE_API_TIMEOUT),
      maxRetryAttempts: parseInt(validation.config.VITE_MAX_RETRY_ATTEMPTS),
      maxConnections: parseInt(validation.config.VITE_MAX_CONNECTIONS),
      connectionTimeout: parseInt(validation.config.VITE_CONNECTION_TIMEOUT),
    },

    // Configuración de seguridad
    security: {
      encryptionKeyLength: parseInt(
        validation.config.VITE_ENCRYPTION_KEY_LENGTH
      ),
      pbkdf2Iterations: parseInt(validation.config.VITE_PBKDF2_ITERATIONS),
      allowedOrigins: import.meta.env.VITE_ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
    },
  };
}

/**
 * Verifica si la aplicación está en modo de desarrollo
 * @returns {boolean}
 */
export function isDevelopment() {
  return import.meta.env.DEV;
}

/**
 * Verifica si la aplicación está en modo de producción
 * @returns {boolean}
 */
export function isProduction() {
  return import.meta.env.PROD;
}

/**
 * Obtiene información del build
 * @returns {Object}
 */
export function getBuildInfo() {
  return {
    version: import.meta.env.VITE_APP_VERSION || "1.0.0",
    buildDate: new Date().toISOString(),
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  };
}

/**
 * Logs de configuración para debugging
 */
export function logEnvironmentInfo() {
  if (isDevelopment()) {
    const config = getAppConfig();
    console.log("🔧 Configuración de la aplicación:", {
      app: config.app,
      api: config.api,
      security: {
        ...config.security,
        // No loggear datos sensibles
        encryptionKeyLength: config.security.encryptionKeyLength,
        pbkdf2Iterations: config.security.pbkdf2Iterations,
      },
      build: getBuildInfo(),
    });
  }
}
