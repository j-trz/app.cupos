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
}

export default ProductService;