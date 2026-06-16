/**
 * Codici ATECO 2007 (aggiornamento 2022) — sezioni principali
 * Fonte: ISTAT classificazione ATECO 2007
 * Ogni entry: { codice, descrizione, settore }
 */

export interface AtecoEntry {
    codice: string;
    descrizione: string;
    settore: string;
}

export const ATECO_DATA: AtecoEntry[] = [
    // A — Agricoltura
    { codice: '01', descrizione: 'Coltivazioni agricole e produzioni di prodotti animali', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.1', descrizione: 'Coltivazione di colture agricole non permanenti', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.11', descrizione: 'Coltivazione di cereali', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.13', descrizione: 'Coltivazione di ortaggi e meloni', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.2', descrizione: 'Coltivazione di colture permanenti', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.41', descrizione: 'Allevamento di bovini da latte', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '01.42', descrizione: 'Allevamento di altri bovini e bufalini', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '02', descrizione: 'Silvicoltura e utilizzo di aree forestali', settore: 'Agricoltura, silvicoltura e pesca' },
    { codice: '03', descrizione: 'Pesca e acquacoltura', settore: 'Agricoltura, silvicoltura e pesca' },
    // B — Estrazione
    { codice: '06', descrizione: 'Estrazione di petrolio greggio e di gas naturale', settore: 'Estrazione di minerali da cave e miniere' },
    { codice: '08', descrizione: 'Estrazione di minerali da cave e miniere', settore: 'Estrazione di minerali da cave e miniere' },
    { codice: '08.11', descrizione: 'Estrazione di pietra ornamentale e da costruzione', settore: 'Estrazione di minerali da cave e miniere' },
    // C — Manifatturiero
    { codice: '10', descrizione: 'Industrie alimentari', settore: 'Industria manifatturiera alimentare' },
    { codice: '10.1', descrizione: 'Lavorazione e conservazione di carne', settore: 'Industria manifatturiera alimentare' },
    { codice: '10.5', descrizione: 'Industria lattiero-casearia', settore: 'Industria manifatturiera alimentare' },
    { codice: '10.7', descrizione: 'Produzione di prodotti da forno e farinacei', settore: 'Industria manifatturiera alimentare' },
    { codice: '10.82', descrizione: 'Produzione di cacao, cioccolato, caramelle', settore: 'Industria manifatturiera alimentare' },
    { codice: '11', descrizione: 'Industria delle bevande', settore: 'Industria manifatturiera alimentare' },
    { codice: '12', descrizione: 'Industria del tabacco', settore: 'Industria manifatturiera' },
    { codice: '13', descrizione: 'Industrie tessili', settore: 'Industria tessile e abbigliamento' },
    { codice: '14', descrizione: 'Confezione di articoli di abbigliamento', settore: 'Industria tessile e abbigliamento' },
    { codice: '15', descrizione: 'Fabbricazione di articoli in pelle e simili', settore: 'Industria tessile e abbigliamento' },
    { codice: '16', descrizione: 'Industria del legno e dei prodotti in legno', settore: 'Industria del legno' },
    { codice: '17', descrizione: 'Fabbricazione di carta e prodotti di carta', settore: 'Industria della carta e stampa' },
    { codice: '18', descrizione: 'Stampa e riproduzione di supporti registrati', settore: 'Industria della carta e stampa' },
    { codice: '19', descrizione: 'Fabbricazione di coke e prodotti petroliferi raffinati', settore: 'Industria chimica e petrolchimica' },
    { codice: '20', descrizione: 'Fabbricazione di prodotti chimici', settore: 'Industria chimica e petrolchimica' },
    { codice: '20.1', descrizione: 'Fabbricazione di prodotti chimici di base', settore: 'Industria chimica e petrolchimica' },
    { codice: '21', descrizione: 'Fabbricazione di prodotti farmaceutici di base', settore: 'Industria farmaceutica' },
    { codice: '22', descrizione: 'Fabbricazione di articoli in gomma e materie plastiche', settore: 'Industria della gomma e plastica' },
    { codice: '23', descrizione: 'Fabbricazione di altri prodotti della lavorazione di minerali non metalliferi', settore: 'Industria della ceramica e vetro' },
    { codice: '23.1', descrizione: 'Fabbricazione di vetro e prodotti in vetro', settore: 'Industria della ceramica e vetro' },
    { codice: '23.2', descrizione: 'Fabbricazione di prodotti refrattari', settore: 'Industria della ceramica e vetro' },
    { codice: '23.3', descrizione: 'Fabbricazione di materiali da costruzione in terracotta', settore: 'Industria della ceramica e vetro' },
    { codice: '23.4', descrizione: 'Fabbricazione di altri prodotti in porcellana e in ceramica', settore: 'Industria della ceramica e vetro' },
    { codice: '23.5', descrizione: 'Produzione di cemento, calce e gesso', settore: 'Industria della ceramica e vetro' },
    { codice: '24', descrizione: 'Metallurgia', settore: 'Industria metalmeccanica' },
    { codice: '24.1', descrizione: 'Siderurgia', settore: 'Industria metalmeccanica' },
    { codice: '25', descrizione: 'Fabbricazione di prodotti in metallo', settore: 'Industria metalmeccanica' },
    { codice: '25.1', descrizione: 'Fabbricazione di strutture metalliche', settore: 'Industria metalmeccanica' },
    { codice: '25.2', descrizione: 'Fabbricazione di cisterne, serbatoi, radiatori', settore: 'Industria metalmeccanica' },
    { codice: '25.5', descrizione: 'Fucinatura, imbutitura, stampaggio e profilatura dei metalli', settore: 'Industria metalmeccanica' },
    { codice: '25.61', descrizione: 'Trattamento e rivestimento dei metalli', settore: 'Industria metalmeccanica' },
    { codice: '25.62', descrizione: 'Lavori di meccanica generale', settore: 'Industria metalmeccanica' },
    { codice: '26', descrizione: 'Fabbricazione di computer e prodotti elettronici ottici', settore: 'Industria elettronica e informatica' },
    { codice: '27', descrizione: 'Fabbricazione di apparecchiature elettriche', settore: 'Industria elettronica e informatica' },
    { codice: '28', descrizione: 'Fabbricazione di macchinari e apparecchiature', settore: 'Industria meccanica' },
    { codice: '29', descrizione: 'Fabbricazione di autoveicoli, rimorchi e semirimorchi', settore: 'Industria automotive' },
    { codice: '30', descrizione: 'Fabbricazione di altri mezzi di trasporto', settore: 'Industria automotive' },
    { codice: '31', descrizione: 'Fabbricazione di mobili', settore: 'Industria del mobile e arredo' },
    { codice: '32', descrizione: 'Altre industrie manifatturiere', settore: 'Industria manifatturiera' },
    { codice: '33', descrizione: 'Riparazione, manutenzione e installazione di macchine', settore: 'Manutenzione e installazione' },
    // D — Energia
    { codice: '35', descrizione: 'Fornitura di energia elettrica, gas, vapore', settore: 'Energia e utilities' },
    { codice: '35.1', descrizione: 'Produzione, trasmissione e distribuzione di energia elettrica', settore: 'Energia e utilities' },
    { codice: '35.2', descrizione: 'Produzione e distribuzione di gas', settore: 'Energia e utilities' },
    // E — Acqua e rifiuti
    { codice: '36', descrizione: 'Raccolta, trattamento e distribuzione di acqua', settore: 'Acqua, rifiuti e riciclo' },
    { codice: '38', descrizione: 'Raccolta, trattamento e smaltimento dei rifiuti', settore: 'Acqua, rifiuti e riciclo' },
    { codice: '39', descrizione: 'Attività di risanamento e gestione dei rifiuti', settore: 'Acqua, rifiuti e riciclo' },
    // F — Costruzioni
    { codice: '41', descrizione: 'Costruzione di edifici', settore: 'Edilizia e costruzioni' },
    { codice: '41.1', descrizione: 'Sviluppo di progetti immobiliari', settore: 'Edilizia e costruzioni' },
    { codice: '41.2', descrizione: 'Costruzione di edifici residenziali e non residenziali', settore: 'Edilizia e costruzioni' },
    { codice: '42', descrizione: 'Ingegneria civile', settore: 'Edilizia e costruzioni' },
    { codice: '42.1', descrizione: 'Costruzione di strade e ferrovie', settore: 'Edilizia e costruzioni' },
    { codice: '42.2', descrizione: 'Costruzione di opere di pubblica utilità', settore: 'Edilizia e costruzioni' },
    { codice: '43', descrizione: 'Lavori di costruzione specializzati', settore: 'Edilizia e costruzioni' },
    { codice: '43.1', descrizione: 'Demolizione e preparazione del cantiere', settore: 'Edilizia e costruzioni' },
    { codice: '43.2', descrizione: 'Installazione di impianti elettrici, idraulici', settore: 'Edilizia e costruzioni' },
    { codice: '43.3', descrizione: 'Completamento e finitura di edifici', settore: 'Edilizia e costruzioni' },
    // G — Commercio
    { codice: '45', descrizione: 'Commercio e riparazione di autoveicoli e motocicli', settore: 'Commercio' },
    { codice: '46', descrizione: 'Commercio all\'ingrosso', settore: 'Commercio' },
    { codice: '46.1', descrizione: 'Intermediari del commercio', settore: 'Commercio' },
    { codice: '47', descrizione: 'Commercio al dettaglio', settore: 'Commercio al dettaglio' },
    { codice: '47.1', descrizione: 'Commercio al dettaglio in esercizi non specializzati', settore: 'Commercio al dettaglio' },
    { codice: '47.2', descrizione: 'Commercio al dettaglio di prodotti alimentari', settore: 'Commercio al dettaglio' },
    { codice: '47.3', descrizione: 'Commercio al dettaglio di carburanti', settore: 'Commercio al dettaglio' },
    { codice: '47.4', descrizione: 'Commercio al dettaglio di informatica e telecomunicazioni', settore: 'Commercio al dettaglio' },
    { codice: '47.5', descrizione: 'Commercio al dettaglio di altri prodotti per uso domestico', settore: 'Commercio al dettaglio' },
    // H — Trasporti
    { codice: '49', descrizione: 'Trasporto terrestre e trasporto mediante condotte', settore: 'Trasporti e logistica' },
    { codice: '49.1', descrizione: 'Trasporto ferroviario passeggeri', settore: 'Trasporti e logistica' },
    { codice: '49.2', descrizione: 'Trasporto ferroviario merci', settore: 'Trasporti e logistica' },
    { codice: '49.3', descrizione: 'Altri trasporti terrestri di passeggeri', settore: 'Trasporti e logistica' },
    { codice: '49.4', descrizione: 'Trasporto di merci su strada e servizi di trasloco', settore: 'Trasporti e logistica' },
    { codice: '50', descrizione: 'Trasporto marittimo e per vie d\'acqua', settore: 'Trasporti e logistica' },
    { codice: '51', descrizione: 'Trasporto aereo', settore: 'Trasporti e logistica' },
    { codice: '52', descrizione: 'Magazzinaggio e attività di supporto ai trasporti', settore: 'Trasporti e logistica' },
    { codice: '53', descrizione: 'Servizi postali e attività di corriere', settore: 'Trasporti e logistica' },
    // I — Alloggio e ristorazione
    { codice: '55', descrizione: 'Alloggio', settore: 'Turismo e ristorazione' },
    { codice: '55.1', descrizione: 'Alberghi e strutture simili', settore: 'Turismo e ristorazione' },
    { codice: '56', descrizione: 'Attività dei servizi di ristorazione', settore: 'Turismo e ristorazione' },
    { codice: '56.1', descrizione: 'Ristoranti e attività di ristorazione mobile', settore: 'Turismo e ristorazione' },
    { codice: '56.2', descrizione: 'Fornitura di pasti preparati e altri servizi di ristorazione', settore: 'Turismo e ristorazione' },
    { codice: '56.3', descrizione: 'Bar e altri esercizi simili', settore: 'Turismo e ristorazione' },
    // J — Informatica e comunicazioni
    { codice: '58', descrizione: 'Attività editoriali', settore: 'Media e comunicazione' },
    { codice: '59', descrizione: 'Produzione cinematografica, televisiva e musicale', settore: 'Media e comunicazione' },
    { codice: '60', descrizione: 'Attività di programmazione e trasmissione', settore: 'Media e comunicazione' },
    { codice: '61', descrizione: 'Telecomunicazioni', settore: 'Informatica e telecomunicazioni' },
    { codice: '62', descrizione: 'Produzione di software, consulenza informatica', settore: 'Informatica e telecomunicazioni' },
    { codice: '62.01', descrizione: 'Produzione di software non connesso all\'edizione', settore: 'Informatica e telecomunicazioni' },
    { codice: '62.02', descrizione: 'Consulenza nel settore delle tecnologie dell\'informatica', settore: 'Informatica e telecomunicazioni' },
    { codice: '63', descrizione: 'Attività dei servizi d\'informazione', settore: 'Informatica e telecomunicazioni' },
    // K — Finanza
    { codice: '64', descrizione: 'Attività di servizi finanziari', settore: 'Finanza e assicurazioni' },
    { codice: '65', descrizione: 'Assicurazioni, riassicurazioni e fondi pensione', settore: 'Finanza e assicurazioni' },
    { codice: '66', descrizione: 'Attività ausiliarie dei servizi finanziari e assicurativi', settore: 'Finanza e assicurazioni' },
    // L — Immobiliare
    { codice: '68', descrizione: 'Attività immobiliari', settore: 'Settore immobiliare' },
    { codice: '68.1', descrizione: 'Compravendita di beni immobili propri', settore: 'Settore immobiliare' },
    { codice: '68.2', descrizione: 'Affitto e gestione di immobili propri o in leasing', settore: 'Settore immobiliare' },
    { codice: '68.3', descrizione: 'Attività immobiliari per conto terzi', settore: 'Settore immobiliare' },
    // M — Professioni
    { codice: '69', descrizione: 'Attività legali e contabilità', settore: 'Servizi professionali' },
    { codice: '69.1', descrizione: 'Attività degli studi legali', settore: 'Servizi professionali' },
    { codice: '69.2', descrizione: 'Contabilità, controllo e revisione contabile', settore: 'Servizi professionali' },
    { codice: '70', descrizione: 'Attività di direzione aziendale e di consulenza gestionale', settore: 'Servizi professionali' },
    { codice: '71', descrizione: 'Attività degli studi di architettura e ingegneria', settore: 'Servizi professionali' },
    { codice: '71.1', descrizione: 'Attività degli studi di architettura', settore: 'Servizi professionali' },
    { codice: '71.12', descrizione: 'Attività degli studi di ingegneria e connesse', settore: 'Servizi professionali' },
    { codice: '72', descrizione: 'Ricerca scientifica e sviluppo', settore: 'Ricerca e sviluppo' },
    { codice: '73', descrizione: 'Pubblicità e ricerche di mercato', settore: 'Marketing e comunicazione' },
    { codice: '74', descrizione: 'Altre attività professionali, scientifiche e tecniche', settore: 'Servizi professionali' },
    { codice: '75', descrizione: 'Servizi veterinari', settore: 'Servizi veterinari' },
    // N — Servizi di supporto
    { codice: '77', descrizione: 'Attività di noleggio e leasing', settore: 'Servizi di supporto alle imprese' },
    { codice: '78', descrizione: 'Attività di ricerca e selezione del personale', settore: 'Servizi di supporto alle imprese' },
    { codice: '79', descrizione: 'Attività dei servizi delle agenzie di viaggio', settore: 'Turismo e ristorazione' },
    { codice: '80', descrizione: 'Servizi di vigilanza e investigazione', settore: 'Servizi di supporto alle imprese' },
    { codice: '81', descrizione: 'Attività di servizi per edifici e paesaggio', settore: 'Servizi di supporto alle imprese' },
    { codice: '81.1', descrizione: 'Attività di pulizia e disinfestazione', settore: 'Servizi di supporto alle imprese' },
    { codice: '81.21', descrizione: 'Pulizia generale di edifici', settore: 'Servizi di supporto alle imprese' },
    { codice: '82', descrizione: 'Attività di supporto per le funzioni d\'ufficio', settore: 'Servizi di supporto alle imprese' },
    // O — PA
    { codice: '84', descrizione: 'Amministrazione pubblica e difesa', settore: 'Pubblica Amministrazione' },
    // P — Istruzione
    { codice: '85', descrizione: 'Istruzione', settore: 'Istruzione e formazione' },
    { codice: '85.1', descrizione: 'Istruzione prescolastica', settore: 'Istruzione e formazione' },
    { codice: '85.2', descrizione: 'Istruzione primaria', settore: 'Istruzione e formazione' },
    { codice: '85.3', descrizione: 'Istruzione secondaria', settore: 'Istruzione e formazione' },
    { codice: '85.5', descrizione: 'Istruzione e formazione professionale', settore: 'Istruzione e formazione' },
    { codice: '85.59', descrizione: 'Altre attività di istruzione', settore: 'Istruzione e formazione' },
    // Q — Sanità
    { codice: '86', descrizione: 'Assistenza sanitaria', settore: 'Sanità e assistenza sociale' },
    { codice: '86.1', descrizione: 'Servizi ospedalieri', settore: 'Sanità e assistenza sociale' },
    { codice: '86.2', descrizione: 'Attività dei medici e degli odontoiatri', settore: 'Sanità e assistenza sociale' },
    { codice: '86.21', descrizione: 'Attività degli studi medici di medicina generale', settore: 'Sanità e assistenza sociale' },
    { codice: '86.22', descrizione: 'Attività degli studi medici specialistici', settore: 'Sanità e assistenza sociale' },
    { codice: '86.23', descrizione: 'Attività degli studi odontoiatrici', settore: 'Sanità e assistenza sociale' },
    { codice: '86.9', descrizione: 'Altre attività per la salute', settore: 'Sanità e assistenza sociale' },
    { codice: '87', descrizione: 'Servizi di assistenza residenziale', settore: 'Sanità e assistenza sociale' },
    { codice: '88', descrizione: 'Assistenza sociale non residenziale', settore: 'Sanità e assistenza sociale' },
    // R — Arte
    { codice: '90', descrizione: 'Attività creative, artistiche e di intrattenimento', settore: 'Arte e cultura' },
    { codice: '91', descrizione: 'Attività di biblioteche, archivi, musei', settore: 'Arte e cultura' },
    { codice: '92', descrizione: 'Attività riguardanti le lotterie, le scommesse', settore: 'Intrattenimento e gioco' },
    { codice: '93', descrizione: 'Attività sportive, di intrattenimento e di divertimento', settore: 'Sport e tempo libero' },
    // S — Altre attività
    { codice: '94', descrizione: 'Attività di organizzazioni associative', settore: 'Associazioni e organizzazioni' },
    { codice: '95', descrizione: 'Riparazione di computer e beni personali', settore: 'Riparazioni e manutenzione' },
    { codice: '96', descrizione: 'Altre attività di servizi per la persona', settore: 'Servizi alla persona' },
    { codice: '96.01', descrizione: 'Lavanderia e pulitura di articoli tessili', settore: 'Servizi alla persona' },
    { codice: '96.02', descrizione: 'Servizi degli istituti di bellezza', settore: 'Servizi alla persona' },
    { codice: '96.04', descrizione: 'Attività dei centri benessere fisica', settore: 'Servizi alla persona' },
];

/**
 * Cerca per codice ATECO (prefix match) o descrizione (substring match).
 * Max 8 risultati.
 */
export function searchAteco(query: string): AtecoEntry[] {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return ATECO_DATA.filter(e =>
        e.codice.toLowerCase().startsWith(q) ||
        e.descrizione.toLowerCase().includes(q)
    ).slice(0, 8);
}

/** Dato un codice esatto, restituisce il settore corrispondente. */
export function getSettoreByAteco(codice: string): string | null {
    const q = codice.trim().toLowerCase();
    const match = ATECO_DATA.find(e => e.codice.toLowerCase() === q);
    return match?.settore ?? null;
}
