// Node script diagnostico: login via proxy e chiamata bulk-import
// Conforme alle regole: file temporaneo in docs/10_project_managemnt/debug/

const baseUrl = 'http://localhost:4003';

async function main() {
  const credentials = { identifier: 'admin@example.com', password: 'Admin123!' };

  // 1) Health checks
  try {
    const [api, proxy] = await Promise.all([
      fetch('http://localhost:4001/health').then(r => r.status).catch(() => -1),
      fetch('http://localhost:4003/health').then(r => r.status).catch(() => -1)
    ]);
    console.log('HEALTH', { api, proxy });
  } catch (e) {
    console.log('HEALTH_ERR', e.message);
  }

  // 2) Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const loginBody = await loginRes.text();
  let loginJson = null;
  try { loginJson = JSON.parse(loginBody); } catch (e) {}
  console.log('LOGIN_STATUS', loginRes.status);
  if (loginJson) {
    console.log('LOGIN_KEYS', Object.keys(loginJson));
  } else {
    console.log('LOGIN_RAW', loginBody.slice(0, 400));
  }

  const tokens = (loginJson && (loginJson.tokens || loginJson)) || {};
  const accessToken = tokens.access_token || tokens.accessToken || loginJson?.access_token || loginJson?.accessToken || '';
  const user = loginJson?.user || loginJson?.person || null;
  const tenantIdFromLogin = user?.tenantId || '';
  console.log('ACCESS_TOKEN_PRESENT', Boolean(accessToken));
  console.log('TENANT_ID_LOGIN', tenantIdFromLogin || '(none)');

  let tenantId = tenantIdFromLogin;
  // 3) Fallback: /api/v1/tenants/current per ottenere tenantId se mancante
  if (!tenantId && accessToken) {
    try {
      const tRes = await fetch(`${baseUrl}/api/v1/tenants/current`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const tTxt = await tRes.text();
      let tJson = null;
      try { tJson = JSON.parse(tTxt); } catch {}
      console.log('TENANTS_CURRENT_STATUS', tRes.status);
      if (tJson && (tJson.id || tJson.tenantId)) {
        tenantId = tJson.id || tJson.tenantId;
      } else if (tJson?.data?.id || tJson?.data?.tenantId) {
        tenantId = tJson.data.id || tJson.data.tenantId;
      } else {
        console.log('TENANTS_CURRENT_RAW', tTxt.slice(0, 400));
      }
    } catch (e) {
      console.log('TENANTS_CURRENT_ERR', e.message);
    }
  }
  console.log('TENANT_ID_FINAL', tenantId || '(none)');

  if (!accessToken) {
    console.error('FATAL: accessToken non presente, impossibile proseguire');
    process.exit(2);
  }

  // 4) Bulk import payload minimo
  const payload = {
    courses: [
      {
        code: `AI-QA-${Date.now()}`,
        title: 'QA Import Corso',
        riskLevel: 'BASSO',
        courseType: 'PRIMO_CORSO'
      }
    ],
    overwriteIds: []
  };

  // 5) Chiamata bulk-import (Authorization + X-Tenant-ID se disponibile)
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const bulkRes = await fetch(`${baseUrl}/courses/bulk-import`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const bulkText = await bulkRes.text();
  console.log('BULK_STATUS', bulkRes.status, bulkRes.statusText);
  console.log('BULK_BODY', bulkText.slice(0, 2000));

  if (!bulkRes.ok) process.exit(1);
}

main().catch((err) => { console.error('SCRIPT_ERROR', err); process.exit(1); });