/**
 * P65 - Data Obscuration Utility
 * 
 * Utility per gestire l'oscuramento di dati clinici sensibili.
 * Usato da altri servizi per filtrare dati basandosi sui consensi FSE del paziente.
 * 
 * @module utils/data-obscuration
 */

import { ConsentFSEService } from '../services/consent-fse/ConsentFSEService.js';
import logger from './logger.js';

/**
 * Mappa tipi dato clinico -> tipi documento/modello
 * Usato per determinare quali dati filtrare
 */
export const DATA_TYPE_MAPPINGS = {
    REFERTI_LABORATORIO: ['Referto', 'LabResult'],
    REFERTI_RADIOLOGIA: ['Referto', 'ImagingStudy'],
    REFERTI_SPECIALISTICA: ['Referto', 'Visita'],
    PRESCRIZIONI_FARMACI: ['Prescrizione', 'Ricetta'],
    VACCINAZIONI: ['Vaccinazione', 'Immunization'],
    DIAGNOSI_SENSIBILI: ['Diagnosi', 'Condition'],
    CERTIFICATI_IDONEITA: ['Certificato', 'GiudizioIdoneita'],
    GIUDIZI_MDL: ['GiudizioIdoneita', 'DocumentoMDL']
};

/**
 * Verifica se un tipo di dato è oscurato per un paziente
 * @param {string} personId - ID paziente
 * @param {string} dataType - Tipo dato da verificare
 * @param {string} tenantId - ID tenant
 * @returns {Promise<boolean>} true se oscurato
 */
export async function isDataObscured(personId, dataType, tenantId) {
    try {
        return await ConsentFSEService.isDataObscured(personId, dataType, tenantId);
    } catch (error) {
        logger.error('Errore verifica oscuramento', {
            component: 'data-obscuration',
            action: 'isDataObscured',
            error: error.message,
            personId,
            dataType
        });
        return false; // Fail-open per non bloccare
    }
}

/**
 * Filtra un array di dati clinici basandosi sui consensi di oscuramento
 * @param {Array} data - Array di dati da filtrare
 * @param {string} personId - ID paziente
 * @param {string} tenantId - ID tenant
 * @param {Function} getDataType - Funzione per estrarre il tipo dato dall'elemento
 * @returns {Promise<Array>} Array filtrato
 */
export async function filterObscuredData(data, personId, tenantId, getDataType) {
    if (!data || data.length === 0) {
        return data;
    }

    try {
        const obscurationStatus = await ConsentFSEService.getObscurationStatus(personId, tenantId);

        if (!obscurationStatus.oscuramentoAttivo) {
            return data;
        }

        const obscuredTypes = new Set(obscurationStatus.tipiDatiOscurati);

        return data.filter(item => {
            const dataType = getDataType(item);
            return !obscuredTypes.has(dataType);
        });

    } catch (error) {
        logger.error('Errore filtro dati oscurati', {
            component: 'data-obscuration',
            action: 'filterObscuredData',
            error: error.message,
            personId
        });
        return data; // Fail-open
    }
}

/**
 * Trasforma dati clinici mascherando quelli oscurati
 * Invece di rimuoverli, li sostituisce con placeholder
 * @param {Array} data - Array di dati
 * @param {string} personId - ID paziente
 * @param {string} tenantId - ID tenant
 * @param {Function} getDataType - Funzione per estrarre il tipo dato
 * @param {Object} placeholder - Oggetto placeholder per dati oscurati
 * @returns {Promise<Array>} Array con dati oscurati mascherati
 */
export async function maskObscuredData(data, personId, tenantId, getDataType, placeholder = null) {
    if (!data || data.length === 0) {
        return data;
    }

    const defaultPlaceholder = {
        _obscured: true,
        _message: 'Dato oscurato su richiesta del paziente (Art. 5 D.L. 179/2012)'
    };

    try {
        const obscurationStatus = await ConsentFSEService.getObscurationStatus(personId, tenantId);

        if (!obscurationStatus.oscuramentoAttivo) {
            return data;
        }

        const obscuredTypes = new Set(obscurationStatus.tipiDatiOscurati);

        return data.map(item => {
            const dataType = getDataType(item);
            if (obscuredTypes.has(dataType)) {
                return {
                    id: item.id,
                    tipo: dataType,
                    ...(placeholder || defaultPlaceholder)
                };
            }
            return item;
        });

    } catch (error) {
        logger.error('Errore mascheramento dati oscurati', {
            component: 'data-obscuration',
            action: 'maskObscuredData',
            error: error.message,
            personId
        });
        return data;
    }
}

/**
 * Determina il tipo di dato clinico da un referto
 * @param {Object} referto - Oggetto referto
 * @returns {string} Tipo dato clinico
 */
export function getRefertoDataType(referto) {
    if (!referto) return null;

    // Mappa tipo prestazione -> tipo dato clinico
    const tipoPrestazioneMap = {
        LABORATORIO: 'REFERTI_LABORATORIO',
        RADIOLOGIA: 'REFERTI_RADIOLOGIA',
        ECOGRAFIA: 'REFERTI_RADIOLOGIA',
        DIAGNOSTICA: 'REFERTI_RADIOLOGIA',
        VISITA_SPECIALISTICA: 'REFERTI_SPECIALISTICA',
        VISITA: 'REFERTI_SPECIALISTICA'
    };

    const tipoPrestazione = referto.tipoPrestazione || referto.prestazione?.tipo;
    return tipoPrestazioneMap[tipoPrestazione] || 'REFERTI_SPECIALISTICA';
}

/**
 * Determina il tipo di dato clinico da un documento MDL
 * @param {Object} documento - Oggetto documento
 * @returns {string} Tipo dato clinico
 */
export function getDocumentoMDLDataType(documento) {
    if (!documento) return null;

    const tipoMap = {
        GIUDIZIO_IDONEITA: 'GIUDIZI_MDL',
        CERTIFICATO_IDONEITA: 'CERTIFICATI_IDONEITA',
        CARTELLA_SANITARIA: 'REFERTI_SPECIALISTICA',
        REFERTO_VISITA: 'REFERTI_SPECIALISTICA'
    };

    return tipoMap[documento.tipo] || 'GIUDIZI_MDL';
}

export default {
    isDataObscured,
    filterObscuredData,
    maskObscuredData,
    getRefertoDataType,
    getDocumentoMDLDataType,
    DATA_TYPE_MAPPINGS
};
