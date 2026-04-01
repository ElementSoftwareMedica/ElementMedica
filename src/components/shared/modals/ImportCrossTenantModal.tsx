/**
 * Modal per Import Cross-Tenant di Person/Company
 * Progetto 57 - Commercializzazione E2E
 * 
 * @description
 * Modal che mostra i dettagli di un'entità trovata in altri tenant
 * e permette di selezionare i tipi di dati da condividere con consenso GDPR.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Building2, User, Check, AlertCircle, Info, Shield, X } from 'lucide-react';
import { Modal } from '../../../design-system/molecules/Modal';
import Button from '../../../design-system/atoms/Button/Button';
import { 
  useCheckCrossTenant, 
  EntityType, 
  PersonCheckResult, 
  CompanyCheckResult,
  PERSON_DATA_TYPES,
  COMPANY_DATA_TYPES
} from '../../../hooks/import/useCheckCrossTenant';
import { cn } from '../../../design-system/utils';

// ===== TIPI =====

interface ImportCrossTenantModalProps {
  /** Tipo di entità da importare */
  entityType: EntityType;
  /** Risultato del check esistenza */
  checkResult: PersonCheckResult | CompanyCheckResult;
  /** Callback quando l'importazione è completata */
  onImportSuccess: (profileId: string) => void;
  /** Callback per chiudere il modal */
  onClose: () => void;
  /** Indica se il modal è aperto */
  isOpen: boolean;
}

// ===== COMPONENTI INTERNI =====

interface DataTypeCheckboxProps {
  value: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: string, checked: boolean) => void;
  disabled?: boolean;
}

const DataTypeCheckbox: React.FC<DataTypeCheckboxProps> = ({
  value,
  label,
  description,
  checked,
  onChange,
  disabled = false
}) => (
  <label 
    className={cn(
      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
      checked 
        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(value, e.target.checked)}
      disabled={disabled}
      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
    />
    <div className="flex-1">
      <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
    </div>
  </label>
);

// ===== COMPONENTE PRINCIPALE =====

export const ImportCrossTenantModal: React.FC<ImportCrossTenantModalProps> = ({
  entityType,
  checkResult,
  onImportSuccess,
  onClose,
  isOpen
}) => {
  const { importCrossTenant, isImporting, error } = useCheckCrossTenant();
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(new Set(['ANAGRAFICA']));
  const [gdprConsent, setGdprConsent] = useState(false);

  // Dati entità
  const entityData = useMemo(() => {
    if (entityType === 'person') {
      const result = checkResult as PersonCheckResult;
      return result.person;
    } else {
      const result = checkResult as CompanyCheckResult;
      return result.company;
    }
  }, [entityType, checkResult]);

  // Tipi dati disponibili
  const dataTypes = useMemo(() => {
    return entityType === 'person' ? PERSON_DATA_TYPES : COMPANY_DATA_TYPES;
  }, [entityType]);

  // Handler selezione tipi dati
  const handleDataTypeChange = useCallback((value: string, checked: boolean) => {
    setSelectedDataTypes(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }
      return next;
    });
  }, []);

  // Seleziona tutti / deseleziona tutti
  const handleSelectAll = useCallback(() => {
    const allValues = dataTypes.map(dt => dt.value);
    setSelectedDataTypes(new Set(allValues));
  }, [dataTypes]);

  const handleSelectNone = useCallback(() => {
    // Mantieni sempre ANAGRAFICA selezionato
    setSelectedDataTypes(new Set(['ANAGRAFICA']));
  }, []);

  // Handler importazione
  const handleImport = useCallback(async () => {
    if (!entityData || selectedDataTypes.size === 0 || !gdprConsent) return;

    const result = await importCrossTenant({
      entityType,
      entityId: entityData.id,
      sharedDataTypes: Array.from(selectedDataTypes)
    });

    if (result?.success && result.profile) {
      onImportSuccess(result.profile.id);
      onClose();
    }
  }, [entityData, selectedDataTypes, gdprConsent, entityType, importCrossTenant, onImportSuccess, onClose]);

  // Validazione form
  const isValid = selectedDataTypes.size > 0 && gdprConsent;

  if (!entityData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entityType === 'person' ? 'Importa Persona' : 'Importa Azienda'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Annulla
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!isValid || isImporting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isImporting ? 'Importazione in corso...' : 'Importa nel mio tenant'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">
              {entityType === 'person' 
                ? 'Questa persona è già registrata in altri tenant.'
                : 'Questa azienda è già registrata in altri tenant.'}
            </p>
            <p className="mt-1">
              Puoi importarla nel tuo tenant selezionando quali dati condividere.
              I dati anagrafici globali verranno collegati, i dati specifici del tuo tenant saranno separati.
            </p>
          </div>
        </div>

        {/* Entity Details Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            {entityType === 'person' ? (
              <User className="w-8 h-8 text-teal-600" />
            ) : (
              <Building2 className="w-8 h-8 text-teal-600" />
            )}
            <div>
              {entityType === 'person' ? (
                <>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {(entityData as PersonCheckResult['person'])?.lastName} {(entityData as PersonCheckResult['person'])?.firstName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    CF: {(entityData as PersonCheckResult['person'])?.taxCode || 'N/D'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {(entityData as CompanyCheckResult['company'])?.ragioneSociale}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    P.IVA: {(entityData as CompanyCheckResult['company'])?.piva || 'N/D'}
                  </p>
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Presente in <span className="font-medium">{entityData.profileCount}</span> {entityData.profileCount === 1 ? 'tenant' : 'tenant'}
          </p>
        </div>

        {/* Data Types Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Seleziona i dati da condividere
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                Seleziona tutti
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleSelectNone}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Solo anagrafica
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {dataTypes.map(dataType => (
              <DataTypeCheckbox
                key={dataType.value}
                value={dataType.value}
                label={dataType.label}
                description={dataType.description}
                checked={selectedDataTypes.has(dataType.value)}
                onChange={handleDataTypeChange}
                disabled={dataType.value === 'ANAGRAFICA'} // Anagrafica sempre obbligatoria
              />
            ))}
          </div>
        </div>

        {/* GDPR Consent */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Consenso GDPR obbligatorio
                </span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Confermo di avere l'autorizzazione al trattamento dei dati selezionati
                ai sensi del Regolamento UE 2016/679 (GDPR) e della normativa nazionale vigente.
                Il consenso sarà registrato nell'audit trail.
              </p>
            </div>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Check className="w-4 h-4 text-green-500" />
          <span>
            {selectedDataTypes.size} {selectedDataTypes.size === 1 ? 'tipo di dato selezionato' : 'tipi di dati selezionati'}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default ImportCrossTenantModal;
