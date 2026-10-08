// Centralized API client for Sistem Penjurian (Supabase + Prisma + Next.js JWT)

const TOKEN_KEY = 'juri_auth_token';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignored
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const api = {
  // Token management
  getToken,
  setToken,
  removeToken,

  // Auth
  login: (username, password) => request('/api/login', { method: 'POST', body: { username, password } }),
  logout: () => {
    removeToken();
    return Promise.resolve({ success: true });
  },
  getMe: () => request('/api/me'),

  // Judge
  getJudgeCategories: () => request('/api/judge/categories'),
  getJudgeParticipants: (categoryId) => request(`/api/judge/participants?categoryId=${categoryId}`),
  getJudgeScoring: (participantId) => request(`/api/judge/scoring?participantId=${participantId}`),
  saveScores: (data) => request('/api/judge/scores', { method: 'POST', body: data }),

  // Admin
  getAdminDashboard: () => request('/api/admin/dashboard'),
  getAdminResults: (categoryCode = '') => request(`/api/admin/results${categoryCode ? `?category=${categoryCode}` : ''}`),
  getAdminJudges: () => request('/api/admin/judges'),
  createJudge: (data) => request('/api/admin/judges', { method: 'POST', body: data }),
  updateJudge: (id, data) => request(`/api/admin/judges/${id}`, { method: 'PUT', body: data }),
  deleteJudge: (id) => request(`/api/admin/judges/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/api/admin/categories'),
  resetScores: (data) => request('/api/admin/reset-scores', { method: 'POST', body: data }),
};
