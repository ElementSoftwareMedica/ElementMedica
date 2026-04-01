/**
 * MDL Normativa Templates
 * 
 * Definisce tutti i documenti obbligatori per la Medicina del Lavoro
 * secondo il D.Lgs 81/2008 (Testo Unico Sicurezza sul Lavoro) e s.m.i.
 * 
 * Riferimenti normativi:
 * - Art. 25: Obblighi del medico competente
 * - Art. 41: Sorveglianza sanitaria
 * - Art. 53 + Allegato 3A: Cartella sanitaria e di rischio
 * - D.Lgs 106/2009: Correttivo del T.U.
 * 
 * @module utils/mdlNormativaTemplates
 * @version 1.0.0
 */

/**
 * @typedef {Object} MDLTemplate
 * @property {string} nome - Nome del documento
 * @property {string} codice - Codice identificativo univoco
 * @property {string} tipo - Tipo documento (TipoDocumentoTemplate)
 * @property {string} fase - Fase del processo (FaseDocumento)
 * @property {string} descrizione - Descrizione normativa
 * @property {boolean} obbligatorio - Se richiesto per legge
 * @property {boolean} richiedeFirmaMedico - Se richiede firma medico
 * @property {boolean} richiedeFirma - Se richiede firma lavoratore
 * @property {string[]} branchTypes - Branch di appartenenza
 * @property {number} validitaGiorni - Giorni di validità (null = nessuna)
 * @property {number} ordine - Ordinamento nella lista
 * @property {string} contenutoHtml - Template HTML del documento
 * @property {Object[]} campi - Schema campi del modulo
 */

