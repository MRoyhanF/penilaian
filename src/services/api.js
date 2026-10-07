// Centralized API client for Sistem Penjurian

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'same-origin',
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
  // Auth
  login: (username, password) => request('/api/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getMe: () => request('/api/me'),

  // Judge
  getJudgeCategories: () => request('/api/judge/categories'),
  getJudgeParticipants: (categoryId) => request(`/api/judge/participants/${categoryId}`),
  getJudgeScoring: (participantId) => request(`/api/judge/scoring/${participantId}`),
  saveScores: (data) => request('/api/judge/scores', { method: 'POST', body: data }),

  // Admin
  getAdminDashboard: () => request('/api/admin/dashboard'),
  getAdminResults: (categoryCode = '') => request(`/api/admin/results${categoryCode ? `?category=${categoryCode}` : ''}`),
  getAdminJudges: () => request('/api/admin/judges'),
  resetScores: (data) => request('/api/admin/reset-scores', { method: 'POST', body: data }),
};
