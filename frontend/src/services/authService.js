import ApiClient from './apiClient';

class AuthService {
  static async login(email, password) {
    const result = await ApiClient.post('/auth/login', { email, password });
    if (result.token && result.user) {
      ApiClient.setToken(result.token);
      
      // Obtener perfil actualizado del backend para asegurar datos frescos
      try {
        const profileResult = await ApiClient.get('/auth/profile');
        if (profileResult.profile) {
          const updatedUser = {
            ...result.user,
            ...profileResult.profile
          };
          ApiClient.setSessionUser(updatedUser);
          return { success: true, user: updatedUser };
        }
      } catch (error) {
        console.warn('No se pudo obtener perfil actualizado, usando datos del login:', error);
      }
      
      ApiClient.setSessionUser(result.user);
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || 'Credenciales inválidas' };
  }

  static logout() {
    ApiClient.clearSession();
  }
  
  static async refreshProfile() {
    try {
      const profileResult = await ApiClient.get('/auth/profile');
      if (profileResult.profile) {
        const currentUser = ApiClient.getSessionUser();
        const updatedUser = {
          ...currentUser,
          ...profileResult.profile
        };
        ApiClient.setSessionUser(updatedUser);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Error al refrescar perfil:', error);
      return null;
    }
  }
}

export default AuthService;
