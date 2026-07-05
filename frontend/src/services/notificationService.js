import ApiClient from './apiClient';

class NotificationService {
  // Get user notifications
  static async getUserNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
      const result = await ApiClient.get(endpoint);
      // Backend returns: { success: true, notifications: [...] }
      if (Array.isArray(result)) return result;
      if (result?.notifications) return result.notifications;
      if (Array.isArray(result?.data)) return result.data;
      return [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount() {
    try {
      const result = await ApiClient.get('/notifications/unread-count');
      // Backend returns: { success: true, unreadCount: N }
      return result.unreadCount || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const result = await ApiClient.put(`/notifications/${notificationId}/read`);
      return result;
    } catch (error) {
      console.error(`Error marking notification as read: ${notificationId}`, error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead() {
    try {
      const result = await ApiClient.put('/notifications/read-all');
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Hide notification
  static async hideNotification(notificationId) {
    try {
      const result = await ApiClient.put(`/notifications/${notificationId}/hide`);
      return result;
    } catch (error) {
      console.error(`Error hiding notification: ${notificationId}`, error);
      throw error;
    }
  }

  // Create notification (admin only)
  static async createNotification(payload) {
    try {
      const result = await ApiClient.post('/notifications', payload);
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

export default NotificationService;