/**
 * Servicio de encriptación zero-knowledge
 * Usa PBKDF2 + AES-GCM para encriptación del lado del cliente
 * Las credenciales nunca se envían sin encriptar al servidor
 */

class EncryptionService {
  /**
   * Generar una clave derivada usando PBKDF2
   * @param {string} password - Contraseña del usuario
   * @param {Uint8Array} salt - Salt aleatorio
   * @param {number} iterations - Número de iteraciones (mínimo 100,000)
   * @returns {Promise<CryptoKey>} Clave derivada
   */
  static async deriveKey(password, salt, iterations = 100000) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encriptar datos usando AES-GCM
   * @param {string} plaintext - Texto plano a encriptar
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<Object>} Objeto con datos encriptados
   */
  static async encrypt(plaintext, userPassword) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Generar salt e IV aleatorios
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derivar clave de la contraseña del usuario
      const key = await this.deriveKey(userPassword, salt);

      // Encriptar los datos
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        data
      );

      // Combinar todos los componentes
      const encryptedData = new Uint8Array(encryptedBuffer);

      return {
        encryptedData: Array.from(encryptedData),
        salt: Array.from(salt),
        iv: Array.from(iv),
        algorithm: "AES-GCM",
        keyDerivation: "PBKDF2",
        iterations: 100000,
      };
    } catch (error) {
      console.error("Error during encryption:", error);
      throw new Error("Error al encriptar los datos");
    }
  }

  /**
   * Desencriptar datos usando AES-GCM
   * @param {Object} encryptedObject - Objeto con datos encriptados
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<string>} Texto plano desencriptado
   */
  static async decrypt(encryptedObject, userPassword) {
    try {
      const { encryptedData, salt, iv, iterations = 100000 } = encryptedObject;

      // Convertir arrays a Uint8Array
      const saltBuffer = new Uint8Array(salt);
      const ivBuffer = new Uint8Array(iv);
      const encryptedBuffer = new Uint8Array(encryptedData);

      // Derivar la misma clave usando la contraseña del usuario
      const key = await this.deriveKey(userPassword, saltBuffer, iterations);

      // Desencriptar los datos
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBuffer,
        },
        key,
        encryptedBuffer
      );

      // Convertir a texto
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error("Error during decryption:", error);
      throw new Error(
        "Error al desencriptar los datos. Verifica tu contraseña."
      );
    }
  }

  /**
   * Encriptar credenciales de conexión API
   * @param {Object} credentials - Credenciales a encriptar
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<Object>} Credenciales encriptadas
   */
  static async encryptCredentials(credentials, userPassword) {
    const credentialsJson = JSON.stringify(credentials);
    return await this.encrypt(credentialsJson, userPassword);
  }

  /**
   * Desencriptar credenciales de conexión API
   * @param {Object} encryptedCredentials - Credenciales encriptadas
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<Object>} Credenciales desencriptadas
   */
  static async decryptCredentials(encryptedCredentials, userPassword) {
    const credentialsJson = await this.decrypt(
      encryptedCredentials,
      userPassword
    );
    return JSON.parse(credentialsJson);
  }

  /**
   * Generar hash de verificación de contraseña (no almacenar la contraseña real)
   * @param {string} password - Contraseña del usuario
   * @param {Uint8Array} salt - Salt único por usuario
   * @returns {Promise<string>} Hash de verificación
   */
  static async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    return Array.from(new Uint8Array(hashBuffer));
  }

  /**
   * Verificar contraseña contra hash almacenado
   * @param {string} password - Contraseña a verificar
   * @param {Array} storedHash - Hash almacenado
   * @param {Array} salt - Salt utilizado
   * @returns {Promise<boolean>} True si la contraseña es correcta
   */
  static async verifyPassword(password, storedHash, salt) {
    try {
      const saltBuffer = new Uint8Array(salt);
      const computedHash = await this.hashPassword(password, saltBuffer);

      // Comparación timing-safe
      if (computedHash.length !== storedHash.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < computedHash.length; i++) {
        result |= computedHash[i] ^ storedHash[i];
      }

      return result === 0;
    } catch (error) {
      console.error("Error during password verification:", error);
      return false;
    }
  }

  /**
   * Exportar conexión encriptada para respaldo
   * @param {Object} connection - Conexión a exportar
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<string>} JSON encriptado para respaldo
   */
  static async exportConnection(connection, userPassword) {
    const exportData = {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      description: connection.description,
      encrypted_credentials: connection.encrypted_credentials,
      column_mapping: connection.column_mapping,
      created_at: connection.created_at,
      export_timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    const encryptedExport = await this.encrypt(exportJson, userPassword);

    return JSON.stringify(
      {
        type: "encrypted_connection_backup",
        version: "1.0",
        data: encryptedExport,
      },
      null,
      2
    );
  }

  /**
   * Importar conexión desde respaldo encriptado
   * @param {string} backupData - Datos de respaldo encriptados
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<Object>} Conexión importada
   */
  static async importConnection(backupData, userPassword) {
    try {
      const backupObject = JSON.parse(backupData);

      if (backupObject.type !== "encrypted_connection_backup") {
        throw new Error("Formato de respaldo inválido");
      }

      const decryptedJson = await this.decrypt(backupObject.data, userPassword);
      const connectionData = JSON.parse(decryptedJson);

      // Validar estructura de datos
      const requiredFields = ["name", "type", "encrypted_credentials"];
      for (const field of requiredFields) {
        if (!connectionData[field]) {
          throw new Error(`Campo requerido faltante: ${field}`);
        }
      }

      return connectionData;
    } catch (error) {
      console.error("Error importing connection:", error);
      throw new Error(
        "Error al importar la conexión. Verifica el archivo y la contraseña."
      );
    }
  }

  /**
   * Generar salt aleatorio para un nuevo usuario
   * @returns {Uint8Array} Salt aleatorio
   */
  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Validar fortaleza de contraseña
   * @param {string} password - Contraseña a validar
   * @returns {Object} Resultado de validación
   */
  static validatePassword(password) {
    const result = {
      valid: true,
      errors: [],
      strength: 0,
    };

    if (password.length < 12) {
      result.valid = false;
      result.errors.push("La contraseña debe tener al menos 12 caracteres");
    } else {
      result.strength += 25;
    }

    if (!/[a-z]/.test(password)) {
      result.valid = false;
      result.errors.push(
        "La contraseña debe contener al menos una letra minúscula"
      );
    } else {
      result.strength += 25;
    }

    if (!/[A-Z]/.test(password)) {
      result.valid = false;
      result.errors.push(
        "La contraseña debe contener al menos una letra mayúscula"
      );
    } else {
      result.strength += 25;
    }

    if (!/\d/.test(password)) {
      result.valid = false;
      result.errors.push("La contraseña debe contener al menos un número");
    } else {
      result.strength += 25;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.errors.push("Se recomienda incluir caracteres especiales");
    } else {
      result.strength += 10;
    }

    return result;
  }
}

export default EncryptionService;
