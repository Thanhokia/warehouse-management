import axiosClient from './axiosClient';

const productService = {
  // Lấy danh sách sản phẩm
  getAll: async () => {
    return await axiosClient.get('/products');
  },

  // Lấy chi tiết thông tin một sản phẩm
  getById: async (id) => {
    return await axiosClient.get(`/products/${id}`);
  },

  // Thêm mới sản phẩm
  create: async (productData) => {
    return await axiosClient.post('/products', productData);
  },

  // Cập nhật sản phẩm
  update: async (id, productData) => {
    return await axiosClient.put(`/products/${id}`, productData);
  },

  // Xóa sản phẩm
  delete: async (id) => {
    return await axiosClient.delete(`/products/${id}`);
  }
};

export default productService;
