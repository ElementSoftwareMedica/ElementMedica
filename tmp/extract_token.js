const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node extract_token.js <login.json>'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(path, 'utf8'));
const t = j?.tokens?.access_token || j?.accessToken || j?.access_token || j?.token || '';
process.stdout.write(String(t || ''));