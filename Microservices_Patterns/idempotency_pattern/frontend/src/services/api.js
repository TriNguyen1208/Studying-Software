const API_BASE = 'http://localhost:5002/api';

export async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error('Không thể tải thông tin tài khoản');
  return res.json();
}

export async function fetchTransactions() {
  const res = await fetch(`${API_BASE}/transactions`);
  if (!res.ok) throw new Error('Không thể tải lịch sử giao dịch');
  return res.json();
}

export async function fetchIdempotencyRecords() {
  const res = await fetch(`${API_BASE}/idempotency-keys`);
  if (!res.ok) throw new Error('Không thể tải bản ghi Idempotency');
  return res.json();
}

export async function executeTransfer({
  fromAccount = 'ACC-1001',
  toAccount = 'ACC-2002',
  amount,
  reason,
  idempotencyKey,
  bypassIdempotency = false,
  delayMs = 600,
}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (bypassIdempotency) {
    headers['X-Bypass-Idempotency'] = 'true';
  } else if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const startTime = performance.now();
  const res = await fetch(`${API_BASE}/transfer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fromAccount,
      toAccount,
      amount,
      reason,
      delayMs,
    }),
  });

  const durationMs = Math.round(performance.now() - startTime);
  const cacheHeader = res.headers.get('X-Cache-Lookup') || 'N/A';
  const replayHeader = res.headers.get('X-Idempotent-Replay') || 'false';

  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = { message: await res.text() };
  }

  return {
    status: res.status,
    ok: res.ok,
    cacheHeader,
    replayHeader,
    durationMs,
    data,
    timestamp: new Date().toLocaleTimeString(),
  };
}

export async function resetDatabase() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Không thể khôi phục dữ liệu ban đầu');
  return res.json();
}
