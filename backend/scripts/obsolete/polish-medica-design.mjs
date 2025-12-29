import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function polishMedicaDesign() {
  console.log('✨ Polishing Element Medica design for elegance and trust...\n');

  // Update medicina-del-lavoro-medica
  const medicaPage = await prisma.cMSPage.findFirst({
    where: {
      slug: 'medicina-del-lavoro-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  // Update homepage-medica
  const homepagePage = await prisma.cMSPage.findFirst({
    where: {
      slug: 'homepage-medica',
      tenantId: 'tenant-id-medica'
    }
  });

  if (!medicaPage || !homepagePage) {
    console.error('❌ Pages not found!');
    process.exit(1);
  }

  let medicaContent = medicaPage.content;
  let homepageContent = homepagePage.content;

  // ============================================================================
  // DESIGN PRINCIPLES:
  // - Colori più soft e professionali (teal/blue invece di cyan)
  // - Più white space e breathing room
  // - Bordi e ombre più sottili
  // - Typography più raffinata
  // - Call-to-actions più evidenti ma eleganti
  // ============================================================================

  // Fix 1: Hero section - background più elegante e soft
  const heroFixes = [
    {
      old: /from-medical-50 via-white to-medical-50/g,
      new: 'from-teal-50/30 via-white to-blue-50/30'
    },
    {
      old: /bg-medical-100 text-medical-700/g,
      new: 'bg-teal-50 text-teal-700 border border-teal-200'
    },
    {
      old: /bg-gradient-to-br from-medical-600 to-medical-800/g,
      new: 'bg-gradient-to-br from-teal-600 to-blue-700'
    }
  ];

  // Fix 2: Buttons - più eleganti e leggibili
  const buttonFixes = [
    {
      old: /bg-medical-600 text-white font-semibold rounded-lg hover:bg-medical-700/g,
      new: 'bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800'
    },
    {
      old: /bg-white text-medical-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-medical-600/g,
      new: 'bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-all duration-300 border-2 border-teal-600 hover:border-teal-700 hover:shadow-lg'
    },
    {
      old: /bg-medical-800 text-white font-bold rounded-lg hover:bg-medical-900/g,
      new: 'bg-teal-700 text-white font-semibold rounded-xl hover:bg-teal-800'
    }
  ];

  // Fix 3: Cards - design più pulito e professionale
  const cardFixes = [
    {
      old: /bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100/g,
      new: 'bg-white p-8 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 hover:border-teal-100'
    },
    {
      old: /bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100/g,
      new: 'bg-white p-8 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 hover:border-teal-100'
    }
  ];

  // Fix 4: Icons containers - più soft e moderni
  const iconFixes = [
    {
      old: /bg-gradient-to-br from-medical-600 to-medical-700 rounded-2xl/g,
      new: 'bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl shadow-inner'
    },
    {
      old: /bg-medical-100 rounded-xl/g,
      new: 'bg-teal-50 rounded-2xl border border-teal-100'
    }
  ];

  // Fix 5: Stats cards - più eleganti
  const statsFixes = [
    {
      old: /text-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-medical-100/g,
      new: 'text-center p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-200 hover:border-teal-200'
    },
    {
      old: /text-3xl font-bold text-medical-600/g,
      new: 'text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent'
    }
  ];

  // Fix 6: Titles - più raffinati
  const titleFixes = [
    {
      old: /text-4xl lg:text-5xl font-bold text-gray-900/g,
      new: 'text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight'
    },
    {
      old: /<span class="text-medical-600">/g,
      new: '<span class="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">'
    }
  ];

  // Fix 7: Section backgrounds - più variety e depth
  const bgFixes = [
    {
      old: /py-16 md:py-20 bg-white/g,
      new: 'py-16 md:py-24 bg-gradient-to-b from-white to-gray-50/50'
    },
    {
      old: /py-16 md:py-20 bg-gray-50/g,
      new: 'py-16 md:py-24 bg-gradient-to-b from-gray-50/50 to-white'
    }
  ];

  // Fix 8: ISO Badge - più premium
  const badgeFixes = [
    {
      old: /bg-white p-6 rounded-xl shadow-xl border-t-4 border-medical-500/g,
      new: 'bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-2xl border-2 border-teal-100'
    },
    {
      old: /text-3xl font-bold text-medical-600/g,
      new: 'text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent'
    }
  ];

  // Apply all fixes to medicina-del-lavoro-medica
  heroFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  buttonFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  cardFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  iconFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  statsFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  titleFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  bgFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });
  badgeFixes.forEach(fix => {
    medicaContent = medicaContent.replace(fix.old, fix.new);
  });

  // Apply all fixes to homepage-medica
  heroFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  buttonFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  cardFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  iconFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  statsFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  titleFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  bgFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });
  badgeFixes.forEach(fix => {
    homepageContent = homepageContent.replace(fix.old, fix.new);
  });

  // Update both pages
  await prisma.cMSPage.update({
    where: { id: medicaPage.id },
    data: { content: medicaContent }
  });

  await prisma.cMSPage.update({
    where: { id: homepagePage.id },
    data: { content: homepageContent }
  });

  console.log('✅ Element Medica design polished!');
  console.log('\n🎨 Design Improvements:');
  console.log('   ✨ Colors: teal-600/blue-600 gradient for modern medical feel');
  console.log('   ✨ Backgrounds: soft gradients (from-white to-gray-50/50)');
  console.log('   ✨ Buttons: rounded-xl with gradient hover effects');
  console.log('   ✨ Cards: rounded-3xl with subtle borders and smooth animations');
  console.log('   ✨ Icons: shadow-inner for depth, teal-50 background');
  console.log('   ✨ Stats: gradient text (bg-clip-text) for premium look');
  console.log('   ✨ Typography: tracking-tight for refined titles');
  console.log('   ✨ Spacing: increased py-24 for more breathing room');
  console.log('   ✨ Shadows: softer (shadow-md to shadow-xl on hover)');
  console.log('   ✨ Transitions: duration-500 for smooth, elegant animations');

  await prisma.$disconnect();
}

polishMedicaDesign();
