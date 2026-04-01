/**
 * Types for Modulistica Template Form
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 * @project P53 - Modulistica System
 */

import type {
  CampoTemplate,
  CampoTemplateType,
  TipoDocumentoTemplate,
  FaseDocumento,
  CampoCondition,
  CodiceRischio,
  TipoVisitaMDL,
  CompilatoreQuestionario
} from '../../../../../services/clinicaApi';

export type { CampoTemplate, CampoTemplateType, CampoCondition, CodiceRischio, TipoVisitaMDL, CompilatoreQuestionario };

export interface FormData {
  nome: string;
  descrizione: string;
  codice: string;
  tipo: TipoDocumentoTemplate;
  fase: FaseDocumento;
  branchTypes: string[];
  richiedeFirma: boolean;
  richiedeFirmaMedico: boolean;
  richiedeFirmaDipendente: boolean;
  richiedeFirmaFormatore: boolean;
  richiedeFirmaDatore: boolean;
  /** Posizione firma nel documento: 'footer' (in fondo), 'inline' (nel corpo), 'both' */
  firmaPosition: 'footer' | 'inline' | 'both';
  validitaGiorni: string;
  /** Data fissa di scadenza (alternativa a validitaGiorni) */
  scadenzaFissa: string;
  obbligatorio: boolean;
  isActive: boolean;
  ordine: number;
  contenutoHtml: string;
  campi: CampoTemplate[];
  prestazioniIds: string[];
  mediciIds: string[];
  /** Abilita sistema scoring per questionari */
  haScoring: boolean;
  /** Punteggio massimo totale */
  scoringMaxScore: number;
  /** Soglia minima per superamento */
  scoringPassingScore: number;
  /** Soglia critica */
  sogliaCritica: number;
  // === MDL-specific QuestionarioConfig fields ===
  /** Specializzazione medica (es. Cardiologia, Audiometria) */
  specializzazione: string;
  /** Codici rischio lavorativo applicabili */
  codiciRischio: CodiceRischio[];
  /** Tipi visita MDL applicabili */
  tipiVisitaMDL: TipoVisitaMDL[];
  /** Chi può compilare il questionario */
  compilabileDa: CompilatoreQuestionario;
  /** Tempo stimato compilazione (minuti) */
  tempoStimato: string;
  /** Istruzioni per il paziente */
  istruzioniPaziente: string;
  /** Istruzioni per il medico */
  istruzioniMedico: string;
  /** Richiede revisione del medico dopo compilazione */
  richiedeRevisione: boolean;
  /** Periodicità di ricompilazione (mesi) */
  periodicitaMesi: string;
  /** Invia promemoria prima della scadenza */
  promemoria: boolean;
  /** Il questionario è a pagamento */
  isPagamento: boolean;
  /** Genera movimento contabile */
  fatturabile: boolean;
  /** Prezzo default se non legato a tariffa */
  prezzoDefault: string;
}

export type TabId = 'info' | 'campi' | 'anteprima' | 'template' | 'associazioni';

export const TIPI_DOCUMENTO: { value: TipoDocumentoTemplate; label: string; group?: string }[] = [
  // --- Modulistica ---
  { value: 'CONSENSO_INFORMATO', label: 'Consenso Informato', group: 'Modulistica' },
  { value: 'PRIVACY', label: 'Informativa Privacy', group: 'Modulistica' },
  { value: 'ANAMNESI', label: 'Anamnesi', group: 'Modulistica' },
  { value: 'CERTIFICATO', label: 'Certificato', group: 'Modulistica' },
  { value: 'PRESCRIZIONE', label: 'Prescrizione', group: 'Modulistica' },
  { value: 'REFERTO', label: 'Referto', group: 'Modulistica' },
  { value: 'MODULO_GENERICO', label: 'Modulo Generico', group: 'Modulistica' },
  { value: 'DICHIARAZIONE', label: 'Dichiarazione', group: 'Modulistica' },
  // --- Questionari ---
  { value: 'QUESTIONARIO_ANAMNESI_MDL', label: 'Questionario Anamnesi MDL', group: 'Questionari' },
  { value: 'QUESTIONARIO_RISCHIO', label: 'Questionario Rischio', group: 'Questionari' },
  { value: 'QUESTIONARIO_SINTOMI', label: 'Questionario Sintomi', group: 'Questionari' },
  { value: 'SCHEDA_SORVEGLIANZA', label: 'Scheda Sorveglianza', group: 'Questionari' },
  { value: 'ALCOL_SCREENING', label: 'Alcol Screening', group: 'Questionari' },
  // --- Altro ---
  { value: 'ALTRO', label: 'Altro' }
];

