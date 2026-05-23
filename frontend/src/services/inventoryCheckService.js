import axiosClient from './axiosClient';

const inventoryCheckService = {
  getAll: () => axiosClient.get('/inventory-checks'),
  
  create: (data) => axiosClient.post('/inventory-checks', data),
  
  approve: (id) => axiosClient.put(`/inventory-checks/${id}/approve`),
  
  reject: (id) => axiosClient.put(`/inventory-checks/${id}/reject`),
};

export default inventoryCheckService;
