import ApiClient from './apiClient';

export class TransferService {
  static async listTransfers() {
    return await ApiClient.get('/transfers');
  }

  static async createTransfer(data) {
    return await ApiClient.post('/transfers', data);
  }

  static async listAllTransfers() {
    return await ApiClient.get('/transfers/all');
  }

  // Recupera cupos de un producto-espejo cedido. quantity es opcional: si no
  // se manda, el backend recupera todo lo que quede disponible en el espejo
  // (comportamiento anterior). Pasarla permite devolver solo una parte de lo
  // cedido (ej. se cedieron 5 y se quieren recuperar solo 2).
  static async reclaimTransfer(productId, quantity) {
    const body = quantity ? { quantity: Number(quantity) } : {};
    return await ApiClient.post(`/transfers/${productId}/reclaim`, body);
  }
}

export default TransferService;
