import axiosClient from './axiosClient';

const authService = {
  login: async (username, password) => {
    const response = await axiosClient.post('/auth/login', { username, password });
    return response;
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  },
  
  getToken: () => {
    return sessionStorage.getItem('token');
  }
};

export default authService;
