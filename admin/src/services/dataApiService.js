/**
 * Servicio de API de datos - Capa de abstracción para operaciones de base de datos
 * Permite cambiar entre diferentes proveedores de base de datos (Supabase, Neon, etc.)
 * sin afectar el código del frontend
 */

import apiClient from './apiClient';

class DataApiService {
  /**
   * Obtener datos de una tabla
   */
  async getData(table, filters = {}, options = {}) {
    try {
      const response = await apiClient.get('/data', {
        params: {
          table,
          filters: JSON.stringify(filters),
          ...options
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      throw error;
    }
  }

  /**
   * Insertar datos en una tabla
   */
  async insertData(table, data) {
    try {
      const response = await apiClient.post('/data', {
        table,
        operation: 'insert',
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error insertando datos:', error);
      throw error;
    }
  }

  /**
   * Actualizar datos en una tabla
   */
  async updateData(table, id, data, idField = 'id') {
    try {
      const response = await apiClient.put('/data', {
        table,
        operation: 'update',
        id,
        idField,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Error actualizando datos:', error);
      throw error;
    }
  }

  /**
   * Eliminar datos de una tabla
   */
  async deleteData(table, id, idField = 'id') {
    try {
      const response = await apiClient.delete('/data', {
        data: {
          table,
          operation: 'delete',
          id,
          idField
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error eliminando datos:', error);
      throw error;
    }
  }

  /**
   * Ejecutar una consulta personalizada
   */
  async executeQuery(query, params = []) {
    try {
      const response = await apiClient.post('/data/query', {
        query,
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error ejecutando consulta:', error);
      throw error;
    }
  }

  /**
   * Obtener esquema de tabla
   */
  async getTableSchema(table) {
    try {
      const response = await apiClient.get(`/data/schema/${table}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo esquema de tabla:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de tablas
   */
  async getTables() {
    try {
      const response = await apiClient.get('/data/tables');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo lista de tablas:', error);
      throw error;
    }
  }
}

export default new DataApiService();