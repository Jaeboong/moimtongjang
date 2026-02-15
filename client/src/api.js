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
  changePassword: (payload) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  listUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateMonthlyFee: (userId, monthlyFee) =>
    request(`/users/${userId}/monthly-fee`, {
      method: "PATCH",
      body: JSON.stringify({ monthlyFee }),
    }),

  getSummary: () => request("/ledger/summary?months=6"),
  getTransactions: () => request("/ledger/transactions?limit=200"),
  getBalance: () => request("/ledger/balance"),

  requestDeposit: (payload) => request("/ledger/deposits/request", { method: "POST", body: JSON.stringify(payload) }),
  adminDeposit: (payload) => request("/ledger/deposits/admin", { method: "POST", body: JSON.stringify(payload) }),
  forcePaidDeposit: (payload) =>
    request("/ledger/deposits/force-paid", { method: "POST", body: JSON.stringify(payload) }),
  forceUnpaidDeposit: (payload) =>
    request("/ledger/deposits/force-unpaid", { method: "POST", body: JSON.stringify(payload) }),
  forceZeroPaidDeposit: (payload) =>
    request("/ledger/deposits/force-zero-paid", { method: "POST", body: JSON.stringify(payload) }),
  decideDeposit: (id, action) =>
    request(`/ledger/deposits/${id}/decision`, { method: "PATCH", body: JSON.stringify({ action }) }),
  updateLedgerEntry: (id, payload) =>
    request(`/ledger/entries/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteLedgerEntry: (id) => request(`/ledger/entries/${id}`, { method: "DELETE" }),

  createWithdrawal: (payload) => request("/ledger/withdrawals", { method: "POST", body: JSON.stringify(payload) }),
  createAdjustment: (payload) => request("/ledger/adjustments", { method: "POST", body: JSON.stringify(payload) }),
};
