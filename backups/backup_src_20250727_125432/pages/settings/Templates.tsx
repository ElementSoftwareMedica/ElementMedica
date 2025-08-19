import React, { useState, useEffect, useRef } from 'react';
import { FileText, Presentation, Upload, Search, List, Edit, PlusCircle, FileImage, Star, StarOff, 
  ExternalLink, Check, Plus, Layout, Filter, Trash2, Clipboard, AlertCircle, X, Save, ArrowLeft, Eye, 
  ChevronDown, ChevronUp, FileOutput, MoreVertical, Settings } from 'lucide-react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { TabNavigation } from '../../components/shared';
import { API_ENDPOINTS } from '../../config/api';
import ReactDOM from 'react-dom';
import { TemplateCard } from '../../components/shared/template/TemplateCard';
import { TemplateActionDropdown } from '../../components/shared/template/TemplateActionDropdown';
import { NewTemplateDropdown } from '../../components/shared/template/NewTemplateDropdown';
import { PlaceholdersLegend } from '../../components/shared/template/PlaceholdersLegend';
import { TemplateFormModal } from '../../components/shared/template/TemplateFormModal';
import { Template } from '../../types/template';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';

const TEMPLATE_TYPES = [
  { value: 'attestato', label: 'Attestati' },
  { value: 'lettera_incarico', label: 'Lettere di Incarico' },
  { value: 'registro_presenze', label: 'Registri Presenze' },
  { value: 'fattura', label: 'Fatture' },
  { value: 'visita', label: 'Visite' },
  { value: 'preventivo', label: 'Preventivi' },
];

const FILE_FORMATS = [
  { value: 'text', label: 'Documento di testo' },
  { value: 'pptx', label: 'Presentazione Slides' },
];

