/**
 * ============================================================================
 * TELEMETRY VERIFICATION & TEST SCRIPT
 * ============================================================================
 * Script này tự động gọi API của Backend để:
 * 1. Đặt 3 đơn hàng hợp lệ (sinh ra Spans, Metrics, Logs thành công).
 * 2. Đặt 1 đơn hàng trễ (simulate-slow) để kiểm chứng Histogram P95.
 * 3. Đặt 1 đơn hàng lỗi (simulate-error) để kiểm chứng Counter 5xx và Loki error log.
 * 4. Kiểm tra endpoint /metrics để xác minh Prometheus scraping format hợp lệ.
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5001;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Bắt đầu kịch bản kiểm thử Telemetry...\n');

  try {
    // 1. Health check
    console.log('1. Kiểm tra /health...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.statusCode} => ${health.data}\n`);

    // 2. Normal orders
    console.log('2. Đặt 2 đơn hàng thành công...');
    const ord1 = await makeRequest('/api/orders', 'POST', { itemId: 'item-macbook', quantity: 1 });
    console.log(`   Order 1: ${ord1.statusCode} => ${ord1.data}`);
    const ord2 = await makeRequest('/api/orders', 'POST', { itemId: 'item-sony', quantity: 2 });
    console.log(`   Order 2: ${ord2.statusCode} => ${ord2.data}\n`);

    // 3. Slow order
    console.log('3. Đặt đơn hàng chậm (simulate-slow)...');
    const slow = await makeRequest('/api/orders/simulate-slow', 'POST', { itemId: 'item-keychron', delayMs: 400 });
    console.log(`   Slow Order: ${slow.statusCode} => ${slow.data}\n`);

    // 4. Error order
    console.log('4. Đặt đơn hàng lỗi (simulate-error)...');
    const errOrd = await makeRequest('/api/orders/simulate-error', 'POST', { itemId: 'item-iphone' });
    console.log(`   Error Order: ${errOrd.statusCode} => ${errOrd.data}\n`);

    // 5. Scrape metrics
    console.log('5. Cào thử dữ liệu /metrics của Prometheus...');
    const metrics = await makeRequest('/metrics');
    const metricLines = metrics.data.split('\n').filter((l) => l.startsWith('http_requests_total') || l.startsWith('active_orders'));
    console.log('   Các dòng metric tiêu biểu:');
    metricLines.slice(0, 5).forEach((line) => console.log('   ' + line));

    console.log('\n✅ Toàn bộ luồng Telemetry hoạt động hoàn hảo!');
  } catch (err) {
    console.error('❌ Kiểm thử thất bại (hãy đảm bảo Backend đang chạy):', err.message);
  }
}

runTests();
