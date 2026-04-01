/**
 * MovimentoContabileForm
 * 
 * P59 - Form per creazione e modifica movimenti contabili
 * 
 * Features:
 * - Validazione client-side
 * - Calcolo automatico IVA e importo netto
 * - Selezione soggetto (persona/azienda)
 * - Collegamento a attività sorgente
 * - Gestione compensi professionisti
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Calculator,
    Building2,
    User,
    Calendar,
    Euro,
    FileText,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
    useMovimentoContabile,
    useCreateMovimento,
    useUpdateMovimento,
} from '../../../hooks/management/useMovimentiContabili';
import type {
    CreateMovimentoInput,
    UpdateMovimentoInput,
    DirezioneMovimento,
    StatoMovimento,
    TipoAttivitaMovimento,
    TipoSoggettoMovimento,
    TipoCompensoMedico,
    BranchType,
} from '../../../services/movimentiContabiliService';

// ============================================
// CONSTANTS
// ============================================

const DIREZIONE_OPTIONS = [
    { value: 'ENTRATA', label: 'Entrata (Ricavo)' },
    { value: 'USCITA', label: 'Uscita (Costo)' },
];

const STATO_OPTIONS = [
    { value: 'BOZZA', label: 'Bozza' },
    { value: 'CONFERMATO', label: 'Confermato' },
    { value: 'FATTURATO', label: 'Fatturato' },
    { value: 'PAGATO', label: 'Pagato' },
];

const TIPO_ATTIVITA_OPTIONS = [
    // Clinica
    { value: 'VISITA_MEDICA', label: 'Visita Medica', group: 'Clinica' },
    { value: 'VISITA_SPECIALISTICA', label: 'Visita Specialistica', group: 'Clinica' },
    { value: 'ESAME_DIAGNOSTICO', label: 'Esame Diagnostico', group: 'Clinica' },
    // Medicina del Lavoro
    { value: 'GIUDIZIO_IDONEITA', label: 'Giudizio Idoneità', group: 'Medicina Lavoro' },
    { value: 'ALLEGATO_3B', label: 'Allegato 3B', group: 'Medicina Lavoro' },
    { value: 'DVR', label: 'DVR', group: 'Medicina Lavoro' },
    { value: 'SOPRALLUOGO', label: 'Sopralluogo', group: 'Medicina Lavoro' },
    { value: 'NOMINA_RUOLO', label: 'Nomina Ruolo', group: 'Medicina Lavoro' },
    // Formazione
    { value: 'CORSO_FORMAZIONE', label: 'Corso Formazione', group: 'Formazione' },
    { value: 'CORSO_AGGIORNAMENTO', label: 'Corso Aggiornamento', group: 'Formazione' },
    // Altro
    { value: 'BUNDLE_PACCHETTO', label: 'Bundle/Pacchetto', group: 'Altro' },
    { value: 'PREVENTIVO', label: 'Preventivo', group: 'Altro' },
    { value: 'CONSULENZA', label: 'Consulenza', group: 'Altro' },
    { value: 'ALTRO', label: 'Altro', group: 'Altro' },
];

const TIPO_SOGGETTO_OPTIONS = [
    { value: 'PAZIENTE', label: 'Paziente' },
    { value: 'AZIENDA', label: 'Azienda' },
    { value: 'MEDICO_COLLABORATORE', label: 'Medico Collaboratore' },
    { value: 'FORNITORE', label: 'Fornitore' },
    { value: 'SEDE', label: 'Sede' },
];

const TIPO_COMPENSO_OPTIONS = [
    { value: '', label: 'Nessun compenso' },
    { value: 'PERCENTUALE_VISITA', label: 'Percentuale su visita' },
    { value: 'FISSO_VISITA', label: 'Fisso per visita' },
    { value: 'FISSO_MENSILE', label: 'Fisso mensile' },
    { value: 'PERCENTUALE_FATTURATO', label: 'Percentuale su fatturato' },
];

const BRANCH_OPTIONS = [
    { value: 'MEDICA', label: 'Clinica Medica' },
    { value: 'FORMAZIONE', label: 'Formazione' },
];

const ALIQUOTE_IVA = [
    { value: '22', label: '22%' },
    { value: '10', label: '10%' },
    { value: '4', label: '4%' },
    { value: '0', label: 'Esente' },
];

// ============================================
// FORM INTERFACE
// ============================================

interface FormData {
    direzione: DirezioneMovimento;
    tipo: TipoAttivitaMovimento;
    tipoSoggetto: TipoSoggettoMovimento;
    stato: StatoMovimento;
    importoLordo: string;
    aliquotaIva: string;
    importoIva: string;
    importoNetto: string;
    dataEsecuzione: string;
    dataScadenza: string;
    descrizione: string;
    note: string;
    branch_type: BranchType;
    // Compensi
    compensoTipo: TipoCompensoMedico | '';
    compensoValore: string;
    // IDs (opzionali per collegamento)
    personId: string;
    companyTenantProfileId: string;
}

const initialFormData: FormData = {
    direzione: 'ENTRATA',
    tipo: 'VISITA_MEDICA',
    tipoSoggetto: 'PAZIENTE',
    stato: 'BOZZA',
    importoLordo: '',
    aliquotaIva: '22',
    importoIva: '',
    importoNetto: '',
    dataEsecuzione: new Date().toISOString().split('T')[0],
    dataScadenza: '',
    descrizione: '',
    note: '',
    branch_type: 'MEDICA',
    compensoTipo: '',
    compensoValore: '',
    personId: '',
    companyTenantProfileId: '',
};

// ============================================
// MAIN COMPONENT
// ============================================

const MovimentoContabileForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();
    const { isReady } = useTenantFilter();

    const isEdit = Boolean(id);
    const pageTitle = isEdit ? 'Modifica Movimento' : 'Nuovo Movimento';

    // State
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Queries and Mutations
    const { data: existingMovimento, isLoading: isLoadingMovimento } = useMovimentoContabile(
        id,
        undefined,
        { enabled: isEdit }
    );
    const createMutation = useCreateMovimento();
    const updateMutation = useUpdateMovimento();

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Populate form data when editing
    useEffect(() => {
        if (existingMovimento && isEdit) {
            setFormData({
                direzione: existingMovimento.direzione,
                tipo: existingMovimento.tipo,
                tipoSoggetto: existingMovimento.tipoSoggetto,
                stato: existingMovimento.stato,
                importoLordo: String(existingMovimento.importoLordo || ''),
                aliquotaIva: String(existingMovimento.aliquotaIva || '22'),
                importoIva: String(existingMovimento.importoIva || ''),
                importoNetto: String(existingMovimento.importoNetto || ''),
                dataEsecuzione: existingMovimento.dataEsecuzione?.split('T')[0] || '',
                dataScadenza: existingMovimento.dataScadenza?.split('T')[0] || '',
                descrizione: existingMovimento.descrizione || '',
                note: existingMovimento.note || '',
                branch_type: existingMovimento.branch_type,
                compensoTipo: existingMovimento.compensoTipo || '',
                compensoValore: String(existingMovimento.compensoValore || ''),
                personId: existingMovimento.personId || '',
                companyTenantProfileId: existingMovimento.companyTenantProfileId || '',
            });
        }
    }, [existingMovimento, isEdit]);

    // Auto-calculate IVA and importo netto
    const calculateAmounts = useCallback((lordo: string, aliquota: string) => {
        const importoLordo = parseFloat(lordo) || 0;
        const iva = parseFloat(aliquota) || 0;

        if (importoLordo > 0) {
            const importoNetto = importoLordo / (1 + iva / 100);
            const importoIva = importoLordo - importoNetto;

            return {
                importoNetto: importoNetto.toFixed(2),
                importoIva: importoIva.toFixed(2),
            };
        }
        return { importoNetto: '', importoIva: '' };
    }, []);

    // Handle input changes
    const handleChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setIsDirty(true);
        setErrors(prev => ({ ...prev, [name]: '' }));

        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate when importoLordo or aliquotaIva changes
            if (name === 'importoLordo' || name === 'aliquotaIva') {
                const { importoNetto, importoIva } = calculateAmounts(
                    name === 'importoLordo' ? value : prev.importoLordo,
                    name === 'aliquotaIva' ? value : prev.aliquotaIva
                );
                updated.importoNetto = importoNetto;
                updated.importoIva = importoIva;
            }

            // Auto-set branch based on tipo
            if (name === 'tipo') {
                const formazione = ['CORSO_FORMAZIONE', 'CORSO_AGGIORNAMENTO'];
                updated.branch_type = formazione.includes(value) ? 'FORMAZIONE' : 'MEDICA';
            }

            return updated;
        });
    }, [calculateAmounts]);

    // Validate form
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.direzione) {
            newErrors.direzione = 'Direzione obbligatoria';
        }
        if (!formData.tipo) {
            newErrors.tipo = 'Tipo attività obbligatorio';
        }
        if (!formData.tipoSoggetto) {
            newErrors.tipoSoggetto = 'Tipo soggetto obbligatorio';
        }
        if (!formData.importoLordo || parseFloat(formData.importoLordo) <= 0) {
            newErrors.importoLordo = 'Importo lordo obbligatorio e positivo';
        }
        if (!formData.dataEsecuzione) {
            newErrors.dataEsecuzione = 'Data esecuzione obbligatoria';
        }

        // Validate compenso if tipo is set
        if (formData.compensoTipo && !formData.compensoValore) {
            newErrors.compensoValore = 'Valore compenso obbligatorio se tipo compenso selezionato';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast({ message: 'Correggi gli errori nel form', type: 'error' });
            return;
        }

        const payload: CreateMovimentoInput = {
            direzione: formData.direzione,
            tipo: formData.tipo,
            tipoSoggetto: formData.tipoSoggetto,
            stato: formData.stato,
            importoLordo: parseFloat(formData.importoLordo),
            importoNetto: parseFloat(formData.importoNetto),
            aliquotaIva: parseFloat(formData.aliquotaIva),
            importoIva: parseFloat(formData.importoIva),
            dataEsecuzione: formData.dataEsecuzione,
            descrizione: formData.descrizione || undefined,
            note: formData.note || undefined,
            branch_type: formData.branch_type,
            ...(formData.dataScadenza && { dataScadenza: formData.dataScadenza }),
            ...(formData.compensoTipo && { compensoTipo: formData.compensoTipo as TipoCompensoMedico }),
            ...(formData.compensoValore && { compensoValore: parseFloat(formData.compensoValore) }),
            ...(formData.personId && { personId: formData.personId }),
            ...(formData.companyTenantProfileId && { companyTenantProfileId: formData.companyTenantProfileId }),
        };

        try {
            if (isEdit && id) {
                await updateMutation.mutateAsync({ id, data: payload as UpdateMovimentoInput });
                showToast({ message: 'Movimento aggiornato con successo', type: 'success' });
            } else {
                await createMutation.mutateAsync(payload);
                showToast({ message: 'Movimento creato con successo', type: 'success' });
            }
            navigate('/management/movimenti-contabili');
        } catch (error) {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        }
    };

    // Cancel handler with confirmation if dirty
    const handleCancel = async () => {
        if (isDirty) {
            const confirmed = await confirm({
                title: 'Modifiche non salvate',
                message: 'Ci sono modifiche non salvate. Vuoi abbandonare?',
                confirmLabel: 'Abbandona',
                cancelLabel: 'Continua a modificare',
            });
            if (!confirmed) return;
        }
        navigate('/management/movimenti-contabili');
    };

    // Show loading if fetching existing movimento
    if (isEdit && isLoadingMovimento) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={handleCancel}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Indietro
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                        <p className="text-gray-500">
                            {isEdit ? 'Modifica i dati del movimento' : 'Inserisci i dati del nuovo movimento'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Classificazione */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-teal-600" />
                            Classificazione
                        </CardTitle>
                        <CardDescription>Tipo e direzione del movimento</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Direzione */}
                        <div className="space-y-2">
                            <Label htmlFor="direzione" required>Direzione</Label>
                            <Select
                                id="direzione"
                                name="direzione"
                                value={formData.direzione}
                                onChange={handleChange}
                                options={DIREZIONE_OPTIONS}
                                className={errors.direzione ? 'border-red-500' : ''}
                            />
                            {errors.direzione && (
                                <p className="text-sm text-red-500">{errors.direzione}</p>
                            )}
                        </div>

                        {/* Tipo Attività */}
                        <div className="space-y-2">
                            <Label htmlFor="tipo" required>Tipo Attività</Label>
                            <Select
                                id="tipo"
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                                options={TIPO_ATTIVITA_OPTIONS}
                                className={errors.tipo ? 'border-red-500' : ''}
                            />
                            {errors.tipo && (
                                <p className="text-sm text-red-500">{errors.tipo}</p>
                            )}
                        </div>

                        {/* Stato */}
                        <div className="space-y-2">
                            <Label htmlFor="stato">Stato</Label>
                            <Select
                                id="stato"
                                name="stato"
                                value={formData.stato}
                                onChange={handleChange}
                                options={STATO_OPTIONS}
                            />
                        </div>

                        {/* Branch Type */}
                        <div className="space-y-2">
                            <Label htmlFor="branch_type">Branch</Label>
                            <Select
                                id="branch_type"
                                name="branch_type"
                                value={formData.branch_type}
                                onChange={handleChange}
                                options={BRANCH_OPTIONS}
                            />
                        </div>

                        {/* Tipo Soggetto */}
                        <div className="space-y-2">
                            <Label htmlFor="tipoSoggetto" required>Tipo Soggetto</Label>
                            <Select
                                id="tipoSoggetto"
                                name="tipoSoggetto"
                                value={formData.tipoSoggetto}
                                onChange={handleChange}
                                options={TIPO_SOGGETTO_OPTIONS}
                                className={errors.tipoSoggetto ? 'border-red-500' : ''}
                            />
                            {errors.tipoSoggetto && (
                                <p className="text-sm text-red-500">{errors.tipoSoggetto}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Importi */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Euro className="w-5 h-5 mr-2 text-green-600" />
                            Importi
                        </CardTitle>
                        <CardDescription>Importi e calcolo IVA automatico</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Importo Lordo */}
                        <div className="space-y-2">
                            <Label htmlFor="importoLordo" required>Importo Lordo (€)</Label>
                            <Input
                                id="importoLordo"
                                name="importoLordo"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.importoLordo}
                                onChange={handleChange}
                                placeholder="0.00"
                                className={errors.importoLordo ? 'border-red-500' : ''}
                            />
                            {errors.importoLordo && (
                                <p className="text-sm text-red-500">{errors.importoLordo}</p>
                            )}
                        </div>

                        {/* Aliquota IVA */}
                        <div className="space-y-2">
                            <Label htmlFor="aliquotaIva">Aliquota IVA</Label>
                            <Select
                                id="aliquotaIva"
                                name="aliquotaIva"
                                value={formData.aliquotaIva}
                                onChange={handleChange}
                                options={ALIQUOTE_IVA}
                            />
                        </div>

                        {/* Importo IVA (calcolato) */}
                        <div className="space-y-2">
                            <Label>IVA (€)</Label>
                            <Input
                                value={formData.importoIva}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>

                        {/* Importo Netto (calcolato) */}
                        <div className="space-y-2">
                            <Label>Imponibile (€)</Label>
                            <Input
                                value={formData.importoNetto}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Date */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                            Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Data Esecuzione */}
                        <div className="space-y-2">
                            <Label htmlFor="dataEsecuzione" required>Data Esecuzione</Label>
                            <DatePickerElegante
                                value={formData.dataEsecuzione}
                                onChange={(date) => handleChange({ target: { name: 'dataEsecuzione', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                                theme="blue"
                            />
                            {errors.dataEsecuzione && (
                                <p className="text-sm text-red-500">{errors.dataEsecuzione}</p>
                            )}
                        </div>

                        {/* Data Scadenza */}
                        <div className="space-y-2">
                            <Label htmlFor="dataScadenza">Data Scadenza Pagamento</Label>
                            <DatePickerElegante
                                value={formData.dataScadenza}
                                onChange={(date) => handleChange({ target: { name: 'dataScadenza', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                                theme="blue"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Compenso Professionista (solo per USCITA) */}
                {formData.direzione === 'USCITA' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <User className="w-5 h-5 mr-2 text-purple-600" />
                                Compenso Professionista
                            </CardTitle>
                            <CardDescription>Per pagamenti a medici, formatori, collaboratori</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tipo Compenso */}
                            <div className="space-y-2">
                                <Label htmlFor="compensoTipo">Tipo Compenso</Label>
                                <Select
                                    id="compensoTipo"
                                    name="compensoTipo"
                                    value={formData.compensoTipo}
                                    onChange={handleChange}
                                    options={TIPO_COMPENSO_OPTIONS}
                                />
                            </div>

                            {/* Valore Compenso */}
                            <div className="space-y-2">
                                <Label htmlFor="compensoValore">
                                    {formData.compensoTipo?.includes('PERCENTUALE') ? 'Percentuale (%)' : 'Valore (€)'}
                                </Label>
                                <Input
                                    id="compensoValore"
                                    name="compensoValore"
                                    type="number"
                                    step={formData.compensoTipo?.includes('PERCENTUALE') ? '1' : '0.01'}
                                    min="0"
                                    value={formData.compensoValore}
                                    onChange={handleChange}
                                    placeholder={formData.compensoTipo?.includes('PERCENTUALE') ? '30' : '100.00'}
                                    className={errors.compensoValore ? 'border-red-500' : ''}
                                />
                                {errors.compensoValore && (
                                    <p className="text-sm text-red-500">{errors.compensoValore}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Descrizione e Note */}
                <Card>
                    <CardHeader>
                        <CardTitle>Descrizione</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Descrizione */}
                        <div className="space-y-2">
                            <Label htmlFor="descrizione">Descrizione</Label>
                            <Input
                                id="descrizione"
                                name="descrizione"
                                value={formData.descrizione}
                                onChange={handleChange}
                                placeholder="Descrizione del movimento..."
                            />
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <Label htmlFor="note">Note Interne</Label>
                            <textarea
                                id="note"
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Note aggiuntive..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Annulla
                    </Button>
                    <CRUDPrimaryButton
                        operation={isEdit ? 'update' : 'create'}
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {isEdit ? 'Salva Modifiche' : 'Crea Movimento'}
                            </>
                        )}
                    </CRUDPrimaryButton>
                </div>
            </form>
        </div>
    );
};

export default MovimentoContabileForm;
