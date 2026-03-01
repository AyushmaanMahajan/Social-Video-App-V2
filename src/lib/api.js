import axios from 'axios';

const getBaseUrl = () => (typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const setToken = (token) => {
  if (typeof window !== 'undefined') localStorage.setItem('token', token);
};

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

const removeToken = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
};

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.baseURL = getBaseUrl();
  return config;
});

export const signup = async (profileData) => {
  const { data } = await axios.post('/api/auth/signup', profileData);
  if (data.token) setToken(data.token);
  return data;
};

export const login = async (email, password) => {
  const { data } = await axios.post('/api/auth/login', { email, password });
  if (data.token) setToken(data.token);
  return data;
};

export const logout = () => removeToken();

export const getUser = async (userId) => {
  const { data } = await axios.get(`/api/users/${userId}`);
  return data;
};

export const updateUser = async (userData) => {
  const { data } = await axios.put('/api/users/me', userData);
  return data;
};

export const getEncounterProfile = async () => {
  const { data } = await axios.get('/api/encounter/next');
  return data?.profile || null;
};

export const skipEncounterProfile = async (skippedUserId) => {
  const { data } = await axios.post('/api/encounter/skip', { skippedUserId });
  return data;
};

export const getPassedEncounterProfiles = async () => {
  const { data } = await axios.get('/api/encounter/passed');
  return data?.profiles || [];
};

export const restorePassedEncounterProfiles = async () => {
  const { data } = await axios.delete('/api/encounter/passed');
  return data;
};

export const recordInteraction = async (otherUserId, status) => {
  const { data } = await axios.post('/api/interactions/record', { otherUserId, status });
  return data;
};

export const getInteractions = async (search) => {
  const params = search ? { search } : {};
  const { data } = await axios.get('/api/interactions', { params });
  return data;
};

export const toggleChat = async (targetUserId, enabled) => {
  const { data } = await axios.post('/api/interactions/chat-toggle', { targetUserId, enabled });
  return data;
};

export const getChatStatus = async (targetUserId) => {
  const { data } = await axios.get(`/api/interactions/chat-status/${targetUserId}`);
  return data;
};

export const getMessages = async (targetUserId, encounterId) => {
  const params = { targetUserId };
  if (encounterId) params.encounterId = encounterId;
  const { data } = await axios.get('/api/interactions/messages', { params });
  return data?.messages || [];
};

export const getPresenceStatus = async (ids = []) => {
  if (!ids.length) return [];
  const { data } = await axios.get('/api/presence/status', { params: { ids: ids.join(',') } });
  return data?.statuses || [];
};

export const getPresenceVisibility = async () => {
  const { data } = await axios.get('/api/presence/visibility');
  return data?.showStatus ?? true;
};

export const setPresenceVisibility = async (showStatus) => {
  const { data } = await axios.post('/api/presence/visibility', { showStatus });
  return data?.showStatus ?? showStatus;
};

export { getToken, setToken, removeToken };