export const FASI_DOCUMENTO: { value: FaseDocumento; label: string }[] = [
  { value: 'REGISTRAZIONE', label: 'Registrazione' },
  { value: 'PRE_VISITA', label: 'Pre-visita' },
  { value: 'DURANTE_VISITA', label: 'Durante visita' },
  { value: 'POST_VISITA', label: 'Post-visita' },
  { value: 'AMMINISTRATIVO', label: 'Amministrativo' },
  { value: 'ALTRO', label: 'Altro' }
];

export const TIPI_CAMPO: { value: CampoTemplateType; label: string; description: string }[] = [
  { value: 'text', label: 'Testo breve', description: 'Campo di testo su una riga' },
  { value: 'textarea', label: 'Testo lungo', description: 'Area di testo multi-riga' },
  { value: 'number', label: 'Numero', description: 'Campo numerico con validazione' },
  { value: 'date', label: 'Data', description: 'Selettore data' },
  { value: 'email', label: 'Email', description: 'Campo email con validazione' },
  { value: 'phone', label: 'Telefono', description: 'Campo telefono' },
  { value: 'boolean', label: 'Sì/No', description: 'Singola checkbox sì/no' },
  { value: 'select', label: 'Selezione singola', description: 'Menu a tendina con una scelta' },
  { value: 'radio', label: 'Scelta singola (radio)', description: 'Opzioni radio mutualmente esclusive' },
  { value: 'multiselect', label: 'Selezione multipla', description: 'Checkbox multiple (più scelte)' },
  { value: 'signature', label: 'Firma', description: 'Campo per firma digitale' }
];

export const BRANCH_TYPES = [
  { value: 'MEDICA', label: 'ElementMedica' },
  { value: 'FORMAZIONE', label: 'ElementSicurezza' }
];

/** Tipi che abilitano la sezione Configurazione MDL nel form */
export const TIPI_QUESTIONARIO_MDL: TipoDocumentoTemplate[] = [
  'QUESTIONARIO_ANAMNESI_MDL',
  'QUESTIONARIO_RISCHIO',
  'QUESTIONARIO_SINTOMI',
  'SCHEDA_SORVEGLIANZA',
  'ALCOL_SCREENING',
];

export const COMPILATORI_QUESTIONARIO: { value: CompilatoreQuestionario; label: string; desc: string }[] = [
  { value: 'MEDICO', label: 'Solo medico', desc: 'Il medico compila interamente' },
  { value: 'PAZIENTE', label: 'Solo paziente', desc: 'Il paziente compila autonomamente' },
  { value: 'ENTRAMBI', label: 'Medico e paziente', desc: 'Sezioni dedicate a entrambi' },
  { value: 'ASSISTITO', label: 'Paziente assistito', desc: 'Il paziente è assistito dall\'operatore' },
];

export const TIPI_VISITA_MDL_OPTIONS: { value: TipoVisitaMDL; label: string }[] = [
  { value: 'PREVENTIVA', label: 'Preventiva (art. 41 c.2a)' },
  { value: 'PREVENTIVA_PREASSUNTIVA', label: 'Preventiva preassuntiva (art. 41 c.2a-bis)' },
  { value: 'PERIODICA', label: 'Periodica (art. 41 c.2b)' },
  { value: 'CAMBIO_MANSIONE', label: 'Cambio mansione (art. 41 c.2c)' },
  { value: 'CESSAZIONE_RAPPORTO', label: 'Cessazione rapporto (art. 41 c.2d)' },
  { value: 'PRECEDENTE_ASSENZA', label: 'Dopo assenza >60gg (art. 41 c.2e)' },
  { value: 'SU_RICHIESTA_LAVORATORE', label: 'Su richiesta lavoratore (art. 41 c.2f)' },
  { value: 'STRAORDINARIA', label: 'Straordinaria (art. 41 c.3)' },
  { value: 'VERIFICA_IDONEITA', label: 'Verifica idoneità (art. 41 c.9)' },
  { value: 'RIENTRO_MATERNITA', label: 'Rientro maternità/congedo' },
];

