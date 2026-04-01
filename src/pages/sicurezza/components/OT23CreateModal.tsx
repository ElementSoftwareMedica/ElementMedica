/**
 * OT23 Create Modal
 * Modal per creazione nuova domanda OT23
 * 
 * @component OT23CreateModal
 * @project P44 - ElementSicurezza
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, FileText, Hash, Euro, AlertCircle } from 'lucide-react';

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

import { ot23Api, type OT23CreateData } from '@/services/sicurezzaApi';
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

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: OT23CreateData) => ot23Api.create(data, { headers: operateHeaders }),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Domanda OT23 creata con successo' });
            queryClient.invalidateQueries({ queryKey: ['ot23'] });
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

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Nuova Domanda OT23
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Azienda */}
                    <div>
                        <Label className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4" />
                            Azienda *
                        </Label>
                        <select
                            value={formData.companyTenantProfileId}
                            onChange={(e) => handleChange('companyTenantProfileId', e.target.value)}
                            className={`w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-50 ${errors.companyTenantProfileId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                            disabled={loadingCompanies || !!preselectedCompanyProfileId}
                        >
                            <option value="">Seleziona azienda...</option>
                            {companies?.map((profile: CompanyProfile) => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.company.ragioneSociale} ({profile.company.piva})
                                </option>
                            ))}
                        </select>
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
                        <select
                            value={formData.anno}
                            onChange={(e) => handleChange('anno', Number(e.target.value))}
                            className={`w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-50 ${errors.anno ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
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
                                Dopo la creazione potrai aggiungere gli interventi di prevenzione
                                per raggiungere i 100 punti necessari.
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
