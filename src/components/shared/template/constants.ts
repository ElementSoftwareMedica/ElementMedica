export const TEMPLATE_TYPES = [
  { value: 'attestato', label: 'Attestati' },
  { value: 'lettera_incarico', label: 'Lettere di Incarico' },
  { value: 'registro_presenze', label: 'Registri Presenze' },
  { value: 'fattura', label: 'Fatture' },
  { value: 'visita', label: 'Visite' },
  { value: 'preventivo', label: 'Preventivi' },
];

export const FILE_FORMATS = [
  { value: 'text', label: 'Documento di testo' },
  { value: 'pptx', label: 'Presentazione Slides' },
];

export const ENTITY_FIELDS = {
  'scheduled-courses': [
    { desc: 'Nome corso', placeholder: 'corso_nome' },
    { desc: 'Docente principale', placeholder: 'docente_nome' },
    { desc: 'Co-relatore/i', placeholder: 'co_relatori' },
    { desc: 'Data 1 (prima sessione)', placeholder: 'data_1' },
    { desc: 'Data 2 (seconda sessione)', placeholder: 'data_2' },
    { desc: 'Orario 1', placeholder: 'orario_1' },
    { desc: 'Orario 2', placeholder: 'orario_2' },
    { desc: 'Luogo', placeholder: 'luogo' },
    { desc: 'Modalità di erogazione', placeholder: 'modalita_erogazione' },
    { desc: 'Lista partecipanti (tutti)', placeholder: 'lista_partecipanti' },
    { desc: 'Lista partecipanti in data 1', placeholder: 'lista_partecipanti_data_1' },
    { desc: 'Lista partecipanti in data 2', placeholder: 'lista_partecipanti_data_2' },
    { desc: 'Nome azienda', placeholder: 'azienda_nome' },
    { desc: 'Stato programma', placeholder: 'stato_programma' },
    { desc: 'Note', placeholder: 'note' },
    { desc: 'Durata totale (ore)', placeholder: 'durata_ore' },
    { desc: 'Codice corso', placeholder: 'codice_corso' },
    { desc: 'Relatore/i', placeholder: 'relatori' },
    { desc: 'Numero partecipanti', placeholder: 'numero_partecipanti' },
    { desc: 'Data generazione documento', placeholder: 'data_generazione_template' },
    { desc: 'Numero progressivo', placeholder: 'numero_progressivo' },
  ],
  'courses': [
    { desc: 'Titolo corso', placeholder: 'corso_titolo' },
    { desc: 'Normativa', placeholder: 'normativa' },
    { desc: 'Ore corso', placeholder: 'ore_corso' },
    { desc: 'Modalità', placeholder: 'modalita' },
    { desc: 'ATECO', placeholder: 'ateco' },
    { desc: 'Contenuti', placeholder: 'contenuti' },
    { desc: 'Codice corso', placeholder: 'codice_corso' },
  ],
  'trainers': [
    { desc: 'Nome', placeholder: 'nome' },
    { desc: 'Cognome', placeholder: 'cognome' },
    { desc: 'Specialità', placeholder: 'specialita' },
    { desc: 'Email', placeholder: 'email' },
    { desc: 'Telefono', placeholder: 'telefono' },
    { desc: 'Codice Fiscale', placeholder: 'codice_fiscale' },
    { desc: 'Note', placeholder: 'note' },
    { desc: 'Indirizzo', placeholder: 'indirizzo' },
    { desc: 'Città', placeholder: 'citta' },
    { desc: 'Provincia', placeholder: 'provincia' },
    { desc: 'CAP', placeholder: 'cap' },
    { desc: 'Data di nascita', placeholder: 'data_nascita' },
    { desc: 'Luogo di nascita', placeholder: 'luogo_nascita' },
    { desc: 'Partita IVA', placeholder: 'piva' },
    { desc: 'IBAN', placeholder: 'iban' },
    { desc: 'PEC', placeholder: 'pec' },
    { desc: 'SDI', placeholder: 'sdi' },
  ],
  'employees': [
    { desc: 'Nome', placeholder: 'nome' },
    { desc: 'Cognome', placeholder: 'cognome' },
    { desc: 'Codice Fiscale', placeholder: 'codice_fiscale' },
    { desc: 'Email', placeholder: 'email' },
    { desc: 'Telefono', placeholder: 'telefono' },
    { desc: 'Data Nascita', placeholder: 'data_nascita' },
    { desc: 'Indirizzo', placeholder: 'indirizzo' },
    { desc: 'Città', placeholder: 'citta' },
    { desc: 'Provincia', placeholder: 'provincia' },
    { desc: 'CAP', placeholder: 'cap' },
    { desc: 'Ruolo', placeholder: 'ruolo' },
    { desc: 'Azienda', placeholder: 'azienda' },
    { desc: 'Username', placeholder: 'username' },
    { desc: 'Note', placeholder: 'note' },
    { desc: 'Stato', placeholder: 'stato' },
    { desc: 'Data Creazione', placeholder: 'data_creazione' },
    { desc: 'Profilo Professionale', placeholder: 'profilo_professionale' },
    { desc: 'Data Assunzione', placeholder: 'data_assunzione' },
  ],
  'companies': [
    { desc: 'Ragione Sociale', placeholder: 'ragione_sociale' },
    { desc: 'Codice ATECO', placeholder: 'codice_ateco' },
    { desc: 'P.IVA', placeholder: 'piva' },
    { desc: 'Codice Fiscale', placeholder: 'codice_fiscale' },
    { desc: 'SDI', placeholder: 'sdi' },
    { desc: 'PEC', placeholder: 'pec' },
    { desc: 'IBAN', placeholder: 'iban' },
    { desc: 'Sede Azienda', placeholder: 'sede_azienda' },
    { desc: 'Città', placeholder: 'citta' },
    { desc: 'Provincia', placeholder: 'provincia' },
    { desc: 'CAP', placeholder: 'cap' },
    { desc: 'Persona di Riferimento', placeholder: 'persona_riferimento' },
    { desc: 'Mail', placeholder: 'mail' },
    { desc: 'Telefono', placeholder: 'telefono' },
    { desc: 'Note', placeholder: 'note' },
  ],
};

