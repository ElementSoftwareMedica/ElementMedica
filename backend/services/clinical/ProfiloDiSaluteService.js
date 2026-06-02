/**
 * ProfiloDiSaluteService
 * CRUD per ProfiloDiSalutePersona — dati salute, stile di vita, DPI, mezzi aziendali
 * 
 * R19: Nuovo servizio per la gestione del profilo sanitario/sicurezza dei pazienti/dipendenti
 * 
 * @module services/clinical/ProfiloDiSaluteService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

class ProfiloDiSaluteService {

    /**
     * Recupera il profilo di salute di una persona per un tenant.
     * @param {string} personId
     * @param {string} tenantId
     * @returns {Promise<object|null>}
     */
    async getByPerson(personId, tenantId) {
        return prisma.profiloDiSalutePersona.findUnique({
            where: {
                personId_tenantId: { personId, tenantId },
                deletedAt: null,
            },
        });
    }

    /**
     * Crea o aggiorna il profilo di salute (upsert).
     * @param {string} personId
     * @param {string} tenantId
     * @param {object} data
     * @returns {Promise<object>}
     */
    async upsert(personId, tenantId, data) {
        const int = (v) => (v != null && v !== '' ? parseInt(v, 10) : null);
        const float = (v) => (v != null && v !== '' ? parseFloat(v) : null);
        const bool = (v, def = false) => (v != null ? Boolean(v) : def);
        const str = (v) => (v != null && v !== '' ? String(v) : null);
        const arr = (v) => (Array.isArray(v) ? v : []);
        const json = (v) => (v != null ? v : null);
        const dt = (v) => (v ? new Date(v) : null);

        const payload = {
            // Stato civile & familiari
            statoCivile: str(data.statoCivile),
            numeroFigli: int(data.numeroFigli),
            professione: str(data.professione),

            // Invalidità civile / INAIL / INPS
            hasInvalidita: bool(data.hasInvalidita),
            tipoInvalidita: str(data.tipoInvalidita),
            gradoInvaliditaCivile: int(data.gradoInvaliditaCivile),
            gradoInvaliditaInail: int(data.gradoInvaliditaInail),
            gradoInvaliditaInps: int(data.gradoInvaliditaInps),
            causaDiServizio: bool(data.causaDiServizio),
            gradoCausaDiServizio: int(data.gradoCausaDiServizio),
            legge104: bool(data.legge104),
            legge104Grado: int(data.legge104Grado),

            // Patologie croniche
            hasDiabete: bool(data.hasDiabete),
            tipoDiabete: str(data.tipoDiabete),
            terapiaInsulina: bool(data.terapiaInsulina),
            hasIpertensione: bool(data.hasIpertensione),
            hasCardiopatie: bool(data.hasCardiopatie),
            hasAsma: bool(data.hasAsma),
            hasEpilessia: bool(data.hasEpilessia),
            altrePatologie: str(data.altrePatologie),
            farmaci: str(data.farmaci),
            allergieFarmaci: str(data.allergieFarmaci),

            // Abitudini
            fumatore: str(data.fumatore),
            tipoSigaretta: str(data.tipoSigaretta),
            sigaretteGiorno: int(data.sigaretteGiorno),
            anniFumo: int(data.anniFumo),
            etaInizioFumo: int(data.etaInizioFumo),
            alcol: str(data.alcol),
            unitaAlcolSettimana: int(data.unitaAlcolSettimana),
            droghe: str(data.droghe),
            attivitaFisica: str(data.attivitaFisica),
            oreAttivitaSettimana: float(data.oreAttivitaSettimana),
            peso: float(data.peso),
            altezza: float(data.altezza),
            bmi: float(data.bmi),
            alimentazione: str(data.alimentazione),
            porzioniFruttaVerdure: int(data.porzioniFruttaVerdure),

            // Sonno
            qualitaSonno: str(data.qualitaSonno),
            oreSonnoNotte: float(data.oreSonnoNotte),
            sonnolenzaDiurna: bool(data.sonnolenzaDiurna),
            scalaEpworth: int(data.scalaEpworth),
            apneaNotturna: bool(data.apneaNotturna),
            disturbiSonno: str(data.disturbiSonno),

            // Diuresi
            diuresiFrequenza: str(data.diuresiFrequenza),
            diuresiNocturia: bool(data.diuresiNocturia),
            diuresiUrgenza: bool(data.diuresiUrgenza),
            diuresiDolore: bool(data.diuresiDolore),
            diuresiEmaturia: bool(data.diuresiEmaturia),

            // Alvo
            alvoFrequenza: str(data.alvoFrequenza),
            alvoFormaBristol: int(data.alvoFormaBristol),
            alvoDolore: bool(data.alvoDolore),
            alvoSanguinamento: bool(data.alvoSanguinamento),

            // Salute riproduttiva
            sesso: str(data.sesso),
            ciclaMestruale: data.ciclaMestruale != null ? Boolean(data.ciclaMestruale) : null,
            etaMenarca: int(data.etaMenarca),
            cicloDurata: int(data.cicloDurata),
            cicloDurataFlusso: int(data.cicloDurataFlusso),
            cicloRegolare: data.cicloRegolare != null ? Boolean(data.cicloRegolare) : null,
            ultimaMestruazione: dt(data.ultimaMestruazione),
            menopausa: bool(data.menopausa),
            etaMenopausa: int(data.etaMenopausa),
            numeroGravidanze: int(data.numeroGravidanze),
            gravidanzeATermine: int(data.gravidanzeATermine),
            gravidanzePretermine: int(data.gravidanzePretermine),
            abortiSpontanei: int(data.abortiSpontanei),
            abortiVolontari: int(data.abortiVolontari),
            inGravidanza: bool(data.inGravidanza),
            inAllattamento: bool(data.inAllattamento),
            settimanaGestazione: int(data.settimanaGestazione),

            // Vaccinazioni & esposizioni
            vaccinazioni: json(data.vaccinazioni),
            esposizioniLavorative: json(data.esposizioniLavorative),

            // Donazioni
            donatoreOrgani: bool(data.donatoreOrgani),
            donatoreSangue: bool(data.donatoreSangue),
            donatoreSangueFrequenza: str(data.donatoreSangueFrequenza),

            // DPI personali
            usaDpiPersonali: bool(data.usaDpiPersonali),
            dpiPersonali: arr(data.dpiPersonali),
            datInizioUsoDpiPersonali: dt(data.datInizioUsoDpiPersonali),

            // DPI aziendali
            dpiAzienda: arr(data.dpiAzienda),
            altriDpiAzienda: str(data.altriDpiAzienda),
            dataInizioUsoDpiAzienda: dt(data.dataInizioUsoDpiAzienda),
            corsiFormazioneDpi: json(data.corsiFormazioneDpi),

            // Mezzi aziendali
            usaMezziAziendali: bool(data.usaMezziAziendali),
            mezziAziendali: arr(data.mezziAziendali),
            altriMezziAziendali: str(data.altriMezziAziendali),
            patenteCategorie: arr(data.patenteCategorie),
            patenteScadenza: dt(data.patenteScadenza),
            patenteSospesa: bool(data.patenteSospesa),
            cqc: bool(data.cqc),
            cqcScadenza: dt(data.cqcScadenza),
            abilitazioniMezzi: json(data.abilitazioniMezzi),

            // Formazione obbligatoria D.Lgs 81/08 art. 37
            formazioneGenerale: bool(data.formazioneGenerale),
            formazioneGeneraleData: dt(data.formazioneGeneraleData),
            formazioneGeneraleScadenza: dt(data.formazioneGeneraleScadenza),
            formazioneSpecifica: bool(data.formazioneSpecifica),
            formazioneSpecificaData: dt(data.formazioneSpecificaData),
            formazioneSpecificaScadenza: dt(data.formazioneSpecificaScadenza),
            addestramentoCompletato: bool(data.addestramentoCompletato),

            // Idoneità specifiche
            idoneoLavoroInQuota: data.idoneoLavoroInQuota != null ? bool(data.idoneoLavoroInQuota) : undefined,
            idoneoSpazioConfinato: data.idoneoSpazioConfinato != null ? bool(data.idoneoSpazioConfinato) : undefined,
            idoneoGuida: data.idoneoGuida != null ? bool(data.idoneoGuida) : undefined,
            idoneoVDT: data.idoneoVDT != null ? bool(data.idoneoVDT) : undefined,

            // DPI consegne
            dpiConsegne: json(data.dpiConsegne),

            // Note
            noteSalute: str(data.noteSalute),
            deletedAt: null,
        };

        const result = await prisma.profiloDiSalutePersona.upsert({
            where: {
                personId_tenantId: { personId, tenantId },
            },
            create: {
                personId,
                tenantId,
                ...payload,
            },
            update: payload,
        });

        logger.info({ personId, tenantId, action: 'UPSERT_PROFILO_SALUTE' }, 'ProfiloDiSalute aggiornato');
        return result;
    }

    /**
     * Elimina (soft) il profilo di salute.
     * @param {string} personId
     * @param {string} tenantId
     */
    async softDelete(personId, tenantId) {
        const existing = await prisma.profiloDiSalutePersona.findFirst({
            where: { personId, tenantId, deletedAt: null },
        });
        if (!existing || existing.tenantId !== tenantId) {
            const err = new Error('Profilo di salute non trovato');
            err.statusCode = 404;
            throw err;
        }
        await prisma.profiloDiSalutePersona.update({
            where: { id: existing.id },
            data: { deletedAt: new Date() },
        });
        logger.info({ personId, tenantId }, 'ProfiloDiSalute eliminato (soft)');
    }
}

export default new ProfiloDiSaluteService();
