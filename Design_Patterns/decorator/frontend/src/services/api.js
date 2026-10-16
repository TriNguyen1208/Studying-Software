/**
 * API CLIENT SERVICE (PORT 5003)
 */

const API_BASE = 'http://localhost:5003';

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
  async processDocument(payload) {
    const res = await fetch(`${API_BASE}/api/pipeline/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async runBenchmark(iterations = 30, sampleTextSizeKb = 5) {
    const res = await fetch(`${API_BASE}/api/pipeline/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iterations, sampleTextSizeKb })
    });
    return handleResponse(res);
  },

  async getAuditLogs(limit = 25) {
    const res = await fetch(`${API_BASE}/api/pipeline/audit-logs?limit=${limit}`);
    return handleResponse(res);
  },

  async clearCache() {
    const res = await fetch(`${API_BASE}/api/pipeline/cache/clear`, {
      method: 'POST'
    });
    return handleResponse(res);
  }
};
