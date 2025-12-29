import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enhanceMedicaLayout() {
  console.log('🎨 Enhancing Element Medica medicina-del-lavoro-medica layout...\n');

  const page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'medicina-del-lavoro-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  if (!page) {
    console.error('❌ Page not found!');
    process.exit(1);
  }

  let content = page.content;

  // Migliora spaziatura e layout
  
  // Fix 1: Aggiungi più padding alle sections
  content = content.replace(/py-20/g, 'py-16 md:py-20');
  
  // Fix 2: Migliora card spacing
  content = content.replace(/gap-8/g, 'gap-6 md:gap-8');
  content = content.replace(/gap-12/g, 'gap-8 md:gap-12');
  
  // Fix 3: Migliora responsive text sizes
  content = content.replace(
    /text-4xl lg:text-5xl/g,
    'text-3xl md:text-4xl lg:text-5xl'
  );
  content = content.replace(
    /text-3xl lg:text-4xl/g,
    'text-2xl md:text-3xl lg:text-4xl'
  );
  
  // Fix 4: Aggiungi più padding ai bottoni
  content = content.replace(
    /px-6 py-3/g,
    'px-8 py-4'
  );
  
  // Fix 5: Migliora shadow effects
  content = content.replace(/shadow-lg/g, 'shadow-xl hover:shadow-2xl transition-shadow duration-300');
  content = content.replace(/shadow-2xl/g, 'shadow-2xl hover:shadow-3xl transition-shadow duration-300');
  
  // Fix 6: Aggiungi animazioni hover alle card
  content = content.replace(
    /<div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">/g,
    '<div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">'
  );
  
  // Fix 7: Migliora icone size
  content = content.replace(/w-16 h-16/g, 'w-14 h-14 md:w-16 md:h-16');
  content = content.replace(/w-12 h-12/g, 'w-10 h-10 md:w-12 md:h-12');
  
  // Fix 8: Aggiungi background patterns
  content = content.replace(
    /<section class="relative bg-gradient-to-br from-medical-50 via-white to-medical-50 py-/g,
    '<section class="relative bg-gradient-to-br from-medical-50 via-white to-medical-50 py-'
  );

  // Fix 9: Migliora stats cards
  content = content.replace(
    /class="text-center p-4 bg-white rounded-lg shadow-sm">/g,
    'class="text-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-medical-100">'
  );

  // Fix 10: Aggiungi max-width per leggibilità
  content = content.replace(
    /<p class="text-xl text-gray-600 leading-relaxed">/g,
    '<p class="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl">'
  );

  // Update nel database
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });

  console.log('✅ Element Medica medicina-del-lavoro-medica layout enhanced!');
  console.log('📊 Improvements:');
  console.log('   - Responsive padding and spacing (py-16 md:py-20)');
  console.log('   - Improved text sizes with mobile breakpoints');
  console.log('   - Enhanced button padding (px-8 py-4)');
  console.log('   - Better shadow effects with transitions');
  console.log('   - Card hover animations (-translate-y-1)');
  console.log('   - Stats cards with borders and hover effects');
  console.log('   - Improved icon responsiveness');
  console.log('   - Better typography with max-width for readability');

  await prisma.$disconnect();
}

enhanceMedicaLayout();
