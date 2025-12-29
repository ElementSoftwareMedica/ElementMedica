import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';
import http from 'http';

async function main() {
  try {
    const admin = await prisma.person.findFirst({ where: { email: 'admin@example.com' } });
    if (!admin) { console.log('ADMIN_NOT_FOUND'); return; }
    const tenantId = admin.tenantId;
    const { accessToken } = await JWTService.generateTokenPair(admin, { userAgent: 'safe-script', ip: '127.0.0.1' }, { rememberMe: false });

    const persons = [
      {
        firstName: 'Demo',
        lastName: 'Import',
        email: `demo.import.${Date.now()}@example.com`,
        roleType: 'EMPLOYEE',
        tenantId: tenantId
      }
    ];

    const payload = JSON.stringify({ persons, overwriteIds: [] });

    const opts = {
      hostname: 'localhost',
      port: 4001,
      path: '/api/v1/persons/import?mode=json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bearer ' + accessToken,
        'X-Tenant-ID': tenantId
      }
    };

    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('STATUS', res.statusCode);
        try {
          const j = JSON.parse(data);
          console.log('IMPORTED', j.imported || 0, 'UPDATED', j.updated || 0, 'SKIPPED', j.skipped || 0, 'ERRORS', (j.errors || []).length);
          if (j.error) { console.log('ERROR_MSG', j.error); }
        } catch {
          console.log('BODY', data);
        }
      });
    });
    req.on('error', e => console.log('ERROR', e.message));
    req.write(payload);
    req.end();
  } catch (e) {
    console.log('SCRIPT_ERROR', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();