export const CODICI_RISCHIO_OPTIONS: { value: CodiceRischio; label: string; categoria: string }[] = [
  // Fisici
  { value: 'RUM', label: 'Rumore', categoria: 'Fisici' },
  { value: 'VIB_MB', label: 'Vibrazioni mano-braccio', categoria: 'Fisici' },
  { value: 'VIB_WBV', label: 'Vibrazioni corpo intero', categoria: 'Fisici' },
  { value: 'RAD_ION', label: 'Radiazioni ionizzanti', categoria: 'Fisici' },
  { value: 'RAD_NIR', label: 'Radiazioni non ionizzanti', categoria: 'Fisici' },
  { value: 'CEM', label: 'Campi elettromagnetici', categoria: 'Fisici' },
  { value: 'MIC', label: 'Microclima severo', categoria: 'Fisici' },
  // Chimici
  { value: 'CHI', label: 'Agenti chimici', categoria: 'Chimici' },
  { value: 'CAN', label: 'Cancerogeni/mutageni', categoria: 'Chimici' },
  { value: 'AMI', label: 'Amianto', categoria: 'Chimici' },
  { value: 'PIO', label: 'Piombo', categoria: 'Chimici' },
  // Biologici
  { value: 'BIO', label: 'Agenti biologici', categoria: 'Biologici' },
  // Ergonomici
  { value: 'MMC', label: 'Movimentazione manuale carichi', categoria: 'Ergonomici' },
  { value: 'MOV_RIP', label: 'Movimenti ripetitivi arti sup.', categoria: 'Ergonomici' },
  { value: 'POS', label: 'Posture incongrue', categoria: 'Ergonomici' },
  // Organizzativi
  { value: 'NOT', label: 'Lavoro notturno', categoria: 'Organizzativi' },
  { value: 'VDT', label: 'Videoterminale >20h/sett.', categoria: 'Organizzativi' },
  { value: 'SLC', label: 'Stress lavoro-correlato', categoria: 'Organizzativi' },
  // Specifici
  { value: 'QUO', label: 'Lavoro in quota', categoria: 'Specifici' },
  { value: 'SPA_CON', label: 'Spazi confinati', categoria: 'Specifici' },
  { value: 'GUI_MEZ', label: 'Guida automezzi/macchine', categoria: 'Specifici' },
  // Settoriali
  { value: 'CAR_ELE', label: 'Carrelli elevatori', categoria: 'Settoriali' },
  { value: 'ELE', label: 'Rischio elettrico', categoria: 'Settoriali' },
  { value: 'INC', label: 'Rischio incendio', categoria: 'Settoriali' },
  { value: 'ISO', label: 'Lavoro isolato', categoria: 'Settoriali' },
  { value: 'IPE', label: 'Ipogei/lavori con funi', categoria: 'Settoriali' },
  { value: 'POL', label: 'Polveri/silice', categoria: 'Settoriali' },
  { value: 'ALC', label: 'Alcol/sostanze psicotrope', categoria: 'Settoriali' },
];

export const CONDITION_OPERATORS: { value: CampoCondition['operator']; label: string }[] = [
  { value: 'equals', label: 'È uguale a' },
  { value: 'notEquals', label: 'È diverso da' },
  { value: 'contains', label: 'Contiene' },
  { value: 'greaterThan', label: 'Maggiore di' },
  { value: 'lessThan', label: 'Minore di' },
  { value: 'isEmpty', label: 'È vuoto' },
  { value: 'isNotEmpty', label: 'Non è vuoto' }
];

