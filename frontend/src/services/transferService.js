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
}

export default TransferService;
