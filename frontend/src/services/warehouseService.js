import axiosClient from './axiosClient';

const warehouseService = {
  // Lấy danh sách kho hàng
  getAll: async () => {
    return await axiosClient.get('/warehouses');
  },

  // Lấy chi tiết thông tin một kho
  getById: async (id) => {
    return await axiosClient.get(`/warehouses/${id}`);
  },

  // Lấy danh sách tồn kho theo id kho  
  getStock: async (id) => {
    return await axiosClient.get(`/warehouses/${id}/stock`);
  },

  // Thêm mới kho hàng
  create: async (warehouseData) => {
    return await axiosClient.post('/warehouses', warehouseData);
  },

  // Cập nhật thông tin kho hàng
  update: async (id, warehouseData) => {
    return await axiosClient.put(`/warehouses/${id}`, warehouseData);
  },

  // Xóa kho hàng
  delete: async (id) => {
    return await axiosClient.delete(`/warehouses/${id}`);
  },

  // Điều chỉnh tồn kho hàng loạt
  adjustStockBatch: async (adjustments) => {
    return await axiosClient.post('/stock/adjust-batch', adjustments);
  }
};

export default warehouseService;
