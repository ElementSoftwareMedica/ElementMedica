/**
 * MovimentoContabile Validation Middleware
 * 
 * Validazioni per le API dei movimenti contabili.
 * 
 * PROGETTO 59 - Modello Unificato COSTI e RICAVI
 * 
 * @module validations/movimento-contabile.validation
 * @version 1.0.0
 */

import { body, param, query, validationResult } from 'express-validator';

// ============================================
// ENUMS PER VALIDAZIONE
// ============================================

const DIREZIONI_VALIDE = ['ENTRATA', 'USCITA'];

const TIPI_ATTIVITA_VALIDI = [
    'VISITA_MEDICA', 'PRESTAZIONE_CLINICA', 'REFERTO',
    'VISITA_MDL', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP',
    'DVR_STESURA', 'DVR_AGGIORNAMENTO',
    'NOMINA_MC', 'NOMINA_RSPP',
    'GIUDIZIO_IDONEITA', 'ALLEGATO_3B',
    'CORSO_FORMAZIONE', 'DOCENZA', 'ATTESTATO',
    'BUNDLE', 'CONVENZIONE', 'CONSULENZA',
    'SPESA_FISSA', 'SPESA_RICORRENTE', 'RIMBORSO'
];

const STATI_VALIDI = ['BOZZA', 'DA_FATTURARE', 'CONFERMATO', 'FATTURATO', 'PAGATO', 'ANNULLATO', 'STORNATO'];

const TIPI_SOGGETTO_VALIDI = ['PAZIENTE', 'AZIENDA', 'DIPENDENTE', 'MEDICO', 'FORMATORE', 'RSPP', 'FORNITORE'];

const BRANCH_TYPES = ['MEDICA', 'FORMAZIONE'];

// ============================================
// VALIDATION HANDLER
// ============================================

/**
 * Middleware per gestire errori di validazione
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ============================================
// CREAZIONE MOVIMENTO
// ============================================

/**
 * Validazione per creazione movimento contabile
 */
export const validateCreateMovimento = [
    body('direzione')
        .isString()
        .isIn(DIREZIONI_VALIDE)
        .withMessage(`Direzione deve essere uno tra: ${DIREZIONI_VALIDE.join(', ')}`),

    body('tipo')
        .isString()
        .isIn(TIPI_ATTIVITA_VALIDI)
        .withMessage(`Tipo attività non valido`),

    body('tipoSoggetto')
        .isString()
        .isIn(TIPI_SOGGETTO_VALIDI)
        .withMessage(`Tipo soggetto deve essere uno tra: ${TIPI_SOGGETTO_VALIDI.join(', ')}`),

    body('importoLordo')
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Importo lordo deve essere un numero decimale')
        .custom(value => parseFloat(value) >= 0)
        .withMessage('Importo lordo non può essere negativo'),

    body('importoNetto')
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Importo netto deve essere un numero decimale')
        .custom(value => parseFloat(value) >= 0)
        .withMessage('Importo netto non può essere negativo'),

    body('dataEsecuzione')
        .isISO8601()
        .toDate()
        .withMessage('Data esecuzione deve essere una data valida ISO8601'),

    body('aliquotaIva')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .custom(value => parseFloat(value) >= 0 && parseFloat(value) <= 100)
        .withMessage('Aliquota IVA deve essere tra 0 e 100'),

    body('importoIva')
        .optional()
        .isDecimal({ decimal_digits: '0,2' }),

    body('stato')
        .optional()
        .isIn(STATI_VALIDI)
        .withMessage(`Stato deve essere uno tra: ${STATI_VALIDI.join(', ')}`),

    body('personId')
        .optional()
        .isUUID()
        .withMessage('personId deve essere un UUID valido'),

    body('companyTenantProfileId')
        .optional()
        .isUUID()
        .withMessage('companyTenantProfileId deve essere un UUID valido'),

    body('siteId')
        .optional()
        .isUUID()
        .withMessage('siteId deve essere un UUID valido'),

    body('visitaId')
        .optional()
        .isUUID()
        .withMessage('visitaId deve essere un UUID valido'),

    body('appuntamentoId')
        .optional()
        .isUUID()
        .withMessage('appuntamentoId deve essere un UUID valido'),

    body('sopralluogoId')
        .optional()
        .isUUID()
        .withMessage('sopralluogoId deve essere un UUID valido'),

    body('dvrId')
        .optional()
        .isUUID()
        .withMessage('dvrId deve essere un UUID valido'),

    body('nominaRuoloId')
        .optional()
        .isUUID()
        .withMessage('nominaRuoloId deve essere un UUID valido'),

    body('courseScheduleId')
        .optional()
        .isUUID()
        .withMessage('courseScheduleId deve essere un UUID valido'),

    body('bundleId')
        .optional()
        .isUUID()
        .withMessage('bundleId deve essere un UUID valido'),

    body('dataScadenza')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Data scadenza deve essere una data valida ISO8601'),

    body('branchType')
        .optional()
        .isIn(BRANCH_TYPES)
        .withMessage(`Branch type deve essere uno tra: ${BRANCH_TYPES.join(', ')}`),

    body('descrizione')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Descrizione massimo 1000 caratteri'),

    body('note')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Note massimo 2000 caratteri'),

    handleValidationErrors
];

// ============================================
// AGGIORNAMENTO MOVIMENTO
// ============================================

/**
 * Validazione per aggiornamento movimento
 */