/** Placeholder disponibili per il template PDF */
export const PDF_PLACEHOLDERS = [
  { key: '{{nomePaziente}}', label: 'Nome paziente', category: 'Paziente' },
  { key: '{{cognomePaziente}}', label: 'Cognome paziente', category: 'Paziente' },
  { key: '{{codiceFiscalePaziente}}', label: 'Codice fiscale paziente', category: 'Paziente' },
  { key: '{{dataNascitaPaziente}}', label: 'Data di nascita paziente', category: 'Paziente' },
  { key: '{{luogoNascitaPaziente}}', label: 'Luogo di nascita paziente', category: 'Paziente' },
  { key: '{{emailPaziente}}', label: 'Email paziente', category: 'Paziente' },
  { key: '{{telefonoPaziente}}', label: 'Telefono paziente', category: 'Paziente' },
  { key: '{{nomeMedico}}', label: 'Nome medico', category: 'Medico' },
  { key: '{{cognomeMedico}}', label: 'Cognome medico', category: 'Medico' },
  { key: '{{titoloMedico}}', label: 'Titolo medico (Dott./Dott.ssa)', category: 'Medico' },
  { key: '{{dataVisita}}', label: 'Data della visita', category: 'Visita' },
  { key: '{{oraVisita}}', label: 'Ora della visita', category: 'Visita' },
  { key: '{{prestazione}}', label: 'Nome prestazione', category: 'Visita' },
  { key: '{{ambulatorio}}', label: 'Ambulatorio', category: 'Visita' },
  { key: '{{logoTenant}}', label: 'Logo della struttura', category: 'Struttura' },
  { key: '{{nomeStruttura}}', label: 'Nome della struttura', category: 'Struttura' },
  { key: '{{indirizzoStruttura}}', label: 'Indirizzo della struttura', category: 'Struttura' },
  { key: '{{telefonoStruttura}}', label: 'Telefono della struttura', category: 'Struttura' },
  { key: '{{campiQuestionario}}', label: 'Tutte le domande e risposte', category: 'Questionario' },
  { key: '{{firmaPaziente}}', label: 'Firma del paziente', category: 'Firme' },
  { key: '{{firmaMedico}}', label: 'Firma del medico', category: 'Firme' },
  { key: '{{firmaDipendente}}', label: 'Firma del dipendente', category: 'Firme' },
  { key: '{{firmaFormatore}}', label: 'Firma del formatore', category: 'Firme' },
  { key: '{{firmaDatore}}', label: 'Firma del datore di lavoro', category: 'Firme' },
  { key: '{{dataCompilazione}}', label: 'Data di compilazione', category: 'Documento' },
  { key: '{{dataOggi}}', label: 'Data odierna', category: 'Documento' },
  { key: '{{nomeDocumento}}', label: 'Nome del documento', category: 'Documento' },
  { key: '{{codiceDocumento}}', label: 'Codice del documento', category: 'Documento' },
];

