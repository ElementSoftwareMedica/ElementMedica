/**
 * @file EmployeeImportModal.tsx
 * @description Modal per importazione dipendenti da CSV
 * Features: validazione CF, conflict resolution, bulk company assignment
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Users, Download } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import ImportConflictResolutionPanel, { ConflictItem, ConflictResolution } from '../common/ImportConflictResolutionPanel';
import BulkCompanyAssignmentPanel from '../common/BulkCompanyAssignmentPanel';
import * as authService from '../../../services/auth';

interface EmployeeData {
  firstName: string;
  lastName: string;
  taxCode: string;
  company?: string;
  companyId?: string;
  siteName?: string;
  companySiteId?: string;
  professionalProfile?: string;
  hiringDate?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  role?: string;
  username?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
  _rowIndex?: number;
  _hasConflict?: boolean;
  _conflictWith?: any;
}

interface Company {
  id: string;
  ragioneSociale: string;
  businessName?: string; // Legacy/alias
  piva?: string;
  vatNumber?: string;
  citta?: string;
  city?: string;
  sites?: CompanySite[];
}

interface CompanySite {
  id: string;
  companyId: string;
  siteName: string;
  citta: string;
  indirizzo: string;
}

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  companies: Company[];
  tenantId: string;
}

const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  companies,
  tenantId
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map());
  const [validationWarnings, setValidationWarnings] = useState<Map<number, string[]>>(new Map());
  const [conflicts, setConflicts] = useState<Map<number, ConflictItem>>(new Map());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { showToast } = useToast();

  // Debug: log companies con sedi
  useEffect(() => {
    console.log('🏭 EmployeeImportModal - Companies received:', companies.length);
    console.log('🏭 Companies with sites:', companies.filter(c => c.sites && c.sites.length > 0).length);
    companies.forEach(c => {
      console.log(`  - ${c.ragioneSociale || c.businessName}: ${c.sites?.length || 0} sedi`, c.sites?.map(s => s.siteName));
    });
  }, [companies]);

  // Helper per estrarre data di nascita da codice fiscale
  const extractBirthDateFromTaxCode = (taxCode: string): string | null => {
    if (!taxCode || taxCode.length !== 16) return null;
    
    try {
      const yearChars = taxCode.substring(6, 8);
      const monthChar = taxCode.charAt(8).toUpperCase();
      const dayChars = taxCode.substring(9, 11);
      
      // Mesi: A=01, B=02, C=03, D=04, E=05, H=06, L=07, M=08, P=09, R=10, S=11, T=12
      const monthMap: { [key: string]: string } = {
        'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05', 'H': '06',
        'L': '07', 'M': '08', 'P': '09', 'R': '10', 'S': '11', 'T': '12'
      };
      
      const month = monthMap[monthChar];
      if (!month) return null;
      
      // Il giorno per le donne è incrementato di 40
      let day = parseInt(dayChars, 10);
      if (day > 40) day -= 40;
      
      // Anno: assumiamo secolo in base all'età ragionevole (< 2000 o >= 2000)
      let year = parseInt(yearChars, 10);
      const currentYear = new Date().getFullYear() % 100;
      year = year <= currentYear + 10 ? 2000 + year : 1900 + year;
      
      const dayStr = day.toString().padStart(2, '0');
      // Formato italiano: dd/mm/yyyy
      return `${dayStr}/${month}/${year}`;
    } catch (error) {
      console.error('Errore estrazione data da CF:', error);
      return null;
    }
  };

  // Helper per ottenere il nome dell'azienda (ragioneSociale o businessName)
  const getCompanyName = (company: Company): string => {
    return company.ragioneSociale || company.businessName || 'N/A';
  };

  // Helper per ottenere P.IVA
  const getCompanyVat = (company: Company): string | undefined => {
    return company.piva || company.vatNumber;
  };

  // Helper per ottenere città
  const getCompanyCity = (company: Company): string | undefined => {
    return company.citta || company.city;
  };

  // Funzione per assegnare azienda e sede ai dipendenti selezionati
  const handleBulkAssign = () => {
    if (!selectedCompanyId) return;
    
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;
    
    const companyName = getCompanyName(company);
    const site = selectedSiteId ? company.sites?.find(s => s.id === selectedSiteId) : null;
    
    setEmployees(prev => prev.map((emp, idx) => {
      if (selectedRows.has(idx)) {
        return {
          ...emp,
          company: companyName,
          companyId: selectedCompanyId,
          siteName: site?.siteName || '',
          companySiteId: selectedSiteId || ''
        };
      }
      return emp;
    }));
    
    showToast({
      message: `Assegnati ${selectedRows.size} dipendenti a ${companyName}${site ? ` - ${site.siteName}` : ''}`,
      type: 'success'
    });
    
    // Reset selezione
    setSelectedRows(new Set());
    setSelectedCompanyId(null);
    setSelectedSiteId(null);
  };

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setEmployees([]);
      setValidationErrors(new Map());
      setValidationWarnings(new Map());
      setConflicts(new Map());
      setSelectedRows(new Set());
      setSelectedCompanyId(null);
      setImportResult(null);
    }
  }, [isOpen]);

  // Normalizza CF
  const normalizeTaxCode = (value: string | null | undefined): string => {
    if (!value) return '';
    return String(value).toUpperCase().trim().replace(/\s+/g, '');
  };

  // Valida CF
  const validateTaxCode = (cf: string): boolean => {
    if (!cf) return false;
    const normalized = normalizeTaxCode(cf);
    return normalized.length === 16;
  };

  // Valida email
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email opzionale
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Parse CSV file
  const parseCSV = (csvText: string): EmployeeData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Il file CSV deve contenere almeno un header e una riga di dati');
    }

    // Parse header
    const header = lines[0].split(';').map(h => h.trim());
    
    // Map header indices for required fields
    const firstNameIdx = header.findIndex(h => /^(firstName|nome)$/i.test(h));
    const lastNameIdx = header.findIndex(h => /^(lastName|cognome)$/i.test(h));
    const taxCodeIdx = header.findIndex(h => /^(taxCode|codiceFiscale|codice fiscale|cf)$/i.test(h));
    
    // Map header indices for optional fields
    const emailIdx = header.findIndex(h => /^(email|mail)$/i.test(h));
    const phoneIdx = header.findIndex(h => /^(phone|telefono|tel)$/i.test(h));
    const birthDateIdx = header.findIndex(h => /^(birthDate|data nascita|dataNascita)$/i.test(h));
    const addressIdx = header.findIndex(h => /^(address|indirizzo)$/i.test(h));
    const cityIdx = header.findIndex(h => /^(city|citta|città)$/i.test(h));
    const provinceIdx = header.findIndex(h => /^(province|provincia)$/i.test(h));
    const postalCodeIdx = header.findIndex(h => /^(postalCode|cap)$/i.test(h));
    const roleIdx = header.findIndex(h => /^(role|ruolo)$/i.test(h));
    const companyIdx = header.findIndex(h => /^(company|azienda)$/i.test(h));
    const siteNameIdx = header.findIndex(h => /^(siteName|sede|nome sede)$/i.test(h));
    const usernameIdx = header.findIndex(h => /^(username)$/i.test(h));
    const notesIdx = header.findIndex(h => /^(notes|note)$/i.test(h));
    const statusIdx = header.findIndex(h => /^(status|stato)$/i.test(h));
    const createdAtIdx = header.findIndex(h => /^(createdAt|data creazione|dataCreazione)$/i.test(h));
    const professionalProfileIdx = header.findIndex(h => /^(professionalProfile|profilo professionale)$/i.test(h));
    const hiringDateIdx = header.findIndex(h => /^(hiringDate|data assunzione|dataAssunzione)$/i.test(h));

    if (firstNameIdx === -1 || lastNameIdx === -1 || taxCodeIdx === -1) {
      throw new Error('Il CSV deve contenere almeno le colonne: firstName, lastName, taxCode');
    }

    // Parse data rows
    const data: EmployeeData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      
      const taxCode = normalizeTaxCode(values[taxCodeIdx]);
      const csvBirthDate = birthDateIdx !== -1 ? values[birthDateIdx] : undefined;
      
      // Estrai data di nascita dal CF se non presente nel CSV
      const extractedBirthDate = !csvBirthDate && taxCode ? extractBirthDateFromTaxCode(taxCode) : null;
      
      const employee: EmployeeData = {
        firstName: values[firstNameIdx] || '',
        lastName: values[lastNameIdx] || '',
        taxCode: taxCode,
        email: emailIdx !== -1 ? values[emailIdx] : undefined,
        phone: phoneIdx !== -1 ? values[phoneIdx] : undefined,
        birthDate: csvBirthDate || extractedBirthDate || undefined,
        address: addressIdx !== -1 ? values[addressIdx] : undefined,
        city: cityIdx !== -1 ? values[cityIdx] : undefined,
        province: provinceIdx !== -1 ? values[provinceIdx] : undefined,
        postalCode: postalCodeIdx !== -1 ? values[postalCodeIdx] : undefined,
        role: roleIdx !== -1 ? values[roleIdx] : 'Employee', // Default Employee
        professionalProfile: professionalProfileIdx !== -1 ? values[professionalProfileIdx] : undefined,
        hiringDate: hiringDateIdx !== -1 ? values[hiringDateIdx] : undefined,
        company: companyIdx !== -1 ? values[companyIdx] : undefined,
        siteName: siteNameIdx !== -1 ? values[siteNameIdx] : undefined,
        username: usernameIdx !== -1 ? values[usernameIdx] : undefined,
        notes: notesIdx !== -1 ? values[notesIdx] : undefined,
        status: statusIdx !== -1 ? values[statusIdx] : undefined,
        createdAt: createdAtIdx !== -1 ? values[createdAtIdx] : undefined,
        _rowIndex: i - 1
      };

      data.push(employee);
    }

    return data;
  };

  // Handle drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await processFile(droppedFiles[0]);
    }
  };

  // Process file (used by both file input and drag&drop)
  const processFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      // Read file
      const text = await selectedFile.text();
      const parsedEmployees = parseCSV(text);

      // Validate employees
      const errors = new Map<number, string[]>();
      const warnings = new Map<number, string[]>();
      parsedEmployees.forEach((emp, idx) => {
        const rowErrors: string[] = [];
        const rowWarnings: string[] = [];

        if (!emp.firstName) rowErrors.push('Nome mancante');
        if (!emp.lastName) rowErrors.push('Cognome mancante');
        if (!emp.taxCode) {
          rowErrors.push('Codice Fiscale mancante');
        } else if (!validateTaxCode(emp.taxCode)) {
          rowErrors.push('Codice Fiscale non valido (deve essere 16 caratteri)');
        }
        if (emp.email && !validateEmail(emp.email)) {
          rowErrors.push('Email non valida');
        }

        // Validazione azienda: OBBLIGATORIA per dipendenti
        if (emp.company) {
          const matchedCompany = companies.find(c => {
            const companyName = getCompanyName(c);
            const companyVat = getCompanyVat(c);
            return companyName?.toLowerCase() === emp.company?.toLowerCase() ||
                   companyVat === emp.company;
          });
          
          if (!matchedCompany) {
            // WARNING: Azienda non trovata - può essere assegnata manualmente
            rowWarnings.push(`Azienda "${emp.company}" non trovata. Assegnare manualmente dal pannello sotto.`);
          } else {
            emp.companyId = matchedCompany.id;
            
            // LOGICA SEDE:
            // 1. Se sede specificata nel CSV, validala
            if (emp.siteName) {
              if (matchedCompany.sites && matchedCompany.sites.length > 0) {
                const siteExists = matchedCompany.sites.find(s => 
                  s.siteName?.toLowerCase() === emp.siteName?.toLowerCase()
                );
                
                if (!siteExists) {
                  rowErrors.push(`Sede "${emp.siteName}" non trovata per l'azienda "${emp.company}"`);
                } else {
                  emp.companySiteId = siteExists.id;
                }
              } else {
                rowErrors.push(`L'azienda "${emp.company}" non ha sedi configurate`);
              }
            }
            // 2. Se sede NON specificata nel CSV
            else {
              if (matchedCompany.sites && matchedCompany.sites.length > 0) {
                if (matchedCompany.sites.length === 1) {
                  // Assegnazione automatica se c'è solo 1 sede
                  emp.companySiteId = matchedCompany.sites[0].id;
                  emp.siteName = matchedCompany.sites[0].siteName;
                  console.log(`✅ Sede unica "${emp.siteName}" assegnata automaticamente a ${emp.firstName} ${emp.lastName}`);
                } else {
                  // Richiedi specifica se ci sono più sedi
                  rowErrors.push(`L'azienda "${emp.company}" ha ${matchedCompany.sites.length} sedi. Specificare la sede nel CSV.`);
                }
              }
              // Se l'azienda non ha sedi, ok (verrà assegnata solo l'azienda)
            }
          }
        } else if (emp.siteName) {
          // Se c'è una sede ma non un'azienda, è un errore
          rowErrors.push('Sede specificata senza azienda');
        } else {
          // WARNING: Azienda mancante - può essere assegnata manualmente
          rowWarnings.push('Azienda mancante (assegnare manualmente dal pannello sotto)');
        }

        if (rowErrors.length > 0) {
          errors.set(idx, rowErrors);
        }
        if (rowWarnings.length > 0) {
          warnings.set(idx, rowWarnings);
        }
      });

      setValidationErrors(errors);
      setValidationWarnings(warnings);

      // Call backend validation API to detect conflicts
      // Nota: questo è opzionale, se fallisce non blocca il processo
      try {
        await detectConflicts(parsedEmployees);
      } catch (conflictError) {
        console.warn('Rilevamento conflitti saltato:', conflictError);
        // Non bloccare il processo se il rilevamento conflitti fallisce
      }

      setEmployees(parsedEmployees);
      
      // Select all valid rows by default
      const validRows = new Set<number>();
      parsedEmployees.forEach((_, idx) => {
        if (!errors.has(idx)) {
          validRows.add(idx);
        }
      });
      setSelectedRows(validRows);

      showToast({
        message: `File caricato: ${parsedEmployees.length} dipendenti trovati`,
        type: 'success'
      });
    } catch (error) {
      console.error('Errore parsing CSV:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Errore parsing CSV',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection from input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  // Detect conflicts with backend
  const detectConflicts = async (employeesData: EmployeeData[]) => {
    try {
      // Usa authService invece di accedere direttamente a localStorage
      const token = authService.getToken();
      
      if (!token) {
        console.warn('Token non trovato, skip rilevamento conflitti');
        return;
      }
      console.log('🔍 [IMPORT] Chiamata validate API con', employeesData.length, 'dipendenti');
      
      // Usa proxy Vite per evitare problemi CORS
      const response = await fetch('/api/v1/import/employees/validate', {
        method: 'POST',
        credentials: 'include', // Importante per CORS con cookie
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employees: employeesData.map(({ _rowIndex, _hasConflict, _conflictWith, ...rest }) => rest),
          tenantId
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token non valido o scaduto, skip rilevamento conflitti');
          return;
        }
        throw new Error('Errore validazione backend');
      }

      const result = await response.json();

      console.log('🔍 [IMPORT] Backend validation result:', {
        total: result.total,
        valid: result.valid,
        errors: result.errors?.length || 0,
        duplicates: result.duplicates?.length || 0,
        conflicts: result.conflicts?.length || 0,
        sampleConflict: result.conflicts?.[0],
        allConflicts: result.conflicts
      });

      // Process conflicts
      const conflictsMap = new Map<number, ConflictItem>();
      if (result.conflicts) {
        console.log('🔍 [IMPORT] Processing conflicts:', result.conflicts.length);
        console.log('🔍 [IMPORT] Sample conflict structure:', result.conflicts[0]);
        
        result.conflicts.forEach((conflict: any) => {
          // Prova multipli campi per trovare il taxCode
          const conflictTaxCode = conflict.taxCode || 
                                 conflict.conflictValue || 
                                 conflict.newItem?.taxCode ||
                                 conflict.existingPerson?.taxCode;
          
          if (!conflictTaxCode) {
            console.warn('🔍 [IMPORT] Conflict without taxCode:', conflict);
            return;
          }
          
          // Normalizza taxCode per confronto (uppercase, no spaces)
          const normalizedConflictTaxCode = normalizeTaxCode(conflictTaxCode);
          const index = employeesData.findIndex(e => normalizeTaxCode(e.taxCode) === normalizedConflictTaxCode);
          
          console.log(`🔍 [IMPORT] Conflict for taxCode ${conflictTaxCode}, found at index: ${index}`, {
            conflictTaxCode: normalizedConflictTaxCode,
            sampleCSVTaxCode: employeesData[0] ? normalizeTaxCode(employeesData[0].taxCode) : 'N/A',
            existingPerson: conflict.existingPerson ? {
              id: conflict.existingPerson.id,
              name: `${conflict.existingPerson.firstName} ${conflict.existingPerson.lastName}`
            } : 'N/A'
          });
          
          if (index !== -1) {
            conflictsMap.set(index, {
              index,
              existingItem: conflict.existingPerson,
              newItem: employeesData[index],
              conflictKey: 'CF',
              conflictValue: conflictTaxCode
            });

            employeesData[index]._hasConflict = true;
            employeesData[index]._conflictWith = conflict.existingPerson;
          } else {
            console.warn(`🔍 [IMPORT] Could not match taxCode ${conflictTaxCode} in CSV data`);
          }
        });
        
        console.log('🔍 [IMPORT] Conflicts map size:', conflictsMap.size);
      }

      setConflicts(conflictsMap);
    } catch (error) {
      console.error('Errore rilevamento conflitti:', error);
    }
  };

  // Handle row selection
  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  // Handle import
  const handleImport = async () => {
    if (selectedRows.size === 0) {
      showToast({
        message: 'Seleziona almeno un dipendente da importare',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data
      const selectedEmployees = Array.from(selectedRows)
        .map(idx => employees[idx])
        .filter(emp => !validationErrors.has(emp._rowIndex!));

      // Prepare overwrite IDs - tutti i selezionati con conflitto vengono sovrascritti
      const overwriteIds = Array.from(selectedRows)
        .filter(idx => conflicts.has(idx))
        .map(idx => conflicts.get(idx)?.existingItem?.id)
        .filter((id): id is string => !!id);

      console.log('🔍 [IMPORT] Preparing import:', {
        selectedRowsCount: selectedRows.size,
        selectedEmployeesCount: selectedEmployees.length,
        conflictsCount: conflicts.size,
        overwriteIdsCount: overwriteIds.length,
        overwriteIds
      });

      // Call import API tramite proxy Vite
      const token = authService.getToken();
      if (!token) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }
      
      const response = await fetch('/api/v1/import/employees', {
        method: 'POST',
        credentials: 'include', // Importante per CORS con cookie
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employees: selectedEmployees.map(({ _rowIndex, _hasConflict, _conflictWith, ...rest }) => rest),
          tenantId,
          defaultCompanyId: selectedCompanyId,
          overwriteIds
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token scaduto o invalido - authService gestirà la rimozione
          throw new Error('Sessione scaduta. Effettua nuovamente il login.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore importazione');
      }

      const result = await response.json();
      setImportResult(result);

      showToast({
        message: `Importazione completata: ${result.created} creati, ${result.updated} aggiornati, ${result.skipped} saltati`,
        type: 'success'
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Errore importazione:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Errore importazione',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const validEmployeesCount = employees.filter((_, idx) => !validationErrors.has(idx)).length;
  const employeesWithErrors = validationErrors.size;
  const employeesWithWarnings = validationWarnings.size;
  const employeesWithConflicts = conflicts.size;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Importazione Dipendenti</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {importResult ? (
            // Show summary after import
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-green-900">
                  Importazione Completata
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-gray-600 mb-0.5">Creati</div>
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.created || 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-gray-600 mb-0.5">Aggiornati</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.updated || 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-600 mb-0.5">Saltati</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {importResult.skipped || 0}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setImportResult(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors shadow-sm"
                >
                  Chiudi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload */}
              {!file && (
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${
                    isDragging ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isDragging ? 'Rilascia il file qui' : 'Carica file CSV dipendenti'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Trascina il file qui oppure clicca per selezionare
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Il file deve contenere: Nome, Cognome, Codice Fiscale
                  </p>
                  <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4" />
                    Seleziona File CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">
                    o scarica il <a href="/templates/template_employees.csv" className="text-blue-600 hover:underline" download>template CSV</a>
                  </p>
                </div>
              )}

              {/* Preview Table */}
              {file && employees.length > 0 && (
                <div className="space-y-4">
                  {/* Layout 2 colonne: Stats/Azioni + Bulk Assignment */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Colonna Sinistra: Stats e Azioni */}
                    <div className="flex flex-col gap-3">
                      {/* Card Statistiche */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          {employees.length} dipendenti totali
                        </p>
                        <div className="text-xs text-blue-700">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">✅ {validEmployeesCount} validi</span>
                            {employeesWithErrors > 0 && <span>• ⚠️ {employeesWithErrors} errori</span>}
                            {employeesWithWarnings > 0 && <span>• 💡 {employeesWithWarnings} avvisi</span>}
                            {employeesWithConflicts > 0 && <span>• 🔄 {employeesWithConflicts} conflitti</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Azioni */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Azioni</h4>
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer shadow-md hover:shadow-lg">
                            <Upload className="w-4 h-4" />
                            Cambia File
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                          <a 
                            href="/templates/template_employees.csv" 
                            download
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            Template CSV
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    {/* Colonna Destra: Bulk Company Assignment */}
                    <div>
                      <BulkCompanyAssignmentPanel
                        companies={(companies || []).map(c => ({
                          id: c.id,
                          ragioneSociale: c.ragioneSociale,
                          businessName: c.businessName,
                          piva: c.piva,
                          vatNumber: c.vatNumber,
                          citta: c.citta,
                          city: c.city,
                          sites: c.sites
                        }))}
                        selectedCount={selectedRows.size}
                        onCompanySelect={(companyId, siteId) => {
                          setSelectedCompanyId(companyId);
                          setSelectedSiteId(siteId || null);
                        }}
                        selectedCompanyId={selectedCompanyId}
                        selectedSiteId={selectedSiteId}
                        onAssign={handleBulkAssign}
                      />
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedRows.size === validEmployeesCount && validEmployeesCount > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSelected = new Set<number>();
                                    employees.forEach((_, idx) => {
                                      if (!validationErrors.has(idx)) {
                                        newSelected.add(idx);
                                      }
                                    });
                                    setSelectedRows(newSelected);
                                  } else {
                                    setSelectedRows(new Set());
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Nome
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cognome
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              CF
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Telefono
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Data Nascita
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Profilo Prof.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Indirizzo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Città
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Provincia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              CAP
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Data Assunzione
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Ruolo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Azienda
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sede
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Stato
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employees.map((emp, idx) => {
                            const errors = validationErrors.get(idx);
                            const warnings = validationWarnings.get(idx);
                            const hasError = !!errors;
                            const hasWarning = !!warnings;
                            const isSelected = selectedRows.has(idx);
                            const hasConflict = conflicts.has(idx);
                            const conflict = conflicts.get(idx);
                            const existingPerson = conflict?.existingItem;

                            // Helper per confrontare valori
                            const isDifferent = (field: string) => {
                              if (!hasConflict || !existingPerson) return false;
                              const newVal = (emp[field] || '').toString().toLowerCase().trim();
                              const oldVal = (existingPerson[field] || '').toString().toLowerCase().trim();
                              return newVal !== oldVal && newVal !== '';
                            };

                            return (
                              <React.Fragment key={idx}>
                                <tr
                                  className={`${
                                    hasError ? 'bg-red-50' : hasWarning ? 'bg-yellow-50' : hasConflict ? 'bg-orange-50' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={hasError}
                                      onChange={() => toggleRowSelection(idx)}
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                  <td className={`px-4 py-3 text-sm ${isDifferent('firstName') ? 'bg-yellow-100 font-semibold' : ''}`}>
                                    {emp.firstName}
                                    {hasConflict && existingPerson && isDifferent('firstName') && (
                                      <div className="text-xs text-gray-500 mt-1">DB: {existingPerson.firstName}</div>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 text-sm ${isDifferent('lastName') ? 'bg-yellow-100 font-semibold' : ''}`}>
                                    {emp.lastName}
                                    {hasConflict && existingPerson && isDifferent('lastName') && (
                                      <div className="text-xs text-gray-500 mt-1">DB: {existingPerson.lastName}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                                    {emp.taxCode}
                                  </td>
                                  <td className={`px-4 py-3 text-sm ${isDifferent('email') ? 'bg-yellow-100 font-semibold' : ''}`}>
                                    {emp.email || '-'}
                                    {hasConflict && existingPerson && isDifferent('email') && (
                                      <div className="text-xs text-gray-500 mt-1">DB: {existingPerson.email || '-'}</div>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 text-sm ${isDifferent('phone') ? 'bg-yellow-100 font-semibold' : ''}`}>
                                    {emp.phone || '-'}
                                    {hasConflict && existingPerson && isDifferent('phone') && (
                                      <div className="text-xs text-gray-500 mt-1">DB: {existingPerson.phone || '-'}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.birthDate || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.professionalProfile || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.address || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.city || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.province || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.postalCode || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.hiringDate || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {emp.role || 'Employee'}
                                  </td>
                                <td className="px-4 py-3 text-sm">
                                  {emp.company ? (
                                    <div className="flex items-center gap-1">
                                      {emp.companyId ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          <span className="text-gray-900 truncate text-xs">{emp.company}</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                                          <span className="text-yellow-700 truncate text-xs" title="Azienda non trovata - assegnala manualmente">
                                            {emp.company}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {emp.siteName ? (
                                    <div className="flex items-center gap-1">
                                      {emp.companySiteId ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          <span className="text-gray-900 truncate text-xs">
                                            {emp.siteName}
                                            {/* Mostra badge se auto-assegnata */}
                                            {companies.find(c => c.id === emp.companyId)?.sites?.length === 1 && (
                                              <span className="ml-1 text-blue-600 italic">(auto)</span>
                                            )}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                          <span className="text-red-600 truncate text-xs">{emp.siteName}</span>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {hasError ? (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertCircle className="w-4 h-4" />
                                      <span className="text-xs">
                                        {errors.join(', ')}
                                      </span>
                                    </div>
                                  ) : hasWarning ? (
                                    <div className="flex items-center gap-1 text-yellow-600">
                                      <AlertCircle className="w-4 h-4" />
                                      <span className="text-xs">
                                        {warnings.join(', ')}
                                      </span>
                                    </div>
                                  ) : hasConflict ? (
                                    <div className="flex items-center gap-1 text-orange-600">
                                      <AlertCircle className="w-4 h-4" />
                                      <span className="text-xs">Conflitto</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Valido</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!importResult && file && employees.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedRows.size}</span> dipendenti selezionati
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-full text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || selectedRows.size === 0}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isLoading ? 'Importazione...' : `Importa ${selectedRows.size} Dipendenti`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeImportModal;
