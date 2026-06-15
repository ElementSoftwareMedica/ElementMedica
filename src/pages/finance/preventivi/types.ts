/**
 * Preventivi Types & Configuration
 * 
 * @module pages/finance/preventivi/types
 */

import {
    Clock,
    Send,
    Eye,
    ThumbsUp,
    XCircle,
    AlertCircle,
    CheckCircle2,
    Receipt,
    Lock,
    GraduationCap,
    FileText,
    Shield,
    Stethoscope,
    HelpCircle,
    User,
    Briefcase
} from 'lucide-react';

// Re-export Preventivo from hook for convenience
export type { Preventivo } from '@/hooks/finance/usePreventivi';

// ============================================================================
// Entity Types
// ============================================================================

export interface Company {
    id: string;
    ragioneSociale: string;
    /** ID del CompanyTenantProfile (non del Company): va inviato come aziendaId al backend */
    companyTenantProfileId?: string;
}

export interface Person {
    id: string;
    firstName: string;
    lastName: string;
}

export interface CourseSchedule {
    id: string;
    course: {
        id: string;
        title: string;
        code: string;
    };
    startDate: string;
}

// Voce singola del preventivo
export interface PreventivoVoce {
    id: string;
    descrizione: string;
    quantita: number;
    prezzoUnitario: number;
    subtotale: number;
}

export type TipoServizio =
    | 'CORSO'
    | 'DVR'
    | 'RSPP'
    | 'MEDICO_COMPETENTE'
    | 'CONSULENZA'
    | 'COMPENSO_FORMATORE'
    | 'ALTRO';

export interface CreatePreventivoData {
    tipoServizio: TipoServizio;
    titoloServizio: string;
    descrizioneServizio?: string;
    prezzoTotale: number;
    aliquotaIva: number;
    aziendaId?: string;
    personaId?: string;
    corsoId?: string;
    scheduleId?: string;
    trainerId?: string;
    note?: string;
    voci?: PreventivoVoce[];
    codiceSconto?: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

export interface StatusConfigItem {
    label: string;
    className: string;
    bgClass: string;
    icon: React.FC<{ className?: string }>;
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
    'BOZZA': {
        label: 'Bozza',
        className: 'bg-gray-100 text-gray-800',
        bgClass: 'bg-gray-50 border-gray-200',
        icon: Clock
    },
    'INVIATO': {
        label: 'Inviato',
        className: 'bg-blue-100 text-blue-800',
        bgClass: 'bg-blue-50 border-blue-200',
        icon: Send
    },
    'VISUALIZZATO': {
        label: 'Visualizzato',
        className: 'bg-cyan-100 text-cyan-800',
        bgClass: 'bg-cyan-50 border-cyan-200',
        icon: Eye
    },
    'ACCETTATO': {
        label: 'Accettato',
        className: 'bg-green-100 text-green-800',
        bgClass: 'bg-green-50 border-green-200',
        icon: ThumbsUp
    },
    'RIFIUTATO': {
        label: 'Rifiutato',
        className: 'bg-red-100 text-red-800',
        bgClass: 'bg-red-50 border-red-200',
        icon: XCircle
    },
    'SCADUTO': {
        label: 'Scaduto',
        className: 'bg-orange-100 text-orange-800',
        bgClass: 'bg-orange-50 border-orange-200',
        icon: AlertCircle
    },
    'CONVERTITO': {
        label: 'Convertito',
        className: 'bg-emerald-100 text-emerald-800',
        bgClass: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2
    },
    'ANNULLATO': {
        label: 'Annullato',
        className: 'bg-gray-200 text-gray-600',
        bgClass: 'bg-gray-100 border-gray-300',
        icon: XCircle
    },
    'FATTURATO': {
        label: 'Fatturato',
        className: 'bg-purple-100 text-purple-800',
        bgClass: 'bg-purple-50 border-purple-200',
        icon: Receipt
    },
    'ARCHIVIATO': {
        label: 'Archiviato',
        className: 'bg-slate-100 text-slate-800',
        bgClass: 'bg-slate-50 border-slate-200',
        icon: Lock
    }
};

/**
 * Transizioni di stato valide per i preventivi
 * Allineato con backend/services/preventivi-service.js
 */
export const STATO_TRANSITIONS: Record<string, string[]> = {
    BOZZA: ['INVIATO', 'ACCETTATO', 'SCADUTO', 'ARCHIVIATO'],
    INVIATO: ['VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
    VISUALIZZATO: ['ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
    ACCETTATO: ['FATTURATO', 'CONVERTITO', 'ANNULLATO'],
    RIFIUTATO: ['ARCHIVIATO'],
    SCADUTO: ['ARCHIVIATO'],
    CONVERTITO: ['FATTURATO', 'ARCHIVIATO'],
    FATTURATO: ['ARCHIVIATO'],
    ANNULLATO: ['ARCHIVIATO'],
    ARCHIVIATO: []
};

export interface TipoServizioConfigItem {
    label: string;
    icon: React.FC<{ className?: string }>;
    color: string;
}

export const TIPO_SERVIZIO_CONFIG: Record<string, TipoServizioConfigItem> = {
    'CORSO': { label: 'Corso', icon: GraduationCap, color: 'text-blue-600' },
    'DVR': { label: 'DVR', icon: FileText, color: 'text-green-600' },
    'RSPP': { label: 'RSPP', icon: Shield, color: 'text-orange-600' },
    'MEDICO_COMPETENTE': { label: 'Medico Competente', icon: Stethoscope, color: 'text-red-600' },
    'CONSULENZA': { label: 'Consulenza', icon: HelpCircle, color: 'text-cyan-600' },
    'COMPENSO_FORMATORE': { label: 'Compenso Formatore', icon: User, color: 'text-amber-600' },
    'ALTRO': { label: 'Altro', icon: Briefcase, color: 'text-gray-600' }
};

// ============================================================================
// Component Props Types
// ============================================================================

export interface SearchableDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    required?: boolean;
}

export interface CreatePreventivoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreatePreventivoData) => Promise<void>;
}

export interface MergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPreventivi: any[];
    onMerge: (targetId: string, sourceIds: string[]) => Promise<void>;
}

export interface MergedDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    preventivo: any;
}

export interface ApplyScontoModalProps {
    isOpen: boolean;
    onClose: () => void;
    preventivo: any;
    onApply: (preventivoId: string, codiceSconto: string) => Promise<void>;
}

export interface QuicklookModalProps {
    isOpen: boolean;
    onClose: () => void;
    preventivo: any;
    onEdit?: (preventivo: any) => void;
    onDownloadPdf?: (preventivo: any) => void;
}

export interface EditPreventivoModalProps {
    isOpen: boolean;
    onClose: () => void;
    preventivo: any;
    onSubmit: (id: string, data: any) => Promise<void>;
}
