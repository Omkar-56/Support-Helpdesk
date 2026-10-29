const BASE_URL = '';

export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/api/auth/me', { method: 'GET' }),

  // Tickets
  getTickets: (status) => apiRequest(`/api/tickets${status ? `?status=${status}` : ''}`, { method: 'GET' }),
  getTicket: (id) => apiRequest(`/api/tickets/${id}`, { method: 'GET' }),
  createTicket: (formData) => apiRequest('/api/tickets', { method: 'POST', body: formData }),
  updateStatus: (id, status) => apiRequest(`/api/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Messages
  getMessages: (ticketId) => apiRequest(`/api/tickets/${ticketId}/messages`, { method: 'GET' }),
  sendMessage: (ticketId, payload) => apiRequest(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
};
