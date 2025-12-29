/**
 * Script per creare un preventivo di test e generare il PDF
 * Verifica che il template v11 funzioni correttamente
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestPreventivo() {
  try {
    console.log('🔄 Creazione preventivo di test...\n');

    // 1. Trova tenant attivo
    const tenant = await prisma.tenant.findFirst({
      where: { deletedAt: null }
    });

    if (!tenant) {
      console.log('❌ Nessun tenant trovato');
      return;
    }

    console.log(`📌 Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Trova un utente admin per il tenant
    const admin = await prisma.person.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        personRoles: {
          some: {
            roleType: 'ADMIN'
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Nessun admin trovato');
      return;
    }

    console.log(`👤 Admin: ${admin.firstName} ${admin.lastName} (${admin.id})`);

    // 3. Trova o crea un'azienda di test
    let azienda = await prisma.company.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null
      }
    });

    if (!azienda) {
      azienda = await prisma.company.create({
        data: {
          ragioneSociale: 'Azienda Test S.p.A.',
          partitaIva: '12345678901',
          codiceFiscale: 'TSTFSC12345678901',
          indirizzo: 'Via Milano 123',
          cap: '20100',
          citta: 'Milano',
          provincia: 'MI',
          email: 'test@aziendatest.it',
          telefono: '+39 02 12345678',
          tenantId: tenant.id
        }
      });
      console.log(`🏢 Azienda creata: ${azienda.ragioneSociale}`);
    } else {
      console.log(`🏢 Azienda esistente: ${azienda.ragioneSociale}`);
    }

    // 4. Trova un corso
    const corso = await prisma.course.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null
      }
    });

    if (!corso) {
      console.log('❌ Nessun corso trovato');
      return;
    }

    console.log(`📚 Corso: ${corso.title} (${corso.code})`);

    // 5. Genera numero progressivo
    const year = new Date().getFullYear();
    const lastPreventivo = await prisma.preventivo.findFirst({
      where: {
        tenantId: tenant.id,
        annoProgressivo: year
      },
      orderBy: {
        numeroProgressivo: 'desc'
      }
    });

    const numeroProgressivo = (lastPreventivo?.numeroProgressivo || 0) + 1;

    // 6. Crea preventivo di test
    const dataEmissione = new Date();
    const dataScadenza = new Date();
    dataScadenza.setMonth(dataScadenza.getMonth() + 1);

    const dettagliServizio = {
      voci: [
        {
          descrizione: 'Corso RSPP - Modulo 1 Giuridico (8h)',
          quantita: 5,
          prezzoUnitario: 20.00,
          subtotale: 100.00
        },
        {
          descrizione: 'Corso RSPP - Modulo 2 Tecnico (8h)',
          quantita: 5,
          prezzoUnitario: 20.00,
          subtotale: 100.00
        },
        {
          descrizione: 'Corso RSPP - Modulo 3 Relazionale (8h)',
          quantita: 5,
          prezzoUnitario: 10.00,
          subtotale: 50.00
        },
        {
          descrizione: 'Materiale didattico e attestati',
          quantita: 5,
          prezzoUnitario: 4.00,
          subtotale: 20.00
        }
      ],
      metodoPagamento: '30gg data fattura',
      numPartecipanti: 5
    };

    const subtotale = 270.00;
    const scontoTotale = 27.00; // 10%
    const imponibile = 243.00;
    const aliquotaIva = 22;
    const importoIva = 53.46;
    const importoFinale = 296.46;

    const numero = `PREV-${year}-${String(numeroProgressivo).padStart(4, '0')}`;
    
    const preventivo = await prisma.preventivo.create({
      data: {
        tenantId: tenant.id,
        aziendaId: azienda.id,
        corsoId: corso.id,
        clienteType: 'AZIENDA',
        numero: numero,
        tipoServizio: 'CORSO',
        titoloServizio: corso.title,
        quantita: 5,
        prezzoUnitario: 54, // 270 / 5
        prezzoTotale: subtotale,
        scontoTotale: scontoTotale,
        imponibile: imponibile,
        aliquotaIva: aliquotaIva,
        importoIva: importoIva,
        importoFinale: importoFinale,
        dataEmissione: dataEmissione,
        dataScadenza: dataScadenza,
        stato: 'BOZZA',
        note: 'Il corso include materiale didattico, attestato finale di certificazione, coffee break e pranzo per tutte le giornate. Minimo 5 partecipanti richiesti.',
        dettagliServizio: JSON.stringify(dettagliServizio),
        numeroProgressivo: numeroProgressivo,
        annoProgressivo: year
      }
    });

    console.log(`\n✅ Preventivo creato con successo!`);
    console.log(`   ID: ${preventivo.id}`);
    console.log(`   Numero: PREV-${year}-${String(numeroProgressivo).padStart(4, '0')}`);
    console.log(`   Importo finale: €${importoFinale.toFixed(2)}`);
    console.log(`   Stato: ${preventivo.stato}`);

    console.log(`\n📋 Per generare il PDF, usa:`);
    console.log(`   curl -X POST http://localhost:4001/api/v1/preventivi/${preventivo.id}/generate-pdf \\`);
    console.log(`     -H "Authorization: Bearer <token>" \\`);
    console.log(`     -H "Content-Type: application/json" --output preventivo-test.pdf`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPreventivo();