// Define template examples for different types
const TEMPLATE_EXAMPLES = {
  attestato: `
<div style="text-align: center;">
  <h1>Attestato di Partecipazione</h1>
  <h2>ATTESTATO</h2>
  <p>Si certifica che</p>
  <h3>{{dipendente_nome}} {{dipendente_cognome}}</h3>
  <p>ha partecipato con successo al corso</p>
  <h3>"{{corso_nome}}"</h3>
  <p>della durata di {{Ore corso}} ore</p>
  <p>svoltosi dal {{data_1}} al {{data_2}}</p>
  
  <div style="margin-top: 40px;">
    <p>{{data_generazione_template}}</p>
    <p>Firma del Responsabile</p>
    <p>_______________________</p>
  </div>
</div>`,

  lettera_incarico: `
<div>
  <h1>Lettera di Incarico</h1>
  
  <p>Spett.le {{formatore_nome}} {{formatore_cognome}}<br>
  {{formatore_indirizzo}}<br>
  {{formatore_cap}} {{formatore_citta}} ({{formatore_provincia}})</p>

  <p><strong>Oggetto: Incarico per attività di docenza</strong></p>

  <p>Con la presente si conferisce a {{formatore_nome}} {{formatore_cognome}}, nato/a a {{formatore_luogo_nascita}} il {{formatore_data_nascita}}, l'incarico di svolgere attività di docenza per il corso "{{corso_nome}}" da tenersi presso {{luogo}}.</p>

  <p>L'incarico prevede lo svolgimento delle seguenti attività:</p>
  <ul>
    <li>Predisposizione del materiale didattico</li>
    <li>Svolgimento delle lezioni frontali</li>
    <li>Valutazione dei partecipanti</li>
  </ul>

  <p><strong>Periodo di svolgimento:</strong> dal {{PRIMA_DATA}} al {{ULTIMA_DATA}}<br>
  <strong>Ore di docenza:</strong> {{ORE_TOTALI}}<br>
  <strong>Compenso:</strong> € {{COMPENSO_TOTALE}} (comprensivo di oneri fiscali e previdenziali)</p>

  <p>Cordiali saluti,</p>

  <p>{{data_generazione_template}}</p>

  <p>Il Responsabile<br>
  _______________________</p>
</div>`,

  registro_presenze: `
<div>
  <h1>Registro Presenze</h1>
  
  <div style="text-align: center;">
    <h2>REGISTRO PRESENZE</h2>
    <h3>Corso: "{{corso_nome}}"</h3>
  </div>

  <p><strong>Data:</strong> _______________<br>
  <strong>Orario:</strong> dalle ________ alle ________<br>
  <strong>Docente:</strong> {{formatore_nome}} {{formatore_cognome}}<br>
  <strong>Sede:</strong> {{luogo}}</p>

  <h2>Elenco Partecipanti</h2>

  <table border="1" style="width: 100%; border-collapse: collapse;">
    <tr>
      <th style="width: 5%; text-align: center;">N.</th>
      <th style="width: 40%;">Cognome e Nome</th>
      <th style="width: 25%;">Firma Entrata</th>
      <th style="width: 25%;">Firma Uscita</th>
    </tr>
    <tr><td style="text-align: center;">1</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">2</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">3</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">4</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">5</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">6</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">7</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">8</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">9</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">10</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">11</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">12</td><td></td><td></td><td></td></tr>
  </table>

  <p style="margin-top: 30px;">Firma del docente: ______________________</p>
</div>`,

  documento: `
<div class="documento">
  <h1>Documento di Testo</h1>
  
  <h2>Introduzione</h2>
  <p>Questo è un modello di documento di testo. Modifica questo contenuto in base alle tue esigenze.</p>
  
  <h2>Sezione 1</h2>
  <p>Inserisci qui il contenuto della prima sezione.</p>
  
  <h2>Sezione 2</h2>
  <p>Inserisci qui il contenuto della seconda sezione.</p>
  
  <h3>Sottosezione 2.1</h3>
  <p>Puoi aggiungere sottosezioni se necessario.</p>
  
  <h2>Conclusioni</h2>
  <p>Riassumi qui i punti principali del documento.</p>
  
  <p class="data">{{data_generazione_template}}</p>
  <p class="firma">Firma: _______________________</p>
</div>

<style>
  .documento {
    font-family: 'Arial', sans-serif;
    line-height: 1.5;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 30px;
  }
  h2 {
    color: #3498db;
    margin-top: 25px;
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
  }
  h3 {
    color: #2980b9;
    margin-top: 20px;
  }
  p {
    margin-bottom: 15px;
  }
  .data {
    margin-top: 40px;
    text-align: right;
    font-style: italic;
  }
  .firma {
    margin-top: 20px;
    text-align: right;
  }
</style>`
};

// Add the LOCAL_STORAGE_KEY constant
const LOCAL_STORAGE_KEY = 'elementsoftware_templates';

