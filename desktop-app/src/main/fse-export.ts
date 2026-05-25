/**
 * FSE 2.0 — Fascicolo Sanitario Elettronico — FHIR R4 Export
 *
 * Generates FHIR R4 Bundle JSON for a visit + patient.
 * This is a preparatory module for future FSE 2.0 gateway integration
 * (Ministero della Salute / INI — Infrastruttura Nazionale dell'Infrastruttura).
 *
 * Standards:
 *  - FHIR R4 (https://www.hl7.org/fhir/R4/)
 *  - ICD-10-CM diagnosis codes
 *  - ICPC-2 (International Classification of Primary Care)
 *  - Italian CF (Codice Fiscale) as patient identifier
 *  - OID: 2.16.840.1.113883.2.9 (Italy namespace for CF)
 *
 * NOTE: Full FSE 2.0 submission requires regional gateway credentials
 * (SPID/CIE authentication + INI token). This module generates the
 * data payload that would be submitted.
 */

import { v4 as uuidv4 } from 'uuid'

// ────────────────────────── Types ────────────────────────────

export interface FhirPatient {
    id: string
    firstName?: string | null
    lastName?: string | null
    taxCode?: string | null
    birthDate?: string | null
    gender?: string | null
    tenantId?: string | null
}

export interface FhirVisit {
    id: string
    personId?: string | null
    tenantId?: string | null
    medicoId?: string | null
    stato?: string | null
    dataOra?: string | null
    dataConclusione?: string | null
    motivoVisita?: string | null
    anamnesi?: string | null
    esameObiettivo?: string | null
    diagnosi?: string | null
    terapia?: string | null
    codiceICD10?: string | null
    codiceICPC2?: string | null
    tipo?: string | null
    tipoVisitaMDL?: string | null
}

export interface FhirGiudizio {
    id: string
    esito?: string | null
    limitazioni?: string | null
    prescrizioni?: string | null
    dataEmissione?: string | null
    dataScadenza?: string | null
}

// ────────────────────────── FHIR Helpers ─────────────────────

function genderToFhir(gender: string | null | undefined): string {
    if (!gender) return 'unknown'
    const g = gender.toUpperCase()
    if (g === 'M' || g === 'MALE' || g === 'MASCHIO') return 'male'
    if (g === 'F' || g === 'FEMALE' || g === 'FEMMINA') return 'female'
    return 'other'
}

function visitStatusToFhir(stato: string | null | undefined): string {
    if (!stato) return 'finished'
    const s = stato.toUpperCase()
    if (s === 'COMPLETATA' || s === 'CHIUSA') return 'finished'
    if (s === 'IN_CORSO' || s === 'INIZIATA') return 'in-progress'
    if (s === 'PIANIFICATA') return 'planned'
    if (s === 'CANCELLATA') return 'cancelled'
    return 'finished'
}

function icdCodeSystem(code: string): string {
    // Distinguish ICD-10 from ICPC-2 by format
    // ICD-10: Axx.x | ICPC-2: A01
    if (/^[A-Z]\d{2}(\.\d+)?$/.test(code) && code.length <= 7) {
        return 'http://hl7.org/fhir/sid/icd-10'
    }
    return 'http://hl7.org/fhir/sid/icpc-2'
}

// ────────────────────────── FHIR Resource Builders ───────────

function buildPatientResource(p: FhirPatient): Record<string, unknown> {
    const identifiers: Record<string, unknown>[] = []

    if (p.taxCode) {
        identifiers.push({
            use: 'official',
            system: 'urn:oid:2.16.840.1.113883.2.9.4.3.2', // Italian CF OID
            value: p.taxCode.toUpperCase()
        })
    }

    const name: Record<string, unknown>[] = []
    if (p.firstName || p.lastName) {
        name.push({
            use: 'official',
            family: p.lastName || '',
            given: p.firstName ? [p.firstName] : []
        })
    }

    const resource: Record<string, unknown> = {
        resourceType: 'Patient',
        id: p.id,
        meta: {
            profile: ['https://fhir.it/StructureDefinition/Patient-it-base']
        }
    }

    if (identifiers.length > 0) resource.identifier = identifiers
    if (name.length > 0) resource.name = name
    if (p.birthDate) resource.birthDate = p.birthDate.split('T')[0]
    if (p.gender) resource.gender = genderToFhir(p.gender)

    return resource
}

function buildEncounterResource(v: FhirVisit, patientId: string): Record<string, unknown> {
    const encounter: Record<string, unknown> = {
        resourceType: 'Encounter',
        id: v.id,
        meta: {
            profile: ['https://fhir.it/StructureDefinition/Encounter-it-base']
        },
        status: visitStatusToFhir(v.stato),
        class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'Ambulatory'
        },
        subject: {
            reference: `Patient/${patientId}`
        }
    }

    // Visit type (MDL or generic)
    if (v.tipoVisitaMDL || v.tipo) {
        encounter.type = [{
            coding: [{
                system: 'http://snomed.info/sct',
                code: '185349003',
                display: v.tipoVisitaMDL || v.tipo || 'Visita medica'
            }]
        }]
    }

    // Period
    if (v.dataOra) {
        encounter.period = { start: v.dataOra }
        if (v.dataConclusione) encounter.period = { ...encounter.period as object, end: v.dataConclusione }
    }

    // Reason / motivo
    if (v.motivoVisita) {
        encounter.reasonCode = [{
            text: v.motivoVisita
        }]
    }

    return encounter
}

