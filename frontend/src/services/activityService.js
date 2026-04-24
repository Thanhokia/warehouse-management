import axiosClient from './axiosClient';

const activityService = {
  getAll: () => axiosClient.get('/activities'),
};

export default activityService;