export const MDL_NORMATIVA_TEMPLATES = [
    // ============================================================
    // 1. CONSENSO INFORMATO SORVEGLIANZA SANITARIA
    // Rif: D.Lgs 81/08 art. 13, 41 co. 1, Codice Deontologico
    // ============================================================
    {
        nome: 'Consenso Informato Sorveglianza Sanitaria',
        codice: 'MDL-CONSENSO-001',
        tipo: 'CONSENSO_INFORMATO',
        fase: 'PRE_VISITA',
        descrizione: 'Consenso informato del lavoratore alla sorveglianza sanitaria ai sensi dell\'art. 41 D.Lgs 81/08. Documento obbligatorio prima di ogni visita medica preventiva o periodica.',
        obbligatorio: true,
        richiedeFirma: true,
        richiedeFirmaMedico: true,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 10,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">CONSENSO INFORMATO ALLA SORVEGLIANZA SANITARIA</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 - Sorveglianza Sanitaria</p>

<p>Il/La sottoscritto/a <strong>{{NOME_LAVORATORE}}</strong>, nato/a il {{DATA_NASCITA}}, codice fiscale {{CODICE_FISCALE}},</p>

<p><strong>DICHIARA</strong> di aver ricevuto informazioni esaurienti da parte del Medico Competente in merito a:</p>
<ul>
<li>Le finalità e le modalità degli accertamenti sanitari;</li>
<li>I rischi lavorativi per la salute a cui è esposto/a;</li>
<li>La periodicità degli accertamenti;</li>
<li>Il diritto alla riservatezza dei dati sanitari ai sensi del D.Lgs 196/2003 e GDPR 679/2016;</li>
<li>Il diritto di ricorrere agli organi competenti avverso il giudizio di idoneità.</li>
</ul>

<p><strong>ACCONSENTE</strong> all'effettuazione degli accertamenti sanitari previsti dal protocollo di sorveglianza sanitaria aziendale.</p>

<p>Luogo e data: ___________________________</p>

<table style="width: 100%; margin-top: 30px;">
<tr>
<td style="text-align: left; width: 50%;">
<p>Firma del Lavoratore</p>
<p style="margin-top: 40px;">_________________________</p>
</td>
<td style="text-align: right; width: 50%;">
<p>Il Medico Competente</p>
<p style="margin-top: 40px;">_________________________</p>
</td>
</tr>
</table>
</div>`,
        campi: [
            { key: 'nome_lavoratore', label: 'Nome e Cognome', type: 'TEXT', required: true, ordine: 1 },
            { key: 'data_nascita', label: 'Data di Nascita', type: 'DATE', required: true, ordine: 2 },
            { key: 'codice_fiscale', label: 'Codice Fiscale', type: 'TEXT', required: true, ordine: 3 },
            { key: 'data_firma', label: 'Data Firma', type: 'DATE', required: true, ordine: 4, defaultValue: 'TODAY' },
            { key: 'note_aggiuntive', label: 'Note Aggiuntive', type: 'TEXTAREA', required: false, ordine: 5 }
        ]
    },

    // ============================================================
    // 2. QUESTIONARIO ANAMNESTICO LAVORATIVO
    // Rif: D.Lgs 81/08 art. 25 co. c, Allegato 3A
    // ============================================================
    {
        nome: 'Questionario Anamnestico Lavorativo',
        codice: 'MDL-ANAMNESI-001',
        tipo: 'QUESTIONARIO_ANAMNESI_MDL',
        fase: 'PRE_VISITA',
        descrizione: 'Questionario per la raccolta dell\'anamnesi lavorativa e delle condizioni di salute del lavoratore. Obbligatorio ai sensi dell\'art. 25 c. c) D.Lgs 81/08 ed Allegato 3A.',
        obbligatorio: true,
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 20,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">QUESTIONARIO ANAMNESTICO LAVORATIVO</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 Allegato 3A - Cartella Sanitaria e di Rischio</p>

<h3>Dati Anagrafici</h3>
<p>Nome: {{NOME}} | Cognome: {{COGNOME}} | Data nascita: {{DATA_NASCITA}} | Sesso: {{SESSO}}</p>

<h3>1. Mansione e Rischi Lavorativi</h3>
<p>Mansione attuale: {{MANSIONE}}</p>
<p>Anni di anzianità lavorativa: {{ANNI_LAVORO}}</p>
<p>Esposizioni lavorative: {{ESPOSIZIONI}}</p>

<h3>2. Anamnesi Patologica Remota</h3>
<p>Malattie pregresse: {{MALATTIE_PREGRESSE}}</p>
<p>Interventi chirurgici: {{INTERVENTI}}</p>
<p>Allergie note: {{ALLERGIE}}</p>

<h3>3. Terapie in Corso</h3>
<p>{{TERAPIE}}</p>

<h3>4. Abitudini di Vita</h3>
<p>Fumo: {{FUMO}} | Alcol: {{ALCOL}} | Attività fisica: {{ATTIVITA_FISICA}}</p>

<h3>5. Sintomi Attuali Riferiti al Lavoro</h3>
<p>{{SINTOMI_LAVORO}}</p>
</div>`,
        campi: [
            { key: 'mansione', label: 'Mansione attuale', type: 'TEXT', required: true, ordine: 1 },
            { key: 'anni_lavoro', label: 'Anni di anzianità lavorativa', type: 'NUMBER', required: false, ordine: 2 },
            { key: 'reparto', label: 'Reparto/Ufficio', type: 'TEXT', required: false, ordine: 3 },
            { key: 'esposizioni', label: 'Esposizioni lavorative (chimiche, fisiche, biologiche)', type: 'TEXTAREA', required: false, ordine: 4 },
            { key: 'malattie_pregresse', label: 'Malattie pregresse rilevanti', type: 'TEXTAREA', required: false, ordine: 5 },
            { key: 'interventi_chirurgici', label: 'Interventi chirurgici', type: 'TEXTAREA', required: false, ordine: 6 },
            { key: 'allergie', label: 'Allergie note', type: 'TEXT', required: false, ordine: 7 },
            { key: 'terapie_in_corso', label: 'Terapie farmacologiche in corso', type: 'TEXTAREA', required: false, ordine: 8 },
            { key: 'fumo', label: 'Fumo di sigaretta', type: 'SELECT', required: false, ordine: 9, opzioni: ['Non fumatore', 'Ex fumatore', 'Fumatore < 10 sigarette/die', 'Fumatore ≥ 10 sigarette/die'] },
            { key: 'alcol', label: 'Consumo di alcol', type: 'SELECT', required: false, ordine: 10, opzioni: ['Nessuno', 'Occasionale', 'Moderato (< 2 unità/die)', 'Elevato (≥ 2 unità/die)'] },
            { key: 'sintomi_lavoro', label: 'Sintomi correlabili all\'attività lavorativa', type: 'TEXTAREA', required: false, ordine: 11 },
            { key: 'infortuni_pregressi', label: 'Infortuni sul lavoro pregressi', type: 'TEXTAREA', required: false, ordine: 12 },
            { key: 'malattie_professionali', label: 'Malattie professionali riconosciute', type: 'TEXTAREA', required: false, ordine: 13 }
        ]
    },

    // ============================================================
    // 3. SCHEDA DI SORVEGLIANZA SANITARIA (RIEPILOGO)
    // Rif: D.Lgs 81/08 art. 25 co. g, art. 41 co. 5
    // ============================================================
    {
        nome: 'Scheda Sorveglianza Sanitaria',
        codice: 'MDL-SORVEGLIANZA-001',
        tipo: 'SCHEDA_SORVEGLIANZA',
        fase: 'DURANTE_VISITA',
        descrizione: 'Scheda riepilogativa della sorveglianza sanitaria del lavoratore. Registra periodicità, esami effettuati, giudizio e scadenza successiva. Obbligatoria ex art. 41 co. 5 D.Lgs 81/08.',
        obbligatorio: true,
        richiedeFirma: false,
        richiedeFirmaMedico: true,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 30,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">SCHEDA DI SORVEGLIANZA SANITARIA</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 co. 5</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
<tr>
<td style="border: 1px solid #ccc; padding: 8px;"><strong>Lavoratore</strong></td>
<td style="border: 1px solid #ccc; padding: 8px;">{{NOME_LAVORATORE}}</td>
<td style="border: 1px solid #ccc; padding: 8px;"><strong>Data</strong></td>
<td style="border: 1px solid #ccc; padding: 8px;">{{DATA_VISITA}}</td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 8px;"><strong>Mansione</strong></td>
<td style="border: 1px solid #ccc; padding: 8px;">{{MANSIONE}}</td>
<td style="border: 1px solid #ccc; padding: 8px;"><strong>Tipo Visita</strong></td>
<td style="border: 1px solid #ccc; padding: 8px;">{{TIPO_VISITA}}</td>
</tr>
</table>

<h3>Esami Effettuati</h3>
<p>{{ESAMI_EFFETTUATI}}</p>

<h3>Accertamenti Strumentali</h3>
<p>{{ACCERTAMENTI_STRUMENTALI}}</p>

<h3>Giudizio di Idoneità</h3>
<p>{{GIUDIZIO_IDONEITA}}</p>

<h3>Scadenza Prossima Visita</h3>
<p>{{SCADENZA_PROSSIMA_VISITA}}</p>

<p style="margin-top: 40px;">Il Medico Competente: _________________________</p>
</div>`,
        campi: [
            { key: 'tipo_visita', label: 'Tipo di visita', type: 'SELECT', required: true, ordine: 1, opzioni: ['Preventiva', 'Periodica', 'Su richiesta lavoratore', 'Pre-ripresa lavorativa', 'Cambio mansione', 'Cessazione rapporto', 'Straordinaria'] },
            { key: 'esami_effettuati', label: 'Esami di laboratorio effettuati', type: 'TEXTAREA', required: false, ordine: 2 },
            { key: 'accertamenti_strumentali', label: 'Accertamenti strumentali effettuati', type: 'TEXTAREA', required: false, ordine: 3 },
            { key: 'rischi_esposti', label: 'Rischi per cui esposto', type: 'TEXTAREA', required: false, ordine: 4 },
            { key: 'giudizio_idoneita', label: 'Giudizio di idoneità', type: 'SELECT', required: true, ordine: 5, opzioni: ['Idoneo', 'Idoneo con prescrizioni', 'Idoneo con limitazioni', 'Temporaneamente non idoneo', 'Non idoneo'] },
            { key: 'scadenza_prossima_visita', label: 'Data prossima visita', type: 'DATE', required: false, ordine: 6 },
            { key: 'note_medico', label: 'Annotazioni del medico competente', type: 'TEXTAREA', required: false, ordine: 7 }
        ]
    },

    // ============================================================
    // 4. CARTELLA SANITARIA E DI RISCHIO - ALLEGATO 3A
    // Rif: D.Lgs 81/08 art. 25 co. c), art. 53, Allegato 3A
    // ============================================================
    {
        nome: 'Cartella Sanitaria e di Rischio',
        codice: 'MDL-CARTELLA-3A',
        tipo: 'ANAMNESI',
        fase: 'DURANTE_VISITA',
        descrizione: 'Cartella sanitaria e di rischio del lavoratore - Allegato 3A del D.Lgs 81/08. Documento personale obbligatorio tenuto dal medico competente per ogni lavoratore sottoposto a sorveglianza sanitaria.',
        obbligatorio: true,
        richiedeFirma: false,
        richiedeFirmaMedico: true,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 40,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">CARTELLA SANITARIA E DI RISCHIO</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 - Allegato 3A</p>

<h3>A. DATI IDENTIFICATIVI DEL LAVORATORE</h3>
<p>Nome: {{NOME}} | Cognome: {{COGNOME}} | Sesso: {{SESSO}} | Data nascita: {{DATA_NASCITA}} | Codice Fiscale: {{CF}}</p>

<h3>B. DATI AZIENDALI</h3>
<p>Azienda: {{AZIENDA}} | Mansione: {{MANSIONE}} | Reparto: {{REPARTO}}</p>
<p>Data assunzione: {{DATA_ASSUNZIONE}} | Data visita: {{DATA_VISITA}}</p>

<h3>C. VALUTAZIONE CLINICA</h3>
<h4>Esame obiettivo</h4>
<p>PA: {{PA}} | FC: {{FC}} | Peso: {{PESO}} kg | Altezza: {{ALTEZZA}} cm | BMI: {{BMI}}</p>
<p>Apparato respiratorio: {{APP_RESPIRATORIO}}</p>
<p>Apparato cardiovascolare: {{APP_CARDIOVASCOLARE}}</p>
<p>Apparato locomotore: {{APP_LOCOMOTORE}}</p>
<p>Sistema nervoso: {{SISTEMA_NERVOSO}}</p>
<p>Altro: {{ALTRO_ESAME_OBJ}}</p>

<h3>D. ESAMI COMPLEMENTARI</h3>
<p>{{ESAMI_COMPLEMENTARI}}</p>

<h3>E. GIUDIZIO DI IDONEITÀ</h3>
<p>{{GIUDIZIO}}</p>
</div>`,
        campi: [
            { key: 'pressione_arteriosa_sistolica', label: 'PA Sistolica (mmHg)', type: 'NUMBER', required: false, ordine: 1 },
            { key: 'pressione_arteriosa_diastolica', label: 'PA Diastolica (mmHg)', type: 'NUMBER', required: false, ordine: 2 },
            { key: 'frequenza_cardiaca', label: 'FC (bpm)', type: 'NUMBER', required: false, ordine: 3 },
            { key: 'peso', label: 'Peso (kg)', type: 'NUMBER', required: false, ordine: 4 },
            { key: 'altezza', label: 'Altezza (cm)', type: 'NUMBER', required: false, ordine: 5 },
            { key: 'bmi', label: 'BMI (calcolato)', type: 'NUMBER', required: false, ordine: 6 },
            { key: 'app_respiratorio', label: 'Apparato respiratorio', type: 'TEXTAREA', required: false, ordine: 7 },
            { key: 'app_cardiovascolare', label: 'Apparato cardiovascolare', type: 'TEXTAREA', required: false, ordine: 8 },
            { key: 'app_locomotore', label: 'Apparato locomotore/muscolo-scheletrico', type: 'TEXTAREA', required: false, ordine: 9 },
            { key: 'sistema_nervoso', label: 'Sistema nervoso', type: 'TEXTAREA', required: false, ordine: 10 },
            { key: 'emocromo', label: 'Emocromo', type: 'TEXTAREA', required: false, ordine: 11 },
            { key: 'glicemia', label: 'Glicemia (mg/dL)', type: 'NUMBER', required: false, ordine: 12 },
            { key: 'colesterolemia', label: 'Colesterolemia totale (mg/dL)', type: 'NUMBER', required: false, ordine: 13 },
            { key: 'altri_esami', label: 'Altri esami complementari', type: 'TEXTAREA', required: false, ordine: 14 },
            { key: 'diagnosi_principale', label: 'Diagnosi / Rilievi clinici', type: 'TEXTAREA', required: false, ordine: 15 },
            { key: 'giudizio_idoneita', label: 'Giudizio di idoneità', type: 'SELECT', required: true, ordine: 16, opzioni: ['Idoneo', 'Idoneo con prescrizioni', 'Idoneo con limitazioni', 'Temporaneamente non idoneo', 'Non idoneo'] }
        ]
    },

    // ============================================================
    // 5. GIUDIZIO DI IDONEITÀ LAVORATIVA
    // Rif: D.Lgs 81/08 art. 41 co. 6, 7, 8, 9 - Allegato 3B
    // ============================================================
    {
        nome: 'Giudizio di Idoneità Lavorativa',
        codice: 'MDL-IDONEITA-001',
        tipo: 'CERTIFICATO',
        fase: 'POST_VISITA',
        descrizione: 'Attestazione del giudizio di idoneità alla mansione specifica emessa dal medico competente ai sensi dell\'art. 41 co. 6 D.Lgs 81/08. Documento consegnato a lavoratore e datore di lavoro.',
        obbligatorio: true,
        richiedeFirma: false,
        richiedeFirmaMedico: true,
        branchTypes: ['MEDICA'],
        validitaGiorni: 365,
        ordine: 50,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">GIUDIZIO DI IDONEITÀ ALLA MANSIONE SPECIFICA</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 co. 6 - Allegato 3B</p>

<p>Il Medico Competente <strong>{{NOME_MEDICO}}</strong>, iscritto all'Albo Medici n. {{ALBO}},</p>

<p><strong>CERTIFICA</strong> che il lavoratore</p>

<p>Sig./Sig.ra <strong>{{NOME_LAVORATORE}}</strong>, nato/a il {{DATA_NASCITA}}, C.F. {{CF}},</p>
<p>dipendente di <strong>{{AZIENDA}}</strong>, mansione <strong>{{MANSIONE}}</strong>,</p>

<p>a seguito di visita medica effettuata in data <strong>{{DATA_VISITA}}</strong> è:</p>

<div style="border: 2px solid #333; padding: 15px; margin: 20px 0; font-size: 1.1em;">
<p><strong>{{GIUDIZIO_IDONEITA}}</strong></p>
</div>

<h3>Prescrizioni e Limitazioni</h3>
<p>{{PRESCRIZIONI}}</p>

<p>Scadenza prossima visita: <strong>{{SCADENZA}}</strong></p>

<p>Luogo e data: <strong>{{LUOGO}}</strong>, {{DATA_EMISSIONE}}</p>

<p style="margin-top: 40px;">Il Medico Competente<br/>_________________________<br/>{{NOME_MEDICO}}</p>
<p><em>Il presente giudizio può essere impugnato entro 30 giorni all'organo di vigilanza territorialmente competente ai sensi dell'art. 41 co. 9 D.Lgs 81/08.</em></p>
</div>`,
        campi: [
            { key: 'giudizio_idoneita', label: 'Giudizio di idoneità', type: 'SELECT', required: true, ordine: 1, opzioni: ['IDONEO alla mansione specifica', 'IDONEO CON PRESCRIZIONI alla mansione specifica', 'IDONEO CON LIMITAZIONI alla mansione specifica', 'TEMPORANEAMENTE NON IDONEO alla mansione specifica', 'NON IDONEO alla mansione specifica'] },
            { key: 'prescrizioni', label: 'Prescrizioni / Limitazioni specifiche', type: 'RICHTEXT', required: false, ordine: 2 },
            { key: 'dpi_prescritti', label: 'DPI aggiuntivi prescritti', type: 'TEXTAREA', required: false, ordine: 3 },
            { key: 'scadenza_prossima_visita', label: 'Scadenza prossima visita', type: 'DATE', required: false, ordine: 4 },
            { key: 'data_emissione', label: 'Data emissione', type: 'DATE', required: true, ordine: 5, defaultValue: 'TODAY' },
            { key: 'nr_registro', label: 'N° Registro', type: 'TEXT', required: false, ordine: 6 }
        ]
    },

    // ============================================================
    // 6. COMUNICAZIONE ESITO VISITA AL LAVORATORE
    // Rif: D.Lgs 81/08 art. 41 co. 6 e 8
    // ============================================================
    {
        nome: 'Comunicazione Esito Visita al Lavoratore',
        codice: 'MDL-COMUNICAZIONE-001',
        tipo: 'DICHIARAZIONE',
        fase: 'POST_VISITA',
        descrizione: 'Comunicazione scritta dell\'esito della visita e del giudizio di idoneità al lavoratore, ai sensi dell\'art. 41 co. 6 e 8 D.Lgs 81/08. Il lavoratore riceve sempre copia del giudizio.',
        obbligatorio: true,
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 60,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">COMUNICAZIONE ESITO VISITA MEDICA</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 co. 6</p>

<p>Gentile <strong>{{NOME_LAVORATORE}}</strong>,</p>

<p>a seguito della visita medica effettuata in data <strong>{{DATA_VISITA}}</strong>, Le comunico che il giudizio di idoneità alla mansione di <strong>{{MANSIONE}}</strong> è il seguente:</p>

<div style="border: 2px solid #333; padding: 15px; margin: 20px 0;">
<p><strong>{{GIUDIZIO_IDONEITA}}</strong></p>
<p>Prescrizioni/Limitazioni: {{PRESCRIZIONI}}</p>
</div>

<p>La prossima visita medica è prevista per: <strong>{{SCADENZA_PROSSIMA_VISITA}}</strong></p>

<p>In caso di insorgenza di malattie o condizioni che potrebbero influire sulla Sua idoneità lavorativa, La invitiamo a contattare il Medico Competente.</p>

<p><em>Ai sensi dell'art. 41 co. 9 D.Lgs 81/08, Lei ha facoltà di ricorrere avverso il giudizio di idoneità entro 30 giorni dalla comunicazione all'organo di vigilanza territorialmente competente.</em></p>

<table style="width: 100%; margin-top: 30px;">
<tr>
<td style="width: 50%;">Data ricezione: ________________<br/>Firma lavoratore: ________________</td>
<td style="width: 50%; text-align: right;">Il Medico Competente<br/>{{NOME_MEDICO}}</td>
</tr>
</table>
</div>`,
        campi: [
            { key: 'giudizio_sintetico', label: 'Giudizio (sintesi)', type: 'TEXT', required: true, ordine: 1 },
            { key: 'prescrizioni', label: 'Prescrizioni e limitazioni', type: 'TEXTAREA', required: false, ordine: 2 },
            { key: 'data_ricezione', label: 'Data ricezione comunicazione', type: 'DATE', required: false, ordine: 3 },
            { key: 'note', label: 'Note', type: 'TEXTAREA', required: false, ordine: 4 }
        ]
    },

    // ============================================================
    // 7. RICHIESTA VISITA SU ISTANZA DEL LAVORATORE
    // Rif: D.Lgs 81/08 art. 41 co. 2 lett. b
    // ============================================================
    {
        nome: 'Richiesta Visita su Istanza del Lavoratore',
        codice: 'MDL-RICHIESTA-LAVORATORE-001',
        tipo: 'MODULO_GENERICO',
        fase: 'PRE_VISITA',
        descrizione: 'Modulo di richiesta di visita medica su istanza del lavoratore ai sensi dell\'art. 41 co. 2 lett. b) D.Lgs 81/08. Il lavoratore può richiedere la visita quando ritiene che la propria salute possa essere correlata al lavoro.',
        obbligatorio: false,
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 70,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">RICHIESTA DI VISITA MEDICA SU ISTANZA DEL LAVORATORE</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 co. 2 lett. b)</p>

<p>Il/La sottoscritto/a <strong>{{NOME_LAVORATORE}}</strong>, dipendente di <strong>{{AZIENDA}}</strong>,</p>
<p>con mansione: <strong>{{MANSIONE}}</strong></p>

<p><strong>RICHIEDE</strong> di essere sottoposto/a a visita medica dal Medico Competente per le seguenti motivazioni:</p>

<p>{{MOTIVAZIONE_RICHIESTA}}</p>

<p>Sintomi/disturbi riferiti: {{SINTOMI}}</p>

<p>Data richiesta: {{DATA_RICHIESTA}}</p>
<p>Firma lavoratore: _________________________</p>
</div>`,
        campi: [
            { key: 'motivazione_richiesta', label: 'Motivazione della richiesta', type: 'RICHTEXT', required: true, ordine: 1 },
            { key: 'sintomi_riferiti', label: 'Sintomi / disturbi riferiti', type: 'TEXTAREA', required: false, ordine: 2 },
            { key: 'da_quando', label: 'Da quanto tempo presenti i sintomi', type: 'TEXT', required: false, ordine: 3 },
            { key: 'correlazione_lavoro', label: 'Correlazione con l\'attività lavorativa', type: 'TEXTAREA', required: false, ordine: 4 },
            { key: 'data_richiesta', label: 'Data richiesta', type: 'DATE', required: true, ordine: 5, defaultValue: 'TODAY' }
        ]
    },

    // ============================================================
    // 8. PRESCRIZIONI E LIMITAZIONI LAVORATIVE
    // Rif: D.Lgs 81/08 art. 41 co. 6 + Codice Deontologico
    // ============================================================
    {
        nome: 'Prescrizioni e Limitazioni Lavorative',
        codice: 'MDL-PRESCRIZIONI-001',
        tipo: 'PRESCRIZIONE',
        fase: 'POST_VISITA',
        descrizione: 'Documento recante le prescrizioni e limitazioni lavorative imposte dal medico competente nell\'ambito del giudizio di idoneità. Indica DPI aggiuntivi, orari ridotti, evitamento di rischi specifici e visite di controllo.',
        obbligatorio: false,
        richiedeFirma: true,
        richiedeFirmaMedico: true,
        branchTypes: ['MEDICA'],
        validitaGiorni: 365,
        ordine: 80,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">PRESCRIZIONI E LIMITAZIONI LAVORATIVE</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 art. 41 co. 6</p>

<p>Il Medico Competente prescrive per il lavoratore <strong>{{NOME_LAVORATORE}}</strong>,</p>
<p>mansione: <strong>{{MANSIONE}}</strong> — in data: <strong>{{DATA}}</strong></p>

<h3>Prescrizioni Obbligatorie (limitazioni assolute)</h3>
<p>{{PRESCRIZIONI_ASSOLUTE}}</p>

<h3>Limitazioni (raccomandazioni)</h3>
<p>{{LIMITAZIONI}}</p>

<h3>DPI Aggiuntivi Prescritti</h3>
<p>{{DPI_AGGIUNTIVI}}</p>

<h3>Adattamenti dell'Organizzazione del Lavoro</h3>
<p>{{ADATTAMENTI_ORGANIZZATIVI}}</p>

<h3>Visite di Controllo</h3>
<p>Periodicità: {{PERIODICITA_CONTROLLI}}</p>

<p>Firma lavoratore per presa visione: _________________________</p>
<p>Il Medico Competente: _________________________</p>
</div>`,
        campi: [
            { key: 'prescrizioni_assolute', label: 'Prescrizioni assolute (vietato/obbligatorio)', type: 'RICHTEXT', required: false, ordine: 1 },
            { key: 'limitazioni', label: 'Limitazioni raccomandate', type: 'RICHTEXT', required: false, ordine: 2 },
            { key: 'dpi_aggiuntivi', label: 'DPI aggiuntivi prescritti', type: 'TEXTAREA', required: false, ordine: 3 },
            { key: 'adattamenti_organizzativi', label: 'Adattamenti organizzativi (orari, turni, carichi)', type: 'TEXTAREA', required: false, ordine: 4 },
            { key: 'periodicita_controlli', label: 'Periodicità visite di controllo', type: 'SELECT', required: false, ordine: 5, opzioni: ['Mensile', 'Trimestrale', 'Semestrale', 'Annuale', 'Non indicata'] },
            { key: 'durata_prescrizioni', label: 'Durata prescrizioni', type: 'TEXT', required: false, ordine: 6 },
            { key: 'data_revisione', label: 'Data revisione prescrizioni', type: 'DATE', required: false, ordine: 7 }
        ]
    },

    // ============================================================
    // 9. QUESTIONARIO ALCOL E SOSTANZE STUPEFACENTI
    // Rif: L. 125/2001, D.Lgs 81/08, Provvedimento Stato-Regioni 18/09/2008
    // ============================================================
    {
        nome: 'Questionario Alcol e Sostanze Stupefacenti',
        codice: 'MDL-ALCOL-SOSTANZE-001',
        tipo: 'ALCOL_SCREENING',
        fase: 'PRE_VISITA',
        descrizione: 'Questionario anamnestico per la verifica dell\'esposizione ad alcol e sostanze stupefacenti per mansioni a rischio elevato. Obbligatorio per alcune categorie per Accordo Stato-Regioni 18/09/2008 e Provvedimento 30/10/2007.',
        obbligatorio: false,
        richiedeFirma: true,
        richiedeFirmaMedico: false,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 90,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">QUESTIONARIO ALCOL E SOSTANZE STUPEFACENTI</h2>
<p style="text-align: center; font-style: italic;">L. 125/2001 - D.Lgs 81/2008 - Accordo Stato-Regioni 18/09/2008</p>

<p><em>Il presente questionario è strettamente riservato e trattato dal Medico Competente nel rispetto del D.Lgs 196/2003 e GDPR 679/2016.</em></p>

<h3>SEZIONE ALCOL (AUDIT-C)</h3>
<ol>
<li>Con quale frequenza assume bevande alcoliche? {{FREQUENZA_ALCOL}}</li>
<li>Nelle giornate in cui beve, quante unità alcoliche consuma? {{UNITA_ALCOL}}</li>
<li>Con quale frequenza consuma 6 o più unità alcoliche in un'unica occasione? {{BINGE_DRINKING}}</li>
</ol>

<h3>SEZIONE SOSTANZE</h3>
<p>Uso attuale o pregresso di sostanze stupefacenti: {{USO_SOSTANZE}}</p>
<p>Terapie sostitutive in corso: {{TERAPIE_SOSTITUTIVE}}</p>

<p>Data: {{DATA}}</p>
<p>Il lavoratore dichiara il vero e firma: _________________________</p>
</div>`,
        campi: [
            { key: 'audit_c_q1', label: 'AUDIT-C: Frequenza consumo alcolici', type: 'SELECT', required: false, ordine: 1, opzioni: ['Mai', 'Meno di 1 volta/mese', '2-4 volte/mese', '2-3 volte/settimana', '4+ volte/settimana'] },
            { key: 'audit_c_q2', label: 'AUDIT-C: Unità alcoliche per giornata di consumo', type: 'SELECT', required: false, ordine: 2, opzioni: ['1-2', '3-4', '5-6', '7-9', '10 o più'] },
            { key: 'audit_c_q3', label: 'AUDIT-C: Frequenza consumo ≥ 6 unità', type: 'SELECT', required: false, ordine: 3, opzioni: ['Mai', 'Meno di 1 volta/mese', 'Mensilmente', 'Settimanalmente', 'Ogni giorno / quasi ogni giorno'] },
            { key: 'audit_c_score', label: 'AUDIT-C Score totale', type: 'NUMBER', required: false, ordine: 4 },
            { key: 'uso_sostanze', label: 'Uso attuale/pregresso sostanze stupefacenti', type: 'SELECT', required: false, ordine: 5, opzioni: ['Nessuno', 'Uso pregresso (>1 anno fa)', 'Uso saltuario', 'Uso regolare'] },
            { key: 'sostanze_specifiche', label: 'Tipo di sostanze (se applicabile)', type: 'TEXT', required: false, ordine: 6 },
            { key: 'terapie_sostitutive', label: 'Terapie sostitutive in corso', type: 'TEXT', required: false, ordine: 7 },
            { key: 'mansione_rischio', label: 'Mansione a rischio (da Provvedimento 30/10/2007)', type: 'CHECKBOX', required: false, ordine: 8 }
        ]
    },

    // ============================================================
    // 10. SCHEDA VALUTAZIONE RISCHI SPECIFICI
    // Rif: D.Lgs 81/08 art. 28, 29 - Valutazione dei Rischi
    // ============================================================
    {
        nome: 'Scheda Rischi Specifici Lavorativi',
        codice: 'MDL-RISCHI-001',
        tipo: 'QUESTIONARIO_RISCHIO',
        fase: 'PRE_VISITA',
        descrizione: 'Scheda per la valutazione dei rischi specifici a cui è esposto il lavoratore, utile al medico competente per definire il protocollo di sorveglianza sanitaria adeguato. Basata su D.Lgs 81/08 Titoli IV-XII.',
        obbligatorio: false,
        richiedeFirma: false,
        richiedeFirmaMedico: false,
        branchTypes: ['MEDICA'],
        validitaGiorni: null,
        ordine: 100,
        contenutoHtml: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<h2 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">SCHEDA RISCHI SPECIFICI LAVORATIVI</h2>
<p style="text-align: center; font-style: italic;">D.Lgs 81/2008 - Valutazione dei rischi per la sorveglianza sanitaria</p>

<p>Lavoratore: <strong>{{NOME_LAVORATORE}}</strong> | Mansione: <strong>{{MANSIONE}}</strong> | Data: {{DATA}}</p>

<h3>RISCHI FISICI</h3>
<p>Rumore (D.Lgs 81/08 Tit. VIII): {{RISCHIO_RUMORE}}</p>
<p>Vibrazioni (D.Lgs 81/08 Tit. VIII): {{RISCHIO_VIBRAZIONI}}</p>
<p>Radiazioni ottiche artificiali: {{RISCHIO_ROA}}</p>
<p>VDT/Videoterminale: {{RISCHIO_VDT}}</p>
<p>Movimentazione manuale carichi: {{RISCHIO_MMC}}</p>
<p>Lavoro in quota: {{RISCHIO_QUOTA}}</p>
<p>Agenti atmosferici/microclima: {{RISCHIO_MICROCLIMA}}</p>

<h3>RISCHI CHIMICI</h3>
<p>Agenti chimici pericolosi (D.Lgs 81/08 Tit. IX): {{RISCHIO_CHIMICO}}</p>
<p>Agenti cancerogeni/mutageni: {{RISCHIO_CMR}}</p>
<p>Amianto: {{RISCHIO_AMIANTO}}</p>

<h3>RISCHI BIOLOGICI</h3>
<p>Agenti biologici (D.Lgs 81/08 Tit. X): {{RISCHIO_BIOLOGICO}}</p>

<h3>RISCHI ERGONOMICI/ORGANIZZATIVI</h3>
<p>Posture fisse/movimenti ripetitivi: {{RISCHIO_ERGONOMICO}}</p>
<p>Lavoro notturno/turni: {{RISCHIO_TURNI}}</p>
<p>Stress lavoro-correlato: {{RISCHIO_STRESS}}</p>
</div>`,
        campi: [
            { key: 'rischio_rumore', label: 'Esposizione a rumore (LEX dB)', type: 'SELECT', required: false, ordine: 1, opzioni: ['Non esposto', '70-80 dB(A)', '80-85 dB(A)', '85-87 dB(A)', '> 87 dB(A)'] },
            { key: 'rischio_vibrazioni_mav', label: 'Vibrazioni mano-braccio (m/s²)', type: 'SELECT', required: false, ordine: 2, opzioni: ['Non esposto', '< 2.5', '2.5-5.0', '> 5.0'] },
            { key: 'rischio_vibrazioni_wbv', label: 'Vibrazioni corpo intero (m/s²)', type: 'SELECT', required: false, ordine: 3, opzioni: ['Non esposto', '< 0.5', '0.5-1.15', '> 1.15'] },
            { key: 'rischio_vdt', label: 'Utilizzo VDT (h/die)', type: 'SELECT', required: false, ordine: 4, opzioni: ['Non esposto', '< 2h', '2-4h', '> 4h (lavoratore VDT)'] },
            { key: 'rischio_mmc', label: 'Movimentazione Manuale Carichi (NIOSH/MAPO)', type: 'SELECT', required: false, ordine: 5, opzioni: ['Assente', 'Lieve (indice < 1)', 'Moderato (indice 1-2)', 'Elevato (indice > 2)'] },
            { key: 'rischio_chimico', label: 'Esposizione ad agenti chimici', type: 'TEXTAREA', required: false, ordine: 6 },
            { key: 'rischio_cmr', label: 'Esposizione ad agenti CMR (cancerogeni/mutageni)', type: 'TEXTAREA', required: false, ordine: 7 },
            { key: 'rischio_biologico', label: 'Esposizione ad agenti biologici', type: 'TEXTAREA', required: false, ordine: 8 },
            { key: 'rischio_ergonomico', label: 'Rischio ergonomico (posture/movimenti ripetitivi)', type: 'SELECT', required: false, ordine: 9, opzioni: ['Assente', 'Lieve', 'Moderato', 'Elevato'] },
            { key: 'lavoro_notturno', label: 'Lavoro notturno/su turni', type: 'CHECKBOX', required: false, ordine: 10 },
            { key: 'note_rischi', label: 'Note aggiuntive sui rischi', type: 'TEXTAREA', required: false, ordine: 11 }
        ]
    }
];

