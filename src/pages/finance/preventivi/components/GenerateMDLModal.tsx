/**
 * GenerateMDLModal - Wizard Preventivo MDL
 * 
 * Modal per generazione automatica preventivi Medicina del Lavoro
 * basati su protocolli sanitari aziendali.
 * 
 * Flusso wizard:
 * 1. Selezione azienda con autocomplete
 * 2. Selezione sedi da includere
 * 3. Preview prestazioni aggregate
 * 4. Conferma e generazione
 * 
 * @project P58 - Feature Completion
 * @module pages/finance/preventivi/components
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Building2,
    MapPin,
    FileText,
    Check,
    AlertCircle,
    Search,
    Euro,
    Users,
    ChevronRight,
    ChevronLeft,
    Stethoscope,
    Loader2
} from 'lucide-react';
import { Button } from '@/design-system/atoms/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/design-system/atoms/Badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost } from '@/services/api';
import { useTenantMode } from '@/contexts/TenantModeContext';

// Types
interface Sede {
    id: string;
    siteName: string;
    citta: string | null;
    mansioniCount: number;
    lavoratoriCount: number;
}

interface Azienda {
    id: string;
    company: {
        id: string;
        ragioneSociale: string;
        piva: string;
    };
    sites: Sede[];
    totaleManzioni: number;
    totaleLavoratori: number;
}

interface PrestazioneAggregate {
    prestazioneId: string;
    codice: string;
    descrizione: string;
    categoria: string;
    quantita: number;
    prezzoUnitario: number;
    prezzoTotale: number;
    aliquotaIva: number;
    obbligatoria: boolean;
}

interface Preview {
    azienda: {
        id: string;
        ragioneSociale: string;
        piva: string;
    };
    sedi: Array<{
        siteId: string;
        siteName: string;
        citta: string;
        totaleLavoratoriSede: number;
    }>;
    numLavoratori: number;
    prestazioniAggregate: PrestazioneAggregate[];
    scontoApplicato: {
        percentuale: number;
        descrizione: string;
    } | null;
    totali: {
        prezzoTotale: number;
        scontoTotale: number;
        imponibile: number;
        iva: number;
        importoFinale: number;
    };
}

interface GenerateMDLModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (preventivo: { id: string; numero: number }) => void;
}

// Step Configuration
const STEPS = [
    { id: 1, title: 'Seleziona Azienda', icon: Building2 },
    { id: 2, title: 'Seleziona Sedi', icon: MapPin },
    { id: 3, title: 'Anteprima', icon: FileText },
    { id: 4, title: 'Conferma', icon: Check }
];

export const GenerateMDLModal: React.FC<GenerateMDLModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Azienda
    const [searchQuery, setSearchQuery] = useState('');
    const [aziende, setAziende] = useState<Azienda[]>([]);
    const [loadingAziende, setLoadingAziende] = useState(false);
    const [selectedAzienda, setSelectedAzienda] = useState<Azienda | null>(null);

    // Step 2: Sedi
    const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);

    // Step 3: Preview
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setCurrentStep(1);
            setSearchQuery('');
            setAziende([]);
            setSelectedAzienda(null);
            setSelectedSiteIds([]);
            setPreview(null);
        }
    }, [isOpen]);

    // Fetch aziende
    const fetchAziende = useCallback(async (query: string) => {
        setLoadingAziende(true);
        try {
            const response = await apiGet<{ success: boolean; data: { aziende: Azienda[] } }>(
                `/api/v1/preventivi/mdl/aziende?search=${encodeURIComponent(query)}&limit=20`
            );
            if (response?.success) {
                setAziende(response.data.aziende);
            }
        } catch (error) {
        } finally {
            setLoadingAziende(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAziende(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchAziende]);

    // Auto-select all sites when azienda changes
    useEffect(() => {
        if (selectedAzienda) {
            setSelectedSiteIds(selectedAzienda.sites.map(s => s.id));
        }
    }, [selectedAzienda]);

    // Fetch preview when sedi are selected
    const fetchPreview = useCallback(async () => {
        if (!selectedAzienda || selectedSiteIds.length === 0) return;

        setLoadingPreview(true);
        try {
            const siteIdsParam = selectedSiteIds.join(',');
            const response = await apiGet<{ success: boolean; data: Preview }>(
                `/api/v1/preventivi/mdl/preview?companyTenantProfileId=${selectedAzienda.id}&siteIds=${siteIdsParam}`
            );
            if (response?.success) {
                setPreview(response.data);
            }
        } catch (error) {
            showToast({
                message: 'Errore nel calcolo dell\'anteprima',
                type: 'error'
            });
        } finally {
            setLoadingPreview(false);
        }
    }, [selectedAzienda, selectedSiteIds, showToast]);

    // Handle step navigation
    const goToStep = (step: number) => {
        if (step === 3) {
            fetchPreview();
        }
        setCurrentStep(step);
    };

    const canProceed = useMemo(() => {
        switch (currentStep) {
            case 1:
                return selectedAzienda !== null;
            case 2:
                return selectedSiteIds.length > 0;
            case 3:
                return preview !== null && preview.prestazioniAggregate.length > 0;
            default:
                return true;
        }
    }, [currentStep, selectedAzienda, selectedSiteIds, preview]);

    // Generate preventivo
    const handleGenerate = async () => {
        if (!selectedAzienda || !preview) return;

        setLoading(true);
        try {
            const response = await apiPost<{
                success: boolean;
                data: { preventivo: { id: string; numero: number } };
            }>('/api/v1/preventivi/mdl/generate', {
                companyTenantProfileId: selectedAzienda.id,
                siteIds: selectedSiteIds,
                validitaGiorni: 30
            }, { headers: operateHeaders });

            if (response?.success) {
                showToast({
                    message: `Preventivo n. ${response.data.preventivo.numero} generato con successo`,
                    type: 'success'
                });
                onSuccess(response.data.preventivo);
                onClose();
            }
        } catch (error: unknown) {
            const errorMessage = 'Errore nella generazione del preventivo';
            showToast({
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Toggle site selection
    const toggleSite = (siteId: string) => {
        setSelectedSiteIds(prev =>
            prev.includes(siteId)
                ? prev.filter(id => id !== siteId)
                : [...prev, siteId]
        );
    };

    const selectAllSites = () => {
        if (selectedAzienda) {
            setSelectedSiteIds(selectedAzienda.sites.map(s => s.id));
        }
    };

    const deselectAllSites = () => {
        setSelectedSiteIds([]);
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-teal-600" />
                        Genera Preventivo MDL
                    </DialogTitle>
                    <DialogDescription>
                        Genera automaticamente un preventivo basato sui protocolli sanitari dell'azienda
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-teal-600 text-white' : ''}
                      ${isActive ? 'bg-teal-100 text-teal-600 ring-2 ring-teal-600' : ''}
                      ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <span
                                        className={`text-sm font-medium hidden sm:inline ${isActive ? 'text-teal-600' : 'text-gray-500'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                                        <div
                                            className={`h-full bg-teal-600 transition-all ${currentStep > step.id ? 'w-full' : 'w-0'
                                                }`}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto py-4 min-h-[400px]">
                    {/* Step 1: Selezione Azienda */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cerca azienda per ragione sociale o P.IVA..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            {loadingAziende && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                </div>
                            )}

                            {!loadingAziende && aziende.length === 0 && searchQuery && (
                                <div className="text-center py-8 text-gray-500">
                                    Nessuna azienda trovata per "{searchQuery}"
                                </div>
                            )}

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {aziende.map((azienda) => (
                                    <div
                                        key={azienda.id}
                                        onClick={() => setSelectedAzienda(azienda)}
                                        className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedAzienda?.id === azienda.id
                                                ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-gray-200 hover:border-teal-300 dark:border-gray-700'
                                            }
                    `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {azienda.company.ragioneSociale}
                                                </h4>
                                                <p className="text-sm text-gray-500">
                                                    P.IVA: {azienda.company.piva}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {azienda.sites.length} sedi
                                                </Badge>
                                                <Badge variant="secondary">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {azienda.totaleLavoratori} lav.
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedAzienda && (
                                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200">
                                    <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                        <Check className="w-4 h-4" />
                                        <span className="font-medium">Selezionata: {selectedAzienda.company.ragioneSociale}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Selezione Sedi */}
                    {currentStep === 2 && selectedAzienda && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Seleziona le sedi da includere nel preventivo
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllSites}>
                                        Seleziona tutte
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={deselectAllSites}>
                                        Deseleziona tutte
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {selectedAzienda.sites.map((site) => {
                                    const isSelected = selectedSiteIds.includes(site.id);
                                    return (
                                        <div
                                            key={site.id}
                                            onClick={() => toggleSite(site.id)}
                                            className={`
                        p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-4
                        ${isSelected
                                                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                                    : 'border-gray-200 hover:border-teal-300 dark:border-gray-700'
                                                }
                      `}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSite(site.id)}
                                            />
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {site.siteName}
                                                </h4>
                                                {site.citta && (
                                                    <p className="text-sm text-gray-500">{site.citta}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>{site.mansioniCount} mansioni</span>
                                                <span>{site.lavoratoriCount} lavoratori</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedSiteIds.length === 0 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <span className="text-amber-700 dark:text-amber-300">
                                        Seleziona almeno una sede per continuare
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {loadingPreview && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                                    <span className="ml-2 text-gray-500">Calcolo prestazioni in corso...</span>
                                </div>
                            )}

                            {!loadingPreview && preview && (
                                <>
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-500">Sedi incluse</p>
                                            <p className="text-xl font-bold">{preview.sedi.length}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-500">Lavoratori</p>
                                            <p className="text-xl font-bold">{preview.numLavoratori}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-500">Prestazioni</p>
                                            <p className="text-xl font-bold">{preview.prestazioniAggregate.length}</p>
                                        </div>
                                    </div>

                                    {/* Prestazioni List */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Prestazione</th>
                                                    <th className="px-4 py-2 text-center">Quantità</th>
                                                    <th className="px-4 py-2 text-right">Prezzo Unit.</th>
                                                    <th className="px-4 py-2 text-right">Totale</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.prestazioniAggregate.map((prest, idx) => (
                                                    <tr
                                                        key={prest.prestazioneId}
                                                        className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
                                                    >
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs text-gray-400">{prest.codice}</span>
                                                                <span>{prest.descrizione}</span>
                                                                {prest.obbligatoria && (
                                                                    <Badge variant="default" className="text-xs">Obbl.</Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">{prest.quantita}</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(prest.prezzoUnitario)}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(prest.prezzoTotale)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotale</span>
                                            <span>{formatCurrency(preview.totali.prezzoTotale)}</span>
                                        </div>
                                        {preview.scontoApplicato && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Sconto ({preview.scontoApplicato.percentuale}%)</span>
                                                <span>-{formatCurrency(preview.totali.scontoTotale)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span>Imponibile</span>
                                            <span>{formatCurrency(preview.totali.imponibile)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>IVA</span>
                                            <span>{formatCurrency(preview.totali.iva)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                            <span>Totale</span>
                                            <span className="text-teal-600">{formatCurrency(preview.totali.importoFinale)}</span>
                                        </div>
                                    </div>

                                    {preview.prestazioniAggregate.length === 0 && (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-600" />
                                            <span className="text-amber-700 dark:text-amber-300">
                                                Nessuna prestazione trovata. Verificare che le mansioni abbiano rischi e protocolli configurati.
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 4: Conferma */}
                    {currentStep === 4 && preview && (
                        <div className="space-y-6">
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-teal-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Riepilogo Preventivo</h3>
                                <p className="text-gray-500">Verifica i dati prima di generare il preventivo</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Azienda</h4>
                                    <p className="font-medium">{preview.azienda.ragioneSociale}</p>
                                    <p className="text-sm text-gray-500">P.IVA: {preview.azienda.piva}</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Sedi</h4>
                                    <p className="font-medium">{preview.sedi.length} sedi selezionate</p>
                                    <p className="text-sm text-gray-500">{preview.numLavoratori} lavoratori totali</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Prestazioni</h4>
                                    <p className="font-medium">{preview.prestazioniAggregate.length} voci</p>
                                    <p className="text-sm text-gray-500">Validità: 30 giorni</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-teal-50 dark:bg-teal-900/20">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Importo Totale</h4>
                                    <p className="text-2xl font-bold text-teal-600">
                                        {formatCurrency(preview.totali.importoFinale)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
                        disabled={loading}
                    >
                        {currentStep === 1 ? (
                            'Annulla'
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Indietro
                            </>
                        )}
                    </Button>

                    {currentStep < 4 ? (
                        <Button
                            onClick={() => goToStep(currentStep + 1)}
                            disabled={!canProceed}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            Avanti
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generazione...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Genera Preventivo
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GenerateMDLModal;
