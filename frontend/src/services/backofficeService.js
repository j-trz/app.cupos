/**
 * Servicio de Backoffice - Cliente API para el frontend
 * Permite realizar operaciones de integración con sistemas externos
 */

import ApiClient from './apiClient';

class BackofficeService {
  /**
   * Importar pasajeros desde el backoffice usando la ficha de venta
   * @param {string} fichaVenta - Número de ficha de venta
   */
  static async importarPasajeros(fichaVenta) {
    return ApiClient.get('/backoffice/importar-pasajeros', {
      params: { ficha_venta: fichaVenta }
    });
  }
}

export default BackofficeService;
