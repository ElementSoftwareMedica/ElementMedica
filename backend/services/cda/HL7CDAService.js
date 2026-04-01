/**
 * P65 Fase 4 - HL7 CDA Service (Refactored)
 * 
 * Servizio per generazione documenti Clinical Document Architecture (CDA)
 * conformi a HL7 CDA R2 per integrazione con FSE 2.0
 * 
 * IMPORTANTE: Legge i dati clinici da Visita.datiStrutturati usando i tag HL7
 * configurati nei campi del VisitTemplate. Questo permette ai medici di
 * creare template personalizzati mantenendo compatibilità HL7/FSE.
 * 
 * @module services/cda/HL7CDAService
 * @project P65 - FSE Integration Predisposition
 */

import prisma from '../../config/prisma-optimization.js';
import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { getMedicoTitle } from '../../utils/medicoFormatters.js';


/**
 * OID Registry per Italia (FSE 2.0)
 */
export const OID_REGISTRY = {
  // Sistemi di codifica
  LOINC: '2.16.840.1.113883.6.1',
  ICD9_CM: '2.16.840.1.113883.6.103',
  ICD10: '2.16.840.1.113883.6.90',
  SNOMED_CT: '2.16.840.1.113883.6.96',
  ATC: '2.16.840.1.113883.6.73',
  AIC: '2.16.840.1.113883.2.9.6.1.5',

  // Italia FSE
  CODICE_FISCALE: '2.16.840.1.113883.2.9.4.3.2',
  REGIONE_LOMBARDIA: '2.16.840.1.113883.2.9.2.30',
  ASL_TEMPLATE: '2.16.840.1.113883.2.9.10.1.1', // Template referto laboratorio

  // Template CDA Italia
  TEMPLATE_REFERTO_LAB: '2.16.840.1.113883.2.9.10.1.1',
  TEMPLATE_REFERTO_RAD: '2.16.840.1.113883.2.9.10.1.2',
  TEMPLATE_PRESCRIZIONE: '2.16.840.1.113883.2.9.10.1.4',
  TEMPLATE_REFERTO_SPEC: '2.16.840.1.113883.2.9.10.1.5'
};

/**
 * Codici LOINC comuni per sezioni CDA
 */
export const LOINC_SECTIONS = {
  ANAMNESI: { code: '10164-2', display: 'History of present illness' },
  ESAME_OBIETTIVO: { code: '29545-1', display: 'Physical findings' },
  DIAGNOSI: { code: '29548-5', display: 'Diagnosis' },
  CONCLUSIONI: { code: '55110-1', display: 'Conclusions' },
  PRESCRIZIONI: { code: '57828-6', display: 'Prescriptions' },
  ALLERGIE: { code: '48765-2', display: 'Allergies and adverse reactions' },
  TERAPIA: { code: '10160-0', display: 'Medications' },
  ESAMI_LABORATORIO: { code: '26436-6', display: 'Laboratory studies' },
  ESAMI_RADIOLOGIA: { code: '18726-0', display: 'Radiology studies' }
};

/**
 * Classe principale per generazione CDA
 */
export class HL7CDAService {

