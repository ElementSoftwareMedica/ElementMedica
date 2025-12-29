/**
 * Clinical Module Validation Schemas
 * Schemi di validazione per il modulo Poliambulatorio ElementMedica
 * 
 * @module config/validation-clinical
 */

import Joi from 'joi';
import { z } from 'zod';
import { createJoiValidator, validateQuery, validateParams, VALIDATION_CONFIGS } from './validation.js';
import { logger } from '../utils/logger.js';

// ============================================
// ENUMS - Match Prisma schema exactly
// ============================================

export const CLINICAL_ENUMS = {
    TipoPrestazione: ['VISITA_SPECIALISTICA', 'VISITA_MEDICINA_LAVORO', 'ESAME_STRUMENTALE', 'ESAME_LABORATORIO', 'INTERVENTO_AMBULATORIALE', 'VACCINAZIONE', 'CERTIFICAZIONE', 'CONSULENZA'],
    StatoStrumento: ['ATTIVO', 'IN_MANUTENZIONE', 'FUORI_SERVIZIO', 'DISMESSO', 'IN_TARATURA'],
    TipoListino: ['PRIVATO', 'SSN', 'CONVENZIONATO', 'ASSICURAZIONE'],
    StatoAppuntamento: ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'ANNULLATO', 'NO_SHOW'],
    StatoVisita: ['INIZIATA', 'IN_CORSO', 'SOSPESA', 'COMPLETATA', 'ANNULLATA'],
    StatoReferto: ['BOZZA', 'IN_REVISIONE', 'FIRMATO', 'CONSEGNATO', 'ARCHIVIATO'],
    TipoConvenzione: ['AZIENDALE', 'ASSICURATIVA', 'PUBBLICA', 'PRIVATA']
};

// ============================================
// JOI SCHEMAS - Clinical Module
// ============================================

