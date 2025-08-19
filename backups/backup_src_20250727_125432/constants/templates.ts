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

// Definisci i nomi delle entità
export const ENTITY_LABELS = {
  'scheduled-courses': 'Corsi Programmati',
  'courses': 'Corsi',
  'trainers': 'Formatori',
  'employees': 'Dipendenti',
  'companies': 'Aziende',
};

// Definisci i campi per ogni entità
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
    { desc: 'Azienda', placeholder: 'azienda' },
    { desc: 'Ruolo', placeholder: 'ruolo' },
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

// Placeholder per lettere di incarico
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

// Placeholder per attestati
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