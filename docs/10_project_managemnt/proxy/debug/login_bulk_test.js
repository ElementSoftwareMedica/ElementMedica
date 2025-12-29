(async () => {
  try {
    // 1) Login via proxy v1 per ottenere access token
    const loginRes = await fetch('http://localhost:4003/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@example.com', password: 'Admin123!' })
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    console.log('LOGIN_STATUS', loginRes.status);
    console.log('LOGIN_KEYS', Object.keys(loginJson));
    const at = loginJson?.tokens?.access_token;
    if (!at) {
      console.log('LOGIN_BODY_PREVIEW', JSON.stringify(loginJson).slice(0, 800));
      process.exit(2);
    }
    console.log('ACCESS_TOKEN_LEN', at.length);

    // 2) POST /courses/bulk-import con Authorization: Bearer e body vuoto
    const bulkRes = await fetch('http://localhost:4003/courses/bulk-import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${at}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    const bulkText = await bulkRes.text();
    console.log('BULK_STATUS', bulkRes.status);
    console.log('BULK_BODY_PREVIEW', bulkText.slice(0, 800));
  } catch (err) {
    console.error('SCRIPT_ERROR', err?.stack || err?.message || String(err));
    process.exit(1);
  }
})();