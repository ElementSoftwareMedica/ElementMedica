import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enhanceHomepageMedica() {
  console.log('🎨 Enhancing Element Medica homepage-medica layout...\n');

  const page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'homepage-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  if (!page) {
    console.error('❌ Page not found!');
    process.exit(1);
  }

  let content = page.content;

  // Applica gli stessi miglioramenti della pagina medicina del lavoro
  
  // Responsive padding
  content = content.replace(/py-20/g, 'py-16 md:py-20');
  content = content.replace(/py-16/g, 'py-12 md:py-16');
  
  // Responsive spacing
  content = content.replace(/gap-8/g, 'gap-6 md:gap-8');
  content = content.replace(/gap-12/g, 'gap-8 md:gap-12');
  
  // Responsive text
  content = content.replace(
    /text-4xl lg:text-5xl/g,
    'text-3xl md:text-4xl lg:text-5xl'
  );
  content = content.replace(
    /text-3xl lg:text-4xl/g,
    'text-2xl md:text-3xl lg:text-4xl'
  );
  content = content.replace(
    /text-2xl/g,
    'text-xl md:text-2xl'
  );
  
  // Button padding
  content = content.replace(
    /px-6 py-3/g,
    'px-8 py-4'
  );
  
  // Shadow effects
  content = content.replace(/shadow-lg/g, 'shadow-xl hover:shadow-2xl transition-shadow duration-300');
  
  // Card hover effects
  content = content.replace(
    /<div class="bg-white p-6 rounded-2xl shadow-lg transition-shadow hover:shadow-2xl">/g,
    '<div class="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">'
  );

  content = content.replace(
    /<div class="bg-white p-8 rounded-2xl shadow-lg">/g,
    '<div class="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">'
  );
  
  // Icon sizes
  content = content.replace(/w-16 h-16/g, 'w-14 h-14 md:w-16 md:h-16');
  content = content.replace(/w-12 h-12/g, 'w-10 h-10 md:w-12 md:h-12');

  // Typography max-width
  content = content.replace(
    /<p class="text-xl text-gray-600">/g,
    '<p class="text-lg md:text-xl text-gray-600 max-w-2xl">'
  );

  // Badge improvements
  content = content.replace(
    /class="text-center p-6 bg-white/g,
    'class="text-center p-4 md:p-6 bg-white'
  );

  // Update nel database
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });

  console.log('✅ Element Medica homepage-medica layout enhanced!');
  console.log('📊 Improvements:');
  console.log('   - Responsive padding (py-12 md:py-16, py-16 md:py-20)');
  console.log('   - Mobile-first text sizes with md: breakpoints');
  console.log('   - Enhanced button padding (px-8 py-4)');
  console.log('   - Card hover animations with translate and borders');
  console.log('   - Better shadow transitions');
  console.log('   - Responsive icons (w-10 md:w-12, w-14 md:w-16)');
  console.log('   - Typography improvements with max-width');

  await prisma.$disconnect();
}

enhanceHomepageMedica();
