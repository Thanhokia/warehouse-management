import productService from './productService';
import reportService from './reportService';
import transactionService from './transactionService';
import axiosClient from './axiosClient';

const dashboardService = {
  getOverview: async () => {
    try {
      const response = await axiosClient.get('/dashboard/overview');
      return response;
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tổng quan:", error);
      throw error;
    }
  },

  getInventoryTrend: async () => {
    try {
      const response = await axiosClient.get('/dashboard/inventory-trend');
      return response;
    } catch (error) {
      console.error("Lỗi khi tải xu hướng nhập - xuất kho:", error);
      throw error;
    }
  }
};

export default dashboardService;
