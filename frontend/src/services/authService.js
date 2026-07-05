import ApiClient from './apiClient';

class AuthService {
  static async login(email, password) {
    const result = await ApiClient.post('/auth/login', { email, password });
    if (result.token && result.user) {
      ApiClient.setToken(result.token);
      ApiClient.setSessionUser(result.user);
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || 'Credenciales inválidas' };
  }

  static logout() {
    ApiClient.clearSession();
  }
}

export default AuthService;
