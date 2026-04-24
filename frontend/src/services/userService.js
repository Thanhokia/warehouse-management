import axiosClient from './axiosClient';

const userService = {
  // Lấy danh sách người dùng
  getAll: async () => {
    return await axiosClient.get('/users');
  },

  // Lấy chi tiết thông tin một người dùng
  getById: async (id) => {
    return await axiosClient.get(`/users/${id}`);
  },

  // Thêm mới người dùng
  create: async (userData) => {
    return await axiosClient.post('/users', userData);
  },

  // Cập nhật thông tin người dùng
  update: async (id, userData) => {
    return await axiosClient.put(`/users/${id}`, userData);
  },

  // Xóa người dùng
  delete: async (id) => {
    return await axiosClient.delete(`/users/${id}`);
  }
};

export default userService;
