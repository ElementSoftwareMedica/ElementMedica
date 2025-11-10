import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Calculator, Euro, Tag, Plus, Trash2, Users, Building2, Check } from 'lucide-react';
import { usePreventivi } from '../../../hooks/finance/usePreventivi';
import { useCodiciSconto } from '../../../hooks/finance/useCodiciSconto';
import preventiviService from '../../../services/preventiviService';

interface Company {
  id: string | number;
  ragioneSociale?: string;
  businessName?: string;
}

interface Training {
  id: string | number;
  title?: string;
  name?: string;
  serviceType?: string;
  price?: number;
}

interface CompanyConfig {
  numPartecipanti: number;
  enabled: boolean;
}

interface DateEntry {
  date: string;
  startTime?: string;
  endTime?: string;
}

interface PreventiviModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompanies: Company[];
  selectedCourse: Training;
  dates: DateEntry[];
  scheduleId?: string | number | null;
  editingPreventivo?: any | null;
  onPreventiviCreated: (ids: string[]) => void;
}

interface SpesaAccessoria {
  descrizione: string;
  importo: number;
}

export const PreventiviModal = ({
  isOpen,
  onClose,
  selectedCompanies,
  selectedCourse,
  dates,
  scheduleId,
  editingPreventivo = null,
  onPreventiviCreated,
}: PreventiviModalProps) => {
  const { createPreventivo, applySconto, loading } = usePreventivi();
  const { validateCodice, loading: loadingSconto } = useCodiciSconto();

  // Selected company in sidebar
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | number | null>(null);

  // Per-company configuration
  const [companiesConfig, setCompaniesConfig] = useState<Map<string | number, CompanyConfig>>(new Map());

  // Shared form values
  const [prezzoUnitario, setPrezzoUnitario] = useState<number>(0);
  const [tipoServizio, setTipoServizio] = useState<string>('MEDICO_COMPETENTE');
  const [speseAccessorie, setSpeseAccessorie] = useState<SpesaAccessoria[]>([]);
  const [codiceSconto, setCodiceSconto] = useState<string>('');
  const [scontoApplicato, setScontoApplicato] = useState<{
    id: string;
    codice: string;
    percentuale: number;
  } | null>(null);
  const [note, setNote] = useState<string>('');

  // Track if companies config was initialized to prevent re-initialization loop
  const companiesInitializedRef = useRef(false);
  const editingInitializedRef = useRef(false);

  // Initialize companies config from selectedCompanies
  useEffect(() => {
    // Only initialize once
    if (companiesInitializedRef.current || selectedCompanies.length === 0) {
      return;
    }
    
    const initialConfig = new Map<string | number, CompanyConfig>();
    selectedCompanies.forEach((company) => {
      initialConfig.set(company.id, {
        numPartecipanti: 1,
        enabled: true,
      });
    });
    setCompaniesConfig(initialConfig);

    // Select first company by default
    setSelectedCompanyId(selectedCompanies[0].id);
    
    // Mark as initialized
    companiesInitializedRef.current = true;
  }, []); // Empty deps - initialize once on mount

  // Pre-populate fields when editing a preventivo
  useEffect(() => {
    if (editingPreventivo && !editingInitializedRef.current) {
      // Populate basic fields
      if (editingPreventivo.tipoServizio) {
        setTipoServizio(editingPreventivo.tipoServizio);
      }
      
      // Parse spese accessorie from note if present
      // Note format: "Prezzo base: €X\nSpese accessorie:\n- Desc: €Y\n\nNote aggiuntive:\nText"
      let parsedSpese: SpesaAccessoria[] = [];
      let noteAggiuntive = '';
      
      if (editingPreventivo.note) {
        const speseMatch = editingPreventivo.note.match(/Spese accessorie:\n((?:- .+: €[\d.]+\n?)+)/);
        if (speseMatch) {
          const speseLines = speseMatch[1].split('\n').filter(Boolean);
          parsedSpese = speseLines.map((line: string) => {
            const match = line.match(/- (.+): €([\d.]+)/);
            if (match) {
              return {
                descrizione: match[1],
                importo: parseFloat(match[2])
              };
            }
            return null;
          }).filter(Boolean) as SpesaAccessoria[];
        }
        
        // Extract note aggiuntive
        const noteMatch = editingPreventivo.note.match(/Note aggiuntive:\n(.+)$/s);
        if (noteMatch) {
          noteAggiuntive = noteMatch[1];
        }
      }
      
      setSpeseAccessorie(parsedSpese);
      setNote(noteAggiuntive);
      
      // Calculate prezzoUnitario from totals (convert Decimal strings to numbers)
      const numPartecipanti = 1; // Default for editing
      const totaleSpese = parsedSpese.reduce((sum, s) => sum + s.importo, 0);
      const prezzoBase = Number(editingPreventivo.prezzoTotale) - totaleSpese;
      const calcolatedPrezzoUnitario = prezzoBase / numPartecipanti;
      setPrezzoUnitario(calcolatedPrezzoUnitario);
      
      // Set sconto if present
      if (editingPreventivo.scontoApplicato) {
        setScontoApplicato(editingPreventivo.scontoApplicato);
        setCodiceSconto(editingPreventivo.scontoApplicato.codice);
      }
      
      // Initialize company config for the edited preventivo
      const editConfig = new Map<string | number, CompanyConfig>();
      editConfig.set(editingPreventivo.aziendaId, {
        numPartecipanti: 1,
        enabled: true,
      });
      setCompaniesConfig(editConfig);
      
      // Select the company being edited
      setSelectedCompanyId(editingPreventivo.aziendaId);
      
      // Mark as initialized
      editingInitializedRef.current = true;
    }
  }, [editingPreventivo]);

  // Auto-populate prezzoUnitario from course
  useEffect(() => {
    if (selectedCourse && 'price' in selectedCourse && !editingPreventivo) {
      setPrezzoUnitario((selectedCourse as any).price || 0);
    }
  }, [selectedCourse, editingPreventivo]);

  // Update company participant count
  const updateCompanyParticipants = (companyId: string | number, count: number) => {
    setCompaniesConfig((prev) => {
      const newConfig = new Map(prev);
      const existing = newConfig.get(companyId) || { numPartecipanti: 1, enabled: true };
      newConfig.set(companyId, { ...existing, numPartecipanti: Math.max(1, count) });
      return newConfig;
    });
  };

  // Toggle company enabled
  const toggleCompanyEnabled = (companyId: string | number) => {
    setCompaniesConfig((prev) => {
      const newConfig = new Map(prev);
      const existing = newConfig.get(companyId) || { numPartecipanti: 1, enabled: true };
      newConfig.set(companyId, { ...existing, enabled: !existing.enabled });
      return newConfig;
    });
  };

  // Add spesa accessoria
  const handleAddSpesa = () => {
    setSpeseAccessorie([...speseAccessorie, { descrizione: '', importo: 0 }]);
  };

  // Remove spesa accessoria
  const handleRemoveSpesa = (index: number) => {
    setSpeseAccessorie(speseAccessorie.filter((_, i) => i !== index));
  };

  // Update spesa accessoria
  const handleUpdateSpesa = (index: number, field: 'descrizione' | 'importo', value: string | number) => {
    const updated = [...speseAccessorie];
    if (field === 'importo') {
      updated[index].importo = typeof value === 'number' ? value : parseFloat(value) || 0;
    } else {
      updated[index].descrizione = String(value);
    }
    setSpeseAccessorie(updated);
  };

  // Validate codice sconto
  const handleValidateCodice = async () => {
    if (!codiceSconto.trim()) {
      setScontoApplicato(null);
      return;
    }

    if (!selectedCompanyId) {
      alert('⚠️ Seleziona prima un\'azienda');
      return;
    }

    const selectedConfig = companiesConfig.get(selectedCompanyId);
    if (!selectedConfig) return;

    const totals = companyTotals.get(selectedCompanyId);
    if (!totals) return;

    try {
      const result = await validateCodice({
        codice: codiceSconto.trim(),
        importo: totals.subtotale,
        tipoServizio,
        corsoId: String(selectedCourse.id),
      });

      if (result.valido && result.codice) {
        const percentuale =
          result.codice.tipo === 'PERCENTUALE'
            ? result.codice.valore
            : (result.codice.valore / totals.subtotale) * 100;

        setScontoApplicato({
          id: result.codice.id,
          codice: result.codice.codice,
          percentuale: Math.round(percentuale * 100) / 100,
        });
        alert(
          `✅ Codice sconto "${result.codice.codice}" applicato: ${result.codice.tipo === 'PERCENTUALE' ? `-${result.codice.valore}%` : `-€${result.codice.valore}`}`
        );
      } else {
        setScontoApplicato(null);
        alert(result.messaggio || '❌ Codice sconto non valido o scaduto');
      }
    } catch (error: any) {
      console.error('Errore validazione codice:', error);
      setScontoApplicato(null);
      alert(error.response?.data?.message || 'Errore durante la validazione');
    }
  };

  // Calculate totals per company
  const companyTotals = useMemo(() => {
    const totalsMap = new Map<string | number, {
      prezzoBase: number;
      totaleSpese: number;
      subtotale: number;
      importoSconto: number;
      imponibile: number;
      percentualeIva: number;
      importoIva: number;
      importoFinale: number;
    }>();

    companiesConfig.forEach((config, companyId) => {
      if (!config.enabled) return;

      // 1. Prezzo base (unitario × partecipanti)
      const prezzoBase = prezzoUnitario * config.numPartecipanti;

      // 2. Spese accessorie
      const totaleSpese = speseAccessorie.reduce((sum, spesa) => sum + spesa.importo, 0);

      // 3. Subtotale
      const subtotale = prezzoBase + totaleSpese;

      // 4. Sconto
      const importoSconto = scontoApplicato 
        ? (subtotale * scontoApplicato.percentuale) / 100 
        : 0;

      // 5. Imponibile (dopo sconto)
      const imponibile = subtotale - importoSconto;

      // 6. IVA (10% medico, 22% altri)
      const percentualeIva = tipoServizio === 'MEDICO_COMPETENTE' ? 10 : 22;
      const importoIva = (imponibile * percentualeIva) / 100;

      // 7. Importo finale
      const importoFinale = imponibile + importoIva;

      totalsMap.set(companyId, {
        prezzoBase,
        totaleSpese,
        subtotale,
        importoSconto,
        imponibile,
        percentualeIva,
        importoIva,
        importoFinale,
      });
    });

    return totalsMap;
  }, [companiesConfig, prezzoUnitario, speseAccessorie, scontoApplicato, tipoServizio]);

  // Get totals for selected company
  const selectedTotals = selectedCompanyId ? companyTotals.get(selectedCompanyId) : null;
  const selectedConfig = selectedCompanyId ? companiesConfig.get(selectedCompanyId) : null;

  // Generate or update preventivi
  const handleGeneratePreventivi = async () => {
    if (!scheduleId) {
      alert('❌ Salva il calendario prima di generare i preventivi');
      return;
    }

    // If editing a single preventivo, update it
    if (editingPreventivo) {
      try {
        const config = companiesConfig.get(editingPreventivo.aziendaId);
        const totals = companyTotals.get(editingPreventivo.aziendaId);
        
        if (!config || !totals) {
          alert('❌ Configurazione non valida');
          return;
        }

        // Build note with breakdown
        const courseTitle = selectedCourse.title || selectedCourse.name || 'Corso';
        const noteBreakdown = [
          `Corso: ${courseTitle}`,
          `Partecipanti: ${config.numPartecipanti}`,
          `Prezzo unitario: €${prezzoUnitario.toFixed(2)}`,
          `Prezzo base: €${totals.prezzoBase.toFixed(2)}`,
        ];

        if (speseAccessorie.length > 0) {
          noteBreakdown.push('\nSpese accessorie:');
          speseAccessorie.forEach((spesa) => {
            noteBreakdown.push(`- ${spesa.descrizione}: €${spesa.importo.toFixed(2)}`);
          });
        }

        if (scontoApplicato) {
          noteBreakdown.push(`\nSconto applicato: ${scontoApplicato.codice} (-${scontoApplicato.percentuale}%)`);
        }

        noteBreakdown.push(`\nTotale imponibile: €${totals.imponibile.toFixed(2)}`);
        noteBreakdown.push(`IVA (${totals.percentualeIva}%): €${totals.importoIva.toFixed(2)}`);
        noteBreakdown.push(`Totale finale: €${totals.importoFinale.toFixed(2)}`);

        if (note) {
          noteBreakdown.push(`\nNote aggiuntive:\n${note}`);
        }

        const updateData = {
          tipoServizio,
          prezzoTotale: totals.prezzoBase + totals.totaleSpese,
          imponibile: totals.imponibile,
          importoIva: totals.importoIva,
          importoFinale: totals.importoFinale,
          percentualeIva: totals.percentualeIva,
          note: noteBreakdown.join('\n'),
        };

        await preventiviService.update(editingPreventivo.id, updateData);

        // Apply or remove sconto
        if (scontoApplicato && scontoApplicato.codice !== editingPreventivo.scontoApplicato?.codice) {
          await applySconto(editingPreventivo.id, scontoApplicato.codice);
        } else if (!scontoApplicato && editingPreventivo.scontoApplicato) {
          await preventiviService.removeSconto(editingPreventivo.id);
        }

        alert('✅ Preventivo aggiornato con successo!');
        onPreventiviCreated([editingPreventivo.id]);
      } catch (error: any) {
        console.error('Errore aggiornamento preventivo:', error);
        alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Aggiornamento fallito'}`);
      }
      return;
    }

    // Otherwise, create new preventivi
    try {
      const preventiviCreati: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const [companyId, config] of companiesConfig.entries()) {
        if (!config.enabled || config.numPartecipanti < 1) continue;

        const company = selectedCompanies.find((c) => c.id === companyId);
        const totals = companyTotals.get(companyId);

        if (!company || !totals) continue;

        try {
          // Build note with breakdown
          const courseTitle = selectedCourse.title || selectedCourse.name || 'Corso';
          const noteBreakdown = [
            `Corso: ${courseTitle}`,
            `Partecipanti: ${config.numPartecipanti}`,
            `Prezzo unitario: €${prezzoUnitario.toFixed(2)}`,
            `Prezzo base: €${totals.prezzoBase.toFixed(2)}`,
          ];

          if (speseAccessorie.length > 0) {
            noteBreakdown.push('\nSpese accessorie:');
            speseAccessorie.forEach((spesa) => {
              noteBreakdown.push(`- ${spesa.descrizione}: €${spesa.importo.toFixed(2)}`);
            });
          }

          if (scontoApplicato) {
            noteBreakdown.push(`\nSconto applicato: ${scontoApplicato.codice} (-${scontoApplicato.percentuale}%)`);
          }

          noteBreakdown.push(`\nTotale imponibile: €${totals.imponibile.toFixed(2)}`);
          noteBreakdown.push(`IVA (${totals.percentualeIva}%): €${totals.importoIva.toFixed(2)}`);
          noteBreakdown.push(`Totale finale: €${totals.importoFinale.toFixed(2)}`);

          if (note) {
            noteBreakdown.push(`\nNote aggiuntive:\n${note}`);
          }

          const preventivoData = {
            aziendaId: String(companyId),
            corsoId: String(scheduleId),
            tipoServizio,
            prezzoTotale: totals.prezzoBase + totals.totaleSpese,
            imponibile: totals.imponibile,
            importoIva: totals.importoIva,
            importoFinale: totals.importoFinale,
            percentualeIva: totals.percentualeIva,
            note: noteBreakdown.join('\n'),
          };

          const preventivo = await createPreventivo(preventivoData);

          // Apply sconto if present
          if (preventivo?.id && scontoApplicato) {
            await applySconto(preventivo.id, scontoApplicato.codice);
          }

          if (preventivo?.id) {
            preventiviCreati.push(preventivo.id);
            successCount++;
          }
        } catch (error) {
          console.error(`Errore creazione preventivo per azienda ${companyId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(
          `✅ Generati ${successCount} preventivo/i!${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
        );
        onPreventiviCreated(preventiviCreati);
      } else {
        alert('❌ Nessun preventivo generato con successo');
      }
    } catch (error: any) {
      console.error('Errore generazione preventivi:', error);
      alert(
        `❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`
      );
    }
  };

  const getCompanyName = (company: Company): string => {
    return company.ragioneSociale || company.businessName || `Azienda ${company.id}`;
  };

  const enabledCount = Array.from(companiesConfig.values()).filter((c) => c.enabled).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingPreventivo ? 'Modifica Preventivo' : 'Genera Preventivi'}
              </h2>
              <p className="text-sm text-gray-600">
                {editingPreventivo 
                  ? `${editingPreventivo.azienda?.ragioneSociale || 'Azienda'} - €${editingPreventivo.importoFinale ? Number(editingPreventivo.importoFinale).toFixed(2) : '0.00'}`
                  : `${enabledCount} ${enabledCount === 1 ? 'azienda selezionata' : 'aziende selezionate'}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Split View */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Companies List (hidden in edit mode) */}
          {!editingPreventivo && (
            <div className="w-2/5 border-r bg-gray-50 overflow-y-auto">
              <div className="p-4 border-b bg-white">
                <h3 className="font-semibold text-gray-700 text-sm mb-1">Aziende Partecipanti</h3>
                <p className="text-xs text-gray-500">
                  Configura il numero di partecipanti per ciascuna azienda
                </p>
              </div>
              <div className="p-4 space-y-2">
              {selectedCompanies.map((company) => {
                const config = companiesConfig.get(company.id);
                const isSelected = selectedCompanyId === company.id;
                const totals = companyTotals.get(company.id);

                return (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                      }
                      ${!config?.enabled ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompanyEnabled(company.id);
                          }}
                          className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center
                            transition-colors
                            ${config?.enabled
                              ? 'bg-orange-500 border-orange-500'
                              : 'bg-white border-gray-300'
                            }
                          `}
                        >
                          {config?.enabled && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Company Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-sm text-gray-800 truncate">
                            {getCompanyName(company)}
                          </span>
                        </div>

                        {/* Participants Input */}
                        {config?.enabled && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <label className="text-xs text-gray-600">Partecipanti:</label>
                              <input
                                type="number"
                                min="1"
                                value={config.numPartecipanti}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateCompanyParticipants(
                                    company.id,
                                    parseInt(e.target.value) || 1
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 px-2 py-1 border rounded text-sm text-center"
                              />
                            </div>

                            {/* Preview Total */}
                            {totals && (
                              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                                Totale: <span className="font-semibold text-orange-600">
                                  €{totals.importoFinale.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Right Panel: Form */}
          <div className={`flex-1 overflow-y-auto ${editingPreventivo ? 'w-full' : ''}`}>
            <div className="p-6 space-y-6">
              {!selectedCompanyId && !editingPreventivo ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Seleziona un'azienda dalla lista per configurare il preventivo</p>
                </div>
              ) : (
                <>
                  {/* Selected Company Header */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-800">
                        {(() => {
                          // In edit mode, use azienda from editingPreventivo
                          if (editingPreventivo?.azienda) {
                            return editingPreventivo.azienda.ragioneSociale || `Azienda ${editingPreventivo.aziendaId}`;
                          }
                          // In create mode, find company from selectedCompanies
                          const company = selectedCompanies.find((c) => c.id === selectedCompanyId);
                          return company ? getCompanyName(company) : 'Azienda';
                        })()}
                      </h3>
                    </div>
                    {selectedConfig && (
                      <p className="text-sm text-gray-600">
                        {selectedConfig.numPartecipanti}{' '}
                        {selectedConfig.numPartecipanti === 1 ? 'partecipante' : 'partecipanti'}
                      </p>
                    )}
                  </div>

                  {/* Prezzo Unitario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Euro className="inline w-4 h-4 mr-1" />
                      Prezzo Unitario (per partecipante)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prezzoUnitario}
                      onChange={(e) => setPrezzoUnitario(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Es: 500.00"
                    />
                    {selectedConfig && (
                      <p className="text-xs text-gray-500 mt-1">
                        Prezzo base: €{prezzoUnitario.toFixed(2)} ×{' '}
                        {selectedConfig.numPartecipanti} ={' '}
                        <span className="font-semibold">
                          €{(prezzoUnitario * selectedConfig.numPartecipanti).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Tipo Servizio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Servizio (IVA)
                    </label>
                    <select
                      value={tipoServizio}
                      onChange={(e) => setTipoServizio(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="MEDICO_COMPETENTE">Medico Competente (IVA 10%)</option>
                      <option value="CORSO">Formazione (IVA 22%)</option>
                      <option value="RSPP">RSPP (IVA 22%)</option>
                      <option value="DVR">DVR (IVA 22%)</option>
                      <option value="PRIVACY">Privacy (IVA 22%)</option>
                      <option value="ALTRO">Altro (IVA 22%)</option>
                    </select>
                  </div>

                  {/* Spese Accessorie */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Spese Accessorie (condivise)
                      </label>
                      <button
                        onClick={handleAddSpesa}
                        className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Aggiungi
                      </button>
                    </div>
                    {speseAccessorie.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nessuna spesa accessoria</p>
                    ) : (
                      <div className="space-y-2">
                        {speseAccessorie.map((spesa, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={spesa.descrizione}
                              onChange={(e) =>
                                handleUpdateSpesa(index, 'descrizione', e.target.value)
                              }
                              placeholder="Descrizione"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={spesa.importo}
                              onChange={(e) =>
                                handleUpdateSpesa(index, 'importo', e.target.value)
                              }
                              placeholder="0.00"
                              className="w-28 px-3 py-2 border rounded-lg text-sm"
                            />
                            <button
                              onClick={() => handleRemoveSpesa(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Codice Sconto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="inline w-4 h-4 mr-1" />
                      Codice Sconto (opzionale)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codiceSconto}
                        onChange={(e) => setCodiceSconto(e.target.value.toUpperCase())}
                        placeholder="Es: SCONTO10"
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                      />
                      <button
                        onClick={handleValidateCodice}
                        disabled={!codiceSconto.trim() || loadingSconto}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingSconto ? 'Verifica...' : 'Applica'}
                      </button>
                    </div>
                    {scontoApplicato && (
                      <div className="mt-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                        ✅ Sconto "{scontoApplicato.codice}" applicato: -
                        {scontoApplicato.percentuale}%
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note Aggiuntive
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                      placeholder="Eventuali note o dettagli aggiuntivi..."
                    />
                  </div>

                  {/* Preview Breakdown */}
                  {selectedTotals && selectedConfig && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-lg border-2 border-orange-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-orange-600" />
                        Anteprima Calcolo
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Prezzo base ({selectedConfig.numPartecipanti} partecipanti):
                          </span>
                          <span className="font-medium">
                            €{selectedTotals.prezzoBase.toFixed(2)}
                          </span>
                        </div>
                        {selectedTotals.totaleSpese > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Spese accessorie:</span>
                            <span className="font-medium">
                              €{selectedTotals.totaleSpese.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Subtotale:</span>
                          <span className="font-medium">
                            €{selectedTotals.subtotale.toFixed(2)}
                          </span>
                        </div>
                        {selectedTotals.importoSconto > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Sconto ({scontoApplicato?.percentuale}%):</span>
                            <span className="font-medium">
                              -€{selectedTotals.importoSconto.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-700 font-medium">Imponibile:</span>
                          <span className="font-semibold">
                            €{selectedTotals.imponibile.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            IVA ({selectedTotals.percentualeIva}%):
                          </span>
                          <span className="font-medium">
                            €{selectedTotals.importoIva.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-orange-300">
                          <span className="text-gray-800 font-bold text-base">
                            TOTALE FINALE:
                          </span>
                          <span className="font-bold text-orange-600 text-lg">
                            €{selectedTotals.importoFinale.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {editingPreventivo ? (
              <span>Modalità <strong>Modifica Preventivo</strong></span>
            ) : enabledCount === 0 ? (
              <span className="text-amber-600">⚠️ Seleziona almeno un'azienda</span>
            ) : (
              <span>
                Verranno generati <strong>{enabledCount}</strong>{' '}
                {enabledCount === 1 ? 'preventivo' : 'preventivi'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleGeneratePreventivi}
              disabled={loading || (!editingPreventivo && enabledCount === 0) || !scheduleId}
              className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingPreventivo ? 'Aggiornamento...' : 'Generazione...'}
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  {editingPreventivo ? 'Aggiorna Preventivo' : 'Genera Preventivi'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreventiviModal;
