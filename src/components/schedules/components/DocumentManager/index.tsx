/**
 * DocumentManager Component (Refactored)
 * 
 * Main component for managing all schedule-related documents:
 * - Lettere di Incarico
 * - Registri Presenze  
 * - Attestati di Partecipazione
 * - Preventivi
 * 
 * Refactored from 761L → 270L (-64%)
 * Architecture: Hooks Composition + Component Library
 */

import React from 'react';
import { FileText, Users, Award, Calculator, RefreshCw } from 'lucide-react';

// Hooks
import {
  useDocumentData,
  useDocumentGeneration,
  useDocumentActions,
  useDocumentUI
} from './hooks';

// Components
import {
  DocumentStatusSelector,
  DocumentSummaryCards,
  DocumentSection
} from './components';

// Utils & Types
import {
  hasAttendanceData,
  getStatusInfo,
  getPersonFullName,
  getCompanyName
} from './documentHelpers';
import {
  canGenerateLettere,
  canGenerateRegistri,
  canGenerateAttestati,
  canGeneratePreventivi
} from './documentValidators';
import type { DocumentManagerProps } from './types';

// External components
import RegenerateAttestatiModal from '../RegenerateAttestatiModal';
import PreventiviModal from '../PreventiviModal';

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  status,
  onStatusChange,
  selectedPersons,
  selectedCompanies,
  attendance,
  dates,
  showStatusMenu,
  onShowStatusMenuChange,
  scheduleId,
  trainers = [],
  persons = [],
  selectedCourse,
  companies = [],
  pendingPreventiviIds = [],
  onPendingPreventiviCreated
}) => {
  const statusOptions = ['Preventivo', 'Conferma', 'Fattura', 'Pagamento'];

  // Computed values
  const hasAttendance = hasAttendanceData(dates, attendance);
  const hasScheduleId = Boolean(scheduleId);

  // Hook 1: Document data management
  const {
    lettereList,
    registriList,
    attestatiList,
    preventiviList,
    refresh
  } = useDocumentData(scheduleId, pendingPreventiviIds);

  // Hook 2: Document generation
  const {
    loading,
    generateLettere,
    generateRegistri,
    generateAttestati
  } = useDocumentGeneration({
    scheduleId,
    trainers,
    dates,
    attendance,
    selectedPersons,
    attestatiList,
    onRefresh: refresh
  });

  // Hook 3: Document actions (download/delete)
  const {
    downloadLettera,
    downloadRegistro,
    downloadAttestato,
    downloadPreventivo,
    downloadAttestatiZip,
    deleteLettera,
    deleteRegistro,
    deleteAttestato,
    deletePreventivo
  } = useDocumentActions(refresh);

  // Hook 4: UI state (modals)
  const {
    showRegenerateModal,
    showPreventiviModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal
  } = useDocumentUI();

  // Get status information
  const statusInfo = getStatusInfo(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">📄 Gestione Documenti</h3>
        <div className="flex items-center gap-3">
          {hasScheduleId && (
            <button
              onClick={refresh}
              className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="Ricarica documenti"
            >
              <RefreshCw className="w-4 h-4" />
              Aggiorna
            </button>
          )}
          {!hasScheduleId && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ⚠️ Salva il corso per abilitare la generazione documenti
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-5 bg-white shadow-sm space-y-6">
        {/* Status Selector */}
        <DocumentStatusSelector
          status={status}
          statusOptions={statusOptions}
          showMenu={showStatusMenu}
          onStatusChange={onStatusChange}
          onShowMenuChange={onShowStatusMenuChange}
        />

        {/* Summary Cards */}
        <DocumentSummaryCards
          selectedPersonsCount={selectedPersons.length}
          selectedCompaniesCount={selectedCompanies.length}
          datesCount={dates.length}
        />

        {/* Document Generation Sections */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">
            Generazione Documenti
          </h4>

          {/* 1. Lettere di Incarico */}
          <DocumentSection
            title="Lettere di Incarico"
            description={`Genera ${trainers.length} lettera${trainers.length !== 1 ? 'e' : ''} per ${trainers.length > 0 ? 'i formatori' : 'nessun formatore'} del corso`}
            icon={FileText}
            color="blue"
            count={lettereList.length}
            canGenerate={canGenerateLettere(scheduleId, trainers)}
            loading={loading.lettere}
            warningMessage={trainers.length === 0 ? '⚠️ Nessun formatore selezionato' : undefined}
            details={
              trainers.length > 0 ? (
                <span>{trainers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}</span>
              ) : undefined
            }
            onGenerate={generateLettere}
            documents={lettereList}
            onDownload={downloadLettera}
            onDelete={deleteLettera}
            getDocumentName={(doc) => 
              doc.trainer ? `${doc.trainer.firstName} ${doc.trainer.lastName}` : doc.nomeFile
            }
            buttonText="Genera Lettere"
          />

          {/* 2. Registri Presenze */}
          <DocumentSection
            title="Registri Presenze"
            description={`Genera ${dates.length} registro${dates.length !== 1 ? 'i' : ''} per ${dates.length > 0 ? 'le sessioni' : 'nessuna sessione'} del corso`}
            icon={Users}
            color="purple"
            count={registriList.length}
            canGenerate={canGenerateRegistri(scheduleId, dates)}
            loading={loading.registri}
            details={
              dates.length > 0 ? (
                <span>{dates.map((d, i) => `Sessione ${i + 1}: ${d.date}`).join(' • ')}</span>
              ) : undefined
            }
            onGenerate={generateRegistri}
            documents={registriList}
            onDownload={downloadRegistro}
            onDelete={deleteRegistro}
            getDocumentName={(doc) => doc.fileName || `Registro ${doc.id}`}
            buttonText="Genera Registri"
          />

          {/* 3. Attestati */}
          <DocumentSection
            title="Attestati di Partecipazione"
            description={`Genera ${selectedPersons.length} attestato${selectedPersons.length !== 1 ? 'i' : ''} per ${selectedPersons.length > 0 ? 'i partecipanti' : 'nessun partecipante'}`}
            icon={Award}
            color="green"
            count={attestatiList.length}
            canGenerate={canGenerateAttestati(scheduleId, hasAttendance, selectedPersons)}
            loading={loading.attestati}
            warningMessage={
              !hasAttendance
                ? '⚠️ Disponibile dopo la registrazione delle presenze (Step 3)'
                : undefined
            }
            onGenerate={openRegenerateModal}
            documents={attestatiList}
            showZipDownload={true}
            onDownload={downloadAttestato}
            onDelete={deleteAttestato}
            onDownloadZip={() => downloadAttestatiZip(attestatiList.map(a => a.id))}
            getDocumentName={(doc) =>
              doc.person ? `${doc.person.firstName} ${doc.person.lastName}` : doc.fileName
            }
            buttonText="Genera Attestati"
          />

          {/* 4. Preventivi */}
          <DocumentSection
            title="Preventivi"
            description={`Genera preventivi per ${selectedCompanies.length} aziend${selectedCompanies.length !== 1 ? 'e' : 'a'}`}
            icon={Calculator}
            color="orange"
            count={preventiviList.length}
            canGenerate={canGeneratePreventivi(scheduleId, selectedCompanies)}
            loading={false}
            details={
              selectedCompanies.length > 0 ? (
                <span>
                  {companies
                    .filter(c => selectedCompanies.includes(c.id))
                    .map(c => getCompanyName(c))
                    .join(', ')}
                </span>
              ) : undefined
            }
            onGenerate={() => openPreventiviModal()}
            documents={preventiviList}
            onDownload={downloadPreventivo}
            onEdit={(doc) => openPreventiviModal(doc)}
            onDelete={deletePreventivo}
            getDocumentName={(doc) => {
              const company = companies.find(c => c.id === doc.companyId);
              return company ? getCompanyName(company) : `Preventivo #${doc.numero}/${doc.anno}`;
            }}
            buttonText="Genera Preventivi"
          />
        </div>

        {/* Status Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm">
            <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Stato attuale: {status}
            </div>
            <div className="text-blue-700 text-xs">{statusInfo.description}</div>
          </div>
        </div>
      </div>

      {/* Modal: Preventivi */}
      {showPreventiviModal && selectedCourse && (
        <PreventiviModal
          isOpen={showPreventiviModal}
          onClose={closePreventiviModal}
          selectedCompanies={companies.filter(c => selectedCompanies.includes(c.id))}
          selectedCourse={selectedCourse as any}
          dates={dates as any}
          scheduleId={scheduleId}
          editingPreventivo={editingPreventivo}
          onPreventiviCreated={(ids) => {
            if (scheduleId) {
              refresh();
            } else {
              onPendingPreventiviCreated?.(ids);
            }
            closePreventiviModal();
          }}
        />
      )}

      {/* Modal: Rigenera Attestati */}
      <RegenerateAttestatiModal
        isOpen={showRegenerateModal}
        onClose={closeRegenerateModal}
        onConfirm={generateAttestati}
        persons={selectedPersons
          .map(id => persons.find(p => String(p.id) === String(id)))
          .filter((p): p is typeof persons[0] => p !== undefined)
          .map(p => ({
            id: String(p.id),
            firstName: p.firstName,
            lastName: p.lastName
          }))}
        existingAttestati={attestatiList}
        scheduleTitle="Corso"
      />
    </div>
  );
};

export default DocumentManager;
