const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function eliminateWhiteSpace() {
  console.log('🎨 Eliminating excessive white space...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  let content = String(page.content);
  
  // Add decorative pattern to hero section
  content = content.replace(
    /<div class="container mx-auto px-4 py-12">/g,
    '<div class="relative">\n          <div class="absolute inset-0 bg-gradient-to-br from-teal-50 via-blue-50/30 to-white opacity-70"></div>\n          <div class="container mx-auto px-4 py-16 relative z-10">'
  );
  
  // Close hero wrapper properly
  const heroEndIndex = content.indexOf('</div>\n          </div>');
  if (heroEndIndex !== -1) {
    // Find the last </div> of hero section (after the grid)
    const gridEnd = content.indexOf('</div>\n\n            <div class="bg-gradient-to-r');
    if (gridEnd !== -1) {
      content = content.substring(0, gridEnd) + '</div>\n          </div>\n        </div>\n\n            <div class="bg-gradient-to-r' + content.substring(gridEnd + 11);
    }
  }
  
  // Add accent shapes to specialist section
  content = content.replace(
    /<section class="py-16 bg-gray-50">/g,
    '<section class="py-20 bg-gradient-to-br from-gray-50 via-teal-50/20 to-blue-50/20 relative overflow-hidden">\n        <div class="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"></div>\n        <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>\n        <div class="relative z-10">'
  );
  
  // Close specialist section wrapper
  content = content.replace(
    /<\/div>\s*<\/section>\s*<!-- Come Funziona/g,
    '</div>\n        </div>\n      </section>\n      \n      <!-- Come Funziona'
  );
  
  // Add pattern to convenzioni section
  content = content.replace(
    /<section class="py-16 bg-gradient-to-br from-teal-50 to-blue-50">/g,
    '<section class="py-20 bg-gradient-to-br from-teal-100/40 via-blue-50/30 to-teal-50/40 relative">\n        <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 2px 2px, #0d9488 1px, transparent 0); background-size: 40px 40px;"></div>\n        <div class="relative z-10">'
  );
  
  // Close convenzioni wrapper
  content = content.replace(
    /<\/section>\s*<!-- FAQ Section -->/g,
    '</div>\n      </section>\n      \n      <!-- FAQ Section -->'
  );
  
  // Add subtle pattern to FAQ section
  content = content.replace(
    /<section class="py-16 bg-gradient-to-br from-blue-50\/40 via-white to-teal-50\/40">/g,
    '<section class="py-20 bg-gradient-to-br from-blue-100/30 via-white to-teal-100/30 relative">\n        <div class="absolute inset-0 opacity-5" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(13, 148, 136, 0.1) 35px, rgba(13, 148, 136, 0.1) 70px);"></div>\n        <div class="relative z-10">'
  );
  
  // Close FAQ wrapper
  content = content.replace(
    /<\/section>\s*<!-- Final CTA -->/g,
    '</div>\n      </section>\n      \n      <!-- Final CTA -->'
  );
  
  // Add cards effect to specialty cards grid
  content = content.replace(
    /<div class="grid md:grid-cols-3 gap-8">/g,
    '<div class="grid md:grid-cols-3 gap-8 relative">'
  );
  
  // Add connecting lines between process steps
  content = content.replace(
    /<div class="grid md:grid-cols-4 gap-6">/g,
    '<div class="relative">\n          <div class="hidden md:block absolute top-10 left-0 right-0 h-1 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200 rounded-full" style="width: 85%; margin: 0 auto;"></div>\n          <div class="grid md:grid-cols-4 gap-6 relative z-10">'
  );
  
  // Close process steps wrapper
  content = content.replace(
    /<div class="text-center mt-12">\s*<a href="\/prenota" class="inline-block bg-gradient-to-r from-teal-600 to-teal-700/g,
    '</div>\n          </div>\n          \n          <div class="text-center mt-16">\n            <a href="/prenota" class="inline-block bg-gradient-to-r from-teal-600 to-teal-700'
  );
  
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });
  
  console.log('✅ White space eliminated with style!');
  console.log('\n🎨 Visual enhancements added:');
  console.log('   • Hero: Gradient overlay background');
  console.log('   • Specialists: Floating blur circles (teal/blue)');
  console.log('   • Come Prenotare: Connecting line between steps');
  console.log('   • Convenzioni: Dotted grid pattern overlay');
  console.log('   • FAQ: Diagonal stripe pattern');
  console.log('   • All sections: Increased padding (py-20)');
  console.log('   • Z-index layering for depth');
  
  await prisma.$disconnect();
}

eliminateWhiteSpace().catch(console.error);
