import axios from 'axios';

// In production (served by the same backend), we use relative paths.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const authApi = {
  sendCode: (phone) => api.post('/auth/send-code', { phone }),
  verifyCode: (request_id, code) => api.post('/auth/verify', { request_id, code }),
  logout: (session_id) => api.post(`/auth/logout?session_id=${session_id}`),
};

export const chatApi = {
  list: (session_id) => api.get(`/chats/list?session_id=${session_id}`),
  clean: (session_id, chat_ids) => api.post('/chats/clean', { session_id, chat_ids }),
};

export default api;
