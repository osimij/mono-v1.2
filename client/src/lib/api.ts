import { apiRequest } from "./queryClient";

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const sessionId = localStorage.getItem('sessionId');
  const headers = {
    ...options.headers,
    ...(sessionId && { 'Authorization': `Bearer ${sessionId}` })
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Dataset endpoints
  datasets: {
    getAll: () => authenticatedFetch("/api/datasets"),
    getById: (id: number) => authenticatedFetch(`/api/datasets/${id}`),
    upload: async (file: File) => {
      const sessionId = localStorage.getItem('sessionId');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          ...(sessionId && { 'Authorization': `Bearer ${sessionId}` })
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    analyze: (id: number) => apiRequest('POST', `/api/datasets/${id}/analyze`),
    delete: (id: number) => apiRequest('DELETE', `/api/datasets/${id}`)
  },

  // Model endpoints
  models: {
    getAll: () => authenticatedFetch("/api/models"),
    create: async (data: any) => {
      const response = await apiRequest('POST', '/api/models', data);
      return response.json();
    },
    predict: async (modelId: number, inputs: any, mode: 'single' | 'batch') => {
      return apiRequest('POST', `/api/models/${modelId}/predict`, { inputs, mode });
    },
    delete: (id: number) => apiRequest('DELETE', `/api/models/${id}`)
  },

  // Chat endpoints
  chat: {
    getSessions: () => authenticatedFetch("/api/chat-sessions"),
    createSession: async (title: string) => {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'Authorization': `Bearer ${sessionId}` })
        },
        body: JSON.stringify({ title })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    },
    sendMessage: (sessionId: number, message: string, datasetId?: number) => 
      apiRequest('POST', `/api/chat-sessions/${sessionId}/messages`, { message, datasetId })
  }
};
