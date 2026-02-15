const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  listUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: JSON.stringify(payload) }),
  getSummary: () => request("/ledger/summary?months=6"),
  getTransactions: () => request("/ledger/transactions?limit=200"),
  getBalance: () => request("/ledger/balance"),
  requestDeposit: (payload) => request("/ledger/deposits/request", { method: "POST", body: JSON.stringify(payload) }),
  decideDeposit: (id, action) =>
    request(`/ledger/deposits/${id}/decision`, { method: "PATCH", body: JSON.stringify({ action }) }),
  createWithdrawal: (payload) => request("/ledger/withdrawals", { method: "POST", body: JSON.stringify(payload) }),
  createAdjustment: (payload) => request("/ledger/adjustments", { method: "POST", body: JSON.stringify(payload) }),
};
