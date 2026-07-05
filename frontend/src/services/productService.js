import ApiClient from './apiClient';

class ProductService {
  static async getProducts() {
    const result = await ApiClient.get('/products');
    return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
  }

  static async createProduct(payload) {
    return ApiClient.post('/products', payload);
  }

  static async updateProduct(id, payload) {
    return ApiClient.put(`/products/${id}`, payload);
  }

  static async deleteProduct(id) {
    return ApiClient.delete(`/products/${id}`);
  }
}

export default ProductService;