/**
 * Normalizza un campo MDL dal formato sorgente (con 'key', tipi uppercase, 'opzioni')
 * al formato CampoQuestionario atteso dal renderer e dal DB (name, tipi lowercase, options).
 * @param {Object} campo - Campo grezzo dal template
 * @returns {Object} Campo normalizzato
 */
function normalizeCampo(campo) {
    const TYPE_MAP = {
        TEXT: 'text', TEXTAREA: 'textarea', RICHTEXT: 'textarea',
        NUMBER: 'number', DATE: 'date', SELECT: 'select',
        CHECKBOX: 'boolean', BOOLEAN: 'boolean', RADIO: 'radio',
        MULTISELECT: 'multiselect', SCALE: 'scale', FILE: 'text'
    };
    return {
        // 'key' → 'name' (identifier used by QuestionarioRenderer)
        name: campo.name || campo.key || campo.id,
        label: campo.label,
        type: TYPE_MAP[campo.type] || campo.type?.toLowerCase() || 'text',
        required: campo.required ?? false,
        ordine: campo.ordine ?? 0,
        // 'opzioni' → 'options' (both array of strings are accepted by normalizeOptions)
        ...(campo.options ? { options: campo.options } : {}),
        ...(campo.opzioni ? { options: campo.opzioni } : {}),
        ...(campo.defaultValue !== undefined ? { defaultValue: campo.defaultValue } : {}),
        ...(campo.placeholder ? { placeholder: campo.placeholder } : {}),
        ...(campo.helpText ? { helpText: campo.helpText } : {}),
    };
}

/**
 * Restituisce i template MDL con i campi serializzati per Prisma
 * @param {string} tenantId - ID del tenant
 * @returns {Array} Template pronti per essere inseriti nel database
 */
export function getMDLTemplatesForTenant(tenantId) {
    return MDL_NORMATIVA_TEMPLATES.map(t => ({
        tenantId,
        nome: t.nome,
        codice: t.codice,
        tipo: t.tipo,
        fase: t.fase,
        descrizione: t.descrizione,
        obbligatorio: t.obbligatorio,
        richiedeFirma: t.richiedeFirma ?? false,
        richiedeFirmaMedico: t.richiedeFirmaMedico ?? false,
        branchTypes: t.branchTypes ?? ['MEDICA'],
        validitaGiorni: t.validitaGiorni ?? null,
        ordine: t.ordine,
        isActive: true,
        contenutoHtml: t.contenutoHtml,
        // Normalize campi: key→name, uppercase types→lowercase, opzioni→options
        campi: (t.campi ?? []).map(normalizeCampo),
        questionarioConfig: null
    }));
}
