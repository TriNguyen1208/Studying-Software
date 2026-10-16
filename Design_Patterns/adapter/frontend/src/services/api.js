/**
 * API CLIENT SERVICE
 * Kết nối tới Backend Server (Port 5002)
 */

const API_BASE = 'http://localhost:5002';

async function handleResponse(res) {
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.message || json.error || `HTTP error ${res.status}`;
    const err = new Error(errorMsg);
    err.data = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  async getGateways() {
    const res = await fetch(`${API_BASE}/api/gateways`);
    return handleResponse(res);
  },

  async getCircuitBreakerStatus() {
    const res = await fetch(`${API_BASE}/api/gateways/circuit-breaker`);
    return handleResponse(res);
  },

  async resetCircuit(gatewayId) {
    const res = await fetch(`${API_BASE}/api/gateways/circuit-breaker/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayId })
    });
    return handleResponse(res);
  },

  async checkout(payload) {
    const res = await fetch(`${API_BASE}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async refund(payload) {
    const res = await fetch(`${API_BASE}/api/payments/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getTransactions(limit = 20) {
    const res = await fetch(`${API_BASE}/api/payments/transactions?limit=${limit}`);
    return handleResponse(res);
  },

  async getAuditLogs(limit = 20) {
    const res = await fetch(`${API_BASE}/api/payments/audit-logs?limit=${limit}`);
    return handleResponse(res);
  }
};
