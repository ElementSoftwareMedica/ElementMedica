/**
 * Catalogo consensi — metadati canonici dei moduli consenso (senza i testi lunghi).
 *
 * Vocabolario unico usato sia dalla firma tablet (ConsensoModulo.codice) sia dal
 * sistema GDPR (ConsentRecord.consentType). Mantiene allineati i due mondi:
 * `ConsentRecord.consentType` === `ConsensoModulo.codice`.
 *
 * NB: i testi completi e gli eventuali override per-tenant restano in
 * consenso-moduli.routes.js / ConsensoFirmaService.js. Qui solo i metadati per UI/validazione.
 *
 * @module services/clinical/consensiModuliCatalog
 */

export const CONSENSI_MODULI_CATALOG = [
    { codice: 'gdpr', titolo: 'Consenso al trattamento dei dati personali (GDPR)', sottotitolo: 'Artt. 13–14 del Regolamento UE 2016/679', obbligatorio: true, ordine: 1, validitaGiorni: null },
    { codice: 'sanitari', titolo: 'Consenso al trattamento dei dati sanitari', sottotitolo: 'Art. 9 del Regolamento UE 2016/679 — Dati particolari relativi alla salute', obbligatorio: true, ordine: 2, validitaGiorni: null },
    { codice: 'prestazione', titolo: 'Consenso informato alla prestazione sanitaria', sottotitolo: 'Consenso al trattamento diagnostico/terapeutico — Legge 219/2017', obbligatorio: false, ordine: 3, validitaGiorni: null },
    { codice: 'chirurgico', titolo: 'Consenso informato a intervento chirurgico/invasivo', sottotitolo: 'Interventi in anestesia locale/locoregionale/generale', obbligatorio: false, ordine: 4, validitaGiorni: null },
    { codice: 'marketing', titolo: 'Consenso a comunicazioni marketing', sottotitolo: 'Comunicazioni promozionali, informative e iniziative della struttura', obbligatorio: false, ordine: 5, validitaGiorni: 3650 },
    { codice: 'comunicazioni', titolo: 'Consenso a promemoria e comunicazioni di servizio', sottotitolo: 'Reminder appuntamenti, indicazioni operative e comunicazioni amministrative', obbligatorio: false, ordine: 6, validitaGiorni: 3650 },
    { codice: 'fse_alimentazione', titolo: 'Consenso alimentazione Fascicolo Sanitario Elettronico', sottotitolo: 'Inserimento dei documenti sanitari nel FSE', obbligatorio: false, ordine: 7, validitaGiorni: 3650 },
    { codice: 'fse_consultazione', titolo: 'Consenso consultazione Fascicolo Sanitario Elettronico', sottotitolo: 'Consultazione del FSE da parte dei professionisti autorizzati', obbligatorio: false, ordine: 8, validitaGiorni: 3650 },
    { codice: 'fse_pregresso', titolo: 'Consenso recupero dati pregressi FSE', sottotitolo: 'Consultazione dei documenti sanitari già presenti nel FSE', obbligatorio: false, ordine: 9, validitaGiorni: 3650 },
    { codice: 'mdl_sorveglianza', titolo: 'Consenso sorveglianza sanitaria Medicina del Lavoro', sottotitolo: 'D.Lgs. 81/2008 - visite, accertamenti e giudizio di idoneità', obbligatorio: true, ordine: 10, validitaGiorni: 365 },
];

/** Solo i codici canonici (per validazione consentType). */
export const CONSENSI_MODULI_CODICI = CONSENSI_MODULI_CATALOG.map((m) => m.codice);

export default CONSENSI_MODULI_CATALOG;