export const DEFAULT_PDF_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
  <!-- Header con logo -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px;">
    <div>
      {{logoTenant}}
      <h2 style="margin: 5px 0 0 0; color: #0d9488; font-size: 18px;">{{nomeStruttura}}</h2>
      <p style="margin: 2px 0; color: #666; font-size: 12px;">{{indirizzoStruttura}}</p>
      <p style="margin: 2px 0; color: #666; font-size: 12px;">Tel: {{telefonoStruttura}}</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0; color: #999; font-size: 11px;">Codice: {{codiceDocumento}}</p>
      <p style="margin: 2px 0; color: #999; font-size: 11px;">Data: {{dataOggi}}</p>
    </div>
  </div>

  <!-- Titolo documento -->
  <h1 style="text-align: center; color: #1a1a1a; font-size: 22px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;">
    {{nomeDocumento}}
  </h1>

  <!-- Dati paziente -->
  <div style="background: #f8fffe; border: 1px solid #e0f2f1; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 12px 0; color: #0d9488; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Dati Paziente</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px; width: 150px;">Cognome e Nome:</td>
        <td style="padding: 4px 8px; font-weight: 600; font-size: 13px;">{{cognomePaziente}} {{nomePaziente}}</td>
        <td style="padding: 4px 8px; color: #666; font-size: 13px; width: 120px;">Codice Fiscale:</td>
        <td style="padding: 4px 8px; font-weight: 600; font-size: 13px;">{{codiceFiscalePaziente}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px;">Data di nascita:</td>
        <td style="padding: 4px 8px; font-size: 13px;">{{dataNascitaPaziente}}</td>
        <td style="padding: 4px 8px; color: #666; font-size: 13px;">Luogo:</td>
        <td style="padding: 4px 8px; font-size: 13px;">{{luogoNascitaPaziente}}</td>
      </tr>
    </table>
  </div>

  <!-- Dati visita -->
  <div style="background: #f0f9ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 12px 0; color: #2563eb; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Dati Visita</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px; width: 150px;">Medico:</td>
        <td style="padding: 4px 8px; font-weight: 600; font-size: 13px;">{{titoloMedico}} {{cognomeMedico}} {{nomeMedico}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px;">Prestazione:</td>
        <td style="padding: 4px 8px; font-size: 13px;">{{prestazione}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px;">Data e ora:</td>
        <td style="padding: 4px 8px; font-size: 13px;">{{dataVisita}} ore {{oraVisita}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 8px; color: #666; font-size: 13px;">Ambulatorio:</td>
        <td style="padding: 4px 8px; font-size: 13px;">{{ambulatorio}}</td>
      </tr>
    </table>
  </div>

  <!-- Campi questionario -->
  <div style="margin-bottom: 30px;">
    {{campiQuestionario}}
  </div>

  <!-- Firme -->
  <div style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px;">
    <div style="text-align: center; width: 45%;">
      <div style="border-bottom: 1px solid #333; min-height: 60px; margin-bottom: 8px;">
        {{firmaPaziente}}
      </div>
      <p style="margin: 0; color: #666; font-size: 12px;">Firma del Paziente</p>
      <p style="margin: 4px 0 0 0; color: #999; font-size: 11px;">{{cognomePaziente}} {{nomePaziente}}</p>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-bottom: 1px solid #333; min-height: 60px; margin-bottom: 8px;">
        {{firmaMedico}}
      </div>
      <p style="margin: 0; color: #666; font-size: 12px;">Firma del Medico</p>
      <p style="margin: 4px 0 0 0; color: #999; font-size: 11px;">{{titoloMedico}} {{cognomeMedico}} {{nomeMedico}}</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
    <p style="margin: 0; color: #999; font-size: 10px;">
      Documento generato il {{dataOggi}} — {{nomeStruttura}} — {{indirizzoStruttura}}
    </p>
  </div>
</div>`;

/** Stato iniziale del form */
export const INITIAL_FORM_DATA: FormData = {
  nome: '',
  descrizione: '',
  codice: '',
  tipo: 'MODULO_GENERICO',
  fase: 'ALTRO',
  branchTypes: ['MEDICA'],
  richiedeFirma: false,
  richiedeFirmaMedico: false,
  richiedeFirmaDipendente: false,
  richiedeFirmaFormatore: false,
  richiedeFirmaDatore: false,
  firmaPosition: 'footer',
  validitaGiorni: '',
  scadenzaFissa: '',
  obbligatorio: false,
  isActive: true,
  ordine: 0,
  contenutoHtml: '',
  campi: [],
  prestazioniIds: [],
  mediciIds: [],
  haScoring: false,
  scoringMaxScore: 100,
  scoringPassingScore: 60,
  sogliaCritica: 30,
  // MDL
  specializzazione: '',
  codiciRischio: [],
  tipiVisitaMDL: [],
  compilabileDa: 'MEDICO',
  tempoStimato: '',
  istruzioniPaziente: '',
  istruzioniMedico: '',
  richiedeRevisione: true,
  periodicitaMesi: '',
  promemoria: false,
  isPagamento: false,
  fatturabile: true,
  prezzoDefault: ''
};
