/**
 * Document helper utilities
 * 
 * Utility functions for document validation, formatting, and status management.
 */

import { DocumentType } from './types';
import type { DateEntry, StatusInfo, Preventivo } from './types';

/**
 * Check if schedule has attendance data for all sessions
 */
export const hasAttendanceData = (
  dates: DateEntry[],
  attendance: Record<number, (string | number)[]>
): boolean => {
  return dates.every((_, idx) => 
    attendance[idx] && attendance[idx].length > 0
  );
};

/**
 * Get status information with color and description
 */
export const getStatusInfo = (status: string): StatusInfo => {
  const statusMap: Record<string, StatusInfo> = {
    'Preventivo': {
      color: 'blue',
      description: '📝 Il corso è in fase di preventivazione'
    },
    'Conferma': {
      color: 'green',
      description: '✅ Il corso è confermato e pronto per l\'erogazione'
    },
    'Fattura': {
      color: 'purple',
      description: '💰 Il corso è stato fatturato'
    },
    'Pagamento': {
      color: 'green',
      description: '✓ Il pagamento è stato ricevuto'
    }
  };
  
  return statusMap[status] || statusMap['Preventivo'];
};

/**
 * Get preventivo status badge color classes
 */
export const getPreventivoStatusColor = (stato: string): string => {
  const colorMap: Record<string, string> = {
    'ACCETTATO': 'bg-green-100 text-green-700 border-green-300',
    'INVIATO': 'bg-blue-100 text-blue-700 border-blue-300',
    'BOZZA': 'bg-gray-100 text-gray-700 border-gray-300',
    'RIFIUTATO': 'bg-red-100 text-red-700 border-red-300'
  };
  
  return colorMap[stato] || colorMap['BOZZA'];
};

/**
 * Format document number (progressive/year)
 */
export const formatDocumentNumber = (numero: number, anno: number): string => {
  return `#${numero}/${anno}`;
};

/**
 * Get document type color for UI elements
 */
export const getDocumentTypeColor = (type: DocumentType): string => {
  const colors: Record<DocumentType, string> = {
    [DocumentType.LETTERA_INCARICO]: 'blue',
    [DocumentType.REGISTRO_PRESENZE]: 'purple',
    [DocumentType.ATTESTATO]: 'green',
    [DocumentType.PREVENTIVO]: 'orange'
  };
  
  return colors[type];
};

/**
 * Get document type label in Italian
 */
export const getDocumentTypeLabel = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
    [DocumentType.LETTERA_INCARICO]: 'Lettera di Incarico',
    [DocumentType.REGISTRO_PRESENZE]: 'Registro Presenze',
    [DocumentType.ATTESTATO]: 'Attestato di Partecipazione',
    [DocumentType.PREVENTIVO]: 'Preventivo'
  };
  
  return labels[type];
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get full name from person object
 */
export const getPersonFullName = (person: { firstName: string; lastName: string }): string => {
  return `${person.firstName} ${person.lastName}`;
};

/**
 * Get company display name
 */
export const getCompanyName = (company: { ragioneSociale?: string; businessName?: string }): string => {
  return company.ragioneSociale || company.businessName || 'Azienda sconosciuta';
};

/**
 * Get training title
 */
export const getTrainingTitle = (training: { name?: string; nome?: string; title?: string }): string => {
  return training.title || training.name || training.nome || 'Corso sconosciuto';
};

/**
 * Get training price
 */
export const getTrainingPrice = (training: { price?: number; prezzo?: number }): number => {
  return training.price || training.prezzo || 0;
};
