import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../../shared/GenericImport';
import { useToast } from '../../../hooks/useToast';
import { apiPost } from '../../../services/api';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import CompanyConflictStep from './CompanyConflictStep';
import type { CompanyImportProps, CompanyData, ImportErrorItem, ConflictResolution } from './types';
import { csvHeaderMap, columnOrder } from './constants';
import { validateCompany, formatCompanyData, detectConflicts, convertToApiFormat } from './utils';

/** Rimuove prefisso IT, spazi e caratteri non numerici dalla P.IVA */
const normalizePiva = (value: string | null | undefined): string => {
  if (!value) return '';
  return String(value).toUpperCase().replace(/\s+/g, '').replace(/^IT/, '').replace(/\D+/g, '');
};

type ImportStep = 'upload' | 'conflicts';

/**
 * Componente import aziende da CSV – gestisce upload, preview e risoluzione
 * conflitti inline senza modal separato.
 */
const CompanyImportRefactored: React.FC<CompanyImportProps> = ({
  onImport,
  onClose,
  existingCompanies = []
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [importData, setImportData] = useState<CompanyData[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<ImportErrorItem[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const { showToast } = useToast();
  const tenantMode = useTenantMode();

  // ── CSV processing ────────────────────────────────────────────────────────
  const customProcessFile = async (file: File): Promise<CompanyData[]> => {
    const processedData = await defaultProcessFile(file, csvHeaderMap, ';');

    const formattedData = processedData.map(company => {
      const mapped = { ...company } as CompanyData;

      // Alias inglese → campo canonico
      const aliases: Record<string, string> = {
        companyName: 'ragioneSociale',
        atecoCode: 'codiceAteco',
        vatNumber: 'piva',
        taxCode: 'codiceFiscale',
        email: 'mail',
        phone: 'telefono',
        city: 'citta',
        province: 'provincia',
        zip: 'cap',
        address: 'indirizzo',
        contactPerson: 'personaRiferimento',
        notes: 'note',
        active: 'isActive',
        siteAddress: 'siteIndirizzo',
        siteCity2: 'siteCitta',
        siteProvince2: 'siteProvincia',
        siteZip: 'siteCap',
        siteContact: 'sitePersonaRiferimento',
        sitePhone2: 'siteTelefono',
        siteEmail2: 'siteMail',
      };
      Object.entries(aliases).forEach(([alias, canonical]) => {
        if ((mapped as any)[alias] !== undefined && (mapped as any)[canonical] === undefined) {
          (mapped as any)[canonical] = (mapped as any)[alias];
          delete (mapped as any)[alias];
        }
      });

      // Fallback: usa città come nome sede se non specificato
      if (!(mapped as any).siteName && (mapped as any).siteCitta) {
        (mapped as any).siteName = (mapped as any).siteCitta;
      }

      const hasSiteSpecificFields = !!(
        (mapped as any).siteName || (mapped as any).siteIndirizzo ||
        (mapped as any).siteCitta || (mapped as any).siteProvincia ||
        (mapped as any).siteCap || (mapped as any).sitePersonaRiferimento ||
        (mapped as any).siteTelefono || (mapped as any).siteMail
      );
      if (hasSiteSpecificFields) (mapped as any)._hasSiteData = true;

      return formatCompanyData(mapped as any) as CompanyData;
    });

    if (formattedData.length === 0) throw new Error('Il file non contiene dati validi');

    const validRowsCount = formattedData.filter(c => c.ragioneSociale).length;
    if (validRowsCount === 0) throw new Error('Nessuna riga contiene la Ragione Sociale (campo obbligatorio)');
    if (validRowsCount < formattedData.length / 2) {
      showToast({ message: `Solo ${validRowsCount}/${formattedData.length} righe hanno la Ragione Sociale`, type: 'warning' });
    }

    const dataWithConflicts = detectConflicts(formattedData as any, existingCompanies as any) as CompanyData[];
    setImportData(dataWithConflicts);
    return dataWithConflicts;
  };

  // ── First import attempt ──────────────────────────────────────────────────
  const handleImport = async (selectedData: CompanyData[]) => {
    const dataToImport = selectedData.filter(c => !(c as any)._isDuplicateSite);
    if (dataToImport.length === 0) {
      showToast({ message: 'Nessuna azienda valida da importare', type: 'warning' });
      return;
    }

    // Validation
    const validationErrors: string[] = [];
    dataToImport.forEach((company, index) => {
      const errors = validateCompany(company as any);
      if (errors.length > 0) validationErrors.push(`Riga ${index + 1}: ${errors.join(', ')}`);
    });
    if (validationErrors.length > 0) {
      showToast({ message: `Errori di validazione:\n${validationErrors.join('\n')}`, type: 'error' });
      return;
    }

    const apiData = dataToImport.map(c => convertToApiFormat(c as any));
    const response = await onImport(apiData as any);

    const conflictErrors: ImportErrorItem[] = (response.results?.errors ?? [])
      .filter((e: any) => e?.existingCompany)
      .map((e: any) => ({
        index: e.index ?? 0,
        error: e.error ?? 'Conflitto rilevato',
        data: (e.data ?? {}) as CompanyData,
        existingCompany: {
          id: String(e.existingCompany.id),
          companyId: e.existingCompany.companyId ? String(e.existingCompany.companyId) : undefined,
          ragioneSociale: e.existingCompany.ragioneSociale ?? '',
          piva: e.existingCompany.piva,
          codiceFiscale: e.existingCompany.codiceFiscale,
          sites: e.existingCompany.sites ?? [],
        },
      }));

    if (conflictErrors.length > 0) {
      setPendingConflicts(conflictErrors);
      setStep('conflicts');

      const { created = [], updated = [] } = response.results ?? {};
      const partialCount = (created as any[]).length + (updated as any[]).length;
      const msg = partialCount > 0
        ? `${partialCount} aziend${partialCount === 1 ? 'a importata' : 'e importate'}. ${conflictErrors.length} conflitt${conflictErrors.length === 1 ? 'o da risolvere' : 'i da risolvere'}.`
        : `${conflictErrors.length} conflitt${conflictErrors.length === 1 ? 'o rilevato' : 'i rilevati'}. Scegli come procedere.`;
      showToast({ message: msg, type: 'warning' });
      return;
    }

    // Success or errors without conflicts
    handleImportResult(response);
  };

  // ── After conflict resolution ─────────────────────────────────────────────
  const handleConflictResolve = async (resolutions: ConflictResolution[]) => {
    setIsResolving(true);
    try {
      const operateHeaders = tenantMode?.getOperateHeaders?.() ?? {};

      // Handle addAsSite first (separate endpoint)
      const siteResolutions = resolutions.filter(r => r.action === 'addAsSite' && r.profileId);
      for (const res of siteResolutions) {
        const conflict = pendingConflicts.find(c => c.index === res.index);
        if (!conflict) continue;
        const sitePayload = {
          siteName: res.siteName ?? conflict.data.siteName ?? conflict.data.siteCitta ?? 'Sede Principale',
          indirizzo: conflict.data.siteIndirizzo ?? conflict.data.indirizzo,
          citta: conflict.data.siteCitta ?? conflict.data.citta,
          provincia: conflict.data.siteProvincia ?? conflict.data.provincia,
          cap: conflict.data.siteCap ?? conflict.data.cap,
          telefono: conflict.data.siteTelefono ?? conflict.data.telefono,
          mail: conflict.data.siteMail ?? conflict.data.mail,
        };
        await apiPost(`/api/v1/companies/${res.profileId}/sites`, sitePayload, { headers: operateHeaders });
      }

      // Handle overwrite: re-import only the conflicting companies with overwriteIds
      const overwriteResolutions = resolutions.filter(r => r.action === 'overwrite' && r.profileId);
      if (overwriteResolutions.length > 0) {
        const overwriteIds = overwriteResolutions.map(r => r.profileId as string);
        // conflict.data è già in formato API (è il rawData restituito dal backend nell'errore)
        // Non va riconvertito per evitare double-conversion che può causare perdita di campi
        const conflictDataToRetry = overwriteResolutions
          .map(r => pendingConflicts.find(c => c.index === r.index)?.data)
          .filter((d): d is CompanyData => !!d);

        if (conflictDataToRetry.length === 0) {
          showToast({ message: 'Nessun dato da sovrascrivere trovato.', type: 'warning' });
          setIsResolving(false);
          return;
        }

        const response = await onImport(conflictDataToRetry as any, overwriteIds);
        handleImportResult(response, siteResolutions.length);
        return;
      }

      // Only sites / all skipped
      if (siteResolutions.length > 0) {
        showToast({
          message: `${siteResolutions.length} sed${siteResolutions.length === 1 ? 'e' : 'i'} creat${siteResolutions.length === 1 ? 'a' : 'e'} con successo`,
          type: 'success',
        });
        onClose();
        return;
      }

      // All skipped
      showToast({ message: 'Conflitti saltati. Import completato.', type: 'info' });
      onClose();
    } catch (error) {
      showToast({
        message: `Errore durante la risoluzione: ${'Errore sconosciuto'}`,
        type: 'error',
      });
    } finally {
      setIsResolving(false);
    }
  };

  // ── Toast & close after import ────────────────────────────────────────────
  const handleImportResult = (response: Awaited<ReturnType<typeof onImport>>, extraSites = 0) => {
    const { created = [], updated = [], sitesCreated = [], errors = [], warnings = [] } =
      (response.results as Record<string, unknown[]> | undefined) ?? {};
    const createdCount = (created as any[]).length;
    const updatedCount = (updated as any[]).length;
    const sitesCount = (sitesCreated as any[]).length + extraSites;
    const errorsCount = (errors as any[]).length;
    const warningsCount = (warnings as any[]).length;
    const total = createdCount + updatedCount;

    if (total > 0) {
      const sitePart = sitesCount ? `, ${sitesCount} sed${sitesCount === 1 ? 'e' : 'i'}` : '';
      const errPart = errorsCount > 0 ? `, ${errorsCount} err${errorsCount === 1 ? 'ore' : 'ori'}` : '';
      const warnPart = warningsCount > 0 ? `, ${warningsCount} avvis${warningsCount === 1 ? 'o' : 'i'}` : '';
      showToast({
        message: `Import completato: ${createdCount} creat${createdCount === 1 ? 'a' : 'e'}, ${updatedCount} aggiorn${updatedCount === 1 ? 'ata' : 'ate'}${sitePart}${errPart}${warnPart}`,
        type: warningsCount > 0 ? 'warning' : 'success',
      });
      onClose();
    } else if (errorsCount > 0) {
      const firstErr = (errors as any[])[0]?.error ?? '';
      showToast({ message: `Import fallito: ${firstErr}`, type: 'error' });
    } else {
      showToast({ message: 'Nessuna modifica effettuata.', type: 'info' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === 'conflicts') {
    return (
      <CompanyConflictStep
        conflicts={pendingConflicts}
        onResolve={handleConflictResolve}
        onCancel={() => setStep('upload')}
        isResolving={isResolving}
      />
    );
  }

  return (
    <GenericImport
      entityType="aziende"
      uniqueField="piva"
      title="Importa Aziende"
      subtitle="Carica un file CSV con i dati delle aziende. I conflitti verranno gestiti nel passaggio successivo."
      columnOrder={columnOrder}
      csvHeaderMap={csvHeaderMap}
      customProcessFile={customProcessFile}
      onImport={handleImport as any}
      onClose={onClose}
      customValidation={validateCompany as any}
      initialPreviewData={importData}
      existingEntities={existingCompanies as any}
      normalizeKey={normalizePiva}
    />
  );
};

export default CompanyImportRefactored;
