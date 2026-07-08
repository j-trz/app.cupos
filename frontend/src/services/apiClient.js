class ApiClient {
  static getBaseUrl() {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    // Sacar cualquier barra final: si VITE_API_URL se configuró con "/" al
    // final (error común en las variables de entorno de Vercel), concatenar
    // el endpoint (que ya arranca con "/") genera "//auth/login" — eso
    // dispara un redirect que el navegador rechaza en un preflight CORS.
    return base.replace(/\/+$/, '');
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

  static setSessionUser(user) {
    if (user) {
      localStorage.setItem('api_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('api_user');
    }
  }

  static getSessionUser() {
    try {
      const stored = localStorage.getItem('api_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static clearSession() {
    localStorage.removeItem('api_token');
    localStorage.removeItem('api_user');
  }

  static async request(endpoint, options = {}) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${path}`;

    const isFormData = options.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Incluir cookies en requests cross-origin
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  static get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  static put(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient;
