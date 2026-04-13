import axios from "axios";

// When running locally with vite, proxy handles /api.
// API_BASE will be /api usually unless overridden.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request (if we had auth fully implemented)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("namo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("namo_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  getMe: () => api.get("/me"),
};

// Cases (REAL DB ENDPOINTS)
export const casesApi = {
  list: () => api.get("/cases"),
  get: (caseId: string) => api.get(`/cases/${caseId}`),
  create: async (data: any) => {
    // data includes: { title, description, targetWallet, maxDepth, riskThreshold, chain }
    const payload = {
      title: data.title || `Investigation: ${data.targetWallet}`,
      description: data.description || `Target Wallet: ${data.targetWallet}. Suspect: ${data.suspectedWallet || 'None'}.`,
      type: "Trace",
      priority: data.riskThreshold > 80 ? "High" : "Medium",
      chain: data.chain,
      target_wallet: data.targetWallet,
      suspectedWallet: data.suspectedWallet,
      maxDepth: data.maxDepth,
      riskThreshold: data.riskThreshold
    };
    return api.post("/cases", payload);
  },
  initializeCanvas: (caseId: string) => api.post(`/cases/${caseId}/initialize`),
  // In a real app the graph data would be generated async by the backend and polled.
  // For the MVP, we skip the mocked complex graph generation and fetch what the backend has
  // or return an empty graph if not implemented yet.
  getGraph: async (caseId: string) => {
    // We just mock the graph return here until graph nodes are saved to DB
    return { data: { graph: { nodes: [], edges: [] }, insights: { suspicious_wallets: [] } } };
  },
  update: (caseId: string, data: any) => api.put(`/cases/${caseId}`, data),
  delete: (caseId: string) => api.delete(`/cases/${caseId}`),
  export: (caseId: string) => api.get(`/cases/${caseId}/export`, { responseType: 'blob' }),
};

// Canvas API (MongoDB)
export const canvasApi = {
  create: (data: { name: string, description: string, chain: string, case_id: string }) => api.post("/canvas/create", data),
  list: () => api.get("/canvas/list"),
  get: (id: string) => api.get(`/canvas/${id}`),
  save: (data: { id: string, nodes: any[], edges: any[], viewport: any }) => api.post("/canvas/save", data),
  delete: (id: string) => api.delete(`/canvas/${id}`),
  syncFromCase: (caseId: string, canvasId: string) => api.post("/api/sync/from-case", { case_id: caseId, canvas_id: canvasId }),
  syncToCase: (caseId: string, canvasId: string) => api.post("/api/sync/to-case", { case_id: caseId, canvas_id: canvasId }),
  getSyncStatus: (caseId: string) => api.get(`/api/sync/status/${caseId}`),
};

// Wallets
export const walletsApi = {
  trace: (address: string, chain: string) => api.post("/wallets/trace", { address, chain }),
  get: (address: string, chain: string) => api.get(`/wallets/${address}?chain=${chain}`),
  transactions: (address: string, chain: string) => api.get(`/wallets/${address}/transactions?chain=${chain}`),
  graph: (address: string, chain: string) => api.get(`/wallets/${address}/graph?chain=${chain}`),
  expand: (address: string, chain: string) => api.post(`/wallets/${address}/expand`, { chain }),
};

// Transactions
export const transactionsApi = {
  get: (txHash: string, chain: string) => api.get(`/transactions/${txHash}?chain=${chain}`),
};

// Evidence (REAL DB ENDPOINTS)
export const evidenceApi = {
  upload: (caseId: string, formData: FormData) => api.post(`/cases/${caseId}/evidence/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  list: (caseId: string) => api.get(`/cases/${caseId}/evidence`),
  anchor: (evidenceId: string) => api.post(`/evidence/${evidenceId}/anchor`),
};

// Analytics
export const analyticsApi = {
  highRiskWallets: () => api.get("/analytics/high-risk-wallets"),
  caseSummary: () => api.get("/analytics/case-summary"),
};

// Wallet Monitoring
export const monitorApi = {
  add: (address: string, chain?: string) => api.post("/monitor", { address, chain }),
  list: () => api.get("/monitor"),
  remove: (monitorId: string) => api.delete(`/monitor/${monitorId}`),
};

// Alerts
export const alertsApi = {
  list: () => api.get("/alerts"),
  markRead: () => api.post("/alerts/read"),
};

// Reports (REAL DB ENDPOINTS)
export const reportsApi = {
  list: () => api.get("/reports"),
  get: (caseId: string) => api.get(`/reports/${caseId}`),
  generatePdf: (caseId: string) => api.get(`/reports/case/${caseId}/pdf`, { responseType: "blob" }),
  generateForensicReport: (caseId: string) => api.get(`/reports/case/${caseId}/generate`, { responseType: "blob" }),
};

// Admin Alert Recipients
export const adminApi = {
  getRecipients: () => api.get("/admin/recipients"),
  addRecipient: (data: { name: string; email: string; telegram_chat_id?: string }) => api.post("/admin/recipients", data),
  updateRecipient: (id: string, data: any) => api.put(`/admin/recipients/${id}`, data),
  deleteRecipient: (id: string) => api.delete(`/admin/recipients/${id}`),
};

// Intelligence Feed
export const intelligenceApi = {
  getNews: () => api.get("/intelligence/news"),
  getNodeIntelligence: (address: string, chain: string) => api.get(`/intelligence/node/${address}?chain=${chain}`),
  analyze: (data: { wallet: string, chain: string, depth?: number }) => api.post("/intelligence/analyze", data),
  copilot: (data: { message: string, case_id?: string, canvas_id?: string }) => api.post("/intelligence/copilot", data),
};

// Investigation Workflow Actions
export const investigationApi = {
  trace: (address: string, chain: string, depth = 2) => api.post("/investigation/trace", { address, chain, depth }),
  expand: (address: string, chain: string, limit = 15) => api.post("/investigation/expand", { address, chain, limit }),
};

// Solana Forensics API (QuickNode Pipeline)
export const solanaApi = {
  walletProfile: (address: string) => api.get(`/v1/solana/wallet/${address}/profile`),
  transactionAnalysis: (hash: string) => api.get(`/v1/solana/transaction/${hash}/analysis`),
  graph: (address: string, limit = 50) => api.get(`/v1/solana/graph/${address}?limit=${limit}`),
  risk: (address: string) => api.get(`/v1/solana/risk/${address}`),
};

export default api;
