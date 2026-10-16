/**
 * DATABASE SEED SCRIPT (DECORATOR PATTERN)
 */

const { initDatabase, query, isDbConnected, closePool } = require('./src/config/db');

async function seed() {
  console.log('[Seed] Đang nạp dữ liệu mẫu ban đầu cho OmniStream...');
  await initDatabase();

  const sampleDocs = [
    {
      id: 'DOC_INIT_001',
      tenant_id: 'tenant_finance',
      title: 'Q3 Financial Audit & Balance Sheet',
      payload: 'ENC_GCM:7f8a9b0c1d2e:3a4b5c6d7e8f:0192837465abcdeffedcba5647382910',
      is_encrypted: true,
      is_compressed: true,
      original_size_bytes: 14200,
      stored_size_bytes: 2840,
      metadata: { department: 'Treasury', compliance: 'SOX-404' }
    },
    {
      id: 'DOC_INIT_002',
      tenant_id: 'tenant_healthcare',
      title: 'Patient Electronic Health Record (EHR)',
      payload: 'ENC_GCM:9a8b7c6d5e4f:1a2b3c4d5e6f:aabbccddeeff00112233445566778899',
      is_encrypted: true,
      is_compressed: true,
      original_size_bytes: 8500,
      stored_size_bytes: 1720,
      metadata: { department: 'Cardiology', compliance: 'HIPAA' }
    }
  ];

  if (isDbConnected()) {
    for (const doc of sampleDocs) {
      await query(
        `INSERT INTO documents (id, tenant_id, title, payload, is_encrypted, is_compressed, original_size_bytes, stored_size_bytes, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [doc.id, doc.tenant_id, doc.title, doc.payload, doc.is_encrypted, doc.is_compressed, doc.original_size_bytes, doc.stored_size_bytes, JSON.stringify(doc.metadata)]
      );
    }
    console.log(`[Seed] Đã nạp ${sampleDocs.length} tài liệu mẫu vào PostgreSQL.`);
  } else {
    console.log(`[Seed] PostgreSQL chưa kết nối, ứng dụng sẽ chạy với in-memory store.`);
  }

  await closePool();
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
