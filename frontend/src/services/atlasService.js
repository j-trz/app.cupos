import ApiClient from './apiClient';

/**
 * Servicio de integración con Netviax Atlas (backoffice) — búsqueda de
 * contactos por documento/email/celular/nombre para autocompletar el
 * formulario de reserva. Solo lectura por ahora.
 */
class AtlasService {
  /**
   * Buscar contactos en Atlas por un único criterio.
   * @param {'documento'|'email'|'celular'|'nombre'} filtroTipo
   * @param {string} valor
   */
  static async buscarContacto(filtroTipo, valor) {
    return ApiClient.post('/backoffice/atlas/contactos/buscar', { filtro_tipo: filtroTipo, valor });
  }

  /**
   * Traer el detalle completo de un contacto por su código, ya mapeado a
   * los datos de contacto + una fila de pasajero.
   * @param {string} contactoCodigo
   */
  static async detalleContacto(contactoCodigo) {
    return ApiClient.get(`/backoffice/atlas/contactos/${encodeURIComponent(contactoCodigo)}`);
  }
}

export default AtlasService;