export const ENTITY_LABELS = {
  'scheduled-courses': 'Corsi Programmati',
  'courses': 'Corsi',
  'trainers': 'Formatori',
  'employees': 'Dipendenti',
  'companies': 'Aziende',
};

export const PLACEHOLDER_GROUPS = {
  'scheduled-courses': [
    '{{corso_nome}}', '{{data_1}}', '{{data_2}}', '{{data_generazione_template}}',
    '{{sessioni}}',
    '{{sessione_1_data}}', '{{sessione_1_orario_inizio}}', '{{sessione_1_orario_fine}}',
    '{{sessione_2_data}}', '{{sessione_2_orario_inizio}}', '{{sessione_2_orario_fine}}',
    '{{sessione_3_data}}', '{{sessione_3_orario_inizio}}', '{{sessione_3_orario_fine}}',
    '{{sessione_4_data}}', '{{sessione_4_orario_inizio}}', '{{sessione_4_orario_fine}}',
    '{{Ore corso}}', '{{modalita_erogazione}}', '{{numero_progressivo}}',
  ],
  'courses': [
    '{{corso_nome}}', '{{Ore corso}}', '{{Normativa}}', '{{contenuti}}', '{{modalita_erogazione}}', '{{numero_progressivo}}', '{{data_generazione_template}}', '{{codice_corso}}',
  ],
  'trainers': [
    '{{formatore_nome}}', '{{formatore_cognome}}', '{{Relatore}}', '{{formatore_codice_fiscale}}', '{{formatore_email}}', '{{formatore_telefono}}', '{{formatore_specialita}}',
    '{{corelatore_nome}}', '{{corelatore_cognome}}', '{{corelatore_codice_fiscale}}', '{{corelatore_email}}', '{{corelatore_telefono}}', '{{corelatore_specialita}}',
  ],
  'employees': [
    '{{dipendente_nome}}', '{{dipendente_cognome}}', '{{dipendente_codice_fiscale}}', '{{dipendente_email}}', '{{dipendente_telefono}}', '{{dipendente_data_nascita}}', '{{dipendente_indirizzo}}', '{{dipendente_citta}}', '{{dipendente_provincia}}', '{{dipendente_cap}}', '{{ruolo}}', '{{azienda}}', '{{dipendente_username}}', '{{dipendente_note}}', '{{dipendente_stato}}', '{{dipendente_data_creazione}}', '{{dipendente_profilo_professionale}}', '{{dipendente_data_assunzione}}',
  ],
  'companies': [
    '{{azienda}}', '{{azienda_piva}}', '{{azienda_codice_fiscale}}', '{{azienda_sdi}}', '{{azienda_pec}}', '{{azienda_iban}}', '{{azienda_sede}}', '{{azienda_citta}}', '{{azienda_provincia}}', '{{azienda_cap}}', '{{azienda_persona_riferimento}}', '{{azienda_mail}}', '{{azienda_telefono}}', '{{azienda_note}}', '{{ateco}}',
  ],
};

export const LETTERA_PLACEHOLDERS = [
  { key: '{{ORE_TOTALI}}', label: 'Ore totali per formatore' },
  { key: '{{PRIMA_DATA}}', label: 'Prima data per formatore' },
  { key: '{{ULTIMA_DATA}}', label: 'Ultima data per formatore' },
  { key: '{{TARIFFA_ORARIA}}', label: 'Tariffa oraria' },
  { key: '{{COMPENSO_TOTALE}}', label: 'Compenso totale' },
  { key: '{{DATA_GENERAZIONE}}', label: 'Data generazione lettera' },
  { key: '{{NUMERO_PROGRESSIVO}}', label: 'Numero progressivo' },
  { key: '{{formatore_indirizzo}}', label: 'Indirizzo residenza formatore' },
  { key: '{{formatore_citta}}', label: 'Città residenza formatore' },
  { key: '{{formatore_provincia}}', label: 'Provincia residenza formatore' },
  { key: '{{formatore_cap}}', label: 'CAP residenza formatore' },
  { key: '{{formatore_data_nascita}}', label: 'Data di nascita formatore' },
  { key: '{{formatore_luogo_nascita}}', label: 'Luogo di nascita formatore' },
];

export const ATTESTATO_PLACEHOLDERS = [
  { key: '{{dipendente_nome}}', label: 'Nome del dipendente' },
  { key: '{{dipendente_cognome}}', label: 'Cognome del dipendente' },
  { key: '{{corso_nome}}', label: 'Nome del corso' },
  { key: '{{Ore corso}}', label: 'Durata del corso in ore' },
  { key: '{{data_1}}', label: 'Data inizio corso' },
  { key: '{{data_2}}', label: 'Data fine corso' },
  { key: '{{data_generazione_template}}', label: 'Data generazione attestato' },
  { key: '{{numero_progressivo}}', label: 'Numero progressivo attestato' },
];

export const LOCAL_STORAGE_KEY = 'elementsoftware_templates';

export const SETTINGS_TABS = [
  { id: 'generali', label: 'Generali' },
  { id: 'templates', label: 'Templates' },
  { id: 'utenti', label: 'Utenti' },
  { id: 'ruoli', label: 'Ruoli' },
  { id: 'log-attivita', label: 'Log Attività' },
];