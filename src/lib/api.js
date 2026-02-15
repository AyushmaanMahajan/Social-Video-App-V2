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

export const getProfiles = async () => {
  const { data } = await axios.get('/api/pool/profiles');
  return data;
};

export const addToPool = async (addedUserId) => {
  const { data } = await axios.post('/api/pool/add', { addedUserId });
  return data;
};

export const getPool = async () => {
  const { data } = await axios.get('/api/pool/my-pool');
  return data;
};

export const getIncoming = async () => {
  const { data } = await axios.get('/api/pool/incoming');
  return data;
};

export const getMatches = async () => {
  const { data } = await axios.get('/api/pool/matches');
  return data;
};

export const checkMutual = async (targetId) => {
  const { data } = await axios.get(`/api/pool/mutual/${targetId}`);
  return data;
};

export const reportUser = async (reportedUserId, reason) => {
  const { data } = await axios.post('/api/pool/report', { reportedUserId, reason });
  return data;
};

export { getToken, setToken, removeToken };
