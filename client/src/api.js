const TOKEN_KEY = "sl_token";
const USER_KEY  = "sl_user";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function getUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } }
export function setUser(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); }
export function clearAuth() { setToken(null); setUser(null); }

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) { clearAuth(); throw new Error("Unauthorized"); }
  if (!res.ok) { const text = await res.text(); throw new Error(text || res.statusText); }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/pdf")) return res.blob();
  return res.json();
}

export const api = {
  // Auth
  signup:   (body)             => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login:    (email, password)  => request("/auth/login",  { method: "POST", body: JSON.stringify({ email, password }) }),
  logout:   ()                 => request("/auth/logout", { method: "POST" }),
  me:       ()                 => request("/auth/me"),

  // Onboarding
  onboardingWorkspace: (body)  => request("/onboarding/workspace", { method: "POST", body: JSON.stringify(body) }),
  onboardingProject:   (body)  => request("/onboarding/project",   { method: "POST", body: JSON.stringify(body) }),
  onboardingComplete:  ()      => request("/onboarding/complete",  { method: "POST" }),

  // Workspace
  workspace:       ()          => request("/workspace"),
  updateWorkspace: (name)      => request("/workspace", { method: "PUT", body: JSON.stringify({ name }) }),
  savePaymentMethod:(body)     => request("/workspace/payment-method", { method: "POST", body: JSON.stringify(body) }),

  // Projects
  projects:      ()            => request("/projects"),
  createProject: (body)        => request("/projects", { method: "POST", body: JSON.stringify(body) }),
  project:       (id)          => request(`/projects/${id}`),
  patchProject:  (id, body)    => request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Contract / SOW
  uploadContract: (id, file) => {
    const fd = new FormData(); fd.append("file", file);
    return request(`/projects/${id}/contract`, { method: "POST", body: fd });
  },
  contract:        (id)        => request(`/projects/${id}/contract`),
  extractContract: (id)        => request(`/projects/${id}/contract/extract`, { method: "POST" }),
  generateBaseline:(id, body)  => request(`/projects/${id}/generate-baseline`, { method: "POST", body: JSON.stringify(body) }),

  // Activity / Documents
  uploadDocs: (id, files) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    return request(`/projects/${id}/documents`, { method: "POST", body: fd });
  },
  documents: (id)              => request(`/projects/${id}/documents`),
  events:    (id)              => request(`/projects/${id}/events`),
  deleteDoc: (id, docId)       => request(`/projects/${id}/documents/${docId}`, { method: "DELETE" }),
  analyze:   (id)              => request(`/projects/${id}/analyze`, { method: "POST" }),

  // Scope Checking & Manual Ask
  checkScope:           (projectId, body) => request(`/projects/${projectId}/check-scope`, { method: "POST", body: JSON.stringify(body) }),
  addManualOpportunity:(projectId, body) => request(`/projects/${projectId}/manual-opportunity`, { method: "POST", body: JSON.stringify(body) }),

  // Opportunities
  opportunities: (projectId, status) => request(`/projects/${projectId}/opportunities${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  opportunity:   (id)                => request(`/opportunities/${id}`),
  patchOpp:      (id, body)          => request(`/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  setStatus:     (id, status, reason)=> request(`/opportunities/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
  generateCo:    (id)                => request(`/opportunities/${id}/change-request`, { method: "POST" }),
  reconcilePayment:(id, body)        => request(`/opportunities/${id}/reconcile`, { method: "POST", body: JSON.stringify(body) }),

  // Change Requests
  changeRequests: (projectId)  => request(`/projects/${projectId}/change-requests`),
  patchCo:        (id, body)   => request(`/change-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  coPdfUrl:       (id)         => `/change-requests/${id}/export`,

  // Invoicing
  invoices:         (projectId) => request(`/projects/${projectId}/invoices`),
  addInvoice:       (projectId, body) => request(`/projects/${projectId}/invoices`, { method: "POST", body: JSON.stringify(body) }),
  invoicingSummary: (projectId) => request(`/projects/${projectId}/invoicing/summary`),

  // Dashboard
  dashboard:         ()        => request("/dashboard/summary"),
  dashboardProjects: ()        => request("/dashboard/projects"),

  // AI Assistant
  ask: (projectId, question)   => request(`/projects/${projectId}/assistant/query`, { method: "POST", body: JSON.stringify({ question }) }),

  // Async Jobs
  job: (id)                    => request(`/jobs/${id}`),
};
