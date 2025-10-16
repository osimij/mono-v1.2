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
    getById: (id: number, options?: { limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.limit && Number.isFinite(options.limit)) {
        params.set("limit", String(Math.max(1, Math.floor(options.limit))));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      return authenticatedFetch(`/api/datasets/${id}${suffix}`);
    },
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
        let message = `Upload failed (${response.status})`;
        try {
          const err = await response.json();
          if (err?.error) message = err.error;
          if (err?.details && Array.isArray(err.details)) {
            message = `${message}: ${err.details.join(', ')}`;
          }
        } catch {}
        throw new Error(message);
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
  },

  // Dashboard configuration endpoints
  dashboards: {
    list: () => authenticatedFetch("/api/dashboards"),
    getById: (id: number) => authenticatedFetch(`/api/dashboards/${id}`),
    saveConfig: async (config: any) => {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'Authorization': `Bearer ${sessionId}` })
        },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    deleteConfig: (id: number) => apiRequest('DELETE', `/api/dashboards/${id}`)
  },

  // Analysis configuration endpoints
  analysis: {
    getConfig: async (datasetId: number) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        return { datasetId, userId: 'anonymous', charts: [], insights: [] };
      }
      return authenticatedFetch(`/api/analysis/${datasetId}`);
    },
    saveConfig: async (config: any) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        return;
      }
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'Authorization': `Bearer ${sessionId}` })
        },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  }
};
