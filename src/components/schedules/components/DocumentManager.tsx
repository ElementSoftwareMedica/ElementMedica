import React, { useState, useEffect } from 'react';
import { Label } from '../../../design-system/atoms/Label';
import { FileText, Users, Award, Download, Loader2, Trash2, RefreshCw, Calculator, Edit } from 'lucide-react';
import lettereIncaricoService from '../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../services/registriPresenzeService';
import attestatiService from '../../../services/attestatiService';
import preventiviService from '../../../services/preventiviService';
import { clearCache, invalidateCache } from '../../../services/api';
import type { LetteraIncarico } from '../../../services/lettereIncaricoService';
import type { RegistroPresenze } from '../../../services/registriPresenzeService';
import type { Attestato } from '../../../services/attestatiService';
import RegenerateAttestatiModal from './RegenerateAttestatiModal';
import PreventiviModal from './PreventiviModal';

type DateEntry = import('../types').ScheduleDateEntry;
type Person = { id: string | number; firstName: string; lastName: string };
type Training = { id: string | number; name?: string; nome?: string; title?: string; price?: number; prezzo?: number; };
type Company = { id: string | number; ragioneSociale?: string; businessName?: string; };

interface DocumentManagerProps {
  status: string;
  onStatusChange: (status: string) => void;
  selectedPersons: (string | number)[];
  selectedCompanies: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  dates: DateEntry[];
  showStatusMenu: boolean;
  onShowStatusMenuChange: (show: boolean) => void;
  scheduleId?: string | number | null;
  trainers?: Array<{ id: string | number; firstName: string; lastName: string }>;
  persons?: Person[];
  selectedCourse?: Training;
  companies?: Company[];
  pendingPreventiviIds?: string[];
  onPendingPreventiviCreated?: (ids: string[]) => void;
}

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
  
  const [loadingLettere, setLoadingLettere] = useState(false);
  const [loadingRegistri, setLoadingRegistri] = useState(false);
  const [loadingAttestati, setLoadingAttestati] = useState(false);
  
  const [lettereList, setLettereList] = useState<LetteraIncarico[]>([]);
  const [registriList, setRegistriList] = useState<RegistroPresenze[]>([]);
  const [attestatiList, setAttestatiList] = useState<Attestato[]>([]);
  const [preventiviList, setPreventiviList] = useState<any[]>([]);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showPreventiviModal, setShowPreventiviModal] = useState(false);
  const [editingPreventivo, setEditingPreventivo] = useState<any>(null);
  
  const hasAttendanceData = dates.every((_, idx) => 
    attendance[idx] && attendance[idx].length > 0
  );

  const hasScheduleId = Boolean(scheduleId);
  const hasSessions = dates.length > 0;
  const hasTrainers = trainers.length > 0;

  // Fetch documenti esistenti quando scheduleId cambia
  useEffect(() => {
    if (scheduleId) {
      fetchDocuments();
    } else if (pendingPreventiviIds.length > 0) {
      // Se non c'è scheduleId ma ci sono preventivi pending, caricali
      fetchPendingPreventivi();
    }
  }, [scheduleId, refreshKey, pendingPreventiviIds]);

  const fetchDocuments = async () => {
    if (!scheduleId) return;
    
    // CRITICAL: Clear cache before fetching to avoid stale/corrupted cache issues
    clearCache();
    
    try {
      const [lettere, registri, attestati, preventivi] = await Promise.all([
        lettereIncaricoService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        registriPresenzeService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        attestatiService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        preventiviService.list({ scheduleId: String(scheduleId) }).catch(() => [])
      ]);
      
      setLettereList(lettere);
      setRegistriList(registri);
      setAttestatiList(attestati);
      setPreventiviList(preventivi);
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
    }
  };

  const fetchPendingPreventivi = async () => {
    if (pendingPreventiviIds.length === 0) return;
    
    try {
      // Fetch preventivi by IDs
      const preventiviPromises = pendingPreventiviIds.map(id => 
        preventiviService.getById(id).catch(() => null)
      );
      const preventivi = (await Promise.all(preventiviPromises)).filter(p => p !== null);
      setPreventiviList(preventivi);
    } catch (error) {
      console.error('Errore caricamento preventivi pending:', error);
    }
  };

  const handleGenerateLettere = async () => {
    if (!scheduleId || !hasTrainers) return;
    setLoadingLettere(true);
    try {
      const result = await lettereIncaricoService.generateBatch({
        scheduleId: String(scheduleId),
        trainerIds: trainers.map(t => String(t.id)),
        sendEmail: false
      });
      
      alert(`✅ ${result.message || `Avviate ${trainers.length} lettere di incarico!`}`);
      // Invalida la cache prima di fare il refresh
      invalidateCache('/api/v1/lettere-incarico');
      setRefreshKey(prev => prev + 1); // Refresh lista
    } catch (error: any) {
      console.error('Errore generazione lettere:', error);
      alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
    } finally {
      setLoadingLettere(false);
    }
  };

  const handleGenerateRegistri = async () => {
    if (!scheduleId || !hasSessions) return;
    setLoadingRegistri(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const [index, date] of dates.entries()) {
        try {
          const attendanceData = attendance[index] || [];
          await registriPresenzeService.generate({
            sessionId: `${scheduleId}-session-${date.date}-${index}`, // Usa data come parte dell'ID
            formatoreId: String(date.trainerId),
            attendanceData: attendanceData.map(personId => ({
              personId: String(personId),
              present: true,
              hours: 8
            }))
          });
          successCount++;
        } catch (err) {
          console.error(`Errore sessione ${index + 1}:`, err);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        alert(`✅ Generati ${successCount} registri presenze!${errorCount > 0 ? ` (${errorCount} errori)` : ''}`);
        // Invalida la cache prima di fare il refresh
        invalidateCache('/api/v1/registri-presenze');
        setRefreshKey(prev => prev + 1);
      } else {
        alert('❌ Nessun registro generato con successo');
      }
    } catch (error: any) {
      console.error('Errore generazione registri:', error);
      alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
    } finally {
      setLoadingRegistri(false);
    }
  };

  const handleGenerateAttestati = async () => {
    if (!scheduleId || selectedPersons.length === 0) return;
    
    // Mostra modal di conferma
    setShowRegenerateModal(true);
  };

  const handleConfirmGeneration = async (personIds: string[], regenerateExisting: boolean) => {
    if (!scheduleId || personIds.length === 0) return;
    
    setLoadingAttestati(true);
    try {
      // Se regenerate=true, prima elimina gli esistenti
      if (regenerateExisting) {
        const existingToDelete = attestatiList
          .filter(a => personIds.includes(a.personId))
          .map(a => a.id);
        
        if (existingToDelete.length > 0) {
          await attestatiService.deleteMultipleAttestati(existingToDelete);
        }
      } else {
        // Filtra solo le persone senza attestati
        const personsWithAttestati = new Set(attestatiList.map(a => a.personId));
        personIds = personIds.filter(id => !personsWithAttestati.has(id));
      }

      if (personIds.length === 0) {
        alert('⚠️ Nessun attestato da generare (tutti i partecipanti selezionati hanno già un attestato)');
        return;
      }

      const result = await attestatiService.generateBatch({
        scheduleId: String(scheduleId),
        personIds,
        sendEmail: false
      });
      
      if (result.success > 0) {
        alert(`✅ Generati ${result.success} attestati!${result.failed > 0 ? ` (${result.failed} errori)` : ''}`);
        // Invalida la cache prima di fare il refresh
        invalidateCache('/api/v1/attestati');
        setRefreshKey(prev => prev + 1);
      } else {
        alert('❌ Nessun attestato generato con successo');
      }
    } catch (error: any) {
      console.error('Errore generazione attestati:', error);
      
      // Gestisci errore 409 (Conflict - attestati esistenti)
      if (error.response?.status === 409) {
        alert('⚠️ Alcuni partecipanti hanno già un attestato. Usa il modal per rigenerarli o seleziona solo chi non ce l\'ha.');
      } else {
        alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
      }
    } finally {
      setLoadingAttestati(false);
    }
  };

  const handleDeleteLettera = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa lettera?')) return;
    try {
      await lettereIncaricoService.delete(id);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Errore eliminazione lettera:', error);
      alert('❌ Errore durante l\'eliminazione');
    }
  };

  const handleDeleteRegistro = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo registro?')) return;
    try {
      await registriPresenzeService.delete(id);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Errore eliminazione registro:', error);
      alert('❌ Errore durante l\'eliminazione');
    }
  };

  const handleDeleteAttestato = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo attestato?')) return;
    try {
      await attestatiService.delete(id);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Errore eliminazione attestato:', error);
      alert('❌ Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">📄 Gestione Documenti</h3>
        <div className="flex items-center gap-3">
          {hasScheduleId && (
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
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
        {/* Document Status */}
        <div>
          <Label>Stato Documentazione</Label>
          <div className="relative mt-1">
            <button
              type="button"
              className="w-full p-2.5 border rounded-lg flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
              onClick={() => onShowStatusMenuChange(!showStatusMenu)}
            >
              <span className="font-medium">{status}</span>
              <span className="text-gray-400">▼</span>
            </button>
            
            {showStatusMenu && (
              <div className="absolute left-0 right-0 mt-1 border rounded-lg bg-white shadow-xl z-10">
                {statusOptions.map(s => (
                  <div
                    key={s}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg transition-colors"
                    onClick={() => {
                      onStatusChange(s);
                      onShowStatusMenuChange(false);
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
            <div className="text-xs text-blue-600 mb-1">Partecipanti</div>
            <div className="text-2xl font-bold text-blue-700">{selectedPersons.length}</div>
          </div>
          <div className="p-3 border rounded-lg bg-purple-50 border-purple-200">
            <div className="text-xs text-purple-600 mb-1">Aziende</div>
            <div className="text-2xl font-bold text-purple-700">{selectedCompanies.length}</div>
          </div>
          <div className="p-3 border rounded-lg bg-green-50 border-green-200">
            <div className="text-xs text-green-600 mb-1">Sessioni</div>
            <div className="text-2xl font-bold text-green-700">{dates.length}</div>
          </div>
        </div>

        {/* Document Generation Sections */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">Generazione Documenti</h4>
          
          {/* 1. Lettere di Incarico */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h5 className="font-semibold text-gray-800">Lettere di Incarico</h5>
                  {lettereList.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {lettereList.length} generate
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Genera <strong>{hasTrainers ? trainers.length : 0} lettera{trainers.length !== 1 ? 'e' : ''}</strong> per {hasTrainers ? 'i formatori' : 'nessun formatore'} del corso
                </p>
                {hasTrainers && (
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border mb-3">
                    {trainers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerateLettere}
                disabled={!hasScheduleId || !hasTrainers || loadingLettere}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center"
              >
                {loadingLettere ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Genera Lettere
                  </>
                )}
              </button>
            </div>
            {!hasTrainers && (
              <div className="text-xs text-amber-600 mb-2">
                ⚠️ Nessun formatore selezionato
              </div>
            )}
            {/* Lista lettere generate */}
            {lettereList.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-2">Documenti generati:</div>
                {lettereList.map(lettera => (
                  <div key={lettera.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="truncate">
                        {lettera.trainer ? `${lettera.trainer.firstName} ${lettera.trainer.lastName}` : lettera.nomeFile}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{lettera.numeroProgressivo}/{lettera.annoProgressivo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => lettereIncaricoService.download(lettera.id)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLettera(lettera.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Registri Presenze */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h5 className="font-semibold text-gray-800">Registri Presenze</h5>
                  {registriList.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {registriList.length} generati
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Genera <strong>{hasSessions ? dates.length : 0} registro{dates.length !== 1 ? 'i' : ''}</strong> per {hasSessions ? 'le sessioni' : 'nessuna sessione'} del corso
                </p>
                {hasSessions && (
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border mb-3">
                    {dates.map((d, i) => `Sessione ${i + 1}: ${d.date}`).join(' • ')}
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerateRegistri}
                disabled={!hasScheduleId || !hasSessions || loadingRegistri}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center"
              >
                {loadingRegistri ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Genera Registri
                  </>
                )}
              </button>
            </div>
            {!hasSessions && (
              <div className="text-xs text-amber-600 mb-2">
                ⚠️ Nessuna sessione programmata
              </div>
            )}
            {/* Lista registri generati */}
            {registriList.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-2">Documenti generati:</div>
                {registriList.map(registro => (
                  <div key={registro.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="truncate">
                        {registro.session ? `Sessione ${registro.session.date}` : registro.nomeFile}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{registro.numeroProgressivo}/{registro.annoProgressivo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => registriPresenzeService.download(registro.id)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRegistro(registro.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Attestati */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-green-600" />
                  <h5 className="font-semibold text-gray-800">Attestati di Partecipazione</h5>
                  {attestatiList.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                      {attestatiList.length} generati
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Genera <strong>{selectedPersons.length} attestato{selectedPersons.length !== 1 ? 'i' : ''}</strong> per {selectedPersons.length > 0 ? 'i partecipanti' : 'nessun partecipante'}
                </p>
                {!hasAttendanceData && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border mb-2">
                    ⚠️ Disponibile dopo la registrazione delle presenze (Step 3)
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerateAttestati}
                disabled={!hasScheduleId || !hasAttendanceData || selectedPersons.length === 0 || loadingAttestati}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center"
              >
                {loadingAttestati ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Genera Attestati
                  </>
                )}
              </button>
            </div>
            {/* Lista attestati generati */}
            {attestatiList.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-600">Documenti generati:</div>
                  {attestatiList.length > 1 && (
                    <button
                      onClick={() => attestatiService.downloadZipBatch(attestatiList.map(a => a.id))}
                      className="text-xs flex items-center gap-1 text-green-700 hover:text-green-800 font-medium"
                    >
                      <Download className="w-3 h-3" />
                      Scarica tutto (ZIP)
                    </button>
                  )}
                </div>
                {attestatiList.map(attestato => (
                  <div key={attestato.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Award className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">
                        {attestato.person ? `${attestato.person.firstName} ${attestato.person.lastName}` : attestato.fileName}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{attestato.numeroProgressivo}/{attestato.annoProgressivo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => attestatiService.download(attestato.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttestato(attestato.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Preventivi */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-orange-600" />
                  <h5 className="font-semibold text-gray-800">Preventivi</h5>
                  {preventiviList.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                      {preventiviList.length} generati
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Genera <strong>{selectedCompanies.length} preventivo{selectedCompanies.length !== 1 ? 'i' : ''}</strong> per {selectedCompanies.length > 0 ? 'le aziende partecipanti' : 'nessuna azienda'}
                </p>
              </div>
              <button
                onClick={() => setShowPreventiviModal(true)}
                disabled={!hasScheduleId || selectedCompanies.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center"
              >
                <Calculator className="w-4 h-4" />
                Genera Preventivi
              </button>
            </div>
            {/* Lista preventivi generati */}
            {preventiviList.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="text-xs font-medium text-gray-600 mb-2">Documenti generati:</div>
                {preventiviList.map((preventivo: any) => (
                  <div key={preventivo.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calculator className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span className="truncate">
                        {preventivo.azienda?.ragioneSociale || `Azienda ${preventivo.aziendaId}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        €{preventivo.importoFinale ? Number(preventivo.importoFinale).toFixed(2) : '0.00'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        preventivo.stato === 'ACCETTATO' ? 'bg-green-100 text-green-700' :
                        preventivo.stato === 'INVIATO' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {preventivo.stato}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => preventiviService.download(preventivo.id)}
                        className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingPreventivo(preventivo);
                          setShowPreventiviModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Modifica"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Eliminare questo preventivo?')) {
                            await preventiviService.delete(preventivo.id);
                            fetchDocuments();
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Status Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm">
            <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Stato attuale: {status}
            </div>
            <div className="text-blue-700 text-xs">
              {status === 'Preventivo' && '📝 Il corso è in fase di preventivazione'}
              {status === 'Conferma' && '✅ Il corso è confermato e pronto per l\'erogazione'}
              {status === 'Fattura' && '💰 Il corso è stato fatturato'}
              {status === 'Pagamento' && '✓ Il pagamento è stato ricevuto'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preventivi */}
      {showPreventiviModal && selectedCourse && (
        <PreventiviModal
          isOpen={showPreventiviModal}
          onClose={() => {
            setShowPreventiviModal(false);
            setEditingPreventivo(null);
          }}
          selectedCompanies={companies.filter(c => selectedCompanies.includes(c.id))}
          selectedCourse={selectedCourse as any}
          dates={dates as any}
          scheduleId={scheduleId}
          editingPreventivo={editingPreventivo}
          onPreventiviCreated={(ids) => {
            if (scheduleId) {
              // Se c'è scheduleId, aggiorna la lista normalmente
              fetchDocuments();
            } else {
              // Se non c'è scheduleId (nuovo evento), salva gli IDs come pending
              onPendingPreventiviCreated?.(ids);
            }
            setShowPreventiviModal(false);
            setEditingPreventivo(null);
          }}
        />
      )}

      {/* Modal Rigenera Attestati */}
      <RegenerateAttestatiModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onConfirm={handleConfirmGeneration}
        persons={selectedPersons
          .map(id => persons.find(p => String(p.id) === String(id)))
          .filter((p): p is Person => p !== undefined)
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