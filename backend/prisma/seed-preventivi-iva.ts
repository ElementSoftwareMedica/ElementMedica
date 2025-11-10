/**
 * Seed Script AGGIORNATO - Sistema Preventivi e Codici Sconto con IVA
 * Include gestione completa IVA con aliquote variabili
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID reali dal database
const TENANT_ID = '21ec594c-efc3-4300-bfa8-b43307a80c9b';
const ADMIN_ID = '3b0cf909-6426-4d97-83df-95dddc6b42bc';
const COMPANY_ID = 'b0b95e24-7fa7-4f29-963c-1f7f9314b14e';
const PERSON_ID = '810bb030-9423-40bc-8160-933ad1bfcc1e';

/**
 * Funzione helper per calcolare i totali con IVA
 */
function calcolaTotaliConIva(
  prezzoUnitario: number,
  quantita: number,
  scontoTotale: number,
  aliquotaIva: number
) {
  const prezzoTotale = prezzoUnitario * quantita;
  const imponibile = prezzoTotale - scontoTotale;
  const importoIva = Math.round(imponibile * (aliquotaIva / 100) * 100) / 100;
  const importoFinale = imponibile + importoIva;

  return {
    prezzoTotale,
    imponibile,
    importoIva,
    importoFinale,
  };
}

