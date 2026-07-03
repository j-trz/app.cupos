/**
 * Servicio de API de datos - Capa de abstracción para operaciones de base de datos
 * Permite cambiar entre diferentes proveedores de base de datos (Supabase, Neon, etc.)
 * sin afectar el código del frontend
 *
 * Backend espera:
 *   GET    /api/data?table=X&filters=JSON&limit=N&offset=N&order=field:ASC|DESC
 *   POST   /api/data  body: { table, operation: 'insert', data: {...} }
 *   PUT    /api/data  body: { table, operation: 'update', id, idField, data: {...} }
 *   DELETE /api/data  body: { table, operation: 'delete', id, idField }
 *   POST   /api/data/query  body: { query, params }
 *   GET    /api/data/schema/:table
 *   GET    /api/data/tables
 */

import apiClient from './apiClient';

class DataApiService {
  /**
   * Construir query string a partir de un objeto de parámetros
   */
  _buildQueryString(params) {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
    return entries.length > 0
      ? '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
  }

  /**
   * Obtener datos de una tabla
   * @param {string} table - Nombre de la tabla
   * @param {Object} filters - Filtros en formato compatible con el backend ($eq, $ne, $gt, $in, etc.)
   * @param {Object} options - Opciones: { order, limit, offset }
   */
  async getData(table, filters = {}, options = {}) {
    try {
      const qs = this._buildQueryString({
        table,
        filters: JSON.stringify(filters),
        order: options.order,
        limit: options.limit,
        offset: options.offset,
      });

      // El backend devuelve un array de rows directamente (sin envoltorio)
      const data = await apiClient.get(`/data${qs}`);
      return Array.isArray(data) ? data : (data || []);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      throw error;
    }
  }

  /**
   * Insertar datos en una tabla
   * @param {string} table - Nombre de la tabla
   * @param {Object} data - Objeto con los campos a insertar
   * @returns {Object} Row insertado
   */
  async insertData(table, data) {
    try {
      const result = await apiClient.post('/data', {
        table,
        operation: 'insert',
        data,
      });
      return result;
    } catch (error) {
      console.error('Error insertando datos:', error);
      throw error;
    }
  }

  /**
   * Actualizar datos en una tabla
   * @param {string} table - Nombre de la tabla
   * @param {string|number} id - Valor del identificador
   * @param {Object} data - Campos a actualizar
   * @param {string} idField - Nombre del campo identificador (default: 'id')
   * @returns {Object} Row actualizado
   */
  async updateData(table, id, data, idField = 'id') {
    try {
      const result = await apiClient.put('/data', {
        table,
        operation: 'update',
        id,
        idField,
        data,
      });
      return result;
    } catch (error) {
      console.error('Error actualizando datos:', error);
      throw error;
    }
  }

  /**
   * Eliminar datos de una tabla
   * @param {string} table - Nombre de la tabla
   * @param {string|number} id - Valor del identificador
   * @param {string} idField - Nombre del campo identificador (default: 'id')
   * @returns {Object} Row eliminado
   */
  async deleteData(table, id, idField = 'id') {
    try {
      // DELETE requiere body, usar request() directamente
      const result = await apiClient.request('/data', {
        method: 'DELETE',
        body: JSON.stringify({
          table,
          operation: 'delete',
          id,
          idField,
        }),
      });
      return result;
    } catch (error) {
      console.error('Error eliminando datos:', error);
      throw error;
    }
  }

  /**
   * Ejecutar una consulta SQL personalizada (solo admin)
   * @param {string} query - Consulta SQL
   * @param {Array} params - Parámetros de la consulta
   */
  async executeQuery(query, params = []) {
    try {
      const result = await apiClient.post('/data/query', {
        query,
        params,
      });
      return result;
    } catch (error) {
      console.error('Error ejecutando consulta:', error);
      throw error;
    }
  }

  /**
   * Obtener esquema de una tabla (columnas y tipos)
   * @param {string} table - Nombre de la tabla
   */
  async getTableSchema(table) {
    try {
      const result = await apiClient.get(`/data/schema/${table}`);
      return result;
    } catch (error) {
      console.error('Error obteniendo esquema de tabla:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de tablas disponibles en la base de datos
   */
  async getTables() {
    try {
      const result = await apiClient.get('/data/tables');
      return result;
    } catch (error) {
      console.error('Error obteniendo lista de tablas:', error);
      throw error;
    }
  }
}

export default new DataApiService();
