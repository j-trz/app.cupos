import ApiClient from './apiClient';

export class ProductService {
  static async listProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    
    return await ApiClient.get(endpoint);
  }

  static async getProductById(id) {
    return await ApiClient.get(`/products/${id}`);
  }

  static async createProduct(productData) {
    return await ApiClient.post('/products', productData);
  }

  static async updateProduct(id, productData) {
    return await ApiClient.put(`/products/${id}`, productData);
  }

  static async deleteProduct(id) {
    return await ApiClient.delete(`/products/${id}`);
  }

  static async updateProductAvailability(productId, availabilityData) {
    return await ApiClient.put(`/products/${productId}/availability`, availabilityData);
  }

  static async bulkUploadProducts(file) {
    const formData = new FormData();
    formData.append('file', file);

    return await ApiClient.post('/products/bulk', formData);
  }

  // Carga masiva real: el backend espera JSON { products: [...] }, no el
  // archivo crudo (ver bulkUploadProducts arriba, que nunca funcionó).
  static async bulkCreateProducts(products) {
    return await ApiClient.post('/products/bulk', { products });
  }

  // Visibilidad compartida: a diferencia de Ceder (TransferService), no crea
  // una fila espejo — comparte el mismo Disponibilidad entre las agencias.
  static async getSharedAgencies(productId) {
    return await ApiClient.get(`/products/${productId}/shared-agencies`);
  }

  static async shareProduct(productId, agencia) {
    return await ApiClient.post(`/products/${productId}/shared-agencies`, { agencia });
  }

  static async unshareProduct(productId, agencia) {
    return await ApiClient.delete(`/products/${productId}/shared-agencies/${encodeURIComponent(agencia)}`);
  }
}

export default ProductService;