// Define interfaces for toast (Template is now imported)
interface Toast {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

interface ToastOptions {
  title: string;
  description: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isClosable?: boolean;
}

// Simple toggle switch component to replace the imported one
const Switch: React.FC<{isChecked: boolean; onChange: () => void}> = ({ isChecked, onChange }) => {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isChecked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isChecked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// Custom Toast notification component
const Toast: React.FC<ToastProps> = ({ title, description, status, onClose }) => {
  const bgColor = status === 'success' ? 'bg-green-100 border-green-500' : 
                 status === 'error' ? 'bg-red-100 border-red-500' : 
                 status === 'warning' ? 'bg-yellow-100 border-yellow-500' : 'bg-blue-100 border-blue-500';
  
  const textColor = status === 'success' ? 'text-green-800' : 
                   status === 'error' ? 'text-red-800' : 
                   status === 'warning' ? 'text-yellow-800' : 'text-blue-800';
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded shadow-lg border-l-4 ${bgColor} ${textColor} max-w-md`}>
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
      <p className="mt-1">{description}</p>
    </div>
  );
};

// Custom toast hook
const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const toast = (options: ToastOptions) => {
    const { title, description, status = 'info', duration = 5000 } = options;
    const id = Math.random().toString(36).substring(2, 11);
    const newToast: Toast = { id, title, description, status };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };
  
  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  const ToastContainer: React.FC = () => (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          status={t.status}
          onClose={() => closeToast(t.id)}
        />
      ))}
    </div>
  );
  
  return { toast, ToastContainer };
};

const ENTITY_FIELDS = {
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

const ENTITY_LABELS = {
  'scheduled-courses': 'Corsi Programmati',
  'courses': 'Corsi',
  'trainers': 'Formatori',
  'employees': 'Dipendenti',
  'companies': 'Aziende',
};

const PLACEHOLDER_GROUPS = {
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
    '{{dipendente_nome}}', '{{dipendente_cognome}}', '{{dipendente_codice_fiscale}}', '{{dipendente_email}}', '{{dipendente_telefono}}', '{{azienda}}', '{{ruolo}}',
  ],
  'companies': [
    '{{azienda}}', '{{azienda_piva}}', '{{azienda_codice_fiscale}}', '{{azienda_sdi}}', '{{azienda_pec}}', '{{azienda_iban}}', '{{azienda_sede}}', '{{azienda_citta}}', '{{azienda_provincia}}', '{{azienda_cap}}', '{{azienda_persona_riferimento}}', '{{azienda_mail}}', '{{azienda_telefono}}', '{{azienda_note}}', '{{ateco}}',
  ],
};

const LETTERA_PLACEHOLDERS = [
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

const ATTESTATO_PLACEHOLDERS = [
  { key: '{{dipendente_nome}}', label: 'Nome del dipendente' },
  { key: '{{dipendente_cognome}}', label: 'Cognome del dipendente' },
  { key: '{{corso_nome}}', label: 'Nome del corso' },
  { key: '{{Ore corso}}', label: 'Durata del corso in ore' },
  { key: '{{data_1}}', label: 'Data inizio corso' },
  { key: '{{data_2}}', label: 'Data fine corso' },
  { key: '{{data_generazione_template}}', label: 'Data generazione attestato' },
  { key: '{{numero_progressivo}}', label: 'Numero progressivo attestato' },
];

// Function to merge local and server templates, giving priority to newer versions
const mergeTemplates = (localTemplates: Template[], serverTemplates: Template[]): Template[] => {
  const mergedMap = new Map<string, Template>();
  
  // Add all server templates first
  serverTemplates.forEach(template => {
    mergedMap.set(template.id, {...template, source: 'server'});
  });
  
  // Then add/override with local templates that don't exist on server or are newer
  localTemplates.forEach(localTemplate => {
    // For temp/local templates without a server counterpart
    if (localTemplate.id.startsWith('temp_') || localTemplate.id.startsWith('local_')) {
      mergedMap.set(localTemplate.id, {...localTemplate, source: 'local'});
    } else {
      // For templates that exist on both server and local
      const existingTemplate = mergedMap.get(localTemplate.id);
      if (!existingTemplate || (localTemplate.updatedAt && existingTemplate.updatedAt && 
          new Date(localTemplate.updatedAt) > new Date(existingTemplate.updatedAt))) {
        mergedMap.set(localTemplate.id, {...localTemplate, source: 'local'});
      }
    }
  });
  
  return Array.from(mergedMap.values());
};

// Add settings tabs for the top navigation
const SETTINGS_TABS = [
  { id: 'generali', label: 'Generali' },
  { id: 'templates', label: 'Templates' },
  { id: 'utenti', label: 'Utenti' },
  { id: 'ruoli', label: 'Ruoli' },
  { id: 'log-attivita', label: 'Log Attività' },
];

const TemplatesSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTypeTab, setActiveTypeTab] = useState('attestato');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalData, setModalData] = useState({
    name: '',
    type: 'attestato',
    fileFormat: 'text',
    url: '',
    googleDocsUrl: '',
    id: '',
    isEditing: false
  });
  const [activeEntityTab, setActiveEntityTab] = useState<'scheduled-courses' | 'courses' | 'trainers' | 'employees' | 'companies'>('scheduled-courses');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('attestato');
  
  // State for the integrated editor
  const [showEditor, setShowEditor] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  
  // Add state to track which dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved_local' | 'saved_server' | 'error'>('idle');
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Refs for dropdowns
  const dropdownRefs = useRef<{[key: string]: React.RefObject<HTMLButtonElement>}>({});
  
  // Add state for header and footer content
  const [headerContent, setHeaderContent] = useState<string>('');
  const [footerContent, setFooterContent] = useState<string>('');
  const [showHeaderEditor, setShowHeaderEditor] = useState<boolean>(false);
  const [showFooterEditor, setShowFooterEditor] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [logoPosition, setLogoPosition] = useState<string>('header');

  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    // Initialize refs for template type dropdowns
    TEMPLATE_TYPES.forEach(type => {
      const dropdownId = `dropdown-${type.value}`;
      dropdownRefs.current[dropdownId] = React.createRef<HTMLButtonElement>();
    });
    
    // Load templates on initial mount
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Ensure each template has a ref
    templates.forEach(template => {
      if (!dropdownRefs.current[template.id]) {
        dropdownRefs.current[template.id] = React.createRef<HTMLButtonElement>();
      }
    });
  }, [templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const templates = await apiGet<Template[]>('template-links');
      setTemplates(templates || []);
    } catch (err) {
      setError('Errore nel recupero dei template');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { id, name, type, fileFormat, url, googleDocsUrl, isEditing } = modalData;
      
      const data = {
          name: name.trim(), 
        url: url.trim() || googleDocsUrl.trim(),
          type,
          fileFormat,
          googleDocsUrl: googleDocsUrl.trim() || null
      };
      
      console.log('Submitting template data:', data);
      
      if (isEditing) {
        await apiPut(`template-links/${id}`, data);
        setSuccess('Template aggiornato con successo');
      } else {
        await apiPost('template-links', data);
        setSuccess('Nuovo template creato con successo');
      }
      
      // Reset form and close modal
      setModalData({
        name: '',
        type: 'attestato',
        fileFormat: 'text',
        url: '',
        googleDocsUrl: '',
        id: '',
        isEditing: false
      });
      setShowAddModal(false);
      
      // Refresh templates list
      await fetchTemplates();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Errore nel salvataggio del template:', err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Errore sconosciuto';
      setError(`Errore nel salvataggio del template: ${errorMsg}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAsDefault = async (id: string, type: string) => {
    try {
      setLoading(true);
      console.log(`Setting template ${id} as default for type ${type}`);
      
      // Use the preferred endpoint
      await apiPost(`template-links/${id}/set-default`);
      setSuccess('Template impostato come predefinito');
      setTimeout(() => setSuccess(null), 3000);
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error setting template as default:', err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Errore sconosciuto';
      setError(`Errore nell'impostare il template come predefinito: ${errorMsg}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setModalData({
      name: template.name,
      type: template.type,
      fileFormat: template.fileFormat || 'text',
      url: template.url,
      googleDocsUrl: template.googleDocsUrl || '',
      id: template.id,
      isEditing: true
    });
    setShowAddModal(true);
  };

  const handleRemoveTemplate = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo template?')) {
      try {
        setLoading(true);
        await apiDelete(`template-links/${id}`);
        setSuccess('Template eliminato con successo');
        setTimeout(() => setSuccess(null), 3000);
        await fetchTemplates();
      } catch (err) {
        setError('Errore nell\'eliminazione del template');
        console.error('Error deleting template:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateNewTemplate = (templateType: string) => {
    const typeInfo = TEMPLATE_TYPES.find(t => t.value === templateType);
    setName(`Nuovo ${typeInfo?.label.slice(0, -1) || 'Template'}`);
    setUrl('');
    setType(templateType);
    setCurrentTemplate({
      id: 'new',
      name: `Nuovo ${typeInfo?.label.slice(0, -1) || 'Template'}`,
      url: '',
      type: templateType,
    });
    setTemplateContent(TEMPLATE_EXAMPLES[templateType as keyof typeof TEMPLATE_EXAMPLES] || '');
    setShowEditor(true);
    setIsNewTemplate(true);
  };

  const handleEditWithEditor = (template: Template) => {
    navigate(`/settings/templates/editor/${template.id}`);
  };

  // Function to handle DOCX import
  const handleDocxImport = (templateType: string) => {
    // Create a temporary input element for file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx';
    
    // Handle file selection
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
    try {
      setLoading(true);
        toast({
          title: 'Importazione',
          description: 'Importazione del file in corso...',
          status: 'info'
        });
        
        // Additional import logic would go here
        
      } catch (error) {
        console.error('Error importing DOCX:', error);
        setError(`Errore nell'importazione del file DOCX: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  };

    input.click();
  };

  // Function to handle Google Docs link
  const handleAddGoogleDocs = (templateType: string) => {
    // Prompt user for the Google Docs URL
    const url = prompt('Inserisci il link al documento Google Docs:');
    if (!url) return;
    
    // Validate Google Docs URL
    if (!url.includes('docs.google.com')) {
      toast({
        title: 'Link non valido',
        description: 'Per favore inserisci un link valido di Google Docs (docs.google.com)',
        status: 'error'
      });
      return;
    }
    
    // Create a template name based on type
    const typeInfo = TEMPLATE_TYPES.find(t => t.value === templateType);
    const newName = prompt('Nome del template:', `${typeInfo?.label.slice(0, -1) || 'Template'} Google Docs`);
    
    if (!newName) return;
    
    // Create a new template
    setModalData({
      name: newName,
      type: templateType,
      fileFormat: 'text',
      url: '',
      googleDocsUrl: url,
      id: '',
      isEditing: false
    });
    setShowAddModal(true);
  };

  // Function to handle Google Slides link
  const handleAddGoogleSlides = (templateType: string) => {
    // Prompt user for the Google Slides URL
    const url = prompt('Inserisci il link alla presentazione Google Slides:');
    if (!url) return;
    
    // Validate Google Slides URL
    if (!url.includes('docs.google.com/presentation')) {
      toast({
        title: 'Link non valido',
        description: 'Per favore inserisci un link valido di Google Slides (docs.google.com/presentation)',
        status: 'error'
      });
      return;
    }
    
    // Create a template name based on type
    const typeInfo = TEMPLATE_TYPES.find(t => t.value === templateType);
    const newName = prompt('Nome del template:', `${typeInfo?.label.slice(0, -1) || 'Template'} Google Slides`);
    
    if (!newName) return;
    
    // Create a new template
    setModalData({
      name: newName,
      type: templateType,
      fileFormat: 'pptx',
      url: '',
      googleDocsUrl: url,
      id: '',
      isEditing: false
    });
    setShowAddModal(true);
  };

  // Toggle dropdown with click instead of hover
  const toggleDropdown = (id: string) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(id);
    }
  };

  // Filtra i template per tipo
  const getTemplatesByType = (templateType: string) => {
    return templates.filter(t => t.type === templateType);
  };

  const handleNavigateToSettingsTab = (tabId: string) => {
    switch (tabId) {
      case 'generali':
        navigate('/settings/general');
        break;
      case 'templates':
        // Already on this page, do nothing
        break;
      case 'utenti':
        navigate('/settings/users');
        break;
      case 'ruoli':
        navigate('/settings/roles');
        break;
      case 'log-attivita':
        navigate('/settings/activity-logs');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestione Template</h1>
      </div>
      
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
                  </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      {/* Template Cards Grid - one for each template type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATE_TYPES.map((templateType) => {
          const templatesOfType = getTemplatesByType(templateType.value);
          const defaultTemplate = templatesOfType.find(t => t.isDefault);
          const otherTemplates = templatesOfType.filter(t => !t.isDefault);
          const dropdownId = `dropdown-${templateType.value}`;
          
          return (
            <div key={templateType.value} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-blue-50 p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium text-blue-800 flex items-center">
                  <FileOutput className="w-5 h-5 mr-2 text-blue-600" />
                  {templateType.label}
                </h3>
                <div className="relative">
                      <button
                    ref={dropdownRefs.current[dropdownId]}
                    onClick={() => toggleDropdown(dropdownId)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm"
                      >
                    <Plus className="w-4 h-4" />
                    <span>Nuovo</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                  
                  <NewTemplateDropdown 
                    isOpen={openDropdownId === dropdownId}
                    toggleDropdown={() => toggleDropdown(dropdownId)}
                    onCreateNew={() => handleCreateNewTemplate(templateType.value)}
                    onImportDocx={() => handleDocxImport(templateType.value)}
                    onAddGoogleDocs={templateType.value !== 'slide' ? () => handleAddGoogleDocs(templateType.value) : undefined}
                    onAddGoogleSlides={templateType.value === 'slide' ? () => handleAddGoogleSlides(templateType.value) : undefined}
                    onCreateDeckDeckGo={templateType.value === 'slide' ? () => handleCreateNewTemplate(templateType.value) : undefined}
                    onCreateWithEtherpad={() => handleAddGoogleDocs(templateType.value)}
                    templateType={templateType.value}
                    buttonRef={dropdownRefs.current[dropdownId]}
                  />
                </div>
        </div>

              <div className="p-4">
                {/* Default Template Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    Template Predefinito
                  </h4>
                  
                  {defaultTemplate ? (
                    <TemplateCard
                      template={defaultTemplate}
                      isDefault={true}
                      onEdit={handleEditTemplate}
                      onSetAsDefault={handleSetAsDefault}
                      onRemove={handleRemoveTemplate}
                      openDropdownId={openDropdownId}
                      toggleDropdown={toggleDropdown}
                      dropdownRefs={dropdownRefs}
                      fetchTemplates={fetchTemplates}
                    />
                  ) : (
                    <div className="border rounded-xl p-3 bg-gray-50 border-gray-200 text-center">
                      <p className="text-xs text-gray-500">Nessun template predefinito</p>
                    </div>
                  )}
                      </div>
                
                {/* Other Templates */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Altri Template</h4>
                  
                  {otherTemplates.length === 0 ? (
                    <div className="border rounded-xl p-3 bg-gray-50 border-gray-200 text-center">
                      <p className="text-xs text-gray-500">Nessun altro template disponibile</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherTemplates.map(template => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          isDefault={false}
                          onEdit={handleEditTemplate}
                          onSetAsDefault={handleSetAsDefault}
                          onRemove={handleRemoveTemplate}
                          openDropdownId={openDropdownId}
                          toggleDropdown={toggleDropdown}
                          dropdownRefs={dropdownRefs}
                          fetchTemplates={fetchTemplates}
                        />
              ))}
            </div>
          )}
        </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Utilizzo del componente PlaceholdersLegend invece della sezione inline */}
      <PlaceholdersLegend 
        entityFields={ENTITY_FIELDS}
        entityLabels={ENTITY_LABELS}
        attestatoPlaceholders={ATTESTATO_PLACEHOLDERS}
        letteraPlaceholders={LETTERA_PLACEHOLDERS}
      />
      
      {/* Utilizzo del componente TemplateFormModal per il form di aggiunta/modifica */}
      <TemplateFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitTemplate}
        modalData={modalData}
        setModalData={setModalData}
        templateTypes={TEMPLATE_TYPES}
        fileFormats={FILE_FORMATS}
        loading={loading}
      />
      
      <ToastContainer />
    </div>
  );
};

export default TemplatesSettingsPage;