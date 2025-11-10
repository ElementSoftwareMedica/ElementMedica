import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';
import http from 'http';

async function main() {
  try {
    const email = 'admin@example.com'; // test identifier (no password used)
    const admin = await prisma.person.findFirst({ where: { email }, include: { personRoles: true } });
    if (!admin) {
      console.log('ADMIN_NOT_FOUND');
      return;
    }
    // Generate token pair without login, using existing JWT secrets
    const { accessToken } = await JWTService.generateTokenPair(admin, { userAgent: 'safe-script', ip: '127.0.0.1' }, { rememberMe: false });

    // Call verify via proxy using Authorization header
    const opts = {
      hostname: 'localhost',
      port: 4003,
      path: '/api/v1/auth/verify',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('VERIFY_STATUS', res.statusCode);
        try {
          const j = JSON.parse(data);
          console.log('VALID', j.valid === true, 'PERMISSIONS', j.permissions ? Object.keys(j.permissions).length : 0);
        } catch {
          console.log('BODY_LEN', data.length);
        }
      });
    });
    req.on('error', e => console.log('ERROR', e.message));
    req.end();
  } catch (e) {
    console.log('SCRIPT_ERROR', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();