export const JOI_CLINICAL_SCHEMAS = {
    // === Common patterns ===
    id: Joi.string().uuid().required(),
    codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i)
        .message('Codice deve contenere solo lettere, numeri, underscore e trattini'),
    telefono: Joi.string().pattern(/^\+?[0-9\s-]{6,20}$/).allow('', null),
    email: Joi.string().email().allow('', null),
    cap: Joi.string().pattern(/^[0-9]{5}$/).allow('', null),
    provincia: Joi.string().length(2).uppercase().allow('', null),

    // === Poliambulatorio ===
    poliambulatorio: {
        create: Joi.object({
            nome: Joi.string().min(3).max(200).required()
                .messages({
                    'string.min': 'Nome deve avere almeno 3 caratteri',
                    'string.max': 'Nome non può superare 200 caratteri',
                    'any.required': 'Nome è obbligatorio'
                }),
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required()
                .messages({
                    'string.pattern.base': 'Codice deve contenere solo lettere, numeri, underscore e trattini',
                    'any.required': 'Codice è obbligatorio'
                }),
            indirizzo: Joi.string().max(300).required()
                .messages({ 'any.required': 'Indirizzo è obbligatorio' }),
            citta: Joi.string().max(100).required()
                .messages({ 'any.required': 'Città è obbligatoria' }),
            cap: Joi.string().pattern(/^[0-9]{5}$/).required()
                .messages({
                    'string.pattern.base': 'CAP deve essere di 5 cifre',
                    'any.required': 'CAP è obbligatorio'
                }),
            provincia: Joi.string().length(2).uppercase().allow('', null)
                .messages({ 'string.length': 'Provincia deve essere di 2 caratteri (es. MI)' }),
            telefono: Joi.string().pattern(/^\+?[0-9\s-]{6,20}$/).allow('', null),
            email: Joi.string().email().allow('', null),
            pec: Joi.string().email().allow('', null),
            piva: Joi.string().pattern(/^[0-9]{11}$/).allow('', null)
                .messages({ 'string.pattern.base': 'Partita IVA deve essere di 11 cifre' }),
            codiceFiscale: Joi.string().pattern(/^[A-Z0-9]{11,16}$/i).allow('', null),
            codiceRegionale: Joi.string().max(50).allow('', null),
            descrizione: Joi.string().max(1000).allow('', null),
            direttoreSanitarioId: Joi.string().uuid().allow(null),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'SOSPESO').default('ATTIVO')
        }),

        update: Joi.object({
            nome: Joi.string().min(3).max(200),
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            indirizzo: Joi.string().max(300).allow('', null),
            citta: Joi.string().max(100).allow('', null),
            cap: Joi.string().pattern(/^[0-9]{5}$/).allow('', null),
            provincia: Joi.string().length(2).uppercase().allow('', null),
            telefono: Joi.string().pattern(/^\+?[0-9\s-]{6,20}$/).allow('', null),
            email: Joi.string().email().allow('', null),
            pec: Joi.string().email().allow('', null),
            piva: Joi.string().pattern(/^[0-9]{11}$/).allow('', null),
            codiceFiscale: Joi.string().pattern(/^[A-Z0-9]{11,16}$/i).allow('', null),
            codiceRegionale: Joi.string().max(50).allow('', null),
            descrizione: Joi.string().max(1000).allow('', null),
            direttoreSanitarioId: Joi.string().uuid().allow(null),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'SOSPESO')
        }),

        assignDirettore: Joi.object({
            direttoreSanitarioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Direttore Sanitario è obbligatorio' })
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(200).allow(''),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'SOSPESO'),
            orderBy: Joi.string().valid('nome', 'codice', 'citta', 'createdAt', 'updatedAt').default('nome'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc'),
            allTenants: Joi.string().valid('true', 'false').default('false')
        })
    },

    // === Ambulatorio ===
    ambulatorio: {
        create: Joi.object({
            poliambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Poliambulatorio è obbligatorio' }),
            nome: Joi.string().min(2).max(200).required()
                .messages({ 'any.required': 'Nome ambulatorio è obbligatorio' }),
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required(),
            specializzazione: Joi.string().max(200).allow('', null),
            piano: Joi.string().max(50).allow('', null),
            capacita: Joi.number().integer().min(1).max(50).default(1),
            colore: Joi.string().max(20).allow('', null).default('#3B82F6'),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'MANUTENZIONE', 'CHIUSO').default('ATTIVO')
        }),

        update: Joi.object({
            nome: Joi.string().min(2).max(200),
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            specializzazione: Joi.string().max(200).allow('', null),
            piano: Joi.string().max(50).allow('', null),
            capacita: Joi.number().integer().min(1).max(50),
            colore: Joi.string().max(20).allow('', null),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'MANUTENZIONE', 'CHIUSO')
        }),

        assignPrestazione: Joi.object({
            prestazioneId: Joi.string().uuid().required()
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(200).allow(''),
            poliambulatorioId: Joi.string().uuid(),
            specializzazione: Joi.string().max(200),
            stato: Joi.string().valid('ATTIVO', 'INATTIVO', 'MANUTENZIONE', 'CHIUSO'),
            orderBy: Joi.string().valid('nome', 'codice', 'specializzazione', 'createdAt').default('nome'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Prestazione ===
    prestazione: {
        create: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required(),
            nome: Joi.string().min(3).max(300).required(),
            descrizione: Joi.string().max(2000).allow('', null),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoPrestazione).default('VISITA_SPECIALISTICA'),
            brancheSpecialistiche: Joi.array().items(Joi.string().max(100)).default([]),
            durataPrevista: Joi.number().integer().min(5).max(480).default(30)
                .messages({ 'number.min': 'Durata minima 5 minuti', 'number.max': 'Durata massima 8 ore' }),
            prezzoBase: Joi.number().precision(2).min(0).required(),
            ivaAliquota: Joi.number().precision(2).min(0).max(100).default(0),
            istruzioniPreparazione: Joi.string().max(2000).allow('', null),
            richiedeStrumento: Joi.boolean().default(false),
            strumentiRichiesti: Joi.array().items(Joi.string()).default([]),
            tipologieRichieste: Joi.array().items(Joi.object({
                tipologia: Joi.string().required(),
                isObbligatorio: Joi.boolean(),
                obbligatorio: Joi.boolean(), // Accept both field names from frontend
                quantitaMinima: Joi.number().integer().min(1).default(1),
                note: Joi.string().max(500).allow('', null)
            })).default([]),
            attivo: Joi.boolean().default(true)
        }),

        update: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            nome: Joi.string().min(3).max(300),
            descrizione: Joi.string().max(2000).allow('', null),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoPrestazione),
            brancheSpecialistiche: Joi.array().items(Joi.string().max(100)),
            durataPrevista: Joi.number().integer().min(5).max(480),
            prezzoBase: Joi.number().precision(2).min(0),
            ivaAliquota: Joi.number().precision(2).min(0).max(100),
            istruzioniPreparazione: Joi.string().max(2000).allow('', null),
            richiedeStrumento: Joi.boolean(),
            strumentiRichiesti: Joi.array().items(Joi.string()),
            tipologieRichieste: Joi.array().items(Joi.object({
                tipologia: Joi.string().required(),
                isObbligatorio: Joi.boolean(),
                obbligatorio: Joi.boolean(), // Accept both field names from frontend
                quantitaMinima: Joi.number().integer().min(1).default(1),
                note: Joi.string().max(500).allow('', null)
            })),
            attivo: Joi.boolean()
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(200).allow(''),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoPrestazione),
            attivo: Joi.boolean(),
            orderBy: Joi.string().valid('nome', 'codice', 'tipo', 'durataPrevista', 'createdAt').default('nome'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Strumento ===
    strumento: {
        create: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required(),
            nome: Joi.string().min(3).max(200).required(),
            descrizione: Joi.string().max(2000).allow('', null),
            marca: Joi.string().max(100).allow('', null),
            modello: Joi.string().max(100).allow('', null),
            numeroSerie: Joi.string().max(100).allow('', null),
            ambulatorioId: Joi.string().uuid().allow(null),
            dataAcquisto: Joi.date().iso().max('now').allow(null),
            costoAcquisto: Joi.number().precision(2).min(0).allow(null),
            dataFineAmmortamento: Joi.date().iso().allow(null),
            ultimaManutenzione: Joi.date().iso().max('now').allow(null),
            prossimaManutenzione: Joi.date().iso().allow(null),
            intervallManutenzione: Joi.number().integer().min(1).allow(null),
            ultimaTaratura: Joi.date().iso().allow(null),
            prossimaTaratura: Joi.date().iso().allow(null),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoStrumento).default('ATTIVO')
        }),

        update: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            nome: Joi.string().min(3).max(200),
            descrizione: Joi.string().max(2000).allow('', null),
            marca: Joi.string().max(100).allow('', null),
            modello: Joi.string().max(100).allow('', null),
            numeroSerie: Joi.string().max(100).allow('', null),
            ambulatorioId: Joi.string().uuid().allow(null),
            dataAcquisto: Joi.date().iso().max('now').allow(null),
            costoAcquisto: Joi.number().precision(2).min(0).allow(null),
            dataFineAmmortamento: Joi.date().iso().allow(null),
            ultimaManutenzione: Joi.date().iso().max('now').allow(null),
            prossimaManutenzione: Joi.date().iso().allow(null),
            intervallManutenzione: Joi.number().integer().min(1).allow(null),
            ultimaTaratura: Joi.date().iso().allow(null),
            prossimaTaratura: Joi.date().iso().allow(null),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoStrumento)
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(200).allow(''),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoStrumento),
            ambulatorioId: Joi.string().uuid(),
            orderBy: Joi.string().valid('nome', 'codice', 'stato', 'prossimaManutenzione', 'createdAt').default('nome'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === ListinoPrezzo ===
    // Schema: prestazioneId, poliambulatorioId, convenzioneId, medicoId, nome, prezzo, ivaAliquota, attivo, validoDa, validoA
    listinoPrezzo: {
        create: Joi.object({
            prestazioneId: Joi.string().uuid().required(),
            poliambulatorioId: Joi.string().uuid().allow(null),
            convenzioneId: Joi.string().uuid().allow(null),
            medicoId: Joi.string().uuid().allow(null),
            nome: Joi.string().max(200).allow('', null),
            prezzo: Joi.number().precision(2).min(0).max(99999.99).required()
                .messages({ 'any.required': 'Prezzo è obbligatorio' }),
            durataMedico: Joi.number().integer().min(5).max(480).allow(null),
            ivaAliquota: Joi.number().precision(2).min(0).max(100).default(0),
            compensoMedicoTipo: Joi.string().valid('PERCENTUALE', 'FISSO', 'MINIMO_MASSIMO'),
            compensoMedicoValore: Joi.number().precision(2).min(0).max(100).allow(null),
            compensoMedicoMinimo: Joi.number().precision(2).min(0).allow(null),
            compensoMedicoMassimo: Joi.number().precision(2).min(0).allow(null),
            scontoPercentuale: Joi.number().precision(2).min(0).max(100).allow(null),
            validoDa: Joi.date().iso().default(() => new Date()),
            validoA: Joi.date().iso().greater(Joi.ref('validoDa')).allow(null),
            attivo: Joi.boolean().default(true)
        }),

        update: Joi.object({
            poliambulatorioId: Joi.string().uuid().allow(null),
            convenzioneId: Joi.string().uuid().allow(null),
            medicoId: Joi.string().uuid().allow(null),
            nome: Joi.string().max(200).allow('', null),
            prezzo: Joi.number().precision(2).min(0).max(99999.99),
            durataMedico: Joi.number().integer().min(5).max(480).allow(null),
            ivaAliquota: Joi.number().precision(2).min(0).max(100),
            compensoMedicoTipo: Joi.string().valid('PERCENTUALE', 'FISSO', 'MINIMO_MASSIMO'),
            compensoMedicoValore: Joi.number().precision(2).min(0).max(100).allow(null),
            compensoMedicoMinimo: Joi.number().precision(2).min(0).allow(null),
            compensoMedicoMassimo: Joi.number().precision(2).min(0).allow(null),
            scontoPercentuale: Joi.number().precision(2).min(0).max(100).allow(null),
            validoDa: Joi.date().iso(),
            validoA: Joi.date().iso().allow(null),
            attivo: Joi.boolean()
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            prestazioneId: Joi.string().uuid(),
            poliambulatorioId: Joi.string().uuid(),
            convenzioneId: Joi.string().uuid(),
            attivo: Joi.boolean(),
            orderBy: Joi.string().valid('prezzo', 'validoDa', 'createdAt').default('validoDa'),
            orderDir: Joi.string().valid('asc', 'desc').default('desc')
        })
    },

    // === Appuntamento ===
    // Schema: numeroPrenotazione, ambulatorioId, prestazioneId, pazienteId, medicoId, 
    // dataOra, durataMinuti, stato, note, noteInterne, convenzioneId,
    // promemoriaSms, promemoriaEmail, promemoriaInviato, oraArrivo, oraChiamata, oraInizio, oraFine
    appuntamento: {
        create: Joi.object({
            pazienteId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Paziente è obbligatorio' }),
            medicoId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Medico è obbligatorio' }),
            ambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio è obbligatorio' }),
            prestazioneId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Prestazione è obbligatorio' }),
            dataOra: Joi.date().iso().min('now').required()
                .messages({
                    'any.required': 'Data e ora sono obbligatorie',
                    'date.min': 'La data deve essere futura'
                }),
            durataMinuti: Joi.number().integer().min(5).max(480).default(30),
            note: Joi.string().max(2000).allow('', null),
            noteInterne: Joi.string().max(2000).allow('', null),
            convenzioneId: Joi.string().uuid().allow(null),
            promemoriaSms: Joi.boolean().default(false),
            promemoriaEmail: Joi.boolean().default(true)
        }),

        update: Joi.object({
            medicoId: Joi.string().uuid(),
            ambulatorioId: Joi.string().uuid(),
            prestazioneId: Joi.string().uuid(),
            dataOra: Joi.date().iso(),
            durataMinuti: Joi.number().integer().min(5).max(480),
            note: Joi.string().max(2000).allow('', null),
            noteInterne: Joi.string().max(2000).allow('', null),
            convenzioneId: Joi.string().uuid().allow(null),
            promemoriaSms: Joi.boolean(),
            promemoriaEmail: Joi.boolean()
        }),

        changeStatus: Joi.object({
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoAppuntamento).required(),
            motivoAnnullamento: Joi.string().max(500).allow('', null)
                .when('stato', { is: 'ANNULLATO', then: Joi.required() }),
            oraArrivo: Joi.date().iso().allow(null),
            oraChiamata: Joi.date().iso().allow(null),
            oraInizio: Joi.date().iso().allow(null),
            oraFine: Joi.date().iso().allow(null)
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            pazienteId: Joi.string().uuid(),
            medicoId: Joi.string().uuid(),
            ambulatorioId: Joi.string().uuid(),
            prestazioneId: Joi.string().uuid(),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoAppuntamento),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso().greater(Joi.ref('dataInizio')),
            orderBy: Joi.string().valid('dataOra', 'stato', 'createdAt').default('dataOra'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Visita ===
    visita: {
        create: Joi.object({
            appuntamentoId: Joi.string().uuid().allow(null),
            pazienteId: Joi.string().uuid().required(),
            medicoId: Joi.string().uuid().required(),
            prestazioneId: Joi.string().uuid().required(),
            dataOra: Joi.date().iso().default(() => new Date()),
            anamnesi: Joi.string().max(10000).allow('', null),
            esamObiettivo: Joi.string().max(10000).allow('', null),
            diagnosi: Joi.string().max(5000).allow('', null),
            diagnosiIcd10: Joi.string().max(20).allow('', null),
            terapia: Joi.string().max(5000).allow('', null),
            prescrizioni: Joi.string().max(5000).allow('', null),
            noteClinic: Joi.string().max(5000).allow('', null),
            followUpRichiesto: Joi.boolean().default(false),
            followUpData: Joi.date().iso().allow(null),
            followUpNote: Joi.string().max(1000).allow('', null),
            consensoInformato: Joi.boolean().default(false),
            consensoTrattamento: Joi.boolean().default(false)
        }),

        update: Joi.object({
            anamnesi: Joi.string().max(10000).allow('', null),
            esamObiettivo: Joi.string().max(10000).allow('', null),
            diagnosi: Joi.string().max(5000).allow('', null),
            diagnosiIcd10: Joi.string().max(20).allow('', null),
            terapia: Joi.string().max(5000).allow('', null),
            prescrizioni: Joi.string().max(5000).allow('', null),
            noteClinic: Joi.string().max(5000).allow('', null),
            followUpRichiesto: Joi.boolean(),
            followUpData: Joi.date().iso().allow(null),
            followUpNote: Joi.string().max(1000).allow('', null),
            consensoInformato: Joi.boolean(),
            consensoTrattamento: Joi.boolean()
        }),

        changeStatus: Joi.object({
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoVisita).required()
        }),

        sign: Joi.object({
            firmaMedico: Joi.string().max(500).required()
                .messages({ 'any.required': 'Firma medico è obbligatoria' })
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            pazienteId: Joi.string().uuid(),
            medicoId: Joi.string().uuid(),
            prestazioneId: Joi.string().uuid(),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoVisita),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso(),
            orderBy: Joi.string().valid('dataOra', 'stato', 'createdAt').default('dataOra'),
            orderDir: Joi.string().valid('asc', 'desc').default('desc')
        })
    },

    // === Referto ===
    referto: {
        create: Joi.object({
            visitaId: Joi.string().uuid().required(),
            tipo: Joi.string().min(2).max(100).required(),
            titolo: Joi.string().min(3).max(300).required(),
            contenuto: Joi.string().max(50000).allow('', null),
            conclusioni: Joi.string().max(10000).allow('', null),
            valoriRiferimento: Joi.string().max(5000).allow('', null)
        }),

        update: Joi.object({
            tipo: Joi.string().min(2).max(100),
            titolo: Joi.string().min(3).max(300),
            contenuto: Joi.string().max(50000).allow('', null),
            conclusioni: Joi.string().max(10000).allow('', null),
            valoriRiferimento: Joi.string().max(5000).allow('', null)
        }),

        changeStatus: Joi.object({
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoReferto).required()
        }),

        sign: Joi.object({
            firmaMedico: Joi.string().max(500).required()
        }),

        deliver: Joi.object({
            consegnatoA: Joi.string().max(200).required(),
            metodiConsegna: Joi.string().max(500).required()
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            visitaId: Joi.string().uuid(),
            tipo: Joi.string().max(100),
            stato: Joi.string().valid(...CLINICAL_ENUMS.StatoReferto),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso(),
            orderBy: Joi.string().valid('dataEmissione', 'stato', 'createdAt').default('createdAt'),
            orderDir: Joi.string().valid('asc', 'desc').default('desc')
        })
    },

    // === Convenzione ===
    // Schema: codice, nome, descrizione, tipo (TipoConvenzione enum), enteTerzo, partitaIva, 
    // codiceFiscale, telefono, email, referente, dataInizio, dataFine, attiva, condizioni
    convenzione: {
        create: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required()
                .messages({
                    'string.pattern.base': 'Codice deve contenere solo lettere, numeri, underscore e trattini',
                    'any.required': 'Codice è obbligatorio'
                }),
            nome: Joi.string().min(3).max(200).required()
                .messages({ 'any.required': 'Nome è obbligatorio' }),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoConvenzione).required()
                .messages({ 'any.required': 'Tipo è obbligatorio' }),
            descrizione: Joi.string().max(1000).allow('', null),
            enteTerzo: Joi.string().max(200).allow('', null),
            partitaIva: Joi.string().max(20).allow('', null),
            codiceFiscale: Joi.string().max(20).allow('', null),
            telefono: Joi.string().pattern(/^\+?[0-9\s-]{6,20}$/).allow('', null),
            email: Joi.string().email().allow('', null),
            referente: Joi.string().max(200).allow('', null),
            dataInizio: Joi.date().iso().required()
                .messages({ 'any.required': 'Data inizio è obbligatoria' }),
            dataFine: Joi.date().iso().min(Joi.ref('dataInizio')).allow(null)
                .messages({ 'date.min': 'Data fine deve essere successiva a data inizio' }),
            condizioni: Joi.object().allow(null),
            attiva: Joi.boolean().default(true)
        }),

        update: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            nome: Joi.string().min(3).max(200),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoConvenzione),
            descrizione: Joi.string().max(1000).allow('', null),
            enteTerzo: Joi.string().max(200).allow('', null),
            partitaIva: Joi.string().max(20).allow('', null),
            codiceFiscale: Joi.string().max(20).allow('', null),
            telefono: Joi.string().pattern(/^\+?[0-9\s-]{6,20}$/).allow('', null),
            email: Joi.string().email().allow('', null),
            referente: Joi.string().max(200).allow('', null),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso().allow(null),
            condizioni: Joi.object().allow(null),
            attiva: Joi.boolean()
        }),

        associatePoliambulatorio: Joi.object({
            poliambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Poliambulatorio è obbligatorio' })
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(500).default(20),
            search: Joi.string().max(200).allow(''),
            tipo: Joi.string().valid(...CLINICAL_ENUMS.TipoConvenzione),
            attiva: Joi.boolean(),
            validaOggi: Joi.boolean(),
            orderBy: Joi.string().valid('nome', 'codice', 'dataInizio', 'dataFine', 'createdAt').default('nome'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Sconto Clinico (usa CodiceSconto con applicabileServizi: PRESTAZIONE_CLINICA) ===
    // Schema CodiceSconto: codice, nome, descrizione, tipoSconto, valore, dataInizio, dataFine,
    // attivo, utilizzoMassimo, utilizzoCorrente, utilizzoPerUtente, cumulabile, minImporto, maxImporto,
    // applicabileA, applicabileServizi, prestazioniIds
    scontoClinico: {
        create: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required()
                .messages({
                    'string.pattern.base': 'Codice deve contenere solo lettere, numeri, underscore e trattini',
                    'any.required': 'Codice è obbligatorio'
                }),
            nome: Joi.string().min(2).max(200).required()
                .messages({ 'any.required': 'Nome è obbligatorio' }),
            descrizione: Joi.string().max(500).allow('', null),
            tipoSconto: Joi.string().valid('PERCENTUALE', 'IMPORTO_FISSO').required()
                .messages({ 'any.required': 'Tipo sconto è obbligatorio' }),
            valore: Joi.number().precision(2).positive().required()
                .messages({ 'any.required': 'Valore sconto è obbligatorio' }),
            dataInizio: Joi.date().iso().required()
                .messages({ 'any.required': 'Data inizio è obbligatoria' }),
            dataFine: Joi.date().iso().min(Joi.ref('dataInizio')).required()
                .messages({
                    'any.required': 'Data fine è obbligatoria',
                    'date.min': 'Data fine deve essere successiva a data inizio'
                }),
            utilizzoMassimo: Joi.number().integer().min(1).allow(null),
            utilizzoPerUtente: Joi.number().integer().min(1).allow(null),
            cumulabile: Joi.boolean().default(false),
            minImporto: Joi.number().precision(2).min(0).allow(null),
            maxImporto: Joi.number().precision(2).min(0).allow(null),
            prestazioniIds: Joi.array().items(Joi.string().uuid()).default([]),
            attivo: Joi.boolean().default(true)
        }),

        update: Joi.object({
            codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i),
            nome: Joi.string().min(2).max(200),
            descrizione: Joi.string().max(500).allow('', null),
            tipoSconto: Joi.string().valid('PERCENTUALE', 'IMPORTO_FISSO'),
            valore: Joi.number().precision(2).positive(),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso(),
            utilizzoMassimo: Joi.number().integer().min(1).allow(null),
            utilizzoPerUtente: Joi.number().integer().min(1).allow(null),
            cumulabile: Joi.boolean(),
            minImporto: Joi.number().precision(2).min(0).allow(null),
            maxImporto: Joi.number().precision(2).min(0).allow(null),
            prestazioniIds: Joi.array().items(Joi.string().uuid()),
            attivo: Joi.boolean()
        }),

        validate: Joi.object({
            codice: Joi.string().min(2).max(50).required()
                .messages({ 'any.required': 'Codice sconto è obbligatorio' }),
            prestazioneId: Joi.string().uuid().allow(null)
        }),

        apply: Joi.object({
            codice: Joi.string().min(2).max(50).required()
                .messages({ 'any.required': 'Codice sconto è obbligatorio' }),
            prezzoBase: Joi.number().precision(2).positive().required()
                .messages({ 'any.required': 'Prezzo base è obbligatorio' }),
            prestazioneId: Joi.string().uuid().allow(null)
        }),

        bulkCreate: Joi.object({
            codes: Joi.array().items(
                Joi.object({
                    codice: Joi.string().min(2).max(50).pattern(/^[A-Z0-9_-]+$/i).required(),
                    nome: Joi.string().min(2).max(200).required(),
                    descrizione: Joi.string().max(500).allow('', null),
                    tipoSconto: Joi.string().valid('PERCENTUALE', 'IMPORTO_FISSO').required(),
                    valore: Joi.number().precision(2).positive().required(),
                    dataInizio: Joi.date().iso().required(),
                    dataFine: Joi.date().iso().required(),
                    utilizzoMassimo: Joi.number().integer().min(1).allow(null),
                    utilizzoPerUtente: Joi.number().integer().min(1).allow(null),
                    cumulabile: Joi.boolean().default(false),
                    prestazioniIds: Joi.array().items(Joi.string().uuid()).default([]),
                    attivo: Joi.boolean().default(true)
                })
            ).min(1).required()
                .messages({ 'array.min': 'Deve essere fornito almeno un codice sconto' })
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(100).allow(''),
            tipoSconto: Joi.string().valid('PERCENTUALE', 'IMPORTO_FISSO'),
            attivo: Joi.boolean(),
            includeExpired: Joi.boolean().default(false),
            orderBy: Joi.string().valid('codice', 'valore', 'dataInizio', 'createdAt', 'utilizzoCorrente').default('createdAt'),
            orderDir: Joi.string().valid('asc', 'desc').default('desc')
        })
    },

    // === Slot Disponibilita ===
    // Schema: ambulatorioId, medicoId, prestazioneId, data, oraInizio, oraFine, disponibile, motivoBlocco
    slotDisponibilita: {
        create: Joi.object({
            medicoId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Medico è obbligatorio' }),
            ambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio è obbligatorio' }),
            prestazioneId: Joi.string().uuid().allow(null),
            data: Joi.date().iso().required()
                .messages({ 'any.required': 'Data è obbligatoria' }),
            oraInizio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
                .messages({
                    'string.pattern.base': 'Ora inizio deve essere nel formato HH:MM',
                    'any.required': 'Ora inizio è obbligatoria'
                }),
            oraFine: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
                .messages({
                    'string.pattern.base': 'Ora fine deve essere nel formato HH:MM',
                    'any.required': 'Ora fine è obbligatoria'
                }),
            disponibile: Joi.boolean().default(true),
            motivoBlocco: Joi.string().max(500).allow('', null)
        }),

        update: Joi.object({
            ambulatorioId: Joi.string().uuid(),
            prestazioneId: Joi.string().uuid().allow(null),
            data: Joi.date().iso(),
            oraInizio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            oraFine: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            disponibile: Joi.boolean(),
            motivoBlocco: Joi.string().max(500).allow('', null)
        }),

        book: Joi.object({
            appuntamentoId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Appuntamento è obbligatorio' })
        }),

        block: Joi.object({
            motivoBlocco: Joi.string().max(500).required()
                .messages({ 'any.required': 'Motivo blocco è obbligatorio' })
        }),

        generate: Joi.object({
            medicoId: Joi.string().uuid().required(),
            dataInizio: Joi.date().iso().required(),
            dataFine: Joi.date().iso().min(Joi.ref('dataInizio')).required()
                .messages({ 'date.min': 'Data fine deve essere successiva a data inizio' }),
            durataMinuti: Joi.number().integer().min(5).max(480).default(30),
            ambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio è obbligatorio' }),
            prestazioneId: Joi.string().uuid().allow(null),
            skipExisting: Joi.boolean().default(true)
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(200).default(50),
            medicoId: Joi.string().uuid(),
            ambulatorioId: Joi.string().uuid(),
            prestazioneId: Joi.string().uuid(),
            dataInizio: Joi.date().iso(),
            dataFine: Joi.date().iso(),
            disponibile: Joi.boolean(),
            soloLiberi: Joi.boolean(),
            orderBy: Joi.string().valid('data', 'oraInizio', 'createdAt').default('data'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Orario Ambulatorio ===
    // Schema: ambulatorioId, medicoId, giornoSettimana, oraInizio, oraFine, durataSlot, attivo, validoDa, validoA
    orarioAmbulatorio: {
        create: Joi.object({
            ambulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio è obbligatorio' }),
            medicoId: Joi.string().uuid().allow(null),
            giornoSettimana: Joi.number().integer().min(0).max(6).required()
                .messages({
                    'number.min': 'Giorno settimana deve essere tra 0 (Domenica) e 6 (Sabato)',
                    'number.max': 'Giorno settimana deve essere tra 0 (Domenica) e 6 (Sabato)',
                    'any.required': 'Giorno settimana è obbligatorio'
                }),
            oraInizio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
                .messages({
                    'string.pattern.base': 'Ora inizio deve essere nel formato HH:MM',
                    'any.required': 'Ora inizio è obbligatoria'
                }),
            oraFine: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
                .messages({
                    'string.pattern.base': 'Ora fine deve essere nel formato HH:MM',
                    'any.required': 'Ora fine è obbligatoria'
                }),
            durataSlot: Joi.number().integer().min(5).max(480).default(30),
            validoDa: Joi.date().iso().allow(null),
            validoA: Joi.date().iso().allow(null),
            attivo: Joi.boolean().default(true)
        }),

        update: Joi.object({
            medicoId: Joi.string().uuid().allow(null),
            giornoSettimana: Joi.number().integer().min(0).max(6),
            oraInizio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            oraFine: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            durataSlot: Joi.number().integer().min(5).max(480),
            validoDa: Joi.date().iso().allow(null),
            validoA: Joi.date().iso().allow(null),
            attivo: Joi.boolean()
        }),

        copySchedule: Joi.object({
            fromAmbulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio sorgente è obbligatorio' }),
            toAmbulatorioId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Ambulatorio destinazione è obbligatorio' })
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
            ambulatorioId: Joi.string().uuid(),
            medicoId: Joi.string().uuid(),
            giornoSettimana: Joi.number().integer().min(0).max(6),
            attivo: Joi.boolean(),
            orderBy: Joi.string().valid('giornoSettimana', 'oraInizio', 'createdAt').default('giornoSettimana'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Template Campo Visita ===
    templateCampoVisita: {
        create: Joi.object({
            prestazioneId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Prestazione è obbligatorio' }),
            nome: Joi.string().min(2).max(100).pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).required()
                .messages({
                    'string.pattern.base': 'Nome campo deve iniziare con lettera e contenere solo lettere, numeri e underscore',
                    'any.required': 'Nome campo è obbligatorio'
                }),
            etichetta: Joi.string().min(2).max(200).required()
                .messages({ 'any.required': 'Etichetta è obbligatoria' }),
            tipo: Joi.string().valid('TESTO', 'TEXTAREA', 'NUMERO', 'DECIMALE', 'DATA', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'FILE').default('TESTO'),
            obbligatorio: Joi.boolean().default(false),
            ordine: Joi.number().integer().min(0),
            opzioni: Joi.when('tipo', {
                is: Joi.string().valid('SELECT', 'MULTISELECT'),
                then: Joi.array().items(Joi.string().max(200)).min(1).required()
                    .messages({ 'array.min': 'Campi SELECT/MULTISELECT richiedono almeno una opzione' }),
                otherwise: Joi.array().items(Joi.string().max(200)).allow(null)
            }),
            valoreDefault: Joi.string().max(1000).allow('', null),
            validazione: Joi.object({
                minLength: Joi.number().integer().min(0),
                maxLength: Joi.number().integer().min(1),
                min: Joi.number(),
                max: Joi.number(),
                pattern: Joi.string().max(500),
                patternMessage: Joi.string().max(200)
            }).allow(null),
            placeholder: Joi.string().max(200).allow('', null),
            helpText: Joi.string().max(500).allow('', null)
        }),

        update: Joi.object({
            nome: Joi.string().min(2).max(100).pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/),
            etichetta: Joi.string().min(2).max(200),
            tipo: Joi.string().valid('TESTO', 'TEXTAREA', 'NUMERO', 'DECIMALE', 'DATA', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'FILE'),
            obbligatorio: Joi.boolean(),
            ordine: Joi.number().integer().min(0),
            opzioni: Joi.array().items(Joi.string().max(200)).allow(null),
            valoreDefault: Joi.string().max(1000).allow('', null),
            validazione: Joi.object({
                minLength: Joi.number().integer().min(0),
                maxLength: Joi.number().integer().min(1),
                min: Joi.number(),
                max: Joi.number(),
                pattern: Joi.string().max(500),
                patternMessage: Joi.string().max(200)
            }).allow(null),
            placeholder: Joi.string().max(200).allow('', null),
            helpText: Joi.string().max(500).allow('', null),
            attivo: Joi.boolean()
        }),

        bulkCreate: Joi.object({
            prestazioneId: Joi.string().uuid().required(),
            campi: Joi.array().items(Joi.object({
                nome: Joi.string().min(2).max(100).pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).required(),
                etichetta: Joi.string().min(2).max(200).required(),
                tipo: Joi.string().valid('TESTO', 'TEXTAREA', 'NUMERO', 'DECIMALE', 'DATA', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'FILE').default('TESTO'),
                obbligatorio: Joi.boolean().default(false),
                ordine: Joi.number().integer().min(0),
                opzioni: Joi.array().items(Joi.string().max(200)).allow(null),
                valoreDefault: Joi.string().max(1000).allow('', null),
                validazione: Joi.object().allow(null),
                placeholder: Joi.string().max(200).allow('', null),
                helpText: Joi.string().max(500).allow('', null)
            })).min(1).required()
        }),

        reorder: Joi.object({
            prestazioneId: Joi.string().uuid().required(),
            ordini: Joi.array().items(Joi.object({
                id: Joi.string().uuid().required(),
                ordine: Joi.number().integer().min(0).required()
            })).min(1).required()
        }),

        duplicate: Joi.object({
            sourcePrestazioneId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Prestazione sorgente è obbligatorio' }),
            targetPrestazioneId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Prestazione destinazione è obbligatorio' })
        }),

        validateValue: Joi.object({
            campoId: Joi.string().uuid().required(),
            valore: Joi.any().required()
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
            prestazioneId: Joi.string().uuid(),
            tipo: Joi.string().valid('TESTO', 'TEXTAREA', 'NUMERO', 'DECIMALE', 'DATA', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'FILE'),
            obbligatorio: Joi.boolean(),
            attivo: Joi.boolean(),
            search: Joi.string().max(200).allow(''),
            orderBy: Joi.string().valid('ordine', 'nome', 'createdAt').default('ordine'),
            orderDir: Joi.string().valid('asc', 'desc').default('asc')
        })
    },

    // === Documento Clinico (Allegati) ===
    documentoClinico: {
        uploadAllegatoVisita: Joi.object({
            visitaId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Visita è obbligatorio' }),
            tipo: Joi.string().valid('document', 'image', 'dicom', 'lab_result', 'trace', 'other').required()
                .messages({ 'any.required': 'Tipo allegato è obbligatorio' }),
            nome: Joi.string().min(1).max(255).required()
                .messages({ 'any.required': 'Nome file è obbligatorio' }),
            descrizione: Joi.string().max(1000).allow('', null)
        }),

        uploadAllegatoReferto: Joi.object({
            refertoId: Joi.string().uuid().required()
                .messages({ 'any.required': 'ID Referto è obbligatorio' }),
            tipo: Joi.string().valid('document', 'image', 'dicom', 'lab_result', 'trace', 'other').required()
                .messages({ 'any.required': 'Tipo allegato è obbligatorio' }),
            nome: Joi.string().min(1).max(255).required()
                .messages({ 'any.required': 'Nome file è obbligatorio' }),
            descrizione: Joi.string().max(1000).allow('', null)
        }),

        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
            tipo: Joi.string().valid('document', 'image', 'dicom', 'lab_result', 'trace', 'other'),
            orderBy: Joi.string().valid('nome', 'createdAt', 'dimensione').default('createdAt'),
            orderDir: Joi.string().valid('asc', 'desc').default('desc')
        })
    },

    // === Common params ===
    params: {
        id: Joi.object({
            id: Joi.string().uuid().required()
        }),
        poliambulatorioId: Joi.object({
            poliambulatorioId: Joi.string().uuid().required()
        }),
        ambulatorioId: Joi.object({
            ambulatorioId: Joi.string().uuid().required()
        }),
        convenzioneId: Joi.object({
            convenzioneId: Joi.string().uuid().required()
        }),
        medicoId: Joi.object({
            medicoId: Joi.string().uuid().required()
        }),
        date: Joi.object({
            date: Joi.date().iso().required()
        })
    }
};

// ============================================
// MIDDLEWARE VALIDATORS - Ready to use
// ============================================

export const clinicalValidators = {
    // Poliambulatorio
    poliambulatorio: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.poliambulatorio.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.poliambulatorio.update),
        assignDirettore: createJoiValidator(JOI_CLINICAL_SCHEMAS.poliambulatorio.assignDirettore),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.poliambulatorio.query, 'joi')
    },

    // Ambulatorio
    ambulatorio: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.ambulatorio.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.ambulatorio.update),
        assignPrestazione: createJoiValidator(JOI_CLINICAL_SCHEMAS.ambulatorio.assignPrestazione),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.ambulatorio.query, 'joi')
    },

    // Prestazione
    prestazione: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.prestazione.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.prestazione.update),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.prestazione.query, 'joi'),
        id: validateParams(JOI_CLINICAL_SCHEMAS.params.id, 'joi')
    },

    // Strumento
    strumento: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.strumento.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.strumento.update),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.strumento.query, 'joi'),
        id: validateParams(JOI_CLINICAL_SCHEMAS.params.id, 'joi')
    },

    // Listino Prezzo
    listinoPrezzo: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.listinoPrezzo.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.listinoPrezzo.update),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.listinoPrezzo.query, 'joi'),
        id: validateParams(JOI_CLINICAL_SCHEMAS.params.id, 'joi')
    },

    // Appuntamento
    appuntamento: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.appuntamento.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.appuntamento.update),
        changeStatus: createJoiValidator(JOI_CLINICAL_SCHEMAS.appuntamento.changeStatus),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.appuntamento.query, 'joi')
    },

    // Visita
    visita: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.visita.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.visita.update),
        changeStatus: createJoiValidator(JOI_CLINICAL_SCHEMAS.visita.changeStatus),
        sign: createJoiValidator(JOI_CLINICAL_SCHEMAS.visita.sign),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.visita.query, 'joi')
    },

    // Referto
    referto: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.referto.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.referto.update),
        changeStatus: createJoiValidator(JOI_CLINICAL_SCHEMAS.referto.changeStatus),
        sign: createJoiValidator(JOI_CLINICAL_SCHEMAS.referto.sign),
        deliver: createJoiValidator(JOI_CLINICAL_SCHEMAS.referto.deliver),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.referto.query, 'joi')
    },

    // Convenzione
    convenzione: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.convenzione.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.convenzione.update),
        associateListino: createJoiValidator(JOI_CLINICAL_SCHEMAS.convenzione.associateListino),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.convenzione.query, 'joi')
    },

    // Sconto Clinico (Codici sconto)
    scontoClinico: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.scontoClinico.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.scontoClinico.update),
        validate: createJoiValidator(JOI_CLINICAL_SCHEMAS.scontoClinico.validate),
        apply: createJoiValidator(JOI_CLINICAL_SCHEMAS.scontoClinico.apply),
        bulkCreate: createJoiValidator(JOI_CLINICAL_SCHEMAS.scontoClinico.bulkCreate),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.scontoClinico.query, 'joi')
    },

    // Slot Disponibilita
    slotDisponibilita: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.slotDisponibilita.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.slotDisponibilita.update),
        book: createJoiValidator(JOI_CLINICAL_SCHEMAS.slotDisponibilita.book),
        block: createJoiValidator(JOI_CLINICAL_SCHEMAS.slotDisponibilita.block),
        generate: createJoiValidator(JOI_CLINICAL_SCHEMAS.slotDisponibilita.generate),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.slotDisponibilita.query, 'joi')
    },

    // Orario Ambulatorio
    orarioAmbulatorio: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.orarioAmbulatorio.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.orarioAmbulatorio.update),
        copySchedule: createJoiValidator(JOI_CLINICAL_SCHEMAS.orarioAmbulatorio.copySchedule),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.orarioAmbulatorio.query, 'joi')
    },

    // Template Campo Visita
    templateCampoVisita: {
        create: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.create),
        update: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.update),
        bulkCreate: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.bulkCreate),
        reorder: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.reorder),
        duplicate: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.duplicate),
        validateValue: createJoiValidator(JOI_CLINICAL_SCHEMAS.templateCampoVisita.validateValue),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.templateCampoVisita.query, 'joi')
    },

    // Documento Clinico (Allegati)
    documentoClinico: {
        uploadAllegatoVisita: createJoiValidator(JOI_CLINICAL_SCHEMAS.documentoClinico.uploadAllegatoVisita),
        uploadAllegatoReferto: createJoiValidator(JOI_CLINICAL_SCHEMAS.documentoClinico.uploadAllegatoReferto),
        query: validateQuery(JOI_CLINICAL_SCHEMAS.documentoClinico.query, 'joi')
    },

    // Params
    params: {
        id: validateParams(JOI_CLINICAL_SCHEMAS.params.id, 'joi'),
        poliambulatorioId: validateParams(JOI_CLINICAL_SCHEMAS.params.poliambulatorioId, 'joi'),
        ambulatorioId: validateParams(JOI_CLINICAL_SCHEMAS.params.ambulatorioId, 'joi'),
        convenzioneId: validateParams(JOI_CLINICAL_SCHEMAS.params.convenzioneId, 'joi'),
        medicoId: validateParams(JOI_CLINICAL_SCHEMAS.params.medicoId, 'joi'),
        date: validateParams(JOI_CLINICAL_SCHEMAS.params.date, 'joi')
    }
};

export default {
    CLINICAL_ENUMS,
    JOI_CLINICAL_SCHEMAS,
    clinicalValidators
};
