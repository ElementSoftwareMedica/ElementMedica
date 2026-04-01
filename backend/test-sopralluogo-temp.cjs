const path = require('path');
// Use the prisma client from the backend
const { PrismaClient } = require(path.join(__dirname, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const site = await prisma.companySite.findFirst({
    where: {
      tenantId: '6a8e68d7-1958-44d8-af50-2121f638db5c',
      deletedAt: null
    },
    select: { id: true, siteName: true }
  });
  console.log('SITE:', JSON.stringify(site));

  if (site) {
    const http = require('http');
    const fs = require('fs');
    const token = fs.readFileSync('/tmp/token.txt', 'utf8').trim();

    const opts = {
      hostname: '127.0.0.1',
      port: 4001,
      path: '/api/v1/sopralluogo/site/' + site.id,
      headers: {
        'Authorization': 'Bearer ' + token,
        'X-Operate-Tenant-Id': '6a8e68d7-1958-44d8-af50-2121f638db5c'
      }
    };

    http.get(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        try {
          const j = JSON.parse(body);
          console.log('SUCCESS:', j.success);
          if (j.data) console.log('DATA:', Array.isArray(j.data) ? j.data.length + ' items' : 'single object');
          if (j.error) console.log('ERROR:', j.error);
        } catch (e) {
          console.log('BODY:', body.slice(0, 300));
        }
        prisma.$disconnect();
      });
    });
  } else {
    console.log('No company site found');
    prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
