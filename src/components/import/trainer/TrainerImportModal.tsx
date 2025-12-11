/**
 * @file TrainerImportModal.tsx
 * @description Modal per importazione formatori da CSV
 * Features: validazione CF+email, conflict resolution, creazione account automatica
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, GraduationCap, Download, Copy, Mail } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import ImportConflictResolutionPanel, { ConflictItem, ConflictResolution } from '../common/ImportConflictResolutionPanel';

interface TrainerData {
  firstName: string;
  lastName: string;
  taxCode: string;
  email: string; // Required for trainers
  phone?: string;
  _rowIndex?: number;
  _hasConflict?: boolean;
  _conflictWith?: any;
}

interface TrainerCredential {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

interface TrainerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  tenantId: string;
}

const TrainerImportModal: React.FC<TrainerImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  tenantId
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [trainers, setTrainers] = useState<TrainerData[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map());
  const [conflicts, setConflicts] = useState<Map<number, ConflictItem>>(new Map());
  const [resolutions, setResolutions] = useState<Map<number, ConflictResolution>>(new Map());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [createAccounts, setCreateAccounts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [credentials, setCredentials] = useState<TrainerCredential[]>([]);
  const { showToast } = useToast();

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setTrainers([]);
      setValidationErrors(new Map());
      setConflicts(new Map());
      setResolutions(new Map());
      setSelectedRows(new Set());
      setCreateAccounts(true);
      setImportResult(null);
      setCredentials([]);
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
    if (!email) return false; // Email REQUIRED for trainers
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Parse CSV file
  const parseCSV = (csvText: string): TrainerData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Il file CSV deve contenere almeno un header e una riga di dati');
    }

    // Parse header
    const header = lines[0].split(';').map(h => h.trim());
    
    // Map header indices
    const firstNameIdx = header.findIndex(h => /^(firstName|nome)$/i.test(h));
    const lastNameIdx = header.findIndex(h => /^(lastName|cognome)$/i.test(h));
    const taxCodeIdx = header.findIndex(h => /^(taxCode|codiceFiscale|cf)$/i.test(h));
    const emailIdx = header.findIndex(h => /^(email|mail)$/i.test(h));
    const phoneIdx = header.findIndex(h => /^(phone|telefono|tel)$/i.test(h));

    if (firstNameIdx === -1 || lastNameIdx === -1 || taxCodeIdx === -1 || emailIdx === -1) {
      throw new Error('Il CSV deve contenere le colonne: firstName, lastName, taxCode, email (obbligatoria per formatori)');
    }

    // Parse data rows
    const data: TrainerData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      
      const trainer: TrainerData = {
        firstName: values[firstNameIdx] || '',
        lastName: values[lastNameIdx] || '',
        taxCode: normalizeTaxCode(values[taxCodeIdx]),
        email: values[emailIdx] || '',
        phone: phoneIdx !== -1 ? values[phoneIdx] : undefined,
        _rowIndex: i - 1
      };

      data.push(trainer);
    }

    return data;
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      // Read file
      const text = await selectedFile.text();
      const parsedTrainers = parseCSV(text);

      // Validate trainers
      const errors = new Map<number, string[]>();
      parsedTrainers.forEach((trainer, idx) => {
        const rowErrors: string[] = [];

        if (!trainer.firstName) rowErrors.push('Nome mancante');
        if (!trainer.lastName) rowErrors.push('Cognome mancante');
        if (!trainer.taxCode) {
          rowErrors.push('Codice Fiscale mancante');
        } else if (!validateTaxCode(trainer.taxCode)) {
          rowErrors.push('Codice Fiscale non valido (deve essere 16 caratteri)');
        }
        if (!trainer.email) {
          rowErrors.push('Email mancante (obbligatoria per formatori)');
        } else if (!validateEmail(trainer.email)) {
          rowErrors.push('Email non valida');
        }

        if (rowErrors.length > 0) {
          errors.set(idx, rowErrors);
        }
      });

      setValidationErrors(errors);

      // Call backend validation API to detect conflicts
      await detectConflicts(parsedTrainers);

      setTrainers(parsedTrainers);
      
      // Select all valid rows by default
      const validRows = new Set<number>();
      parsedTrainers.forEach((_, idx) => {
        if (!errors.has(idx)) {
          validRows.add(idx);
        }
      });
      setSelectedRows(validRows);

      showToast({
        message: `File caricato: ${parsedTrainers.length} formatori trovati`,
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

  // Detect conflicts with backend
  const detectConflicts = async (trainersData: TrainerData[]) => {
    try {
      const response = await fetch('/api/v1/import/trainers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainers: trainersData.map(({ _rowIndex, _hasConflict, _conflictWith, ...rest }) => rest),
          tenantId
        })
      });

      if (!response.ok) {
        throw new Error('Errore validazione backend');
      }

      const result = await response.json();

      // Process conflicts
      const conflictsMap = new Map<number, ConflictItem>();
      if (result.conflicts) {
        result.conflicts.forEach((conflict: any) => {
          const index = trainersData.findIndex(t => t.taxCode === conflict.taxCode);
          if (index !== -1) {
            conflictsMap.set(index, {
              index,
              existingItem: conflict.existingPerson,
              newItem: trainersData[index],
              conflictKey: 'CF',
              conflictValue: conflict.taxCode
            });

            trainersData[index]._hasConflict = true;
            trainersData[index]._conflictWith = conflict.existingPerson;
          }
        });
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
        message: 'Seleziona almeno un formatore da importare',
        type: 'warning'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data
      const selectedTrainers = Array.from(selectedRows)
        .map(idx => trainers[idx])
        .filter(trainer => !validationErrors.has(trainer._rowIndex!));

      // Prepare overwrite IDs
      const overwriteIds = Array.from(resolutions.entries())
        .filter(([_, res]) => res.action === 'overwrite' && res.itemId)
        .map(([_, res]) => res.itemId!);

      // Call import API
      const response = await fetch('/api/v1/import/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainers: selectedTrainers.map(({ _rowIndex, _hasConflict, _conflictWith, ...rest }) => rest),
          tenantId,
          overwriteIds,
          createAccounts
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore importazione');
      }

      const result = await response.json();
      setImportResult(result);

      // Save credentials if accounts were created
      if (result.credentials && result.credentials.length > 0) {
        setCredentials(result.credentials);
      }

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

  // Export credentials to CSV
  const exportCredentialsCSV = () => {
    if (credentials.length === 0) return;

    const csvContent = [
      'Nome;Cognome;Email;Username;Password',
      ...credentials.map(c => 
        `${c.firstName};${c.lastName};${c.email};${c.username};${c.password}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trainer-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Copy credentials to clipboard
  const copyCredentials = async () => {
    if (credentials.length === 0) return;

    const text = credentials.map(c => 
      `${c.firstName} ${c.lastName}\nEmail: ${c.email}\nUsername: ${c.username}\nPassword: ${c.password}`
    ).join('\n\n');

    await navigator.clipboard.writeText(text);
    showToast({
      message: 'Credenziali copiate negli appunti',
      type: 'success'
    });
  };

  if (!isOpen) return null;

  const validTrainersCount = trainers.filter((_, idx) => !validationErrors.has(idx)).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Importazione Formatori</h2>
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
          {credentials.length > 0 ? (
            // Show credentials after import
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <h3 className="text-xl font-bold text-green-900">
                    Importazione Completata - Account Creati
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="text-sm text-gray-600 mb-1">Creati</div>
                    <div className="text-3xl font-bold text-green-600">
                      {importResult?.created || 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="text-sm text-gray-600 mb-1">Aggiornati</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {importResult?.updated || 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="text-sm text-gray-600 mb-1">Account Creati</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {credentials.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Credentials Table */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Credenziali Account Formatori</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={copyCredentials}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copia
                    </button>
                    <button
                      onClick={exportCredentialsCSV}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Esporta CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cognome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Username
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Password
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {credentials.map((cred, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900">{cred.firstName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{cred.lastName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{cred.email}</td>
                          <td className="px-4 py-3 text-sm font-mono text-blue-600">
                            {cred.username}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-purple-600">
                            {cred.password}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Importante:</p>
                    <p>
                      Le credenziali sono visualizzate una sola volta. Assicurati di scaricare il CSV
                      o copiare le credenziali prima di chiudere questa finestra.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Chiudi
                </button>
              </div>
            </div>
          ) : importResult ? (
            // Show summary without credentials
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-green-900">
                  Importazione Completata
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">Creati</div>
                  <div className="text-3xl font-bold text-green-600">
                    {importResult.created || 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="text-sm text-gray-600 mb-1">Aggiornati</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {importResult.updated || 0}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="text-sm text-gray-600 mb-1">Saltati</div>
                  <div className="text-3xl font-bold text-gray-600">
                    {importResult.skipped || 0}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Chiudi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload */}
              {!file && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Carica file CSV formatori
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Il file deve contenere le colonne: firstName, lastName, taxCode, <strong>email (obbligatoria)</strong>
                  </p>
                  <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                    Seleziona File CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Preview Table */}
              {file && trainers.length > 0 && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">
                          {trainers.length} formatori totali
                        </p>
                        <p className="text-sm text-purple-700">
                          {validTrainersCount} validi, {validationErrors.size} con errori, {conflicts.size} conflitti
                        </p>
                      </div>
                      <label className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 cursor-pointer text-sm">
                        Cambia File
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Account Creation Toggle */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createAccounts}
                        onChange={(e) => setCreateAccounts(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-blue-900">
                          Crea automaticamente account di accesso
                        </div>
                        <div className="text-sm text-blue-700">
                          Genera username (nome.cognome) e password per ciascun formatore
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Conflict Resolution */}
                  <ImportConflictResolutionPanel
                    conflicts={conflicts}
                    resolutions={resolutions}
                    onResolutionChange={(index, resolution) => {
                      const newResolutions = new Map(resolutions);
                      newResolutions.set(index, resolution);
                      setResolutions(newResolutions);
                    }}
                    entityType="formatori"
                    displayFields={['firstName', 'lastName', 'taxCode', 'email']}
                    getFieldLabel={(field) => {
                      const labels: Record<string, string> = {
                        firstName: 'Nome',
                        lastName: 'Cognome',
                        taxCode: 'CF',
                        email: 'Email'
                      };
                      return labels[field] || field;
                    }}
                    getFieldValue={(item, field) => item[field] || '-'}
                  />

                  {/* Data Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedRows.size === validTrainersCount && validTrainersCount > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSelected = new Set<number>();
                                    trainers.forEach((_, idx) => {
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
                              Codice Fiscale
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Stato
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {trainers.map((trainer, idx) => {
                            const errors = validationErrors.get(idx);
                            const hasError = !!errors;
                            const isSelected = selectedRows.has(idx);
                            const hasConflict = conflicts.has(idx);

                            return (
                              <tr
                                key={idx}
                                className={`${
                                  hasError ? 'bg-red-50' : hasConflict ? 'bg-yellow-50' : ''
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
                                <td className="px-4 py-3 text-sm text-gray-900">{trainer.firstName}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{trainer.lastName}</td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-900">
                                  {trainer.taxCode}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {trainer.email || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {hasError ? (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertCircle className="w-4 h-4" />
                                      <span className="text-xs">
                                        {errors.join(', ')}
                                      </span>
                                    </div>
                                  ) : hasConflict ? (
                                    <div className="flex items-center gap-1 text-yellow-600">
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
        {!importResult && !credentials.length && file && trainers.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedRows.size}</span> formatori selezionati
                {createAccounts && selectedRows.size > 0 && (
                  <span className="ml-2 text-purple-600">
                    (verranno creati {selectedRows.size} account)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Annulla
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || selectedRows.size === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Importazione...' : `Importa ${selectedRows.size} Formatori`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerImportModal;
