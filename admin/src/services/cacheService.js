/**
 * Servicio de cache para optimizar el rendimiento de las consultas a Power Automate
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Obtener datos del cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Guardar datos en el cache
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpiar cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Invalidar cache por patrón
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtener datos con cache automático
   */
  async getWithCache(key, fetcher) {
    let data = this.get(key);
    if (data !== null) {
      return data;
    }

    try {
      data = await fetcher();
      this.set(key, data);
      return data;
    } catch (error) {
      console.error("Error fetching data for cache:", error);
      throw error;
    }
  }
}

// Instancia singleton
export const cacheService = new CacheService();
export default CacheService;
