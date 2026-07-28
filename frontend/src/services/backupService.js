import ApiClient from './apiClient';

export class BackupService {
  /** Lista los backups existentes en el servidor. */
  static async listBackups() {
    return await ApiClient.get('/backup');
  }

  /**
   * Genera un nuevo backup completo de la base de datos en servidor.
   * Si el servidor no puede escribir en disco (ej. Vercel), la API enviará el blob JSON directamente.
   */
  static async generateBackup() {
    return await ApiClient.post('/backup/generate', {});
  }

  /**
   * Descarga un archivo de backup .json por nombre.
   */
  static async downloadBackup(filename) {
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
    const token = localStorage.getItem('api_token');

    const response = await fetch(`${baseUrl}/backup/download/${filename}`, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al descargar backup: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Restaura la base de datos enviando un objeto JSON de backup o FormData con archivo.
   */
  static async restoreBackup(backupData) {
    if (backupData instanceof File) {
      const formData = new FormData();
      formData.append('file', backupData);
      return await ApiClient.post('/backup/restore', formData);
    }
    return await ApiClient.post('/backup/restore', backupData);
  }

  /**
   * Elimina un archivo de backup guardado en el servidor.
   */
  static async deleteBackup(filename) {
    return await ApiClient.delete(`/backup/${filename}`);
  }
}

export default BackupService;
