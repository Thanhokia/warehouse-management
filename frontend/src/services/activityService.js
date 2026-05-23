import axiosClient from './axiosClient';

const activityService = {
  getAll: () => axiosClient.get('/activities'),
  logAction: (action, status, detail) => axiosClient.post('/activities/log', { action, status, detail }),
};

export default activityService;