export const validateUpdateMovimento = [
    param('id')
        .isUUID()
        .withMessage('ID movimento deve essere un UUID valido'),

    body('importoLordo')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .custom(value => parseFloat(value) >= 0)
        .withMessage('Importo lordo non può essere negativo'),

    body('importoNetto')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .custom(value => parseFloat(value) >= 0)
        .withMessage('Importo netto non può essere negativo'),

    body('aliquotaIva')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .custom(value => parseFloat(value) >= 0 && parseFloat(value) <= 100)
        .withMessage('Aliquota IVA deve essere tra 0 e 100'),

    body('dataScadenza')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Data scadenza deve essere una data valida ISO8601'),

    body('descrizione')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 }),

    body('note')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 2000 }),

    handleValidationErrors
];

// ============================================
// CAMBIO STATO
// ============================================

/**
 * Validazione per cambio stato
 */
export const validateCambioStato = [
    param('id')
        .isUUID()
        .withMessage('ID movimento deve essere un UUID valido'),

    body('stato')
        .isString()
        .isIn(STATI_VALIDI)
        .withMessage(`Stato deve essere uno tra: ${STATI_VALIDI.join(', ')}`),

    body('dataPagamento')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Data pagamento deve essere una data valida'),

    body('metodoPagamento')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 }),

    body('riferimentoPagamento')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 200 }),

    handleValidationErrors
];

// ============================================
// CANCELLAZIONE (GDPR)
// ============================================

/**
 * Validazione per cancellazione (soft delete con motivo GDPR)
 */
export const validateDeleteMovimento = [
    param('id')
        .isUUID()
        .withMessage('ID movimento deve essere un UUID valido'),

    body('deletionReason')
        .isString()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Il motivo della cancellazione deve essere tra 10 e 500 caratteri (requisito GDPR)'),

    handleValidationErrors
];

// ============================================
// QUERY / LISTA
// ============================================

/**
 * Validazione per filtri di ricerca
 */
export const validateQueryMovimenti = [
    query('direzione')
        .optional()
        .isIn(DIREZIONI_VALIDE)
        .withMessage(`Direzione deve essere uno tra: ${DIREZIONI_VALIDE.join(', ')}`),

    query('tipo')
        .optional()
        .isIn(TIPI_ATTIVITA_VALIDI)
        .withMessage('Tipo attività non valido'),

    query('stato')
        .optional()
        .isIn(STATI_VALIDI)
        .withMessage(`Stato deve essere uno tra: ${STATI_VALIDI.join(', ')}`),

    query('tipoSoggetto')
        .optional()
        .isIn(TIPI_SOGGETTO_VALIDI)
        .withMessage(`Tipo soggetto deve essere uno tra: ${TIPI_SOGGETTO_VALIDI.join(', ')}`),

    query('personId')
        .optional()
        .isUUID()
        .withMessage('personId deve essere un UUID valido'),

    query('companyTenantProfileId')
        .optional()
        .isUUID()
        .withMessage('companyTenantProfileId deve essere un UUID valido'),

    query('branchType')
        .optional()
        .isIn(BRANCH_TYPES)
        .withMessage(`Branch type deve essere uno tra: ${BRANCH_TYPES.join(', ')}`),

    query('dataEsecuzioneDa')
        .optional()
        .isISO8601()
        .withMessage('dataEsecuzioneDa deve essere una data ISO8601'),

    query('dataEsecuzioneA')
        .optional()
        .isISO8601()
        .withMessage('dataEsecuzioneA deve essere una data ISO8601'),

    query('dataScadenzaDa')
        .optional()
        .isISO8601()
        .withMessage('dataScadenzaDa deve essere una data ISO8601'),

    query('dataScadenzaA')
        .optional()
        .isISO8601()
        .withMessage('dataScadenzaA deve essere una data ISO8601'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('page deve essere un intero >= 1'),

    query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('pageSize deve essere un intero tra 1 e 100'),

    handleValidationErrors
];

// ============================================
// REPORT
// ============================================

/**
 * Validazione per report totali
 */
export const validateReportTotali = [
    query('dataInizio')
        .isISO8601()
        .withMessage('dataInizio è obbligatorio e deve essere ISO8601'),

    query('dataFine')
        .isISO8601()
        .withMessage('dataFine è obbligatorio e deve essere ISO8601'),

    query('branchType')
        .optional()
        .isIn(BRANCH_TYPES),

    handleValidationErrors
];

/**
 * Validazione per report aging
 */
export const validateReportAging = [
    query('direzione')
        .optional()
        .isIn(DIREZIONI_VALIDE)
        .withMessage(`Direzione deve essere uno tra: ${DIREZIONI_VALIDE.join(', ')}`),

    handleValidationErrors
];

/**
 * Validazione per report compensi
 */
export const validateReportCompensi = [
    query('dataInizio')
        .isISO8601()
        .withMessage('dataInizio è obbligatorio e deve essere ISO8601'),

    query('dataFine')
        .isISO8601()
        .withMessage('dataFine è obbligatorio e deve essere ISO8601'),

    query('personId')
        .optional()
        .isUUID()
        .withMessage('personId deve essere un UUID valido'),

    handleValidationErrors
];

// Export di default
export default {
    handleValidationErrors,
    validateCreateMovimento,
    validateUpdateMovimento,
    validateCambioStato,
    validateDeleteMovimento,
    validateQueryMovimenti,
    validateReportTotali,
    validateReportAging,
    validateReportCompensi
};
