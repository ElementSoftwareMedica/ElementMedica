/**
 * Seed script per Sistema Preventivi e Codici Sconto
 * 
 * Popola il database con:
 * - Codici sconto di test (10 codici vari scenari)
 * - Preventivi per Corsi, DVR, RSPP, Medico
 * - Relazioni tra codici e entità
 * - Applicazioni di sconti ai preventivi
 * 
 * Eseguibile con: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID reali dal database esistente
const TEST_TENANT_ID = '989cbd78-4104-47bf-ae32-fb7a2d9de29f'; // Default Company
const TEST_ADMIN_ID = 'ce385803-3361-4598-b044-243e11554dd9'; // Admin User
const TEST_COMPANY_ID = '371cf546-551f-4827-8a4a-9a41b027e64f'; // Test Company S.r.l.
const TEST_PERSON_ID = 'e20c551e-331e-4354-8eeb-037d378c2b8d'; // Mario Rossi

async function main() {
  console.log('🌱 Inizio seeding Sistema Preventivi e Codici Sconto...\n');

  // Verifica tenant esistente
  const tenant = await prisma.tenant.findUnique({
    where: { id: TEST_TENANT_ID },
  });
  
  if (!tenant) {
    console.error('❌ Tenant di test non trovato. Creare un tenant con id 1 prima di eseguire il seed.');
    return;
  }

  console.log(`✅ Tenant trovato: ${tenant.name}\n`);

  // ========================================
  // STEP 1: Codici Sconto
  // ========================================
  console.log('📋 STEP 1: Creazione Codici Sconto...');
  
  const codiciSconto = await Promise.all([
    // 1. Sconto percentuale generale
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'BENVENUTO2024' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'BENVENUTO2024',
        descrizione: 'Sconto di benvenuto per nuovi clienti',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 15.00,
        applicabileA: ApplicabilitaSconto.TUTTI,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        limiteUtilizzi: 100,
        utilizziCorrente: 0,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 2. Sconto valore assoluto per corsi sicurezza
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'SICUREZZA50' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'SICUREZZA50',
        descrizione: 'Sconto 50€ su corsi di sicurezza',
        tipoSconto: TipoSconto.VALORE_ASSOLUTO,
        valore: 50.00,
        applicabileA: ApplicabilitaSconto.CORSI,
        tipoCorsoApplicabile: TipoCorsoSconto.SICUREZZA,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-06-30'),
        attivo: true,
        cumulabile: false,
        limiteUtilizzi: 50,
        utilizziCorrente: 5,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 3. Sconto per aziende specifiche (20%)
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'CORPORATE20' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'CORPORATE20',
        descrizione: 'Sconto riservato ad aziende partner',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 20.00,
        applicabileA: ApplicabilitaSconto.AZIENDE,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        cumulabile: true,
        limiteUtilizzi: null, // Illimitato
        utilizziCorrente: 12,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 4. Sconto per persone fisiche
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'PRIVATO10' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'PRIVATO10',
        descrizione: 'Sconto per privati cittadini',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 10.00,
        applicabileA: ApplicabilitaSconto.PERSONE,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        limiteUtilizzi: 200,
        utilizziCorrente: 45,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 5. Sconto corsi manageriali
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'MANAGER25' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'MANAGER25',
        descrizione: 'Sconto su corsi manageriali e leadership',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 25.00,
        applicabileA: ApplicabilitaSconto.CORSI,
        tipoCorsoApplicabile: TipoCorsoSconto.MANAGERIALE,
        dataInizio: new Date('2024-03-01'),
        dataFine: new Date('2024-09-30'),
        attivo: true,
        cumulabile: false,
        limiteUtilizzi: 30,
        utilizziCorrente: 8,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 6. Sconto SCADUTO (per test)
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'EXPIRED2023' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'EXPIRED2023',
        descrizione: 'Sconto scaduto (test validazione)',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 30.00,
        applicabileA: ApplicabilitaSconto.TUTTI,
        dataInizio: new Date('2023-01-01'),
        dataFine: new Date('2023-12-31'),
        attivo: false,
        cumulabile: false,
        limiteUtilizzi: 100,
        utilizziCorrente: 78,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
    }),

    // 7. Sconto con LIMITI RAGIUNTI (per test)
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'MAXOUT100' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'MAXOUT100',
        descrizione: 'Sconto con limiti raggiunti (test)',
        tipoSconto: TipoSconto.VALORE_ASSOLUTO,
        valore: 100.00,
        applicabileA: ApplicabilitaSconto.TUTTI,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: false,
        limiteUtilizzi: 10,
        utilizziCorrente: 10, // Limite raggiunto
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

    // 8. Sconto DVR
    prisma.codiceSconto.upsert({
      where: { 
        tenantId_codice: { 
          tenantId: TEST_TENANT_ID, 
          codice: 'DVR2024' 
        } 
      },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        codice: 'DVR2024',
        descrizione: 'Sconto su servizi DVR',
        tipoSconto: TipoSconto.PERCENTUALE,
        valore: 12.00,
        applicabileA: ApplicabilitaSconto.TUTTI,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        limiteUtilizzi: null,
        utilizziCorrente: 3,
        createdBy: TEST_ADMIN_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),
  ]);

  console.log(`✅ Creati ${codiciSconto.length} codici sconto\n`);

  // ========================================
  // STEP 2: Preventivi CORSI
  // ========================================
  console.log('📄 STEP 2: Creazione Preventivi CORSI...');

  const currentYear = new Date().getFullYear();
  
  const preventivoCorso1 = await prisma.preventivo.create({
    data: {
      tenantId: TEST_TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 1,
      numero: `PREV-${currentYear}-0001`,
      tipoServizio: 'CORSO',
      tipoPrezzo: 'PER_PERSONA',
      titoloServizio: 'Corso Sicurezza sul Lavoro - Rischio Medio',
      descrizioneServizio: 'Corso di formazione generale e specifica per lavoratori esposti a rischio medio',
      dettagliServizio: {
        durataOre: 12,
        modalita: 'in presenza',
        sede: 'Milano Centro',
        materiali: ['Dispense', 'Attestato'],
      },
      clienteType: 'AZIENDA',
      aziendaId: TEST_COMPANY_ID,
      personaId: null,
      prezzoUnitario: 150.00,
      quantita: 10,
      prezzoTotale: 1500.00,
      scontoTotale: 225.00,
      importoFinale: 1275.00,
      stato: 'INVIATO',
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 giorni
      dataInvio: new Date(),
      note: 'Preventivo per formazione obbligatoria dipendenti. IVA 22%: €280.50. Totale con IVA: €1555.50',
      generatedBy: TEST_ADMIN_ID,
    },
  });

  // Applica sconto BENVENUTO2024 al preventivo
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: preventivoCorso1.id,
      codiceId: codiciSconto[0].id, // BENVENUTO2024
      codiceUsato: 'BENVENUTO2024',
      tipoSconto: TipoSconto.PERCENTUALE,
      valoreSconto: 15.00,
      importoScontato: 225.00,
      applicatoIl: new Date(),
      applicatoDa: TEST_ADMIN_ID,
      tenantId: TEST_TENANT_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const preventivoCorso2 = await prisma.preventivo.create({
    data: {
      tenantId: TEST_TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 2,
      numero: `PREV-${currentYear}-0002`,
      tipoServizio: TipoServizio.CORSO,
      tipoPrezzo: TipoPrezzo.FORFAIT,
      titoloServizio: 'Corso Leadership e Gestione Team',
      descrizioneServizio: 'Corso manageriale per sviluppo competenze di leadership',
      dettagliServizio: {
        durataOre: 16,
        modalita: 'online',
        piattaforma: 'Zoom',
        materiali: ['Ebook', 'Video registrazioni', 'Certificato'],
      },
      clienteType: ClienteType.PERSONA,
      companyId: null,
      personId: TEST_PERSON_ID,
      prezzoUnitario: 0,
      quantita: 1,
      prezzoTotaleBase: 800.00,
      scontoPercentuale: 25.00,
      scontoValore: 200.00,
      imponibile: 600.00,
      aliquotaIva: 22.00,
      importoIva: 132.00,
      totale: 732.00,
      stato: StatoPreventivo.ACCETTATO,
      dataEmissione: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // -15 giorni
      dataScadenza: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 giorni
      dataInvio: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dataVisualizzazione: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dataAccettazione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      note: 'Cliente interessato a corso avanzato successivo',
      createdBy: TEST_ADMIN_ID,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  // Applica sconto MANAGER25
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: preventivoCorso2.id,
      codiceId: codiciSconto[4].id, // MANAGER25
      codiceUsato: 'MANAGER25',
      tipoSconto: TipoSconto.PERCENTUALE,
      valoreSconto: 25.00,
      importoScontato: 200.00,
      applicatoIl: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      applicatoDa: TEST_ADMIN_ID,
      tenantId: TEST_TENANT_ID,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Creati 2 preventivi CORSI\n`);

  // ========================================
  // STEP 3: Preventivi SERVIZI (DVR, RSPP, Medico)
  // ========================================
  console.log('🏥 STEP 3: Creazione Preventivi SERVIZI...');

  const preventivoDVR = await prisma.preventivo.create({
    data: {
      tenantId: TEST_TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 3,
      numero: `PREV-${currentYear}-0003`,
      tipoServizio: TipoServizio.DVR,
      tipoPrezzo: TipoPrezzo.FORFAIT,
      titoloServizio: 'Documento Valutazione Rischi (DVR)',
      descrizioneServizio: 'Redazione DVR completo con sopralluogo e valutazione rischi',
      dettagliServizio: {
        include: ['Sopralluogo', 'Analisi rischi', 'Piano miglioramento', 'Aggiornamento annuale'],
        dipendenti: 25,
        settore: 'Commercio',
      },
      clienteType: ClienteType.AZIENDA,
      companyId: TEST_COMPANY_ID,
      personId: null,
      prezzoUnitario: 0,
      quantita: 1,
      prezzoTotaleBase: 1200.00,
      scontoPercentuale: 12.00,
      scontoValore: 144.00,
      imponibile: 1056.00,
      aliquotaIva: 22.00,
      importoIva: 232.32,
      totale: 1288.32,
      stato: StatoPreventivo.BOZZA,
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 giorni
      note: 'Include aggiornamento DVR per i prossimi 2 anni',
      createdBy: TEST_ADMIN_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Applica sconto DVR2024
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: preventivoDVR.id,
      codiceId: codiciSconto[7].id, // DVR2024
      codiceUsato: 'DVR2024',
      tipoSconto: TipoSconto.PERCENTUALE,
      valoreSconto: 12.00,
      importoScontato: 144.00,
      applicatoIl: new Date(),
      applicatoDa: TEST_ADMIN_ID,
      tenantId: TEST_TENANT_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const preventivoRSPP = await prisma.preventivo.create({
    data: {
      tenantId: TEST_TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 4,
      numero: `PREV-${currentYear}-0004`,
      tipoServizio: TipoServizio.RSPP,
      tipoPrezzo: TipoPrezzo.FORFAIT,
      titoloServizio: 'Servizio RSPP Esterno - Contratto Annuale',
      descrizioneServizio: 'Servizio completo di RSPP esterno con affiancamento continuativo',
      dettagliServizio: {
        durataContratto: '12 mesi',
        include: ['Affiancamento RSPP', 'Consulenza telefonica', 'Visite periodiche', 'Aggiornamenti normativi'],
        frequenzaVisite: 'Trimestrale',
      },
      clienteType: ClienteType.AZIENDA,
      companyId: TEST_COMPANY_ID,
      personId: null,
      prezzoUnitario: 0,
      quantita: 1,
      prezzoTotaleBase: 3600.00,
      scontoPercentuale: 0,
      scontoValore: 0,
      imponibile: 3600.00,
      aliquotaIva: 22.00,
      importoIva: 792.00,
      totale: 4392.00,
      stato: StatoPreventivo.INVIATO,
      dataEmissione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      dataVisualizzazione: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      note: 'Contratto rinnovabile. Sconto 10% su rinnovo.',
      createdBy: TEST_ADMIN_ID,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const preventivoMedico = await prisma.preventivo.create({
    data: {
      tenantId: TEST_TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 5,
      numero: `PREV-${currentYear}-0005`,
      tipoServizio: TipoServizio.MEDICO,
      tipoPrezzo: TipoPrezzo.PER_PERSONA,
      titoloServizio: 'Sorveglianza Sanitaria - Visite Mediche Periodiche',
      descrizioneServizio: 'Visite mediche preventive e periodiche ai sensi D.Lgs 81/08',
      dettagliServizio: {
        tipologiaVisite: ['Visita idoneità', 'Esami spirometrici', 'Esami audiometrici', 'Esami vista'],
        ubicazione: 'Presso sede cliente',
        durataSessione: '4 ore',
      },
      clienteType: ClienteType.AZIENDA,
      companyId: TEST_COMPANY_ID,
      personId: null,
      prezzoUnitario: 80.00,
      quantita: 15,
      prezzoTotaleBase: 1200.00,
      scontoPercentuale: 20.00,
      scontoValore: 240.00,
      imponibile: 960.00,
      aliquotaIva: 22.00,
      importoIva: 211.20,
      totale: 1171.20,
      stato: StatoPreventivo.VISUALIZZATO,
      dataEmissione: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      dataVisualizzazione: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      note: 'Cliente ha richiesto preventivo anche per visite specialistiche',
      createdBy: TEST_ADMIN_ID,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  // Applica sconto CORPORATE20 al medico
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: preventivoMedico.id,
      codiceId: codiciSconto[2].id, // CORPORATE20
      codiceUsato: 'CORPORATE20',
      tipoSconto: TipoSconto.PERCENTUALE,
      valoreSconto: 20.00,
      importoScontato: 240.00,
      applicatoIl: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      applicatoDa: TEST_ADMIN_ID,
      tenantId: TEST_TENANT_ID,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Creati 3 preventivi SERVIZI (DVR, RSPP, Medico)\n`);

  // ========================================
  // RIEPILOGO FINALE
  // ========================================
  console.log('📊 RIEPILOGO SEEDING:');
  console.log('════════════════════════════════════════');
  console.log(`✅ Codici Sconto:        ${codiciSconto.length}`);
  console.log(`✅ Preventivi Totali:    5`);
  console.log(`   - Corsi:              2`);
  console.log(`   - DVR:                1`);
  console.log(`   - RSPP:               1`);
  console.log(`   - Medico:             1`);
  console.log(`✅ Sconti Applicati:     4`);
  console.log('════════════════════════════════════════');
  
  // Verifica conteggi
  const totaliCodici = await prisma.codiceSconto.count({ where: { tenantId: TEST_TENANT_ID } });
  const totaliPreventivi = await prisma.preventivo.count({ where: { tenantId: TEST_TENANT_ID } });
  const totaliScontiApplicati = await prisma.preventivoSconto.count({ where: { tenantId: TEST_TENANT_ID } });

  console.log('\n✅ Verifica Database:');
  console.log(`   Codici nel DB:         ${totaliCodici}`);
  console.log(`   Preventivi nel DB:     ${totaliPreventivi}`);
  console.log(`   Sconti applicati:      ${totaliScontiApplicati}`);
  
  console.log('\n🎉 Seeding completato con successo!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Errore durante il seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
