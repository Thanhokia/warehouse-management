import axiosClient from './axiosClient';

const reportService = {
  // Lấy toàn bộ tồn kho hiện tại
  getAllStock: async (params) => {
    return await axiosClient.get('/stock', { params });
  },

  // Lấy danh sách tồn kho dưới mức tối thiểu (sắp hết hàng)
  getLowStock: async (params) => {
    return await axiosClient.get('/stock/low-stock', { params });
  }
};

export default reportService;