  /**
   * Genera documento CDA da Referto
   * 
   * Legge i dati clinici da Visita.datiStrutturati usando i tag HL7
   * configurati nei campi del VisitTemplate associato alla visita.
   * 
   * @param {string} refertoId - ID del referto
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{xml: string, hash: string, cdaDocumentId: string}>}
   */
  static async generateFromReferto(refertoId, tenantId) {
    try {
      // Recupera referto con relazioni complete incluso il template
      const referto = await prisma.referto.findFirst({
        where: {
          id: refertoId,
          tenantId,
          deletedAt: null
        },
        include: {
          visita: {
            include: {
              paziente: true,
              prestazione: true,
              medico: true,
              visitTemplate: true // P65: Include template per mapping HL7
            }
          }
        }
      });

      if (!referto) {
        throw new Error(`Referto ${refertoId} non trovato`);
      }

      // Recupera firma digitale se presente
      const firmaDigitale = await prisma.firmaDigitale.findFirst({
        where: {
          refertoId,
          tenantId,
          deletedAt: null
        }
      });

      // Genera XML CDA usando datiStrutturati e template HL7
      const cdaXml = await this._buildCDAFromReferto(
        referto,
        firmaDigitale,
        tenantId
      );

      // Calcola hash
      const hashXml = crypto.createHash('sha256').update(cdaXml).digest('hex');

      // Salva documento CDA
      const cdaDocument = await prisma.cDADocument.upsert({
        where: {
          sourceType_sourceId_tenantId: {
            sourceType: 'REFERTO',
            sourceId: refertoId,
            tenantId
          }
        },
        update: {
          cdaXml,
          hashXml,
          titoloDocumento: `Referto - ${referto.visita?.prestazione?.nome || 'Visita'}`,
          dataDocumento: referto.dataReferto || new Date(),
          autoreId: referto.visita?.medicoId,
          pazienteId: referto.visita?.pazienteId,
          validato: false,
          updatedAt: new Date()
        },
        create: {
          sourceType: 'REFERTO',
          sourceId: refertoId,
          cdaXml,
          hashXml,
          titoloDocumento: `Referto - ${referto.visita?.prestazione?.nome || 'Visita'}`,
          dataDocumento: referto.dataReferto || new Date(),
          autoreId: referto.visita?.medicoId,
          pazienteId: referto.visita?.pazienteId,
          tenantId,
          createdBy: referto.visita?.medicoId
        }
      });

      logger.info('CDA generato da referto', {
        component: 'HL7CDAService',
        action: 'generateFromReferto',
        refertoId,
        cdaDocumentId: cdaDocument.id,
        templateUsed: referto.visita?.visitTemplate?.id || 'none'
      });

      return {
        xml: cdaXml,
        hash: hashXml,
        cdaDocumentId: cdaDocument.id
      };

    } catch (error) {
      logger.error('Errore generazione CDA da referto', {
        component: 'HL7CDAService',
        action: 'generateFromReferto',
        error: error.message,
        refertoId
      });
      throw error;
    }
  }

