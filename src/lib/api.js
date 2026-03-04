import axios from 'axios';

const getBaseUrl = () => (typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

const TOKEN_KEY = 'token';

const getCookieToken = () => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookieToken = (token) => {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
};

const removeCookieToken = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
};

const setToken = (token) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore storage failures; cookie fallback is used
    }
  }
  setCookieToken(token);
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  } catch {
    // ignore and fallback to cookie
  }
  return getCookieToken();
};

const removeToken = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
  removeCookieToken();
};

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (!config.headers) config.headers = {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.baseURL = getBaseUrl();
  return config;
});

export const signup = async (profileData) => {
  const { data } = await axios.post('/api/auth/signup', profileData);
  if (data.token) setToken(data.token);
  return data;
};

export const login = async (identifier, password) => {
  const { data } = await axios.post('/api/auth/login', { identifier, password });
  if (data.token) setToken(data.token);
  return data;
};

export const verifyEmail = async (token) => {
  const { data } = await axios.post('/api/auth/verify-email', { token });
  if (data.token) setToken(data.token);
  return data;
};

export const resendVerification = async (email) => {
  const { data } = await axios.post('/api/auth/resend-verification', { email });
  return data;
};

export const completeOnboarding = async (payload) => {
  const { data } = await axios.post('/api/auth/onboarding', payload);
  return data;
};

export const logout = () => removeToken();

export const getCurrentUser = async () => {
  const token = getToken();
  const { data } = await axios.get('/api/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
};
export const logoutSession = async () => {
  const { data } = await axios.post('/api/auth/logout');
  return data;
};

export const getUser = async (userId) => {
  const { data } = await axios.get(`/api/users/${userId}`);
  return data;
};

export const updateUser = async (userData) => {
  const { data } = await axios.put('/api/users/me', userData);
  return data;
};

export const getMe = async () => {
  const { data } = await axios.get('/api/users/me');
  return data;
};

export const deleteMyAccount = async (confirmation) => {
  const { data } = await axios.delete('/api/users/me', { data: { confirmation } });
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

export const reportEncounterUser = async (payload) => {
  const { data } = await axios.post('/api/encounter/report', payload);
  return data;
};

export const blockUser = async (blockedUserId) => {
  const { data } = await axios.post('/api/blocks', { blockedUserId });
  return data;
};

export const unblockUser = async (blockedUserId) => {
  const { data } = await axios.delete('/api/blocks', { data: { blockedUserId } });
  return data;
};

export const listBlockedUsers = async () => {
  const { data } = await axios.get('/api/blocks');
  return data?.blocks || [];
};

export const reportProfilePhoto = async (payload) => {
  const { data } = await axios.post('/api/users/photos/report', payload);
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
