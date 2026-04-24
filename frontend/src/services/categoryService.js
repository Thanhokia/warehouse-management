import axiosClient from './axiosClient';

const categoryService = {
  // Lấy danh sách tất cả danh mục
  getAll: async () => {
    return await axiosClient.get('/categories');
  },

  // Lấy chi tiết một danh mục theo ID
  getById: async (id) => {
    return await axiosClient.get(`/categories/${id}`);
  },

  // Thêm mới một danh mục
  create: async (categoryData) => {
    return await axiosClient.post('/categories', categoryData);
  },

  // Cập nhật thông tin danh mục
  update: async (id, categoryData) => {
    return await axiosClient.put(`/categories/${id}`, categoryData);
  },

  // Xóa danh mục
  delete: async (id) => {
    return await axiosClient.delete(`/categories/${id}`);
  }
};

export default categoryService;
