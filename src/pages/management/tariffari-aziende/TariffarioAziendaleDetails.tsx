/**
 * TariffarioAziendaleDetails
 * 
 * Pagina di sola visualizzazione per un Tariffario Aziendale.
 * Mostra tutte le informazioni del tariffario senza possibilità di modifica.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Printer,
  Copy,
  FileText,
  Euro,
  Users,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system/molecules/Card';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
  tariffariAziendaliApi,
  TariffarioAziendale,
  VoceTariffario,
  TariffarioDerivato,
  TIPO_VOCE_LABELS,
  FREQUENZA_LABELS,
  UNITA_CALCOLO_LABELS,
  CATEGORIA_VISITA_LABELS,
  CategoriaVisitaMDL,
  formatFasciaDipendenti,
  getVoceDisplayName
} from '../../../services/tariffarioAziendaleApi';

const TariffarioAziendaleDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

  const [loading, setLoading] = useState(true);
  const [tariffario, setTariffario] = useState<TariffarioAziendale | null>(null);
  const [printing, setPrinting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [expandedVoci, setExpandedVoci] = useState<Set<string>>(new Set());

  // Carica tariffario - usa tenantFilterKey per stabilità
  useEffect(() => {
    if (!id || !isReady) return;

    const loadTariffario = async () => {
      try {
        setLoading(true);
        const response = await tariffariAziendaliApi.getById(id, getTenantFilterParams());
        if (response.success && response.data) {
          setTariffario(response.data);
        } else {
          showToast({ message: 'Tariffario non trovato', type: 'error' });
          navigate('/poliambulatorio/mdl/tariffari-aziende');
        }
      } catch (error) {
        showToast({ message: 'Errore nel caricamento', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadTariffario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isReady, tenantFilterKey]);

  // Stampa PDF
  const handlePrint = async () => {
    if (!id) return;
    try {
      setPrinting(true);
      await tariffariAziendaliApi.downloadPDF(id, getTenantFilterParams());
    } catch (error) {
      showToast({ message: 'Errore nella generazione del PDF', type: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  // Clona tariffario
  const handleClone = async () => {
    if (!id) return;
    try {
      setCloning(true);
      const response = await tariffariAziendaliApi.clonaTariffario(id);
      if (response.success) {
        showToast({ message: response.message || 'Tariffario clonato con successo', type: 'success' });
        navigate(`/poliambulatorio/mdl/tariffari-aziende/${response.data.id}`);
      }
    } catch (error) {
      showToast({ message: 'Errore nella clonazione del tariffario', type: 'error' });
    } finally {
      setCloning(false);
    }
  };

  // Toggle attivo/non attivo
  const handleToggleAttivo = async () => {
    if (!id || !tariffario) return;
    try {
      setToggling(true);
      const response = await tariffariAziendaliApi.update(id, { attivo: !tariffario.attivo });
      if (response.success && response.data) {
        setTariffario(prev => prev ? { ...prev, attivo: response.data.attivo } : prev);
        showToast({
          message: response.data.attivo ? 'Tariffario attivato' : 'Tariffario disattivato',
          type: 'success'
        });
      }
    } catch (error) {
      showToast({ message: 'Errore nel cambio di stato', type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  // Toggle espansione voce
  const toggleVoce = (voceId: string) => {
    setExpandedVoci(prev => {
      const next = new Set(prev);
      if (next.has(voceId)) {
        next.delete(voceId);
      } else {
        next.add(voceId);
      }
      return next;
    });
  };

  // Inline IVA edit handler
  const handleIvaChange = async (voceId: string, newIva: number) => {
    if (!id || !tariffario) return;
    try {
      await tariffariAziendaliApi.updateVoce(id, voceId, { ivaAliquota: newIva });
      setTariffario(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          voci: prev.voci?.map(v => v.id === voceId ? { ...v, ivaAliquota: newIva } : v)
        };
      });
      showToast({ message: 'IVA aggiornata', type: 'success' });
    } catch {
      showToast({ message: 'Errore nell\'aggiornamento dell\'IVA', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tariffario) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Tariffario non trovato</p>
        <Button variant="ghost" onClick={() => navigate('/poliambulatorio/mdl/tariffari-aziende')}>
          Torna alla lista
        </Button>
      </div>
    );
  }

  const voci = tariffario.voci || [];

  // Calcola statistiche
  const stats = {
    totaleVoci: voci.length,
    prestazioni: voci.filter(v => v.tipo === 'PRESTAZIONE').length,
    speseFisse: voci.filter(v => v.tipo === 'SPESA_FISSA').length,
    speseRicorrenti: voci.filter(v => v.tipo === 'SPESA_RICORRENTE').length,
    conFasce: voci.filter(v => v.usaFasceDipendenti).length,
    totalePrezziBase: voci.reduce((sum, v) => sum + Number(v.prezzoBase || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/poliambulatorio/mdl/tariffari-aziende')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tariffario.nome}</h1>
              <Badge variant={tariffario.attivo ? 'default' : 'secondary'}>
                {tariffario.attivo ? 'Attivo' : 'Non attivo'}
              </Badge>
              {/* P59 Sprint 11: Mostra numero aziende associate invece del tipo */}
              {tariffario.companyAssociations && tariffario.companyAssociations.length > 0 && (
                <Badge variant="outline">
                  {tariffario.companyAssociations.length} {tariffario.companyAssociations.length === 1 ? 'azienda' : 'aziende'}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Codice: {tariffario.codice}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer className="h-4 w-4 mr-2" />
            {printing ? 'Generazione...' : 'Stampa PDF'}
          </Button>
          <Button variant="outline" onClick={handleClone} disabled={cloning}>
            <Copy className="h-4 w-4 mr-2" />
            {cloning ? 'Clonazione...' : 'Clona'}
          </Button>
          <Button onClick={() => navigate(`/poliambulatorio/mdl/tariffari-aziende/${id}/modifica`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info generali */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informazioni Generali
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {tariffario.descrizione && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Descrizione</span>
                  <p className="mt-1 text-gray-900 dark:text-gray-50">{tariffario.descrizione}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Validità</span>
                <p className="mt-1 flex items-center gap-2 text-gray-900 dark:text-gray-50">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  {tariffario.validoDa ? new Date(tariffario.validoDa).toLocaleDateString('it-IT') : '-'}
                  {tariffario.validoA && (
                    <>
                      <span className="text-gray-400 dark:text-gray-500">→</span>
                      {new Date(tariffario.validoA).toLocaleDateString('it-IT')}
                    </>
                  )}
                </p>
              </div>
              {tariffario.convenzione && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Convenzione</span>
                  <p className="mt-1 text-gray-900 dark:text-gray-50">{tariffario.convenzione.nome}</p>
                </div>
              )}
              {tariffario.note && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Note</span>
                  <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{tariffario.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voci tariffario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Voci Tariffario ({voci.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {voci.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nessuna voce presente nel tariffario
                </p>
              ) : (
                <div className="space-y-5">
                  {(() => {
                    // Categorie allineate all'ordine delle card del PDF:
                    // 1) Prestazioni MDL  2) Consulenza e Sicurezza  3) Spese Accessorie
                    const CATS: { key: string; title: string; tipi: string[] }[] = [
                      { key: 'mdl', title: 'Prestazioni Medicina del Lavoro', tipi: ['PRESTAZIONE', 'QUESTIONARIO'] },
                      {
                        key: 'sic', title: 'Consulenza e Sicurezza',
                        tipi: ['CONSULENZA', 'NOMINA_MC', 'NOMINA_RSPP', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP',
                          'DVR_NUOVO', 'DVR_AGGIORNAMENTO_CON_MODIFICHE', 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'],
                      },
                      { key: 'spese', title: 'Spese Accessorie', tipi: ['SPESA_FISSA', 'SPESA_RICORRENTE', 'USCITA_MC'] },
                    ];
                    const catOf = (t: string) => CATS.find(c => c.tipi.includes(t))?.key || 'spese';

                    // Rende una lista di voci applicando il raggruppamento VML + DVR
                    const renderVociList = (list: VoceTariffario[]) => {
                      const vmlGroups = new Map<string, VoceTariffario[]>();
                      const seenVMLGroups = new Set<string>();
                      const dvrVoci: VoceTariffario[] = [];
                      let dvrGroupSeen = false;

                      list.forEach(voce => {
                        if (
                          voce.tipo === 'PRESTAZIONE' &&
                          voce.categoriaVisita &&
                          voce.prestazione?.tipo === 'VISITA_MEDICINA_LAVORO' &&
                          voce.prestazioneId
                        ) {
                          if (!vmlGroups.has(voce.prestazioneId)) vmlGroups.set(voce.prestazioneId, []);
                          vmlGroups.get(voce.prestazioneId)!.push(voce);
                        }
                        if (voce.tipo.startsWith('DVR_')) dvrVoci.push(voce);
                      });

                      return list.flatMap(voce => {
                        if (voce.tipo.startsWith('DVR_')) {
                          if (dvrGroupSeen) return [];
                          dvrGroupSeen = true;
                          return [
                            <DVRGroupDetailCard
                              key="dvr-group"
                              groupVoci={dvrVoci}
                              expanded={expandedVoci.has('dvr-group')}
                              onToggle={() => toggleVoce('dvr-group')}
                              onIvaChange={handleIvaChange}
                            />
                          ];
                        }

                        const isVisitaMDL =
                          voce.tipo === 'PRESTAZIONE' &&
                          !!voce.categoriaVisita &&
                          voce.prestazione?.tipo === 'VISITA_MEDICINA_LAVORO';

                        if (isVisitaMDL && voce.prestazioneId) {
                          if (seenVMLGroups.has(voce.prestazioneId)) return [];
                          seenVMLGroups.add(voce.prestazioneId);
                          const group = vmlGroups.get(voce.prestazioneId)!;
                          return [
                            <VisitaMDLGroupDetailCard
                              key={`group-${voce.prestazioneId}`}
                              groupKey={voce.prestazioneId}
                              prestazioneName={voce.prestazione?.nome || 'Visita Medica del Lavoro'}
                              groupVoci={group}
                              expanded={expandedVoci.has(`group-${voce.prestazioneId}`)}
                              onToggle={() => toggleVoce(`group-${voce.prestazioneId}`)}
                              onIvaChange={handleIvaChange}
                            />
                          ];
                        }

                        return [
                          <VoceDetailCard
                            key={voce.id}
                            voce={voce}
                            expanded={expandedVoci.has(voce.id)}
                            onToggle={() => toggleVoce(voce.id)}
                            onIvaChange={handleIvaChange}
                          />
                        ];
                      });
                    };

                    return CATS.map(cat => {
                      const catVoci = voci.filter(v => catOf(v.tipo) === cat.key);
                      if (catVoci.length === 0) return null;
                      return (
                        <div key={cat.key} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            <span>{cat.title}</span>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span>{catVoci.length}</span>
                          </div>
                          {renderVociList(catVoci)}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Riepilogo */}
        <div className="space-y-6">
          {/* Card Riepilogo */}
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stato */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Stato</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    {tariffario.attivo ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 font-medium">Attivo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-medium">Non attivo</span>
                      </>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAttivo}
                    disabled={toggling}
                    className="h-7 text-xs"
                  >
                    {toggling ? '...' : tariffario.attivo ? 'Disattiva' : 'Attiva'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-50 mb-3">Composizione</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Totale voci</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{stats.totaleVoci}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Prestazioni</span>
                    <span className="text-gray-900 dark:text-gray-50">{stats.prestazioni}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Spese una tantum</span>
                    <span className="text-gray-900 dark:text-gray-50">{stats.speseFisse}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Spese ricorrenti</span>
                    <span className="text-gray-900 dark:text-gray-50">{stats.speseRicorrenti}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Con fasce dipendenti</span>
                    <span className="text-gray-900 dark:text-gray-50">{stats.conFasce}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-50 mb-3">Totali</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Somma prezzi base</span>
                    <span className="font-semibold text-lg text-gray-900 dark:text-gray-50">
                      € {stats.totalePrezziBase.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats per tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dettaglio per Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(
                voci.reduce((acc, v) => {
                  const tipo = TIPO_VOCE_LABELS[v.tipo] || v.tipo;
                  if (!acc[tipo]) {
                    acc[tipo] = { count: 0, total: 0 };
                  }
                  acc[tipo].count++;
                  acc[tipo].total += Number(v.prezzoBase || 0);
                  return acc;
                }, {} as Record<string, { count: number; total: number }>)
              ).map(([tipo, data]) => (
                <div key={tipo} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <span className="text-sm text-gray-900 dark:text-gray-50">{tipo}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({data.count})</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-50">€ {data.total.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* P59 Sprint 11: Card Aziende Associate (M2M) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                Aziende Associate
                {tariffario.companyAssociations && tariffario.companyAssociations.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {tariffario.companyAssociations.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!tariffario.companyAssociations || tariffario.companyAssociations.length === 0) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nessuna azienda associata a questo tariffario
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tariffario.companyAssociations.map((assoc: {
                    id: string;
                    validoDa: string;
                    validoA?: string | null;
                    attivo: boolean;
                    companyTenantProfile?: {
                      id: string;
                      company?: {
                        id: string;
                        ragioneSociale: string;
                      };
                    };
                  }) => {
                    const company = assoc.companyTenantProfile?.company;
                    const isExpired = assoc.validoA && new Date(assoc.validoA) < new Date();
                    return (
                      <Link
                        key={assoc.id}
                        to={`/companies/${assoc.companyTenantProfile?.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium truncate block text-gray-900 dark:text-gray-50">
                              {company?.ragioneSociale || 'Azienda non trovata'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              dal {new Date(assoc.validoDa).toLocaleDateString('it-IT')}
                              {assoc.validoA && ` al ${new Date(assoc.validoA).toLocaleDateString('it-IT')}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpired && (
                            <Badge variant="secondary" className="text-xs">Scaduto</Badge>
                          )}
                          <ExternalLink className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Componente per visualizzare una singola voce
interface VoceDetailCardProps {
  voce: VoceTariffario;
  expanded: boolean;
  onToggle: () => void;
  onIvaChange?: (voceId: string, newIva: number) => void;
}

// ==================================================================
// VisitaMDLGroupDetailCard — compact read-only grouped card per
// le voci VISITA_MEDICINA_LAVORO che condividono la stessa prestazione
// ==================================================================
interface VisitaMDLGroupDetailCardProps {
  groupKey: string;
  prestazioneName: string;
  groupVoci: VoceTariffario[];
  expanded: boolean;
  onToggle: () => void;
  onIvaChange?: (voceId: string, newIva: number) => void;
}

// Tutte le 10 categorie visita MDL — D.Lgs 81/08 art. 41 + D.Lgs 19/2022
const VISITA_MDL_CATEGORIES_ORDER: CategoriaVisitaMDL[] = [
  'PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'PERIODICA', 'CAMBIO_MANSIONE',
  'CESSAZIONE_RAPPORTO', 'PRECEDENTE_ASSENZA', 'SU_RICHIESTA_LAVORATORE',
  'STRAORDINARIA', 'VERIFICA_IDONEITA', 'RIENTRO_MATERNITA'
];

const DVR_TIPO_LABELS: Record<string, string> = {
  DVR_NUOVO: 'Nuovo DVR',
  DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Aggiornamento con modifiche',
  DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Aggiornamento senza modifiche',
};
const DVR_TIPO_ORDER = ['DVR_NUOVO', 'DVR_AGGIORNAMENTO_CON_MODIFICHE', 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'];

// ==================================================================
// DVRGroupDetailCard — read-only grouped card for DVR_* voci
// ==================================================================
interface DVRGroupDetailCardProps {
  groupVoci: VoceTariffario[];
  expanded: boolean;
  onToggle: () => void;
  onIvaChange?: (voceId: string, newIva: number) => void;
}

const DVRGroupDetailCard: React.FC<DVRGroupDetailCardProps> = ({ groupVoci, expanded, onToggle, onIvaChange }) => {
  return (
    <div className="border border-orange-200 dark:border-orange-700 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-50">DVR – Documento Valutazione Rischi</span>
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-300">DVR</Badge>
            <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100 border-0">
              {groupVoci.length} {groupVoci.length === 1 ? 'tipologia' : 'tipologie'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
            {DVR_TIPO_ORDER.filter(t => groupVoci.some(v => v.tipo === t)).map(t => {
              const voce = groupVoci.find(v => v.tipo === t)!;
              return (
                <span key={t} className="flex items-center gap-0.5">
                  <span className="text-orange-600 dark:text-orange-400">{DVR_TIPO_LABELS[t]}:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200"> €{Number(voce.prezzoBase).toFixed(2)}</span>
                </span>
              );
            })}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-orange-200 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-200 dark:border-orange-700 text-left bg-orange-100/50 dark:bg-orange-800/30">
                <th className="p-2 font-medium text-gray-700 dark:text-gray-300">Tipologia DVR (Art. 17 D.Lgs 81/08)</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Prezzo</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">IVA</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Frequenza</th>
              </tr>
            </thead>
            <tbody>
              {DVR_TIPO_ORDER.filter(t => groupVoci.some(v => v.tipo === t)).map(t => {
                const voce = groupVoci.find(v => v.tipo === t)!;
                return (
                  <tr key={t} className="border-b border-orange-100 dark:border-orange-800/40 last:border-0 hover:bg-orange-50 dark:hover:bg-orange-900/10">
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-50">{DVR_TIPO_LABELS[t]}</td>
                    <td className="p-2 text-right font-semibold text-orange-700 dark:text-orange-300">€ {Number(voce.prezzoBase).toFixed(2)}</td>
                    <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                      <select
                        value={voce.ivaAliquota}
                        onChange={e => onIvaChange?.(voce.id, Number(e.target.value))}
                        className="bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded px-1 py-0.5 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-400"
                        onClick={e => e.stopPropagation()}
                      >
                        {[0, 4, 5, 10, 22].map(rate => (
                          <option key={rate} value={rate}>{rate}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-right text-gray-600 dark:text-gray-400">{FREQUENZA_LABELS[voce.frequenza]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const VisitaMDLGroupDetailCard: React.FC<VisitaMDLGroupDetailCardProps> = ({
  prestazioneName, groupVoci, expanded, onToggle, onIvaChange
}) => {
  return (
    <div className="border border-teal-200 dark:border-teal-700 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-50">{prestazioneName}</span>
            <Badge variant="outline" className="text-xs">Prestazione</Badge>
            <Badge className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100 border-0">
              {groupVoci.length} {groupVoci.length === 1 ? 'categoria' : 'categorie'} visita
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
            {VISITA_MDL_CATEGORIES_ORDER
              .filter(cat => groupVoci.some(v => v.categoriaVisita === cat))
              .map(cat => {
                const voce = groupVoci.find(v => v.categoriaVisita === cat)!;
                return (
                  <span key={cat} className="flex items-center gap-0.5">
                    <span className="text-teal-600 dark:text-teal-400">{CATEGORIA_VISITA_LABELS[cat]}:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200"> €{Number(voce.prezzoBase).toFixed(2)}</span>
                  </span>
                );
              })}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-teal-200 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-200 dark:border-teal-700 text-left bg-teal-100/50 dark:bg-teal-800/30">
                <th className="p-2 font-medium text-gray-700 dark:text-gray-300">Categoria Visita</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Prezzo</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">IVA</th>
                <th className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Frequenza</th>
              </tr>
            </thead>
            <tbody>
              {VISITA_MDL_CATEGORIES_ORDER
                .filter(cat => groupVoci.some(v => v.categoriaVisita === cat))
                .map(cat => {
                  const voce = groupVoci.find(v => v.categoriaVisita === cat)!;
                  return (
                    <tr key={cat} className="border-b border-teal-100 dark:border-teal-800/40 last:border-0 hover:bg-teal-50 dark:hover:bg-teal-900/10">
                      <td className="p-2 font-medium text-gray-900 dark:text-gray-50">{CATEGORIA_VISITA_LABELS[cat]}</td>
                      <td className="p-2 text-right font-semibold text-teal-700 dark:text-teal-300">€ {Number(voce.prezzoBase).toFixed(2)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                        <select
                          value={voce.ivaAliquota}
                          onChange={e => onIvaChange?.(voce.id, Number(e.target.value))}
                          className="bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded px-1 py-0.5 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400"
                          onClick={e => e.stopPropagation()}
                        >
                          {[0, 4, 5, 10, 22].map(rate => (
                            <option key={rate} value={rate}>{rate}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">{FREQUENZA_LABELS[voce.frequenza]}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {groupVoci[0]?.descrizione && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{groupVoci[0].descrizione}</p>
          )}
        </div>
      )}
    </div>
  );
};

const VoceDetailCard: React.FC<VoceDetailCardProps> = ({ voce, expanded, onToggle, onIvaChange }) => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-50">{getVoceDisplayName(voce)}</span>
              <Badge variant="outline" className="text-xs">
                {TIPO_VOCE_LABELS[voce.tipo]}
              </Badge>
              {/* Categoria visita MDL: first visit vs periodic */}
              {voce.categoriaVisita && CATEGORIA_VISITA_LABELS[voce.categoriaVisita] && (
                <Badge variant="secondary" className="text-xs">
                  {CATEGORIA_VISITA_LABELS[voce.categoriaVisita]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {voce.tipo === 'CONSULENZA' ? `${Number(voce.prezzoBase).toFixed(2)}/ora` : Number(voce.prezzoBase).toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {FREQUENZA_LABELS[voce.frequenza]}
              </span>
              {voce.tipo === 'CONSULENZA' && voce.durataMinimaMinuti && (
                <span className="flex items-center gap-1 text-violet-600">
                  <Clock className="h-3 w-3" />
                  min {voce.durataMinimaMinuti} min — €{(Number(voce.prezzoBase) * voce.durataMinimaMinuti / 60).toFixed(2)}
                </span>
              )}
              {voce.usaFasceDipendenti && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Users className="h-3 w-3" />
                  {voce.fasceDipendenti?.length || 0} fasce
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-3">
          {/* CONSULENZA: dettagli tariffazione oraria */}
          {voce.tipo === 'CONSULENZA' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-violet-50 dark:bg-violet-900/20 rounded p-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tariffa oraria</span>
                <p className="font-medium text-violet-800 dark:text-violet-200">€{Number(voce.prezzoBase).toFixed(2)}/ora</p>
              </div>
              {voce.durataMinimaMinuti && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Frazione minima</span>
                  <p className="font-medium text-violet-800 dark:text-violet-200">{voce.durataMinimaMinuti} min</p>
                </div>
              )}
              {voce.durataMinimaMinuti && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Prezzo frazione</span>
                  <p className="font-medium text-violet-800 dark:text-violet-200">€{(Number(voce.prezzoBase) * voce.durataMinimaMinuti / 60).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Unità calcolo</span>
              <p className="font-medium text-gray-900 dark:text-gray-50">{UNITA_CALCOLO_LABELS[voce.unitaCalcolo]}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">IVA</span>
              <select
                value={voce.ivaAliquota}
                onChange={e => onIvaChange?.(voce.id, Number(e.target.value))}
                className="mt-0.5 block w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded px-1 py-0.5 text-sm font-medium text-gray-900 dark:text-gray-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                onClick={e => e.stopPropagation()}
              >
                {[0, 4, 5, 10, 22].map(rate => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
            {voce.descrizione && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Descrizione</span>
                <p className="text-gray-900 dark:text-gray-50">{voce.descrizione}</p>
              </div>
            )}
          </div>

          {/* Fasce dipendenti */}
          {voce.usaFasceDipendenti && voce.fasceDipendenti && voce.fasceDipendenti.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fasce Dipendenti</h5>
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                      <th className="text-left p-2 text-gray-900 dark:text-gray-50">Fascia</th>
                      <th className="text-right p-2 text-gray-900 dark:text-gray-50">Prezzo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voce.fasceDipendenti.map((fascia, idx) => (
                      <tr key={fascia.id || idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <td className="p-2 text-gray-900 dark:text-gray-50">{formatFasciaDipendenti(fascia.minDipendenti, fascia.maxDipendenti)}</td>
                        <td className="p-2 text-right font-medium text-gray-900 dark:text-gray-50">€ {Number(fascia.prezzo).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TariffarioAziendaleDetails;