async function main() {
  console.log('🌱 Inizio seeding Sistema Preventivi con IVA...\n');

  const currentYear = new Date().getFullYear();

  // ========================================
  // STEP 1: Codici Sconto
  // ========================================
  console.log('📋 STEP 1: Creazione Codici Sconto...');

  const codici = [];

  codici.push(
    await prisma.codiceSconto.upsert({
      where: { codice_tenantId: { tenantId: TENANT_ID, codice: 'BENVENUTO2024' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'BENVENUTO2024',
        nome: 'Benvenuto 2024',
        descrizione: 'Sconto di benvenuto per nuovi clienti',
        tipoSconto: 'PERCENTUALE',
        valore: 15.0,
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

  codici.push(
    await prisma.codiceSconto.upsert({
      where: { codice_tenantId: { tenantId: TENANT_ID, codice: 'SICUREZZA50' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'SICUREZZA50',
        nome: 'Sicurezza 50€',
        descrizione: 'Sconto 50€ su corsi di sicurezza',
        tipoSconto: 'VALORE_ASSOLUTO',
        valore: 50.0,
        applicabileA: 'TUTTI',
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

  codici.push(
    await prisma.codiceSconto.upsert({
      where: { codice_tenantId: { tenantId: TENANT_ID, codice: 'CORPORATE20' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'CORPORATE20',
        nome: 'Corporate 20%',
        descrizione: 'Sconto riservato ad aziende partner',
        tipoSconto: 'PERCENTUALE',
        valore: 20.0,
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

  codici.push(
    await prisma.codiceSconto.upsert({
      where: { codice_tenantId: { tenantId: TENANT_ID, codice: 'PRIVATO10' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'PRIVATO10',
        nome: 'Privato 10%',
        descrizione: 'Sconto per privati cittadini',
        tipoSconto: 'PERCENTUALE',
        valore: 10.0,
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

  codici.push(
    await prisma.codiceSconto.upsert({
      where: { codice_tenantId: { tenantId: TENANT_ID, codice: 'DVR2024' } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        codice: 'DVR2024',
        nome: 'DVR 2024',
        descrizione: 'Sconto su servizi DVR',
        tipoSconto: 'PERCENTUALE',
        valore: 12.0,
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
  // STEP 2: Preventivi CORSI con IVA 22%
  // ========================================
  console.log('📄 STEP 2: Creazione Preventivi CORSI (IVA 22%)...');

  // Preventivo 1: Corso Sicurezza - IVA 22%
  const calc1 = calcolaTotaliConIva(150, 10, 225, 22);
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
      prezzoTotale: calc1.prezzoTotale,
      scontoTotale: 225.0,
      imponibile: calc1.imponibile,
      aliquotaIva: 22.0,
      importoIva: calc1.importoIva,
      importoFinale: calc1.importoFinale,
      stato: 'INVIATO',
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(),
      note: `Preventivo per formazione obbligatoria dipendenti. Sconto 15%: €225.00`,
      generatedBy: ADMIN_ID,
    },
  });

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

  // Preventivo 2: Corso Leadership - IVA 22%
  const calc2 = calcolaTotaliConIva(800, 1, 80, 22);
  const prev2 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 2,
      numero: `PREV-${currentYear}-0002`,
      tipoServizio: 'CORSO',
      tipoPrezzo: 'FORFAIT',
      titoloServizio: 'Corso Leadership e Gestione Team',
      descrizioneServizio: 'Corso manageriale per sviluppo competenze di leadership',
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
      scontoTotale: 80.0,
      imponibile: calc2.imponibile,
      aliquotaIva: 22.0,
      importoIva: calc2.importoIva,
      importoFinale: calc2.importoFinale,
      stato: 'ACCETTATO',
      dataEmissione: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dataAccettazione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      note: 'Cliente interessato a corso avanzato successivo. Sconto 10%: €80.00',
      generatedBy: ADMIN_ID,
    },
  });

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

  console.log('✅ Creati 2 preventivi CORSI (IVA 22%)\n');

  // ========================================
  // STEP 3: Preventivi SERVIZI con IVA variabile
  // ========================================
  console.log('🏥 STEP 3: Creazione Preventivi SERVIZI (IVA variabile)...');

  // Preventivo 3: DVR - IVA 22%
  const calc3 = calcolaTotaliConIva(1200, 1, 144, 22);
  const prev3 = await prisma.preventivo.create({
    data: {
      tenantId: TENANT_ID,
      annoProgressivo: currentYear,
      numeroProgressivo: 3,
      numero: `PREV-${currentYear}-0003`,
      tipoServizio: 'DVR',
      tipoPrezzo: 'FORFAIT',
      titoloServizio: 'Documento Valutazione Rischi (DVR)',
      descrizioneServizio: 'Redazione DVR completo con sopralluogo e valutazione rischi',
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
      scontoTotale: 144.0,
      imponibile: calc3.imponibile,
      aliquotaIva: 22.0,
      importoIva: calc3.importoIva,
      importoFinale: calc3.importoFinale,
      stato: 'BOZZA',
      dataEmissione: new Date(),
      dataScadenza: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      note: 'Include aggiornamento DVR per i prossimi 2 anni. Sconto 12%: €144.00',
      generatedBy: ADMIN_ID,
    },
  });

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

  // Preventivo 4: RSPP - IVA 22%
  const calc4 = calcolaTotaliConIva(300, 12, 0, 22);
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
      quantita: 12,
      prezzoTotale: calc4.prezzoTotale,
      scontoTotale: 0,
      imponibile: calc4.imponibile,
      aliquotaIva: 22.0,
      importoIva: calc4.importoIva,
      importoFinale: calc4.importoFinale,
      stato: 'INVIATO',
      dataEmissione: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      note: 'Contratto rinnovabile. Sconto 10% su rinnovo.',
      generatedBy: ADMIN_ID,
    },
  });

  // Preventivo 5: Medico Competente - IVA 10% (servizi sanitari)
  const calc5 = calcolaTotaliConIva(80, 15, 240, 10);
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
      prezzoTotale: calc5.prezzoTotale,
      scontoTotale: 240.0,
      imponibile: calc5.imponibile,
      aliquotaIva: 10.0, // IVA ridotta per servizi sanitari
      importoIva: calc5.importoIva,
      importoFinale: calc5.importoFinale,
      stato: 'INVIATO',
      dataEmissione: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dataScadenza: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      dataInvio: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      note: 'IVA ridotta 10% per prestazioni sanitarie. Sconto 20%: €240.00',
      generatedBy: ADMIN_ID,
    },
  });

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

  console.log('✅ Creati 3 preventivi SERVIZI (IVA 22% e 10%)\n');

  // ========================================
  // RIEPILOGO FINALE
  // ========================================
  console.log('📊 RIEPILOGO SEEDING CON IVA:');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Codici Sconto:        ${codici.length}`);
  console.log(`✅ Preventivi Totali:    5`);
  console.log(`   - Corsi (IVA 22%):    2`);
  console.log(`   - DVR (IVA 22%):      1`);
  console.log(`   - RSPP (IVA 22%):     1`);
  console.log(`   - Medico (IVA 10%):   1`);
  console.log(`✅ Sconti Applicati:     4`);
  console.log('════════════════════════════════════════════════');

  // Verifica dettagliata
  const preventivi = await prisma.preventivo.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { numeroProgressivo: 'asc' },
    select: {
      numero: true,
      tipoServizio: true,
      imponibile: true,
      aliquotaIva: true,
      importoIva: true,
      importoFinale: true,
    },
  });

  console.log('\n💰 DETTAGLIO CALCOLI IVA:');
  console.log('────────────────────────────────────────────────');
  preventivi.forEach((p) => {
    console.log(`${p.numero} (${p.tipoServizio})`);
    console.log(
      `  Imponibile: €${p.imponibile} | IVA ${p.aliquotaIva}%: €${p.importoIva} | Totale: €${p.importoFinale}`
    );
  });
  console.log('────────────────────────────────────────────────');

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
