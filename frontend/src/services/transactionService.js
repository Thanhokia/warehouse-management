import axiosClient from './axiosClient';

const transactionService = {
  // Lấy danh sách phiếu nhập
  getAllImports: async () => {
    return await axiosClient.get('/import-orders');
  },
  
  // Chi tiết phiếu nhập
  getImportById: async (id) => {
    return await axiosClient.get(`/import-orders/${id}`);
  },

  // Tạo phiếu nhập mới
  createImport: async (data) => {
    return await axiosClient.post('/import-orders', data);
  },

  // Duyệt/Cập nhật trạng thái phiếu nhập
  updateImportStatus: async (id, status) => {
    return await axiosClient.patch(`/import-orders/${id}/status`, null, { params: { status } });
  },

  // Xóa phiếu nhập
  deleteImport: async (id) => {
    return await axiosClient.delete(`/import-orders/${id}`);
  },

  // Lấy danh sách phiếu xuất
  getAllExports: async () => {
    return await axiosClient.get('/export-orders');
  },

  // Chi tiết phiếu xuất
  getExportById: async (id) => {
    return await axiosClient.get(`/export-orders/${id}`);
  },

  // Tạo phiếu xuất mới
  createExport: async (data) => {
    return await axiosClient.post('/export-orders', data);
  },

  // Duyệt/Cập nhật trạng thái phiếu xuất
  updateExportStatus: async (id, status) => {
    return await axiosClient.patch(`/export-orders/${id}/status`, null, { params: { status } });
  },

  // Xóa phiếu xuất
  deleteExport: async (id) => {
    return await axiosClient.delete(`/export-orders/${id}`);
  }
};

export default transactionService;
