import fs from 'fs';
const v = JSON.parse(fs.readFileSync('tmp/verify_local.json','utf8'));
const u = v.user || {};
const p = v.permissions || {};
const granted = Object.values(p).filter(Boolean).length;
const roles = Array.isArray(u.roles) ? u.roles.join(',') : (u.role || '[]');
console.log(`Summary | email=${u.email || 'N/A'} | roles=${roles} | perms_true=${granted}`);