/**
 * Add varied test CMS page views for testing the chart
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find a CMS page
  const page = await p.cMSPage.findFirst({
    where: { isPublished: true },
    select: { id: true, slug: true, tenantId: true }
  });

  if (!page) {
    console.log('No published page found');
    return;
  }

  console.log('Adding test views to page:', page.slug);

  // Create varied views for the last 7 days
  const views = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Create random number of views for each day (1-15)
    const numViews = Math.floor(Math.random() * 15) + 1;
    for (let j = 0; j < numViews; j++) {
      views.push({
        pageId: page.id,
        sessionId: 'test-session-' + Date.now() + '-' + i + '-' + j,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test',
        device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
        browser: ['Chrome', 'Firefox', 'Safari'][Math.floor(Math.random() * 3)],
        createdAt: date
      });
    }
  }

  const result = await p.cMSPageView.createMany({
    data: views
  });

  console.log('Created', result.count, 'test views');

  // Verify distribution by manually grouping
  const allViews = await p.cMSPageView.findMany({
    where: { pageId: page.id },
    select: { createdAt: true }
  });

  const grouped = {};
  allViews.forEach(v => {
    const date = v.createdAt.toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });

  console.log('\nViews distribution:');
  Object.entries(grouped).sort().forEach(([date, count]) => {
    console.log('  ' + date + ': ' + count + ' views');
  });
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
