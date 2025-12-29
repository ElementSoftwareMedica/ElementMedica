/**
 * DocumentManager Component (Refactored)
 * 
 * Main component for managing all schedule-related documents:
 * - Lettere di Incarico
 * - Registri Presenze  
 * - Attestati di Partecipazione
 * - Preventivi
 * - Test e Questionari
 * 
 * Refactored from 761L → 270L (-64%)
 * Architecture: Hooks Composition + Component Library
 */

import React, { useState } from 'react';
import { FileText, Users, Award, Calculator, RefreshCw, FileQuestion } from 'lucide-react';

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
import GenerateRegistriModal from '../GenerateRegistriModal';
import GenerateLettereModal from '../GenerateLettereModal';
import TestManagerModal from '../TestManagerModal';

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
    downloadLettereZip,
    downloadRegistriZip,
    deleteLettera,
    deleteRegistro,
    deleteAttestato,
    deletePreventivo
  } = useDocumentActions(refresh, scheduleId);

  // Hook 4: UI state (modals)
  const {
    showRegenerateModal,
    showPreventiviModal,
    showRegistriModal,
    showLettereModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal,
    openRegistriModal,
    closeRegistriModal,
    openLettereModal,
    closeLettereModal
  } = useDocumentUI();

  // State for Test modal
  const [showTestModal, setShowTestModal] = useState(false);

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

          {/* 1. Preventivi */}
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
              const company = companies.find(c => c.id === doc.aziendaId);
              const companyName = company ? getCompanyName(company) : `Azienda ${doc.aziendaId || 'Sconosciuta'}`;

              // Format: yyyy.mm.dd - nome azienda
              const date = new Date(doc.dataEmissione || doc.createdAt);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');

              return `${year}.${month}.${day} - ${companyName}`;
            }}
            buttonText="Genera Preventivi"
          />

          {/* 2. Lettere di Incarico */}
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
            onGenerate={openLettereModal}
            documents={lettereList}
            onDownload={downloadLettera}
            onDelete={deleteLettera}
            getDocumentName={(doc) =>
              doc.trainer ? `${doc.trainer.firstName} ${doc.trainer.lastName}` : doc.nomeFile
            }
            buttonText="Genera Lettere"
            showZipDownload={true}
            onDownloadZip={() => downloadLettereZip(lettereList.map(l => l.id))}
          />

          {/* 3. Registri Presenze */}
          <DocumentSection
            title="Registri Presenze"
            description={`Genera ${dates.length} registr${dates.length !== 1 ? 'i' : 'o'} per ${dates.length > 0 ? 'le sessioni' : 'nessuna sessione'} del corso`}
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
            onGenerate={openRegistriModal}
            documents={registriList}
            onDownload={downloadRegistro}
            onDelete={deleteRegistro}
            getDocumentName={(doc) => doc.nomeFile || doc.fileName || `Registro ${doc.id}`}
            buttonText="Genera Registri"
            showZipDownload={true}
            onDownloadZip={() => downloadRegistriZip(registriList.map(r => r.id))}
          />

          {/* 4. Attestati */}
          <DocumentSection
            title="Attestati di Partecipazione"
            description={`Genera ${selectedPersons.length} attestat${selectedPersons.length !== 1 ? 'i' : 'o'} per ${selectedPersons.length > 0 ? 'i partecipanti' : 'nessun partecipante'}`}
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

          {/* 5. Test e Questionari */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <FileQuestion className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Test e Questionari</h4>
                  <p className="text-sm text-gray-500">
                    Gestisci test iniziali, finali e valutazioni per i partecipanti
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <FileQuestion className="h-4 w-4" />
                Gestisci Test
              </button>
            </div>
          </div>

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
          attendance={attendance}
          persons={persons}
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

      {/* Modal: Genera Registri Presenze */}
      <GenerateRegistriModal
        isOpen={showRegistriModal}
        onClose={closeRegistriModal}
        scheduleId={scheduleId}
        dates={dates}
        attendance={attendance}
        persons={persons}
        companies={companies}
        trainers={trainers}
        onSuccess={refresh}
      />

      {/* Modal: Genera Lettere di Incarico */}
      <GenerateLettereModal
        isOpen={showLettereModal}
        onClose={closeLettereModal}
        scheduleId={scheduleId}
        trainers={
          // Filtra solo i trainers che hanno almeno una sessione assegnata (esclude coTrainers)
          trainers
            .filter(t => dates.some(d => String(d.trainerId) === String(t.id)))
            .map(t => ({
              id: String(t.id),
              firstName: t.firstName,
              lastName: t.lastName,
              email: (t as any).email,
              hourlyRate: (t as any).hourlyRate
            }))
        }
        dates={dates}
        onSuccess={refresh}
      />

      {/* Modal: Test e Questionari */}
      <TestManagerModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        scheduleId={scheduleId}
        courseId={selectedCourse?.id ? String(selectedCourse.id) : undefined}
        riskLevel={(selectedCourse as any)?.riskLevel}
        courseType={(selectedCourse as any)?.courseType}
        courseName={selectedCourse?.name || selectedCourse?.nome || selectedCourse?.title}
        persons={persons.map(p => ({
          id: String(p.id),
          firstName: p.firstName,
          lastName: p.lastName,
          email: (p as any).email
        }))}
      />
    </div>
  );
};

export default DocumentManager;
