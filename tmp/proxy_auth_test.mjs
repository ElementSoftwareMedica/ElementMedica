import http from 'http';
import https from 'https';

function httpRequest(method, urlStr, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + (url.search || ''),
      headers,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const headersObj = Object.fromEntries(Object.entries(res.headers));
        resolve({ statusCode: res.statusCode || 0, body: data, headers: headersObj });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function pickToken(j) {
  return (
    j?.tokens?.access_token || j?.accessToken || j?.access_token || j?.token || ''
  );
}

(async () => {
  const BASE = 'http://localhost:4003';
  try {
    // Login
    const loginPayload = { identifier: 'admin@example.com', password: 'Admin123!' };
    const loginRes = await httpRequest('POST', `${BASE}/api/v1/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload),
    });
    console.log('LOGIN HTTP', loginRes.statusCode);
    if (loginRes.statusCode !== 200) {
      console.error('Login failed body:', loginRes.body);
      process.exit(1);
    }
    const loginJson = JSON.parse(loginRes.body || '{}');
    const token = pickToken(loginJson);
    if (!token) {
      console.error('No access token in login response');
      process.exit(2);
    }

    // Verify
    const verifyRes = await httpRequest('GET', `${BASE}/api/v1/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('VERIFY HTTP', verifyRes.statusCode);

    // Me
    const meRes = await httpRequest('GET', `${BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('ME HTTP', meRes.statusCode);

    // Summary
    const verifyJson = JSON.parse(verifyRes.body || '{}');
    const user = verifyJson.user || {};
    const permissions = verifyJson.permissions || {};
    const grantedCount = Object.values(permissions).filter(Boolean).length;
    const roles = Array.isArray(user.roles) ? user.roles.join(',') : user.role || '[]';
    console.log(`Summary | email=${user.email || 'N/A'} | roles=${roles} | perms_true=${grantedCount}`);
  } catch (err) {
    console.error('Error:', err?.message || err);
    process.exit(3);
  }
})();