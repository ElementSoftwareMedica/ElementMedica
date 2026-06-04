/**
 * OT23 Create Modal
 * Modal per creazione nuova domanda OT23
 * 
 * @component OT23CreateModal
 * @project P44 - ElementSicurezza
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, FileText, Hash, Euro, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import ElegantSelect from '@/components/ui/ElegantSelect';

import { ot23Api, type OT23CatalogoIntervento, type OT23CreateData } from '@/services/sicurezzaApi';
import { apiGet } from '@/services/api';

interface Company {
    id: string;
    ragioneSociale: string;
    piva: string;
}

interface CompanyProfile {
    id: string;
    company: Company;
}

interface OT23CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultAnno?: number;
    preselectedCompanyProfileId?: string;
}

export default function OT23CreateModal({
    isOpen,
    onClose,
    onSuccess,
    defaultAnno,
    preselectedCompanyProfileId
}: OT23CreateModalProps) {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<OT23CreateData>({
        companyTenantProfileId: preselectedCompanyProfileId || '',
        anno: defaultAnno || new Date().getFullYear(),
        pat: '',
        codiceVoce: '',
        premioAnnuale: undefined,
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedInterventi, setSelectedInterventi] = useState<Record<string, OT23CatalogoIntervento>>({});
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const companyDropdownRef = useRef<HTMLDivElement>(null);

    // Query - Company profiles (tenant-filtered via X-Operate-Tenant-Id)
    const { data: companies, isLoading: loadingCompanies } = useQuery({
        queryKey: ['company-profiles-for-ot23', operateHeaders],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: CompanyProfile[] }>(
                '/api/v1/companies?limit=1000',
                {},
                { headers: operateHeaders }
            );
            return response.data || [];
        },
        enabled: isOpen
    });

    const { data: catalogo, isLoading: loadingCatalogo } = useQuery({
        queryKey: ['ot23-catalogo'],
        queryFn: () => ot23Api.getCatalogo(),
        enabled: isOpen
    });

    const sortedCompanies = useMemo(() => (
        [...(companies || [])].sort((a, b) =>
            (a.company?.ragioneSociale || '').localeCompare(b.company?.ragioneSociale || '', 'it')
        )
    ), [companies]);

    const filteredCompanies = useMemo(() => {
        const search = companySearch.trim().toLowerCase();
        if (!search) return sortedCompanies;
        return sortedCompanies.filter(profile =>
            (profile.company?.ragioneSociale || '').toLowerCase().includes(search) ||
            (profile.company?.piva || '').toLowerCase().includes(search)
        );
    }, [companySearch, sortedCompanies]);

    const selectedCompany = useMemo(() => (
        sortedCompanies.find(profile => profile.id === formData.companyTenantProfileId) || null
    ), [formData.companyTenantProfileId, sortedCompanies]);

    const yearOptions = useMemo(() => (
        Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
            .map(year => ({ value: String(year), label: String(year) }))
    ), []);

    useEffect(() => {
        if (selectedCompany) {
            setCompanySearch(`${selectedCompany.company.ragioneSociale}${selectedCompany.company.piva ? ` (${selectedCompany.company.piva})` : ''}`);
        }
    }, [selectedCompany]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
                setIsCompanyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: OT23CreateData) => {
            const domanda = await ot23Api.create(data, { headers: operateHeaders });
            const interventiA = Object.values(selectedInterventi).filter(i => i.sezione === 'A');
            const interventiB = Object.values(selectedInterventi).filter(i => i.sezione !== 'A');
            if (interventiA.length || interventiB.length) {
                return ot23Api.update(domanda.id, { interventiA, interventiB }, { headers: operateHeaders });
            }
            return domanda;
        },
        onSuccess: async (domanda) => {
            showToast({ type: 'success', message: 'Domanda OT23 creata con successo' });
            queryClient.invalidateQueries({ queryKey: ['ot23'] });
            if (domanda?.id) {
                try {
                    await ot23Api.downloadXml(domanda.id, `OT23_${formData.anno}_${formData.pat || 'domanda'}.xml`);
                } catch {
                    showToast({ type: 'warning', message: 'Domanda creata; XML scaricabile dal dettaglio' });
                }
            }
            onSuccess();
        },
        onError: (error: Error) => {
            if (error.message.includes('già esistente')) {
                setErrors({ anno: 'Domanda già esistente per questo anno' });
            } else {
                showToast({ type: 'error', message: 'Errore creazione' });
            }
        }
    });

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.companyTenantProfileId) {
            newErrors.companyTenantProfileId = 'Seleziona un\'azienda';
        }
        if (!formData.anno || formData.anno < 2000 || formData.anno > 2100) {
            newErrors.anno = 'Anno non valido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (field: keyof OT23CreateData, value: string | number | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const toggleIntervento = (intervento: OT23CatalogoIntervento) => {
        setSelectedInterventi(prev => {
            const next = { ...prev };
            if (next[intervento.codice]) {
                delete next[intervento.codice];
            } else {
                next[intervento.codice] = intervento;
            }
            return next;
        });
    };

    const selectedValues = Object.values(selectedInterventi);
    const selectedA = selectedValues.filter(i => i.sezione === 'A').length;
    const selectedBF = selectedValues.filter(i => i.sezione !== 'A').length;
    const hasOt23Requirement = selectedA >= 1 || selectedBF >= 2;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Nuova Domanda OT23
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Azienda */}
                    <div ref={companyDropdownRef} className="relative">
                        <Label className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4" />
                            Azienda *
                        </Label>
                        <Input
                            value={companySearch}
                            onChange={(event) => {
                                setCompanySearch(event.target.value);
                                setIsCompanyDropdownOpen(true);
                                if (!event.target.value) handleChange('companyTenantProfileId', '');
                            }}
                            onFocus={() => !preselectedCompanyProfileId && setIsCompanyDropdownOpen(true)}
                            placeholder={loadingCompanies ? 'Caricamento aziende...' : 'Cerca azienda per nome o P.IVA...'}
                            disabled={loadingCompanies || !!preselectedCompanyProfileId}
                            className={errors.companyTenantProfileId ? 'border-red-500' : ''}
                        />
                        {isCompanyDropdownOpen && !preselectedCompanyProfileId && (
                            <div className="absolute z-[10000] mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                {filteredCompanies.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500">Nessuna azienda trovata</div>
                                ) : filteredCompanies.map(profile => (
                                    <button
                                        key={profile.id}
                                        type="button"
                                        onClick={() => {
                                            handleChange('companyTenantProfileId', profile.id);
                                            setCompanySearch(`${profile.company.ragioneSociale}${profile.company.piva ? ` (${profile.company.piva})` : ''}`);
                                            setIsCompanyDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 ${profile.id === formData.companyTenantProfileId ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}
                                    >
                                        <span className="block truncate">{profile.company.ragioneSociale}</span>
                                        {profile.company.piva && <span className="block text-xs text-gray-400">P.IVA {profile.company.piva}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {errors.companyTenantProfileId && (
                            <p className="text-red-500 text-sm mt-1">{errors.companyTenantProfileId}</p>
                        )}
                    </div>

                    {/* Anno */}
                    <div>
                        <Label className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" />
                            Anno di riferimento *
                        </Label>
                        <ElegantSelect
                            value={String(formData.anno)}
                            onChange={(value) => handleChange('anno', Number(value))}
                            options={yearOptions}
                            triggerClassName={errors.anno ? 'border-red-500' : ''}
                        />
                        {errors.anno && (
                            <p className="text-red-500 text-sm mt-1">{errors.anno}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            La domanda presentata nell'anno X dà diritto alla riduzione per l'anno X+1
                        </p>
                    </div>

                    {/* PAT */}
                    <div>
                        <Label className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4" />
                            PAT (Posizione Assicurativa Territoriale)
                        </Label>
                        <Input
                            value={formData.pat || ''}
                            onChange={(e) => handleChange('pat', e.target.value)}
                            placeholder="Es: 12345678/01"
                            maxLength={20}
                        />
                    </div>

                    {/* Codice Voce */}
                    <div>
                        <Label className="mb-2">Codice Voce Tariffa</Label>
                        <Input
                            value={formData.codiceVoce || ''}
                            onChange={(e) => handleChange('codiceVoce', e.target.value)}
                            placeholder="Es: 0711"
                            maxLength={10}
                        />
                    </div>

                    {/* Premio Annuale */}
                    <div>
                        <Label className="flex items-center gap-2 mb-2">
                            <Euro className="w-4 h-4" />
                            Premio Annuale INAIL (€)
                        </Label>
                        <Input
                            type="number"
                            value={formData.premioAnnuale || ''}
                            onChange={(e) => handleChange('premioAnnuale', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Es: 5000"
                            step="0.01"
                            min="0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Necessario per calcolare il risparmio stimato
                        </p>
                    </div>

                    {/* Interventi OT23 */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <Label className="mb-1 block">Interventi OT23 {catalogo?.annoModello || new Date().getFullYear()}</Label>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {catalogo?.regolaAmmissibilita || 'Seleziona gli interventi realizzati per comporre il file XML.'}
                                </p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${hasOt23Requirement ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {hasOt23Requirement ? 'Requisito raggiunto' : `${selectedA} A · ${selectedBF} B-F`}
                            </div>
                        </div>

                        {loadingCatalogo ? (
                            <div className="mt-4 flex items-center gap-2 text-sm text-blue-700">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Caricamento catalogo...
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {(catalogo?.sezioni || []).map(section => (
                                    <div key={section.codice} className="rounded-xl border border-white/80 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                        <div className="mb-2 flex items-start gap-2">
                                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                                {section.codice}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{section.titolo}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{section.requisito}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {section.interventi.map(intervento => {
                                                const checked = Boolean(selectedInterventi[intervento.codice]);
                                                return (
                                                    <label key={intervento.codice} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${checked ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleIntervento(intervento)}
                                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block font-semibold text-gray-800 dark:text-gray-100">{intervento.codice} · {intervento.descrizione}</span>
                                                            {!!intervento.documentazione?.length && (
                                                                <span className="mt-1 block text-[11px] text-gray-500">
                                                                    Doc.: {intervento.documentazione.slice(0, 2).join(', ')}{intervento.documentazione.length > 2 ? '...' : ''}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {checked && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <Label className="mb-2">Note</Label>
                        <Textarea
                            value={formData.note || ''}
                            onChange={(e) => handleChange('note', e.target.value)}
                            placeholder="Note aggiuntive..."
                            rows={3}
                        />
                    </div>

                    {/* Info box */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-medium">Prossimi passi</p>
                            <p className="mt-1">
                                Verrà generato un XML strutturato con gli interventi selezionati.
                                L'invio ufficiale resta tramite servizio telematico INAIL.
                            </p>
                        </div>
                    </div>
                </form>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {createMutation.isPending ? 'Creazione...' : 'Crea Domanda'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
