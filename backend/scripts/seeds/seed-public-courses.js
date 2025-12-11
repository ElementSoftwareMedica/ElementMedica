const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting public courses seeding...');

  // Get default tenant
  const defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  if (!defaultTenant) {
    console.error('❌ Default tenant not found. Please run the main seed first.');
    process.exit(1);
  }

  // Corsi pubblici di esempio per Element Formazione
  const publicCourses = [
    {
      title: 'Corso di Primo Soccorso Aziendale',
      category: 'Sicurezza',
      description: 'Corso completo di primo soccorso per addetti aziendali secondo il D.Lgs. 81/08',
      fullDescription: 'Il corso di primo soccorso aziendale è obbligatorio per tutte le aziende e fornisce le competenze necessarie per gestire le emergenze sanitarie sul posto di lavoro. Il programma include tecniche di rianimazione cardiopolmonare, gestione delle emorragie, fratture e ustioni.',
      shortDescription: 'Corso obbligatorio di primo soccorso per addetti aziendali',
      duration: '12 ore',
      status: 'ACTIVE',
      code: 'PS001',
      maxPeople: 15,
      pricePerPerson: 180.00,
      validityYears: 3,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'corso-primo-soccorso-aziendale',
      riskLevel: 'ALTO',
      courseType: 'PRIMO_CORSO',
      seoTitle: 'Corso Primo Soccorso Aziendale - Element Formazione',
      seoDescription: 'Corso di primo soccorso aziendale obbligatorio secondo D.Lgs. 81/08. Formazione professionale per addetti al primo soccorso.',
      subcategory: 'Emergenze Sanitarie'
    },
    {
      title: 'Corso Antincendio Rischio Medio',
      category: 'Sicurezza',
      description: 'Corso di formazione per addetti antincendio in attività a rischio medio',
      fullDescription: 'Il corso antincendio rischio medio è rivolto agli addetti alla prevenzione incendi, lotta antincendio e gestione delle emergenze in attività classificate a rischio medio. Include teoria e pratica con esercitazioni su estintori e idranti.',
      shortDescription: 'Formazione antincendio per attività a rischio medio',
      duration: '8 ore',
      status: 'ACTIVE',
      code: 'AI002',
      maxPeople: 12,
      pricePerPerson: 160.00,
      validityYears: 5,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'corso-antincendio-rischio-medio',
      riskLevel: 'MEDIO',
      courseType: 'PRIMO_CORSO',
      seoTitle: 'Corso Antincendio Rischio Medio - Element Formazione',
      seoDescription: 'Corso antincendio per addetti in attività a rischio medio. Formazione teorica e pratica secondo normativa vigente.',
      subcategory: 'Prevenzione Incendi'
    },
    {
      title: 'Aggiornamento RLS - Rappresentante dei Lavoratori',
      category: 'Sicurezza',
      description: 'Corso di aggiornamento annuale per Rappresentanti dei Lavoratori per la Sicurezza',
      fullDescription: 'Il corso di aggiornamento per RLS è obbligatorio annualmente e fornisce le competenze aggiornate su normative, tecniche di valutazione dei rischi e comunicazione efficace con i lavoratori. Essenziale per mantenere la qualifica.',
      shortDescription: 'Aggiornamento annuale obbligatorio per RLS',
      duration: '4 ore',
      status: 'ACTIVE',
      code: 'RLS003',
      maxPeople: 20,
      pricePerPerson: 120.00,
      validityYears: 1,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'aggiornamento-rls-rappresentante-lavoratori',
      riskLevel: 'BASSO',
      courseType: 'AGGIORNAMENTO',
      seoTitle: 'Aggiornamento RLS - Rappresentante Lavoratori Sicurezza',
      seoDescription: 'Corso di aggiornamento annuale per RLS. Formazione obbligatoria per rappresentanti dei lavoratori per la sicurezza.',
      subcategory: 'Rappresentanza Sindacale'
    },
    {
      title: 'Corso per Preposti alla Sicurezza',
      category: 'Sicurezza',
      description: 'Formazione specifica per preposti secondo l\'art. 37 del D.Lgs. 81/08',
      fullDescription: 'Il corso per preposti fornisce la formazione obbligatoria per chi svolge funzioni di controllo e coordinamento delle attività lavorative. Include responsabilità legali, tecniche di comunicazione e gestione della sicurezza sul lavoro.',
      shortDescription: 'Formazione obbligatoria per preposti alla sicurezza',
      duration: '8 ore',
      status: 'ACTIVE',
      code: 'PREP004',
      maxPeople: 18,
      pricePerPerson: 170.00,
      validityYears: 5,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'corso-preposti-sicurezza',
      riskLevel: 'MEDIO',
      courseType: 'PRIMO_CORSO',
      seoTitle: 'Corso Preposti Sicurezza - Formazione Art. 37 D.Lgs. 81/08',
      seoDescription: 'Corso per preposti alla sicurezza secondo art. 37 D.Lgs. 81/08. Formazione obbligatoria per coordinatori e responsabili.',
      subcategory: 'Ruoli di Responsabilità'
    },
    {
      title: 'Corso HACCP per Alimentaristi',
      category: 'Alimentare',
      description: 'Corso di igiene alimentare per operatori del settore alimentare',
      fullDescription: 'Il corso HACCP fornisce le competenze necessarie per operare nel settore alimentare nel rispetto delle norme igienico-sanitarie. Include principi di microbiologia, conservazione alimenti e procedure di autocontrollo.',
      shortDescription: 'Formazione igiene alimentare per operatori settore food',
      duration: '6 ore',
      status: 'ACTIVE',
      code: 'HACCP005',
      maxPeople: 25,
      pricePerPerson: 90.00,
      validityYears: 3,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'corso-haccp-alimentaristi',
      riskLevel: 'BASSO',
      courseType: 'PRIMO_CORSO',
      seoTitle: 'Corso HACCP Alimentaristi - Igiene Alimentare',
      seoDescription: 'Corso HACCP per operatori del settore alimentare. Formazione igiene alimentare e autocontrollo secondo normativa.',
      subcategory: 'Igiene Alimentare'
    },
    {
      title: 'Aggiornamento Coordinatore Sicurezza',
      category: 'Sicurezza',
      description: 'Aggiornamento quinquennale per coordinatori della sicurezza nei cantieri',
      fullDescription: 'Il corso di aggiornamento per coordinatori della sicurezza è obbligatorio ogni 5 anni e aggiorna sulle nuove normative, tecnologie e metodologie per la gestione della sicurezza nei cantieri edili.',
      shortDescription: 'Aggiornamento quinquennale coordinatori sicurezza cantieri',
      duration: '40 ore',
      status: 'ACTIVE',
      code: 'COORD006',
      maxPeople: 10,
      pricePerPerson: 450.00,
      validityYears: 5,
      tenantId: defaultTenant.id,
      isPublic: true,
      slug: 'aggiornamento-coordinatore-sicurezza',
      riskLevel: 'ALTO',
      courseType: 'AGGIORNAMENTO',
      seoTitle: 'Aggiornamento Coordinatore Sicurezza Cantieri',
      seoDescription: 'Corso aggiornamento coordinatori sicurezza cantieri. Formazione quinquennale obbligatoria per professionisti edilizia.',
      subcategory: 'Coordinamento Cantieri'
    }
  ];

  // Crea i corsi pubblici
  for (const courseData of publicCourses) {
    const existingCourse = await prisma.course.findUnique({
      where: { code: courseData.code }
    });

    if (!existingCourse) {
      const course = await prisma.course.create({
        data: courseData
      });
      console.log('✅ Public course created:', course.title);
    } else {
      // Aggiorna il corso esistente per renderlo pubblico
      const updatedCourse = await prisma.course.update({
        where: { code: courseData.code },
        data: {
          isPublic: true,
          slug: courseData.slug,
          riskLevel: courseData.riskLevel,
          courseType: courseData.courseType,
          fullDescription: courseData.fullDescription,
          shortDescription: courseData.shortDescription,
          seoTitle: courseData.seoTitle,
          seoDescription: courseData.seoDescription,
          subcategory: courseData.subcategory
        }
      });
      console.log('✅ Course updated to public:', updatedCourse.title);
    }
  }

  console.log('🎉 Public courses seeding completed successfully!');
  console.log(`📊 Created ${publicCourses.length} public courses for Element Formazione`);
}

main()
  .catch((e) => {
    console.error('❌ Public courses seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });