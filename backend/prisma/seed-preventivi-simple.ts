/**
 * Seed Script Semplificato - Sistema Preventivi e Codici Sconto
 * Usa solo i campi effettivamente presenti nello schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID reali dal database
const TENANT_ID = '989cbd78-4104-47bf-ae32-fb7a2d9de29f'; // Default Company
const ADMIN_ID = 'ce385803-3361-4598-b044-243e11554dd9'; // Admin User
const COMPANY_ID = '371cf546-551f-4827-8a4a-9a41b027e64f'; // Test Company S.r.l.
const PERSON_ID = 'e20c551e-331e-4354-8eeb-037d378c2b8d'; // Mario Rossi

async function main() {
  console.log('🌱 Inizio seeding Sistema Preventivi e Codici Sconto...\n');

  const currentYear = new Date().getFullYear();

  // ========================================
  // STEP 1: Codici Sconto
  // ========================================
  console.log('📋 STEP 1: Creazione Codici Sconto...');

  const codici = [];

  // 1. Sconto percentuale benvenuto
  codici.push(
    await prisma.codiceSconto.upsert({
      where: {
        codice_tenantId: { tenantId: TENANT_ID, codice: 'BENVENUTO2024' },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'BENVENUTO2024',
        nome: 'Benvenuto 2024',
        descrizione: 'Sconto di benvenuto per nuovi clienti',
        tipoSconto: 'PERCENTUALE',
        valore: 15.00,
        applicabileA: 'TUTTI',
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        utilizzoMassimo: 100,
        utilizzoCorrente: 0,
        createdBy: ADMIN_ID,
      },
    })
  );

  // 2. Sconto valore assoluto sicurezza
  codici.push(
    await prisma.codiceSconto.upsert({
      where: {
        codice_tenantId: { tenantId: TENANT_ID, codice: 'SICUREZZA50' },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'SICUREZZA50',
        nome: 'Sicurezza 50€',
        descrizione: 'Sconto 50€ su corsi di sicurezza',
        tipoSconto: 'VALORE_ASSOLUTO',
        valore: 50.00,
        applicabileA: 'TUTTI', // CORSI non è più distinguibile senza tipoCorsoApplicabile
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-06-30'),
        attivo: true,
        cumulabile: false,
        utilizzoMassimo: 50,
        utilizzoCorrente: 5,
        createdBy: ADMIN_ID,
      },
    })
  );

  // 3. Sconto aziende corporate
  codici.push(
    await prisma.codiceSconto.upsert({
      where: {
        codice_tenantId: { tenantId: TENANT_ID, codice: 'CORPORATE20' },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'CORPORATE20',
        nome: 'Corporate 20%',
        descrizione: 'Sconto riservato ad aziende partner',
        tipoSconto: 'PERCENTUALE',
        valore: 20.00,
        applicabileA: 'AZIENDE',
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        cumulabile: true,
        utilizzoMassimo: null,
        utilizzoCorrente: 12,
        createdBy: ADMIN_ID,
      },
    })
  );

  // 4. Sconto persone fisiche
  codici.push(
    await prisma.codiceSconto.upsert({
      where: {
        codice_tenantId: { tenantId: TENANT_ID, codice: 'PRIVATO10' },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'PRIVATO10',
        nome: 'Privato 10%',
        descrizione: 'Sconto per privati cittadini',
        tipoSconto: 'PERCENTUALE',
        valore: 10.00,
        applicabileA: 'PERSONE',
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        utilizzoMassimo: 200,
        utilizzoCorrente: 45,
        createdBy: ADMIN_ID,
      },
    })
  );

  // 5. Sconto DVR
  codici.push(
    await prisma.codiceSconto.upsert({
      where: {
        codice_tenantId: { tenantId: TENANT_ID, codice: 'DVR2024' },
      },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'DVR2024',
        nome: 'DVR 2024',
        descrizione: 'Sconto su servizi DVR',
        tipoSconto: 'PERCENTUALE',
        valore: 12.00,
        applicabileA: 'TUTTI',
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2024-12-31'),
        attivo: true,
        cumulabile: true,
        utilizzoMassimo: null,
        utilizzoCorrente: 3,
        createdBy: ADMIN_ID,
      },
    })
  );

  console.log(`✅ Creati ${codici.length} codici sconto\n`);

  // ========================================
  // STEP 2: Preventivi CORSI
  // ========================================
  console.log('📄 STEP 2: Creazione Preventivi CORSI...');

  const prev1 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 1,
      numero: `PREV-${currentYear}-0001`,
      tipoServizio: 'CORSO',
      tipoPrezzo: 'PER_PERSONA',
      titoloServizio: 'Corso Sicurezza sul Lavoro - Rischio Medio',
      descrizioneServizio:
        'Corso di formazione generale e specifica per lavoratori esposti a rischio medio',
      dettagliServizio: {
        durataOre: 12,
        modalita: 'in presenza',
        sede: 'Milano Centro',
        materiali: ['Dispense', 'Attestato'],
      },
      clienteType: 'AZIENDA',
      aziendaId: COMPANY_ID,
      personaId: null,
      prezzoUnitario: 150.0,
      quantita: 10,
      prezzoTotale: 1500.0,
      scontoTotale: 225.0, // 15%
      importoFinale: 1275.0,
      stato: 'INVIATO',
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(),
      note: 'Preventivo per formazione obbligatoria. IVA 22%: €280.50. Totale: €1555.50',
      generatedBy: ADMIN_ID,
    },
  });

  // Applica sconto BENVENUTO2024
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: prev1.id,
      codiceId: codici[0].id,
      codiceTesto: 'BENVENUTO2024',
      nomeCodice: 'Benvenuto 2024',
      descrizioneCodice: 'Sconto di benvenuto per nuovi clienti',
      tipoSconto: 'PERCENTUALE',
      valoreSconto: 15.0,
      importoScontato: 225.0,
      applicatoIl: new Date(),
      applicatoDa: ADMIN_ID,
      tenantId: TENANT_ID,
    },
  });

  const prev2 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 2,
      numero: `PREV-${currentYear}-0002`,
      tipoServizio: 'CORSO',
      tipoPrezzo: 'FORFAIT',
      titoloServizio: 'Corso Leadership e Gestione Team',
      descrizioneServizio:
        'Corso manageriale per sviluppo competenze di leadership',
      dettagliServizio: {
        durataOre: 16,
        modalita: 'online',
        piattaforma: 'Zoom',
        materiali: ['Ebook', 'Video registrazioni', 'Certificato'],
      },
      clienteType: 'PERSONA',
      aziendaId: null,
      personaId: PERSON_ID,
      prezzoUnitario: 0,
      quantita: 1,
      prezzoTotale: 800.0,
      scontoTotale: 80.0, // 10% privato
      importoFinale: 720.0,
      stato: 'ACCETTATO',
      dataEmissione: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dataAccettazione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      note: 'Cliente interessato a corso avanzato successivo. IVA 22%: €158.40. Totale: €878.40',
      generatedBy: ADMIN_ID,
    },
  });

  // Applica sconto PRIVATO10
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: prev2.id,
      codiceId: codici[3].id,
      codiceTesto: 'PRIVATO10',
      nomeCodice: 'Privato 10%',
      descrizioneCodice: 'Sconto per privati cittadini',
      tipoSconto: 'PERCENTUALE',
      valoreSconto: 10.0,
      importoScontato: 80.0,
      applicatoIl: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      applicatoDa: ADMIN_ID,
      tenantId: TENANT_ID,
    },
  });

  console.log('✅ Creati 2 preventivi CORSI\n');

  // ========================================
  // STEP 3: Preventivi SERVIZI (DVR, RSPP, MEDICO)
  // ========================================
  console.log('🏥 STEP 3: Creazione Preventivi SERVIZI...');

  const prev3 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 3,
      numero: `PREV-${currentYear}-0003`,
      tipoServizio: 'DVR',
      tipoPrezzo: 'FORFAIT',
      titoloServizio: 'Documento Valutazione Rischi (DVR)',
      descrizioneServizio:
        'Redazione DVR completo con sopralluogo e valutazione rischi',
      dettagliServizio: {
        include: [
          'Sopralluogo',
          'Analisi rischi',
          'Piano miglioramento',
          'Aggiornamento annuale',
        ],
        dipendenti: 25,
        settore: 'Commercio',
      },
      clienteType: 'AZIENDA',
      aziendaId: COMPANY_ID,
      personaId: null,
      prezzoUnitario: 0,
      quantita: 1,
      prezzoTotale: 1200.0,
      scontoTotale: 144.0, // 12%
      importoFinale: 1056.0,
      stato: 'BOZZA',
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      note: 'Include aggiornamento DVR per i prossimi 2 anni. IVA 22%: €232.32. Totale: €1288.32',
      generatedBy: ADMIN_ID,
    },
  });

  // Applica sconto DVR2024
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: prev3.id,
      codiceId: codici[4].id,
      codiceTesto: 'DVR2024',
      nomeCodice: 'DVR 2024',
      descrizioneCodice: 'Sconto su servizi DVR',
      tipoSconto: 'PERCENTUALE',
      valoreSconto: 12.0,
      importoScontato: 144.0,
      applicatoIl: new Date(),
      applicatoDa: ADMIN_ID,
      tenantId: TENANT_ID,
    },
  });

  const prev4 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 4,
      numero: `PREV-${currentYear}-0004`,
      tipoServizio: 'RSPP',
      tipoPrezzo: 'MENSILE',
      titoloServizio: 'Servizio RSPP Esterno - Contratto Annuale',
      descrizioneServizio:
        'Servizio completo di RSPP esterno con affiancamento continuativo',
      dettagliServizio: {
        durataContratto: '12 mesi',
        include: [
          'Affiancamento RSPP',
          'Consulenza telefonica',
          'Visite periodiche',
          'Aggiornamenti normativi',
        ],
        frequenzaVisite: 'Trimestrale',
      },
      clienteType: 'AZIENDA',
      aziendaId: COMPANY_ID,
      personaId: null,
      prezzoUnitario: 300.0,
      quantita: 12, // 12 mesi
      prezzoTotale: 3600.0,
      scontoTotale: 0,
      importoFinale: 3600.0,
      stato: 'INVIATO',
      dataEmissione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      note: 'Contratto rinnovabile. Sconto 10% su rinnovo. IVA 22%: €792. Totale: €4392',
      generatedBy: ADMIN_ID,
    },
  });

  const prev5 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 5,
      numero: `PREV-${currentYear}-0005`,
      tipoServizio: 'MEDICO_COMPETENTE',
      tipoPrezzo: 'PER_PERSONA',
      titoloServizio: 'Sorveglianza Sanitaria - Visite Mediche Periodiche',
      descrizioneServizio:
        'Visite mediche preventive e periodiche ai sensi D.Lgs 81/08',
      dettagliServizio: {
        tipologiaVisite: [
          'Visita idoneità',
          'Esami spirometrici',
          'Esami audiometrici',
          'Esami vista',
        ],
        ubicazione: 'Presso sede cliente',
        durataSessione: '4 ore',
      },
      clienteType: 'AZIENDA',
      aziendaId: COMPANY_ID,
      personaId: null,
      prezzoUnitario: 80.0,
      quantita: 15,
      prezzoTotale: 1200.0,
      scontoTotale: 240.0, // 20% corporate
      importoFinale: 960.0,
      stato: 'INVIATO',
      dataEmissione: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      note: 'Cliente ha richiesto preventivo anche per visite specialistiche. IVA 22%: €211.20. Totale: €1171.20',
      generatedBy: ADMIN_ID,
    },
  });

  // Applica sconto CORPORATE20
  await prisma.preventivoSconto.create({
    data: {
      preventivoId: prev5.id,
      codiceId: codici[2].id,
      codiceTesto: 'CORPORATE20',
      nomeCodice: 'Corporate 20%',
      descrizioneCodice: 'Sconto riservato ad aziende partner',
      tipoSconto: 'PERCENTUALE',
      valoreSconto: 20.0,
      importoScontato: 240.0,
      applicatoIl: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      applicatoDa: ADMIN_ID,
      tenantId: TENANT_ID,
    },
  });

  console.log('✅ Creati 3 preventivi SERVIZI\n');

  // ========================================
  // RIEPILOGO FINALE
  // ========================================
  console.log('📊 RIEPILOGO SEEDING:');
  console.log('════════════════════════════════════════');
  console.log(`✅ Codici Sconto:        ${codici.length}`);
  console.log(`✅ Preventivi Totali:    5`);
  console.log(`   - Corsi:              2`);
  console.log(`   - DVR:                1`);
  console.log(`   - RSPP:               1`);
  console.log(`   - Medico:             1`);
  console.log(`✅ Sconti Applicati:     4`);
  console.log('════════════════════════════════════════');

  // Verifica conteggi
  const totCodici = await prisma.codiceSconto.count({
    where: { tenantId: TENANT_ID },
  });
  const totPreventivi = await prisma.preventivo.count({
    where: { tenantId: TENANT_ID },
  });
  const totSconti = await prisma.preventivoSconto.count({
    where: { tenantId: TENANT_ID },
  });

  console.log('\n✅ Verifica Database:');
  console.log(`   Codici nel DB:         ${totCodici}`);
  console.log(`   Preventivi nel DB:     ${totPreventivi}`);
  console.log(`   Sconti applicati:      ${totSconti}`);

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