  /**
   * Genera documento CDA da GiudizioIdoneita
   * @param {string} giudizioId - ID del giudizio
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{xml: string, hash: string, cdaDocumentId: string}>}
   */
  static async generateFromGiudizio(giudizioId, tenantId) {
    try {
      const giudizio = await prisma.giudizioIdoneita.findFirst({
        where: {
          id: giudizioId,
          tenantId,
          deletedAt: null
        },
        include: {
          person: true,
          medicoCompetente: true,
          mansioni: { include: { mansione: true } },
          tenant: true
        }
      });

      if (!giudizio) {
        throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);
      }

      const cdaXml = await this._buildCDAFromGiudizio(giudizio, tenantId);
      const hashXml = crypto.createHash('sha256').update(cdaXml).digest('hex');

      const cdaDocument = await prisma.cDADocument.upsert({
        where: {
          sourceType_sourceId_tenantId: {
            sourceType: 'GIUDIZIO_IDONEITA',
            sourceId: giudizioId,
            tenantId
          }
        },
        update: {
          cdaXml,
          hashXml,
          titoloDocumento: `Giudizio Idoneità - ${giudizio.lavoratore?.firstName} ${giudizio.lavoratore?.lastName}`,
          dataDocumento: giudizio.dataGiudizio,
          autoreId: giudizio.medicoId,
          pazienteId: giudizio.lavoratoreId,
          validato: false,
          updatedAt: new Date()
        },
        create: {
          sourceType: 'GIUDIZIO_IDONEITA',
          sourceId: giudizioId,
          cdaXml,
          hashXml,
          titoloDocumento: `Giudizio Idoneità - ${giudizio.lavoratore?.firstName} ${giudizio.lavoratore?.lastName}`,
          dataDocumento: giudizio.dataGiudizio,
          autoreId: giudizio.medicoId,
          pazienteId: giudizio.lavoratoreId,
          tenantId,
          createdBy: giudizio.medicoId
        }
      });

      logger.info('CDA generato da giudizio idoneità', {
        component: 'HL7CDAService',
        action: 'generateFromGiudizio',
        giudizioId,
        cdaDocumentId: cdaDocument.id
      });

      return {
        xml: cdaXml,
        hash: hashXml,
        cdaDocumentId: cdaDocument.id
      };

    } catch (error) {
      logger.error('Errore generazione CDA da giudizio', {
        component: 'HL7CDAService',
        action: 'generateFromGiudizio',
        error: error.message,
        giudizioId
      });
      throw error;
    }
  }

  /**
   * Recupera documento CDA esistente
   * @param {string} sourceType - Tipo sorgente
   * @param {string} sourceId - ID sorgente
   * @param {string} tenantId - ID tenant
   * @returns {Promise<CDADocument|null>}
   */
  static async getCDADocument(sourceType, sourceId, tenantId) {
    return prisma.cDADocument.findFirst({
      where: {
        sourceType,
        sourceId,
        tenantId,
        deletedAt: null
      }
    });
  }

  /**
   * Ottieni mapping HL7 per campo
   * @param {string} entityType - Tipo entità
   * @param {string} fieldPath - Path campo
   * @param {string} tenantId - ID tenant (opzionale)
   * @returns {Promise<HL7Mapping|null>}
   */
  static async getHL7Mapping(entityType, fieldPath, tenantId = null) {
    // Prima cerca mapping tenant-specific, poi globale
    const mapping = await prisma.hL7Mapping.findFirst({
      where: {
        entityType,
        fieldPath,
        attivo: true,
        OR: [
          { tenantId },
          { tenantId: null }
        ]
      },
      orderBy: {
        tenantId: 'desc' // Priorità a tenant-specific
      }
    });

    return mapping;
  }

  /**
   * Valida documento CDA contro regole base
   * @param {string} cdaXml - XML da validare
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  static async validateCDA(cdaXml) {
    const errors = [];
    const warnings = [];

    // Validazione base strutturale
    if (!cdaXml.includes('<?xml')) {
      errors.push('Manca dichiarazione XML');
    }

    if (!cdaXml.includes('ClinicalDocument')) {
      errors.push('Root element ClinicalDocument mancante');
    }

    // Verifica elementi obbligatori CDA
    const requiredElements = [
      { tag: 'typeId', message: 'typeId mancante' },
      { tag: 'id', message: 'id documento mancante' },
      { tag: 'code', message: 'code documento mancante' },
      { tag: 'effectiveTime', message: 'effectiveTime mancante' },
      { tag: 'recordTarget', message: 'recordTarget (paziente) mancante' },
      { tag: 'author', message: 'author mancante' },
      { tag: 'custodian', message: 'custodian mancante' }
    ];

    for (const elem of requiredElements) {
      if (!cdaXml.includes(`<${elem.tag}`)) {
        errors.push(elem.message);
      }
    }

    // Warnings
    if (!cdaXml.includes('confidentialityCode')) {
      warnings.push('confidentialityCode mancante (raccomandato)');
    }

    if (!cdaXml.includes('legalAuthenticator')) {
      warnings.push('legalAuthenticator mancante per documenti firmati');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Aggiorna stato validazione documento CDA
   * @param {string} cdaDocumentId - ID documento
   * @param {object} validationResult - Risultato validazione
   * @returns {Promise<CDADocument>}
   */
  static async updateValidationStatus(cdaDocumentId, validationResult) {
    return prisma.cDADocument.update({
      where: { id: cdaDocumentId },
      data: {
        validato: validationResult.valid,
        validatoAt: new Date(),
        erroriValidazione: validationResult.errors,
        warningsValidazione: validationResult.warnings
      }
    });
  }

  /**
   * Lista documenti CDA per paziente
   * @param {string} pazienteId - ID paziente
   * @param {string} tenantId - ID tenant
   * @returns {Promise<CDADocument[]>}
   */
  static async getPatientCDADocuments(pazienteId, tenantId) {
    return prisma.cDADocument.findMany({
      where: {
        pazienteId,
        tenantId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // ==========================================
  // METODI PRIVATI - GENERAZIONE XML
  // ==========================================

  /**
   * Estrae i dati clinici da datiStrutturati usando i tag HL7 del template
   * 
   * Raggruppa i valori per sezione CDA basandosi sulla configurazione
   * HL7 di ogni campo nel template.
   * 
   * @param {object} visita - Visita con template
   * @returns {Object<string, Array<{label: string, value: string, code: string, unit?: string}>>}
   * @private
   */
  static _extractHL7DataFromVisita(visita) {
    const result = {
      ANAMNESI: [],
      ESAME_OBIETTIVO: [],
      DIAGNOSI: [],
      TERAPIA: [],
      PRESCRIZIONI: [],
      ALLERGIE: [],
      CONCLUSIONI: [],
      ESAMI_LABORATORIO: [],
      ESAMI_RADIOLOGIA: []
    };

    if (!visita?.visitTemplate?.fields || !visita?.datiStrutturati) {
      return result;
    }

    const template = visita.visitTemplate;
    const data = typeof visita.datiStrutturati === 'string'
      ? JSON.parse(visita.datiStrutturati)
      : visita.datiStrutturati;

    // Parse template fields (JSON)
    const fields = typeof template.fields === 'string'
      ? JSON.parse(template.fields)
      : template.fields;

    // Itera sui campi del template
    for (const field of fields) {
      // Salta campi senza configurazione HL7 o esclusi da CDA
      if (!field.hl7?.code || field.hl7?.includeInCDA === false) {
        continue;
      }

      // Recupera valore dal datiStrutturati usando field.name come chiave
      const value = data[field.name];

      // Salta valori vuoti
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Determina la sezione CDA
      const section = field.hl7.section || 'CONCLUSIONI';

      // Aggiungi alla sezione appropriata
      if (result[section]) {
        result[section].push({
          label: field.hl7.displayName || field.label,
          value: this._formatValue(value, field.type),
          code: field.hl7.code,
          codeSystem: field.hl7.codeSystem || 'LOINC',
          unit: field.hl7.unit
        });
      }
    }

    return result;
  }

  /**
   * Formatta un valore per l'output CDA
   * @private
   */
  static _formatValue(value, fieldType) {
    if (value === null || value === undefined) return '';

    switch (fieldType) {
      case 'BOOLEAN':
        return value === true || value === 'true' ? 'Sì' : 'No';
      case 'DATE':
        try {
          return new Date(value).toLocaleDateString('it-IT');
        } catch {
          return String(value);
        }
      case 'DATETIME':
        try {
          return new Date(value).toLocaleString('it-IT');
        } catch {
          return String(value);
        }
      case 'NUMBER':
      case 'VITALS':
        return String(value);
      case 'MULTI_CHOICE':
        return Array.isArray(value) ? value.join(', ') : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Costruisce XML CDA da Referto
   * 
   * NUOVO APPROCCIO P65: Legge da visita.datiStrutturati usando i tag HL7
   * configurati nei campi del VisitTemplate.
   * 
   * @private
   */
  static async _buildCDAFromReferto(referto, firmaDigitale, tenantId) {
    const visita = referto.visita;
    const paziente = visita?.paziente;
    const medico = visita?.medico;
    const prestazione = visita?.prestazione;

    const documentId = crypto.randomUUID();
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

    // Estrai dati HL7 dal template e datiStrutturati
    const hl7Data = this._extractHL7DataFromVisita(visita);

    // Determina template CDA in base al tipo prestazione
    let templateId = OID_REGISTRY.TEMPLATE_REFERTO_SPEC;
    let documentCode = LOINC_SECTIONS.CONCLUSIONI.code;
    let documentDisplayName = 'Referto specialistico';

    if (prestazione?.tipo === 'LABORATORIO') {
      templateId = OID_REGISTRY.TEMPLATE_REFERTO_LAB;
      documentCode = '11502-2';
      documentDisplayName = 'Laboratory report';
    } else if (prestazione?.tipo === 'RADIOLOGIA') {
      templateId = OID_REGISTRY.TEMPLATE_REFERTO_RAD;
      documentCode = '18748-4';
      documentDisplayName = 'Diagnostic imaging study';
    }

    // Costruisci sezioni CDA dinamicamente
    const sectionsXml = this._buildDynamicSections(hl7Data, referto);

    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- === HEADER === -->
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="${templateId}"/>
  <id root="${tenantId}" extension="${documentId}"/>
  <code code="${documentCode}" codeSystem="${OID_REGISTRY.LOINC}" 
        codeSystemName="LOINC" displayName="${documentDisplayName}"/>
  <title>${this._escapeXml(referto.titolo || 'Referto')}</title>
  <effectiveTime value="${now}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" displayName="Normal"/>
  <languageCode code="it-IT"/>
  
  <!-- === PAZIENTE === -->
  <recordTarget>
    <patientRole>
      ${paziente?.codiceFiscale ? `<id root="${OID_REGISTRY.CODICE_FISCALE}" extension="${paziente.codiceFiscale}"/>` : ''}
      <patient>
        <name>
          <given>${this._escapeXml(paziente?.firstName || '')}</given>
          <family>${this._escapeXml(paziente?.lastName || '')}</family>
        </name>
        ${paziente?.gender ? `<administrativeGenderCode code="${paziente.gender === 'MALE' ? 'M' : 'F'}" codeSystem="2.16.840.1.113883.5.1"/>` : ''}
        ${paziente?.birthDate ? `<birthTime value="${new Date(paziente.birthDate).toISOString().slice(0, 10).replace(/-/g, '')}"/>` : ''}
      </patient>
    </patientRole>
  </recordTarget>
  
  <!-- === AUTORE === -->
  <author>
    <time value="${now}"/>
    <assignedAuthor>
      ${medico?.codiceFiscale ? `<id root="${OID_REGISTRY.CODICE_FISCALE}" extension="${medico.codiceFiscale}"/>` : `<id root="${tenantId}" extension="${medico?.id || 'unknown'}"/>`}
      <assignedPerson>
        <name>
          <prefix>${getMedicoTitle(medico?.gender)}</prefix>
          <given>${this._escapeXml(medico?.firstName || '')}</given>
          <family>${this._escapeXml(medico?.lastName || '')}</family>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  
  <!-- === CUSTODIAN === -->
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="${tenantId}"/>
        <name>Element srl</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  
  ${firmaDigitale ? `
  <!-- === FIRMA === -->
  <legalAuthenticator>
    <time value="${new Date(firmaDigitale.createdAt).toISOString().replace(/[-:]/g, '').split('.')[0]}"/>
    <signatureCode code="S"/>
    <assignedEntity>
      <id root="${tenantId}" extension="${firmaDigitale.firmatarioId}"/>
    </assignedEntity>
  </legalAuthenticator>
  ` : ''}
  
  <!-- === BODY STRUTTURATO (generato da datiStrutturati + HL7 tags) === -->
  <component>
    <structuredBody>
${sectionsXml}
      <!-- Contenuto referto testuale -->
      ${referto.contenuto ? this._buildSection('CONCLUSIONI', referto.contenuto) : ''}
    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  /**
   * Costruisce sezioni CDA dinamiche dai dati HL7 estratti
   * @private
   */
  static _buildDynamicSections(hl7Data, referto) {
    const sections = [];
    const sectionOrder = [
      'ANAMNESI',
      'ALLERGIE',
      'ESAME_OBIETTIVO',
      'ESAMI_LABORATORIO',
      'ESAMI_RADIOLOGIA',
      'DIAGNOSI',
      'TERAPIA',
      'PRESCRIZIONI'
    ];

    for (const sectionKey of sectionOrder) {
      const entries = hl7Data[sectionKey];
      if (!entries || entries.length === 0) continue;

      const section = LOINC_SECTIONS[sectionKey];
      if (!section) continue;

      // Costruisci contenuto testuale
      const textItems = entries.map(entry => {
        let itemText = `<item><content styleCode="Bold">${this._escapeXml(entry.label)}:</content> ${this._escapeXml(entry.value)}`;
        if (entry.unit) {
          itemText += ` ${this._escapeXml(entry.unit)}`;
        }
        itemText += '</item>';
        return itemText;
      }).join('\n              ');

      // Costruisci entry codificate
      const codedEntries = entries.map(entry => `
            <entry>
              <observation classCode="OBS" moodCode="EVN">
                <code code="${entry.code}" codeSystem="${this._getCodeSystemOID(entry.codeSystem)}" 
                      codeSystemName="${entry.codeSystem || 'LOINC'}" displayName="${this._escapeXml(entry.label)}"/>
                <value xsi:type="ST">${this._escapeXml(entry.value)}${entry.unit ? ' ' + this._escapeXml(entry.unit) : ''}</value>
              </observation>
            </entry>`).join('');

      sections.push(`
      <component>
        <section>
          <code code="${section.code}" codeSystem="${OID_REGISTRY.LOINC}" 
                codeSystemName="LOINC" displayName="${section.display}"/>
          <title>${section.display}</title>
          <text>
            <list>
              ${textItems}
            </list>
          </text>${codedEntries}
        </section>
      </component>`);
    }

    return sections.join('\n');
  }

  /**
   * Ottieni OID per code system
   * @private
   */
  static _getCodeSystemOID(codeSystem) {
    const mapping = {
      'LOINC': OID_REGISTRY.LOINC,
      'ICD10': OID_REGISTRY.ICD10,
      'ICD9_CM': OID_REGISTRY.ICD9_CM,
      'SNOMED_CT': OID_REGISTRY.SNOMED_CT,
      'ATC': OID_REGISTRY.ATC
    };
    return mapping[codeSystem] || OID_REGISTRY.LOINC;
  }

  /**
   * Costruisce XML CDA da GiudizioIdoneita
   * @private
   */
  static async _buildCDAFromGiudizio(giudizio, tenantId) {
    const lavoratore = giudizio.person;
    const medico = giudizio.medicoCompetente;
    const azienda = giudizio.tenant;
    const mansioniNomi = giudizio.mansioni?.map(m => m.mansione?.denominazione || m.mansione?.nome).filter(Boolean).join(', ') || 'N/D';

    const documentId = crypto.randomUUID();
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

    // Mappa esito a codice
    const esitoMap = {
      IDONEO: { code: 'FIT', display: 'Idoneo' },
      IDONEO_CON_PRESCRIZIONI: { code: 'FIT_COND', display: 'Idoneo con prescrizioni' },
      IDONEO_CON_LIMITAZIONI: { code: 'FIT_LIM', display: 'Idoneo con limitazioni' },
      TEMPORANEAMENTE_NON_IDONEO: { code: 'TEMP_UNFIT', display: 'Temporaneamente non idoneo' },
      NON_IDONEO: { code: 'UNFIT', display: 'Non idoneo' },
      NON_IDONEO_PERMANENTE: { code: 'PERM_UNFIT', display: 'Non idoneo permanente' }
    };

    const esitoCda = esitoMap[giudizio.esito] || { code: 'UNK', display: 'Sconosciuto' };

    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- === HEADER === -->
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.2.9.10.1.6"/>
  <id root="${tenantId}" extension="${documentId}"/>
  <code code="28653-4" codeSystem="${OID_REGISTRY.LOINC}" 
        codeSystemName="LOINC" displayName="Occupational medicine evaluation note"/>
  <title>Giudizio di Idoneità alla Mansione Specifica</title>
  <effectiveTime value="${now}"/>
  <confidentialityCode code="R" codeSystem="2.16.840.1.113883.5.25" displayName="Restricted"/>
  <languageCode code="it-IT"/>
  
  <!-- === LAVORATORE === -->
  <recordTarget>
    <patientRole>
      ${lavoratore?.codiceFiscale ? `<id root="${OID_REGISTRY.CODICE_FISCALE}" extension="${lavoratore.codiceFiscale}"/>` : ''}
      <patient>
        <name>
          <given>${this._escapeXml(lavoratore?.firstName || '')}</given>
          <family>${this._escapeXml(lavoratore?.lastName || '')}</family>
        </name>
        ${lavoratore?.gender ? `<administrativeGenderCode code="${lavoratore.gender === 'MALE' ? 'M' : 'F'}" codeSystem="2.16.840.1.113883.5.1"/>` : ''}
        ${lavoratore?.birthDate ? `<birthTime value="${new Date(lavoratore.birthDate).toISOString().slice(0, 10).replace(/-/g, '')}"/>` : ''}
      </patient>
    </patientRole>
  </recordTarget>
  
  <!-- === MEDICO COMPETENTE === -->
  <author>
    <time value="${now}"/>
    <assignedAuthor>
      ${medico?.codiceFiscale ? `<id root="${OID_REGISTRY.CODICE_FISCALE}" extension="${medico.codiceFiscale}"/>` : `<id root="${tenantId}" extension="${medico?.id || 'unknown'}"/>`}
      <assignedPerson>
        <name>
          <prefix>${getMedicoTitle(medico?.gender)}</prefix>
          <given>${this._escapeXml(medico?.firstName || '')}</given>
          <family>${this._escapeXml(medico?.lastName || '')}</family>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  
  <!-- === CUSTODIAN === -->
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="${tenantId}"/>
        <name>Element srl</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  
  <!-- === BODY STRUTTURATO === -->
  <component>
    <structuredBody>
      <!-- AZIENDA E MANSIONE -->
      <component>
        <section>
          <code code="29762-2" codeSystem="${OID_REGISTRY.LOINC}" displayName="Social history"/>
          <title>Dati Lavorativi</title>
          <text>
            <list>
              <item>Azienda: ${this._escapeXml(azienda?.ragioneSociale || azienda?.name || 'N/D')}</item>
              <item>Mansione/i: ${this._escapeXml(mansioniNomi)}</item>
              <item>Tipo visita: ${this._escapeXml(giudizio.tipoVisita || 'N/D')}</item>
            </list>
          </text>
        </section>
      </component>
      
      <!-- ESITO IDONEITÀ -->
      <component>
        <section>
          <code code="11323-3" codeSystem="${OID_REGISTRY.LOINC}" displayName="Health status"/>
          <title>Giudizio di Idoneità</title>
          <text>
            <paragraph>
              <content styleCode="Bold">Esito:</content> ${this._escapeXml(esitoCda.display)}
            </paragraph>
            ${giudizio.prescrizioniIdoneita ? `<paragraph><content styleCode="Bold">Prescrizioni:</content> ${this._escapeXml(giudizio.prescrizioniIdoneita)}</paragraph>` : ''}
            ${giudizio.limitazioni ? `<paragraph><content styleCode="Bold">Limitazioni:</content> ${this._escapeXml(giudizio.limitazioni)}</paragraph>` : ''}
            ${giudizio.note ? `<paragraph><content styleCode="Bold">Note:</content> ${this._escapeXml(giudizio.note)}</paragraph>` : ''}
          </text>
          <entry>
            <observation classCode="OBS" moodCode="EVN">
              <code code="11323-3" codeSystem="${OID_REGISTRY.LOINC}" displayName="Health status"/>
              <value xsi:type="CE" code="${esitoCda.code}" displayName="${esitoCda.display}"/>
            </observation>
          </entry>
        </section>
      </component>
      
      ${giudizio.scadenzaGiudizio ? `
      <!-- PROSSIMA VISITA -->
      <component>
        <section>
          <code code="18776-5" codeSystem="${OID_REGISTRY.LOINC}" displayName="Plan of care"/>
          <title>Programmazione</title>
          <text>
            <paragraph>Prossima visita entro: ${new Date(giudizio.scadenzaGiudizio).toLocaleDateString('it-IT')}</paragraph>
          </text>
        </section>
      </component>
      ` : ''}
    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  /**
   * Costruisce una sezione CDA
   * @private
   */
  static _buildSection(sectionKey, content) {
    const section = LOINC_SECTIONS[sectionKey];
    if (!section || !content) return '';

    return `
      <component>
        <section>
          <code code="${section.code}" codeSystem="${OID_REGISTRY.LOINC}" 
                codeSystemName="LOINC" displayName="${section.display}"/>
          <title>${section.display}</title>
          <text>
            <paragraph>${this._escapeXml(content)}</paragraph>
          </text>
        </section>
      </component>`;
  }

  /**
   * Escape caratteri speciali XML
   * @private
   */
  static _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default HL7CDAService;