function buildConditionResource(visitId: string, patientId: string, code: string, display: string): Record<string, unknown> {
    return {
        resourceType: 'Condition',
        id: uuidv4(),
        meta: {
            profile: ['https://fhir.it/StructureDefinition/Condition-it-base']
        },
        clinicalStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active'
            }]
        },
        code: {
            coding: [{
                system: icdCodeSystem(code),
                code: code,
                display: display
            }]
        },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${visitId}` }
    }
}

function buildObservationResource(visitId: string, patientId: string, noteType: string, text: string): Record<string, unknown> {
    return {
        resourceType: 'Observation',
        id: uuidv4(),
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'exam',
                display: 'Exam'
            }]
        }],
        code: {
            coding: [{
                system: 'http://loinc.org',
                code: noteType === 'anamnesi' ? '10164-2' : '11450-4',
                display: noteType === 'anamnesi' ? 'History of present illness' : 'Problem list'
            }]
        },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${visitId}` },
        valueString: text
    }
}

function buildGiudizioObservation(g: FhirGiudizio, visitId: string, patientId: string): Record<string, unknown> {
    const esitoCode: Record<string, { code: string; display: string }> = {
        'IDONEO': { code: '3291000119107', display: 'Idoneo alla mansione' },
        'IDONEO_CON_LIMITAZIONI': { code: '3441000119103', display: 'Idoneo con limitazioni' },
        'NON_IDONEO_TEMPORANEO': { code: '370391006', display: 'Non idoneo temporaneo' },
        'NON_IDONEO_PERMANENTE': { code: '225303009', display: 'Non idoneo permanente' }
    }
    const coding = g.esito ? (esitoCode[g.esito] || { code: g.esito, display: g.esito }) : { code: 'unknown', display: 'Sconosciuto' }

    const obs: Record<string, unknown> = {
        resourceType: 'Observation',
        id: g.id,
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'exam'
            }]
        }],
        code: {
            coding: [{
                system: 'http://snomed.info/sct',
                code: '301956000',
                display: 'Giudizio di idoneità alla mansione specifica (Art. 41 D.Lgs. 81/2008)'
            }]
        },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${visitId}` },
        valueCodeableConcept: {
            coding: [{ system: 'http://snomed.info/sct', ...coding }]
        }
    }

    const components: Record<string, unknown>[] = []
    if (g.limitazioni) {
        components.push({
            code: { coding: [{ system: 'http://loinc.org', code: '75321-0', display: 'Limitazioni' }] },
            valueString: g.limitazioni
        })
    }
    if (g.prescrizioni) {
        components.push({
            code: { coding: [{ system: 'http://loinc.org', code: '75325-1', display: 'Prescrizioni' }] },
            valueString: g.prescrizioni
        })
    }
    if (components.length > 0) obs.component = components

    if (g.dataEmissione) obs.effectiveDateTime = g.dataEmissione
    return obs
}

// ────────────────────────── Bundle Generator ─────────────────

export interface FhirExportInput {
    patient: FhirPatient
    visit: FhirVisit
    giudizio?: FhirGiudizio | null
}

/**
 * Generate a FHIR R4 Bundle (document type) for a clinical visit.
 * Suitable for FSE 2.0 gateway submission (IT Ministry of Health).
 */
export function generateFhirBundle(input: FhirExportInput): Record<string, unknown> {
    const { patient, visit, giudizio } = input
    const bundleId = uuidv4()
    const now = new Date().toISOString()

    const entries: Record<string, unknown>[] = []

    // ── Patient resource ──
    const patientResource = buildPatientResource(patient)
    entries.push({
        fullUrl: `urn:uuid:${patient.id}`,
        resource: patientResource
    })

    // ── Encounter resource ──
    const encounterResource = buildEncounterResource(visit, patient.id)
    entries.push({
        fullUrl: `urn:uuid:${visit.id}`,
        resource: encounterResource
    })

    // ── Conditions (ICD-10 / ICPC-2 diagnosis) ──
    if (visit.codiceICD10) {
        entries.push({
            fullUrl: `urn:uuid:${uuidv4()}`,
            resource: buildConditionResource(visit.id, patient.id, visit.codiceICD10, visit.diagnosi || visit.codiceICD10)
        })
    }
    if (visit.codiceICPC2 && visit.codiceICPC2 !== visit.codiceICD10) {
        entries.push({
            fullUrl: `urn:uuid:${uuidv4()}`,
            resource: buildConditionResource(visit.id, patient.id, visit.codiceICPC2, visit.diagnosi || visit.codiceICPC2)
        })
    }

    // ── Observations (anamnesi / esame obiettivo as free text) ──
    if (visit.anamnesi) {
        entries.push({
            fullUrl: `urn:uuid:${uuidv4()}`,
            resource: buildObservationResource(visit.id, patient.id, 'anamnesi', visit.anamnesi)
        })
    }
    if (visit.esameObiettivo) {
        entries.push({
            fullUrl: `urn:uuid:${uuidv4()}`,
            resource: buildObservationResource(visit.id, patient.id, 'esame_obiettivo', visit.esameObiettivo)
        })
    }

    // ── Giudizio Idoneità (Observation) ──
    if (giudizio) {
        entries.push({
            fullUrl: `urn:uuid:${giudizio.id}`,
            resource: buildGiudizioObservation(giudizio, visit.id, patient.id)
        })
    }

    return {
        resourceType: 'Bundle',
        id: bundleId,
        meta: {
            lastUpdated: now,
            profile: ['https://fhir.it/StructureDefinition/Bundle-it-base-document']
        },
        identifier: {
            system: 'urn:oid:2.16.840.1.113883.2.9.2.10.4.4.1',
            value: bundleId
        },
        type: 'document',
        timestamp: now,
        entry: entries
    }
}
