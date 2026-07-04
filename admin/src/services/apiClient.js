/**
 * Cliente API HTTP para comunicarse con el Backend Flexible (Node.js/Express)
 */
class ApiClient {
  static getBaseUrl() {
    return import.meta.env.VITE_API_URL || '';
  }

  static isApiEnabled() {
    return !!import.meta.env.VITE_API_URL;
  }

  static getToken() {
    return localStorage.getItem('api_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('api_token', token);
    } else {
      localStorage.removeItem('api_token');
    }
  }

  static clearToken() {
    localStorage.removeItem('api_token');
    localStorage.removeItem('api_user');
  }

  static setSessionUser(user) {
    if (user) {
      localStorage.setItem('api_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('api_user');
    }
  }

  static getSessionUser() {
    try {
      const user = localStorage.getItem('api_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  static clearSession() {
    localStorage.removeItem('api_token');
    localStorage.removeItem('api_user');
    localStorage.removeItem('userProfile');
  }

  static async request(endpoint, options = {}) {
    // Bloquear endpoints de 'connections' en el cliente: la gestión de conexiones
    // fue removida del frontend y debe gestionarse desde el panel de administración
    // del backend o mediante operaciones directas de DB por administradores.
    const forbiddenPrefixes = ['/connections', '/connections/', '/power-automate-proxy', '/connections/external-fetch'];
    for (const p of forbiddenPrefixes) {
      if (String(endpoint).startsWith(p)) {
        const err = new Error('El soporte de conexiones desde el cliente fue removido. Use el panel de administración del backend o /api/data para importación de datos.');
        console.error(`❌ Petición bloqueada a endpoint prohibido (${endpoint}):`, err.message);
        throw err;
      }
    }

    const url = `${this.getBaseUrl()}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ Error en petición API (${endpoint}):`, error.message);
      throw error;
    }
  }

  static get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  static post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default ApiClient;
