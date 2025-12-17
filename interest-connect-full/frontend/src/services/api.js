import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const usersAPI = {
  getProfile: (id) => api.get(`/users/profile/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  searchUsers: (params) => api.get('/users/search', { params }),
  getMatches: () => api.get('/users/matches'),
  getInterests: () => api.get('/users/interests'),
  blockUser: (userId) => api.post(`/users/block/${userId}`),
  unblockUser: (userId) => api.delete(`/users/block/${userId}`),
};

export const communitiesAPI = {
  getAll: (params) => api.get('/communities', { params }),
  getMy: () => api.get('/communities/my'),
  getRecommendations: () => api.get('/communities/recommendations'),
  getById: (id) => api.get(`/communities/${id}`),
  create: (data) => api.post('/communities', data),
  update: (id, data) => api.put(`/communities/${id}`, data),
  delete: (id) => api.delete(`/communities/${id}`),
  join: (id) => api.post(`/communities/${id}/join`),
  leave: (id) => api.post(`/communities/${id}/leave`),
  getMembers: (id, params) => api.get(`/communities/${id}/members`, { params }),
};

export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getByCommunity: (communityId) => api.get(`/events/community/${communityId}`),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  join: (id) => api.post(`/events/${id}/join`),
  leave: (id) => api.post(`/events/${id}/leave`),
  delete: (id) => api.delete(`/events/${id}`),
};

export const postsAPI = {
  getByCommunity: (communityId, params) => api.get(`/posts/community/${communityId}`, { params }),
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  addComment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
  deleteComment: (commentId) => api.delete(`/posts/comments/${commentId}`),
};

export const friendsAPI = {
  getAll: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  acceptRequest: (userId) => api.post(`/friends/accept/${userId}`),
  declineRequest: (userId) => api.post(`/friends/decline/${userId}`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
  getStatus: (userId) => api.get(`/friends/status/${userId}`),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, params) => api.get(`/messages/user/${userId}`, { params }),
  getCommunityMessages: (communityId, params) => api.get(`/messages/community/${communityId}`, { params }),
  send: (data) => api.post('/messages/send', data),
  markRead: (messageId) => api.put(`/messages/read/${messageId}`),
  getUnreadCount: () => api.get('/messages/unread/count'),
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/clear-all'),
};

export default api;
