/**
 * MessagingConfigPage - Pagina Configurazione Messaggistica
 * 
 * Permette ai tenant di configurare:
 * - Server SMTP per email (dominio proprio)
 * - Integrazione WhatsApp Business API
 * - Configurazione PEC per comunicazioni certificate
 * 
 * @module pages/settings/MessagingConfigPage
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Mail, MessageCircle, Settings, CheckCircle2, XCircle, AlertCircle,
    Send, Eye, EyeOff, RefreshCw, Trash2, TestTube, Server, Lock, Globe, Shield,
    Route, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CRUDPrimaryButton, CRUDDeleteButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';
import { clinicaApi, PecConfig, PecConfigInput, PecProviderInfo, PecConfigStatus, PecProvider } from '@/services/clinicaApi';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTenantAccess } from '@/hooks/useTenantAccess';

// ============================================
// TYPES
// ============================================

interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password?: string;
    fromEmail: string;
    fromName: string;
    enabled: boolean;
    hasPassword?: boolean;
}

/**
 * WhatsApp Configuration
 * Le credenziali Twilio (accessToken, businessAccountId) sono gestite centralmente.
 * I tenant possono solo configurare il loro numero di telefono WhatsApp.
 */
interface WhatsAppConfig {
    phoneNumberId: string;  // ID del numero WhatsApp del tenant (opzionale)
    enabled: boolean;       // Abilita/disabilita WhatsApp per questo branch
}

interface MessagingStatus {
    smtp: {
        configured: boolean;
        enabled: boolean;
        ready: boolean;
        lastTest?: string;
        lastError?: string;
    };
    whatsapp: {
        configured: boolean;
        enabled: boolean;
        ready: boolean;
        lastTest?: string;
        lastError?: string;
    };
    pec?: {
        configured: boolean;
        enabled: boolean;
        ready: boolean;
    };
}

// ============================================
// BRANCH OPTIONS (must be before RoutingConfig)
// ============================================

type BranchType = 'FORMAZIONE' | 'CLINICA' | 'default' | 'DISABLED';

const BRANCH_OPTIONS: { value: BranchType; label: string; description: string }[] = [
    { value: 'FORMAZIONE', label: 'ElementSicurezza', description: 'Formazione sicurezza sul lavoro' },
    { value: 'CLINICA', label: 'ElementMedica', description: 'Poliambulatorio medicina del lavoro' },
    { value: 'default', label: 'Default (Tutti)', description: 'Configurazione condivisa per tutti i branch' },
    { value: 'DISABLED', label: 'Non usare', description: 'Disabilita questo canale per questa tipologia' }
];

// ============================================
// COMMUNICATION TYPES & ROUTING
// ============================================

type CommunicationType =
    // Formazione
    | 'INVOICES_COURSES'
    | 'CERTIFICATES'
    | 'COURSES_RSPP'
    // Clinica
    | 'MEDICAL_REPORTS'
    | 'APPOINTMENTS'
    | 'INSPECTIONS'
    | 'NOMINATIONS'
    // Commerciale
    | 'QUOTES'
    | 'COMPANY_TARIFFS'
    // Trasversali
    | 'CREDENTIALS'
    | 'MARKETING'
    | 'PROMOTIONAL'
    | 'GENERAL';

interface RoutingConfig {
    smtpBranch: BranchType;
    whatsappBranch: BranchType;
    smsBranch: BranchType;
    pecEnabled: boolean;
}

type MessagingRouting = Record<CommunicationType, RoutingConfig>;

const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, { label: string; description: string; icon: string; category: string }> = {
    // === FORMAZIONE ===
    INVOICES_COURSES: {
        label: 'Fatture Corsi',
        description: 'Email per fatture e preventivi formazione',
        icon: '📄',
        category: 'Formazione'
    },
    CERTIFICATES: {
        label: 'Attestati',
        description: 'Invio attestati di formazione',
        icon: '🎓',
        category: 'Formazione'
    },
    COURSES_RSPP: {
        label: 'Corsi RSPP/Sicurezza',
        description: 'Comunicazioni relative ai corsi di sicurezza',
        icon: '🛡️',
        category: 'Formazione'
    },
    // === CLINICA ===
    MEDICAL_REPORTS: {
        label: 'Referti Medici',
        description: 'Comunicazioni mediche e referti visite',
        icon: '🏥',
        category: 'Clinica'
    },
    APPOINTMENTS: {
        label: 'Appuntamenti',
        description: 'Promemoria e conferme appuntamenti',
        icon: '📅',
        category: 'Clinica'
    },
    INSPECTIONS: {
        label: 'Sopralluoghi',
        description: 'Comunicazioni per sopralluoghi aziendali',
        icon: '🏢',
        category: 'Clinica'
    },
    NOMINATIONS: {
        label: 'Nomine',
        description: 'Nomine medico competente, RSPP, etc.',
        icon: '📋',
        category: 'Clinica'
    },
    // === COMMERCIALE ===
    QUOTES: {
        label: 'Preventivi',
        description: 'Preventivi per corsi e visite mediche',
        icon: '💰',
        category: 'Commerciale'
    },
    COMPANY_TARIFFS: {
        label: 'Tariffari Aziendali',
        description: 'Invio tariffari personalizzati alle aziende',
        icon: '📊',
        category: 'Commerciale'
    },
    // === TRASVERSALI ===
    CREDENTIALS: {
        label: 'Credenziali',
        description: 'Invio credenziali di accesso',
        icon: '🔐',
        category: 'Sistema'
    },
    MARKETING: {
        label: 'Marketing',
        description: 'Newsletter, comunicazioni brand, aggiornamenti servizi',
        icon: '📣',
        category: 'Marketing'
    },
    PROMOTIONAL: {
        label: 'Promozionali',
        description: 'Offerte speciali, sconti, promozioni a tempo limitato',
        icon: '🎁',
        category: 'Marketing'
    },
    GENERAL: {
        label: 'Generiche',
        description: 'Comunicazioni generiche (default)',
        icon: '✉️',
        category: 'Sistema'
    }
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

const StatusBadge: React.FC<{ configured: boolean; enabled: boolean; ready: boolean }> = ({
    configured, enabled, ready
}) => {
    if (ready) {
        return (
            <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Pronta
            </Badge>
        );
    }
    if (configured && !enabled) {
        return (
            <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Disabilitata
            </Badge>
        );
    }
    if (configured && !ready) {
        return (
            <Badge className="bg-yellow-500 hover:bg-yellow-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Incompleta
            </Badge>
        );
    }
    return (
        <Badge variant="outline">
            <Settings className="w-3 h-3 mr-1" />
            Non configurata
        </Badge>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const MessagingConfigPage: React.FC = () => {

    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const { user } = useAuth();
    const { hasFeature } = useTenantAccess();

    // Feature-based tab visibility
    const isGlobalAdmin = user?.globalRole === 'ADMIN' || user?.globalRole === 'SUPER_ADMIN' ||
        (user?.roles as string[] | undefined)?.includes('ADMIN') ||
        (user?.roles as string[] | undefined)?.includes('SUPER_ADMIN');
    const showWhatsapp = isGlobalAdmin || hasFeature('WHATSAPP_INTEGRATION');
    const showPec = isGlobalAdmin || hasFeature('PEC_INTEGRATION');
    const showRouting = isGlobalAdmin || showWhatsapp || showPec;
    const visibleTabCount = 1 + (showWhatsapp ? 1 : 0) + (showPec ? 1 : 0) + (showRouting ? 1 : 0);
    const tabGridClass = visibleTabCount === 4 ? 'grid-cols-4' : visibleTabCount === 3 ? 'grid-cols-3' : visibleTabCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

    // Branch selection state
    const [selectedBranch, setSelectedBranch] = useState<BranchType>('default');

    // SMTP Form state
    const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
        host: '',
        port: 587,
        secure: true,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        enabled: false
    });
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [smtpTestEmail, setSmtpTestEmail] = useState('');
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);

    // WhatsApp Form state
    // Le credenziali Twilio sono gestite centralmente
    // I tenant possono configurare solo il loro phoneNumberId
    const [whatsappForm, setWhatsappForm] = useState<WhatsAppConfig>({
        phoneNumberId: '',
        enabled: false
    });
    const [whatsappTestNumber, setWhatsappTestNumber] = useState('');
    const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);

    // PEC Form state
    const [pecForm, setPecForm] = useState<PecConfigInput>({
        provider: 'ARUBA' as PecProvider,
        host: '',
        port: 465,
        secure: true,
        pecAddress: '',
        password: '',
        senderName: 'ElementMedica - Medicina del Lavoro',
        enabled: false,
        testMode: false,
        testRecipient: ''
    });
    const [showPecPassword, setShowPecPassword] = useState(false);
    const [pecTestRecipient, setPecTestRecipient] = useState('');
    const [isTestingPec, setIsTestingPec] = useState(false);

    // Queries - include selectedBranch in queryKey for refetch on branch change
    const { data: smtpConfig, isLoading: loadingSmtp } = useQuery({
        queryKey: ['messaging-config-smtp', selectedBranch],
        queryFn: async () => {
            try {
                const response = await api.get('/api/v1/messaging/smtp/config', {
                    params: { branchType: selectedBranch }
                });
                return response.data.data as SmtpConfig;
            } catch {
                return null;
            }
        }
    });

    const { data: whatsappConfig, isLoading: loadingWhatsapp } = useQuery({
        queryKey: ['messaging-config-whatsapp', selectedBranch],
        queryFn: async () => {
            try {
                const response = await api.get('/api/v1/messaging/whatsapp/config', {
                    params: { branchType: selectedBranch }
                });
                return response.data.data as WhatsAppConfig;
            } catch {
                return null;
            }
        }
    });

    const { data: status, isLoading: loadingStatus } = useQuery({
        queryKey: ['messaging-config-status', selectedBranch],
        queryFn: async () => {
            try {
                const response = await api.get('/api/v1/messaging/status', {
                    params: { branchType: selectedBranch }
                });
                return response.data.data as MessagingStatus;
            } catch {
                return {
                    smtp: { configured: false, enabled: false, ready: false },
                    whatsapp: { configured: false, enabled: false, ready: false },
                    pec: { configured: false, enabled: false, ready: false }
                };
            }
        }
    });

    // PEC Queries
    const { data: pecProviders = [], isLoading: loadingPecProviders } = useQuery({
        queryKey: ['pec-config-providers'],
        queryFn: () => clinicaApi.pecConfig.getProviders()
    });

    const { data: pecConfig, isLoading: loadingPec } = useQuery({
        queryKey: ['pec-config'],
        queryFn: () => clinicaApi.pecConfig.getConfig()
    });

    const { data: pecStatus } = useQuery({
        queryKey: ['pec-config-status'],
        queryFn: () => clinicaApi.pecConfig.getStatus()
    });

    // Messaging Routing Query
    const { data: messagingRouting, isLoading: loadingRouting, isSuccess: routingLoaded } = useQuery({
        queryKey: ['messaging-routing'],
        queryFn: async () => {
            try {
                const response = await api.get('/api/v1/messaging/routing');
                return response.data.data as MessagingRouting;
            } catch {
                return null;
            }
        }
    });

    // Routing state for form - starts null until data loads
    const [routingForm, setRoutingForm] = useState<MessagingRouting | null>(null);

    // Generate default routing config for all communication types
    const getDefaultRoutingConfig = (): MessagingRouting => {
        const types: CommunicationType[] = [
            // Formazione
            'INVOICES_COURSES', 'CERTIFICATES', 'COURSES_RSPP',
            // Clinica
            'MEDICAL_REPORTS', 'APPOINTMENTS', 'INSPECTIONS', 'NOMINATIONS',
            // Commerciale
            'QUOTES', 'COMPANY_TARIFFS',
            // Trasversali
            'CREDENTIALS', 'MARKETING', 'PROMOTIONAL', 'GENERAL'
        ];
        return types.reduce((acc, type) => ({
            ...acc,
            [type]: {
                smtpBranch: 'default' as BranchType,
                whatsappBranch: 'default' as BranchType,
                smsBranch: 'default' as BranchType,
                pecEnabled: false
            }
        }), {} as MessagingRouting);
    };

    // Update routing form when data loads (including when API returns null)
    useEffect(() => {
        if (routingLoaded && !routingForm) {
            // If API returned data, use it; otherwise use defaults
            setRoutingForm(messagingRouting || getDefaultRoutingConfig());
        }
    }, [routingLoaded, messagingRouting, routingForm]);

    // Routing Mutation
    const saveRoutingMutation = useMutation({
        mutationFn: async (routing: MessagingRouting) => {
            const response = await api.put('/api/v1/messaging/routing/bulk', { routing });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging-routing'] });
            showToast({
                message: 'Configurazione routing salvata con successo',
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore nel salvataggio della configurazione routing. Riprova.',
                type: 'error'
            });
        }
    });

    // SMTP Mutations
    const saveSmtpMutation = useMutation({
        mutationFn: async (data: SmtpConfig) => {
            const response = await api.post('/api/v1/messaging/smtp/config', {
                ...data,
                branchType: selectedBranch
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging-config-smtp'] });
            queryClient.invalidateQueries({ queryKey: ['messaging-config-status'] });
            showToast({
                message: 'Le impostazioni SMTP sono state salvate con successo.',
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore nel salvataggio delle impostazioni SMTP. Riprova.',
                type: 'error'
            });
        }
    });

    const deleteSmtpMutation = useMutation({
        mutationFn: async () => {
            const response = await api.delete('/api/v1/messaging/smtp/config', {
                params: { branchType: selectedBranch }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging-config-smtp'] });
            queryClient.invalidateQueries({ queryKey: ['messaging-config-status'] });
            setSmtpForm({
                host: '',
                port: 587,
                secure: true,
                username: '',
                password: '',
                fromEmail: '',
                fromName: '',
                enabled: false
            });
            showToast({
                message: `La configurazione SMTP per ${selectedBranch} è stata rimossa.`,
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore nella rimozione della configurazione SMTP. Riprova.',
                type: 'error'
            });
        }
    });

    const saveWhatsappMutation = useMutation({
        mutationFn: async (data: WhatsAppConfig) => {
            const response = await api.post('/api/v1/messaging/whatsapp/config', {
                ...data,
                branchType: selectedBranch
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging-config-whatsapp'] });
            queryClient.invalidateQueries({ queryKey: ['messaging-config-status'] });
            showToast({
                message: `Le impostazioni WhatsApp per ${selectedBranch} sono state salvate con successo.`,
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore nel salvataggio delle impostazioni WhatsApp. Riprova.',
                type: 'error'
            });
        }
    });

    const deleteWhatsappMutation = useMutation({
        mutationFn: async () => {
            const response = await api.delete('/api/v1/messaging/whatsapp/config', {
                params: { branchType: selectedBranch }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging-config-whatsapp'] });
            queryClient.invalidateQueries({ queryKey: ['messaging-config-status'] });
            setWhatsappForm({
                phoneNumberId: '',
                enabled: false
            });
            showToast({
                message: `La configurazione WhatsApp per ${selectedBranch} è stata rimossa.`,
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore nella rimozione della configurazione WhatsApp. Riprova.',
                type: 'error'
            });
        }
    });

    // PEC Mutations
    const savePecMutation = useMutation({
        mutationFn: (data: PecConfigInput) => clinicaApi.pecConfig.saveConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pec-config'] });
            queryClient.invalidateQueries({ queryKey: ['pec-config-status'] });
            showToast({
                message: 'Configurazione PEC salvata con successo.',
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore durante il salvataggio',
                type: 'error'
            });
        }
    });

    const deletePecMutation = useMutation({
        mutationFn: () => clinicaApi.pecConfig.deleteConfig(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pec-config'] });
            queryClient.invalidateQueries({ queryKey: ['pec-config-status'] });
            setPecForm({
                provider: 'ARUBA' as PecProvider,
                host: '',
                port: 465,
                secure: true,
                pecAddress: '',
                password: '',
                senderName: 'ElementMedica - Medicina del Lavoro',
                enabled: false,
                testMode: false,
                testRecipient: ''
            });
            showToast({
                message: 'Configurazione PEC eliminata.',
                type: 'success'
            });
        },
        onError: (error: unknown) => {
            showToast({
                message: 'Errore durante l\'eliminazione',
                type: 'error'
            });
        }
    });

    // Effect: popola form con config esistente
    useEffect(() => {
        if (smtpConfig) {
            setSmtpForm(prev => ({
                ...prev,
                host: smtpConfig.host || '',
                port: smtpConfig.port || 587,
                secure: smtpConfig.secure !== false,
                username: smtpConfig.username || '',
                password: '',
                fromEmail: smtpConfig.fromEmail || '',
                fromName: smtpConfig.fromName || '',
                enabled: smtpConfig.enabled !== false,
                hasPassword: smtpConfig.hasPassword
            }));
        }
    }, [smtpConfig]);

    useEffect(() => {
        if (whatsappConfig) {
            // Solo phoneNumberId e enabled sono configurabili dal tenant
            setWhatsappForm({
                phoneNumberId: whatsappConfig.phoneNumberId || '',
                enabled: whatsappConfig.enabled !== false
            });
        }
    }, [whatsappConfig]);

    // Popola form PEC con config esistente
    useEffect(() => {
        if (pecConfig) {
            setPecForm(prev => ({
                ...prev,
                provider: pecConfig.provider || 'ARUBA',
                host: pecConfig.host || '',
                port: pecConfig.port || 465,
                secure: pecConfig.secure !== false,
                pecAddress: pecConfig.pecAddress || '',
                password: '',
                senderName: pecConfig.senderName || '',
                enabled: pecConfig.enabled !== false,
                testMode: pecConfig.testMode || false
            }));
        }
    }, [pecConfig]);

    // Update host/port quando cambia provider PEC
    useEffect(() => {
        const selectedProvider = pecProviders.find(p => p.code === pecForm.provider);
        if (selectedProvider && selectedProvider.host) {
            setPecForm(prev => ({
                ...prev,
                host: selectedProvider.host || prev.host,
                port: selectedProvider.port || prev.port,
                secure: selectedProvider.secure
            }));
        }
    }, [pecForm.provider, pecProviders]);

    // Handlers
    const handleSmtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveSmtpMutation.mutate(smtpForm);
    };

    const handleSmtpTest = async () => {
        if (!smtpTestEmail) {
            showToast({
                message: 'Inserisci un indirizzo email per il test',
                type: 'info'
            });
            return;
        }
        setIsTestingSmtp(true);
        try {
            const res = await api.post('/api/v1/messaging/smtp/test', {
                email: smtpTestEmail,
                branchType: selectedBranch
            });
            if (res.data?.success) {
                showToast({
                    message: `Email di test inviata a ${smtpTestEmail}`,
                    type: 'success'
                });
            } else {
                showToast({
                    message: 'Test SMTP fallito. Verifica le impostazioni.',
                    type: 'error'
                });
            }
        } catch (error: unknown) {
            showToast({
                message: 'Errore durante il test SMTP. Verifica le impostazioni.',
                type: 'error'
            });
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const handleSmtpDelete = async () => {
        if (await confirmDelete(`configurazione SMTP per ${selectedBranch}`)) {
            deleteSmtpMutation.mutate();
        }
    };

    const handleWhatsappSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveWhatsappMutation.mutate(whatsappForm);
    };

    const handleWhatsappTest = async () => {
        if (!whatsappTestNumber) {
            showToast({
                message: 'Inserisci un numero di telefono per il test',
                type: 'info'
            });
            return;
        }
        setIsTestingWhatsapp(true);
        try {
            await api.post('/api/v1/messaging/whatsapp/test', {
                phoneNumber: whatsappTestNumber,
                branchType: selectedBranch
            });
            showToast({
                message: `Messaggio di test inviato a ${whatsappTestNumber}`,
                type: 'success'
            });
        } catch (error: unknown) {
            const axiosErr = error as { response?: { data?: { code?: string; message?: string } } };
            const serverCode = axiosErr?.response?.data?.code;
            const serverMsg = axiosErr?.response?.data?.message;
            let toastMsg = 'Errore durante il test WhatsApp. Verifica le impostazioni.';
            if (serverCode === 'NOT_CONFIGURED') {
                toastMsg = `WhatsApp non configurato per il branch "${selectedBranch}". Salva prima la configurazione.`;
            } else if (serverCode === 'NO_TOKEN') {
                toastMsg = 'Access token WhatsApp non disponibile sulla piattaforma. Contatta il supporto ElementMedica.';
            } else if (serverCode === 'NO_PHONE_NUMBER_ID') {
                toastMsg = 'Inserisci e salva il Phone Number ID prima di eseguire il test.';
            } else if (serverMsg) {
                toastMsg = serverMsg;
            }
            showToast({ message: toastMsg, type: 'error' });
        } finally {
            setIsTestingWhatsapp(false);
        }
    };

    const handleWhatsappDelete = async () => {
        if (await confirmDelete(`configurazione WhatsApp per ${selectedBranch}`)) {
            deleteWhatsappMutation.mutate();
        }
    };

    // PEC Handlers
    const handlePecSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        savePecMutation.mutate(pecForm);
    };

    const handlePecTest = async () => {
        if (!pecTestRecipient) {
            showToast({
                message: 'Inserisci un indirizzo PEC per il test',
                type: 'info'
            });
            return;
        }
        setIsTestingPec(true);
        try {
            await clinicaApi.pecConfig.testConfig(pecTestRecipient);
            showToast({
                message: `Email PEC di test inviata a ${pecTestRecipient}`,
                type: 'success'
            });
        } catch (error: unknown) {
            showToast({
                message: 'Errore durante il test',
                type: 'error'
            });
        } finally {
            setIsTestingPec(false);
        }
    };

    const handlePecDelete = async () => {
        const confirmed = await confirmDelete('configurazione PEC');
        if (confirmed) {
            deletePecMutation.mutate();
        }
    };

    const isLoading = loadingSmtp || loadingWhatsapp || loadingStatus || loadingPec || loadingPecProviders;

    // Get branch label for display
    const getBranchLabel = (branch: BranchType) => {
        const option = BRANCH_OPTIONS.find(o => o.value === branch);
        return option?.label || branch;
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Send className="w-6 h-6 text-blue-600" />
                        Configurazione Messaggistica
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Configura i canali di comunicazione per l'invio di notifiche e credenziali
                    </p>
                </div>
            </div>

            {/* Branch Selector */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Seleziona Branch
                    </CardTitle>
                    <CardDescription>
                        Ogni branch può avere configurazioni SMTP e WhatsApp separate
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {BRANCH_OPTIONS.map(option => (
                            <Button
                                key={option.value}
                                variant={selectedBranch === option.value ? "secondary" : "outline"}
                                onClick={() => setSelectedBranch(option.value)}
                                className="flex items-center gap-2"
                            >
                                {option.value === 'FORMAZIONE' && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                )}
                                {option.value === 'CLINICA' && (
                                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                                )}
                                {option.value === 'default' && (
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                )}
                                {option.label}
                            </Button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Configurazione attuale: <strong>{getBranchLabel(selectedBranch)}</strong> - {BRANCH_OPTIONS.find(o => o.value === selectedBranch)?.description}
                    </p>
                </CardContent>
            </Card>

            <Tabs defaultValue="smtp" className="space-y-6">
                <TabsList className={`grid w-full ${tabGridClass}`}>
                    <TabsTrigger value="smtp" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email SMTP
                        {status?.smtp && (
                            <StatusBadge
                                configured={status.smtp.configured}
                                enabled={status.smtp.enabled}
                                ready={status.smtp.ready}
                            />
                        )}
                    </TabsTrigger>
                    {showWhatsapp && (
                        <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                            {status?.whatsapp && (
                                <StatusBadge
                                    configured={status.whatsapp.configured}
                                    enabled={status.whatsapp.enabled}
                                    ready={status.whatsapp.ready}
                                />
                            )}
                        </TabsTrigger>
                    )}
                    {showPec && (
                        <TabsTrigger value="pec" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            PEC
                            {pecStatus && (
                                <StatusBadge
                                    configured={pecStatus.configured}
                                    enabled={pecStatus.enabled}
                                    ready={pecStatus.ready}
                                />
                            )}
                        </TabsTrigger>
                    )}
                    {showRouting && (
                        <TabsTrigger value="routing" className="flex items-center gap-2">
                            <Route className="w-4 h-4" />
                            Routing
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* ============================================ */}
                {/* SMTP TAB */}
                {/* ============================================ */}
                <TabsContent value="smtp">
                    <form onSubmit={handleSmtpSubmit}>
                        {/* Help Banner */}
                        <Alert className="mb-4">
                            <Settings className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Come configurare SMTP per il tuo dominio:</strong>
                                <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                                    <li><strong>Host SMTP</strong>: Indirizzo del server SMTP del tuo provider email (es. smtp.gmail.com, mail.aruba.it, smtp.office365.com)</li>
                                    <li><strong>Username</strong>: L'indirizzo email completa che utilizzi per accedere al servizio (es. noreply@tuodominio.it)</li>
                                    <li><strong>Password</strong>: La password dell'account email, o una password app se usi 2FA (Google/Microsoft richiedono password app)</li>
                                    <li><strong>Porta 587</strong>: Standard con TLS | <strong>Porta 465</strong>: SSL/TLS diretto | <strong>Porta 25</strong>: Non sicura (sconsigliata)</li>
                                </ul>
                            </AlertDescription>
                        </Alert>

                        {/* Provider Presets */}
                        <Card className="mb-6 border-violet-100 bg-violet-50/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-violet-800">
                                    <Server className="w-4 h-4 inline mr-1" />
                                    Preset provider noti
                                </CardTitle>
                                <CardDescription className="text-xs">Seleziona un provider per precompilare host e porta</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        { label: 'Zoho Mail EU', host: 'smtp.zoho.eu', port: 587, secure: false },
                                        { label: 'Zoho Mail EU (SSL)', host: 'smtp.zoho.eu', port: 465, secure: true },
                                        { label: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
                                        { label: 'Aruba', host: 'smtp.aruba.it', port: 465, secure: true },
                                        { label: 'Office 365', host: 'smtp.office365.com', port: 587, secure: false },
                                        { label: 'Libero / Italia Online', host: 'smtp.libero.it', port: 465, secure: true },
                                    ] as Array<{ label: string; host: string; port: number; secure: boolean }>).map((p) => (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => setSmtpForm(prev => ({ ...prev, host: p.host, port: p.port, secure: p.secure }))}
                                            className="px-3 py-1.5 text-xs rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-colors font-medium"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Server Settings Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Server className="w-5 h-5" />
                                        Server SMTP
                                    </CardTitle>
                                    <CardDescription>
                                        Configura il server SMTP del tuo dominio
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Host */}
                                    <div className="space-y-2">
                                        <Label>Host SMTP *</Label>
                                        <Input
                                            value={smtpForm.host}
                                            onChange={(e) => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
                                            placeholder="smtp.tuodominio.it"
                                            required
                                        />
                                        <p className="text-xs text-gray-500">
                                            Server SMTP del tuo provider: smtp.gmail.com, mail.aruba.it, smtp.office365.com
                                        </p>
                                    </div>

                                    {/* Port */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Porta</Label>
                                            <Input
                                                type="number"
                                                value={smtpForm.port}
                                                onChange={(e) => setSmtpForm(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                                                placeholder="587"
                                            />
                                            <p className="text-xs text-gray-500">587 (TLS) o 465 (SSL)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Connessione sicura</Label>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Switch
                                                    checked={smtpForm.secure}
                                                    onCheckedChange={(checked) => setSmtpForm(prev => ({ ...prev, secure: checked }))}
                                                />
                                                <span className="text-sm text-gray-500">
                                                    {smtpForm.secure ? 'SSL/TLS (porta 465)' : 'STARTTLS (porta 587)'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Username */}
                                    <div className="space-y-2">
                                        <Label>Username SMTP *</Label>
                                        <Input
                                            value={smtpForm.username}
                                            onChange={(e) => setSmtpForm(prev => ({ ...prev, username: e.target.value }))}
                                            placeholder="noreply@tuodominio.it"
                                            required
                                        />
                                        <p className="text-xs text-gray-500">
                                            Email completa dell'account (coincide spesso con Email mittente)
                                        </p>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <Label>Password SMTP {smtpForm.hasPassword ? '(già configurata)' : '*'}</Label>
                                        <div className="relative">
                                            <Input
                                                type={showSmtpPassword ? 'text' : 'password'}
                                                value={smtpForm.password || ''}
                                                onChange={(e) => setSmtpForm(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder={smtpForm.hasPassword ? '••••••••' : 'Password SMTP'}
                                                required={!smtpForm.hasPassword}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                            >
                                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Password dell'account email. Per Gmail/Office365 con 2FA, genera una "Password app"
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sender Settings Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5" />
                                        Mittente
                                    </CardTitle>
                                    <CardDescription>
                                        Come apparirai nelle email
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* From Email */}
                                    <div className="space-y-2">
                                        <Label>Email mittente *</Label>
                                        <Input
                                            type="email"
                                            value={smtpForm.fromEmail}
                                            onChange={(e) => setSmtpForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                                            placeholder="noreply@tuodominio.it"
                                            required
                                        />
                                    </div>

                                    {/* From Name */}
                                    <div className="space-y-2">
                                        <Label>Nome mittente</Label>
                                        <Input
                                            value={smtpForm.fromName}
                                            onChange={(e) => setSmtpForm(prev => ({ ...prev, fromName: e.target.value }))}
                                            placeholder="ElementMedica"
                                        />
                                    </div>

                                    {/* Enabled */}
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div>
                                            <Label>Abilita invio email</Label>
                                            <p className="text-xs text-gray-500">
                                                Se disabilitato, le email non verranno inviate
                                            </p>
                                        </div>
                                        <Switch
                                            checked={smtpForm.enabled}
                                            onCheckedChange={(checked) => setSmtpForm(prev => ({ ...prev, enabled: checked }))}
                                        />
                                    </div>

                                    {/* Test Section */}
                                    <div className="pt-4 border-t space-y-3">
                                        <Label>Test connessione</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="email"
                                                value={smtpTestEmail}
                                                onChange={(e) => setSmtpTestEmail(e.target.value)}
                                                placeholder="test@esempio.com"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleSmtpTest}
                                                disabled={isTestingSmtp || !smtpConfig}
                                            >
                                                {isTestingSmtp ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <TestTube className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                        {!smtpConfig && (
                                            <p className="text-xs text-gray-500">
                                                Salva la configurazione prima di testare
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between mt-6">
                            <CRUDDeleteButton
                                type="button"
                                onClick={handleSmtpDelete}
                                disabled={!smtpConfig || deleteSmtpMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina configurazione
                            </CRUDDeleteButton>

                            <CRUDPrimaryButton
                                type="submit"
                                disabled={saveSmtpMutation.isPending}
                            >
                                {saveSmtpMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                )}
                                Salva configurazione SMTP
                            </CRUDPrimaryButton>
                        </div>
                    </form>
                </TabsContent>

                {/* ============================================ */}
                {/* WHATSAPP TAB */}
                {/* ============================================ */}
                {showWhatsapp && <TabsContent value="whatsapp">
                    {/* Setup Guide Banner */}
                    <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
                        <Smartphone className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900 dark:text-green-200">
                            <strong>WhatsApp Business Cloud API — Modello Centralizzato</strong>
                            <p className="mt-1 text-sm">
                                ElementMedica gestisce le credenziali API centralmente. Devi solo abilitare il canale
                                e opzionalmente configurare il tuo <strong>Phone Number ID</strong> se hai un numero
                                WhatsApp Business dedicato. Segui questa guida:
                            </p>
                            <ol className="mt-2 ml-4 list-decimal text-sm space-y-1">
                                <li>Crea un <strong>Meta Business Account</strong> su <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a></li>
                                <li>Crea una <strong>Meta App</strong> con prodotto <em>WhatsApp Business</em> nel <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">Meta Developer Portal</a></li>
                                <li>Aggiungi un numero di telefono verificato (il numero NON deve essere già registrato su WhatsApp personale)</li>
                                <li>Trova il <strong>Phone Number ID</strong> nella dashboard Meta App → WhatsApp → Configurazione API</li>
                                <li>Contatta il supporto ElementMedica per fornire il tuo <strong>Phone Number ID</strong> e abilitare il canale</li>
                            </ol>
                        </AlertDescription>
                    </Alert>

                    <form onSubmit={handleWhatsappSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Configuration Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-green-600" />
                                        Configurazione Numero
                                    </CardTitle>
                                    <CardDescription>
                                        Configura il tuo numero WhatsApp Business dedicato
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Phone Number ID */}
                                    <div className="space-y-2">
                                        <Label>Phone Number ID</Label>
                                        <Input
                                            value={whatsappForm.phoneNumberId}
                                            onChange={(e) => setWhatsappForm(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                                            placeholder="123456789012345"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Trovalo nel Meta Developer Portal → La tua App → WhatsApp → Configurazione API.
                                            <br />
                                            Lascia vuoto per usare il numero di piattaforma ElementMedica.
                                        </p>
                                    </div>

                                    {/* Enabled */}
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div>
                                            <Label>Abilita WhatsApp</Label>
                                            <p className="text-xs text-gray-500">
                                                Attiva l'invio messaggi WhatsApp per questo branch
                                            </p>
                                        </div>
                                        <Switch
                                            checked={whatsappForm.enabled}
                                            onCheckedChange={(checked) => setWhatsappForm(prev => ({ ...prev, enabled: checked }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Info & Test Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5" />
                                        Stato & Test
                                    </CardTitle>
                                    <CardDescription>
                                        Verifica la connessione alla piattaforma WhatsApp
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Status Info */}
                                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Accesso API</span>
                                            <Badge variant={status?.whatsapp?.configured ? 'default' : 'secondary'}>
                                                {status?.whatsapp?.configured ? 'Configurato' : 'Non configurato'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Canale</span>
                                            <Badge variant={status?.whatsapp?.enabled ? 'default' : 'secondary'}>
                                                {status?.whatsapp?.enabled ? 'Attivo' : 'Disabilitato'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Pronto all'invio</span>
                                            <Badge variant={status?.whatsapp?.ready ? 'default' : 'secondary'} className={status?.whatsapp?.ready ? 'bg-green-500' : ''}>
                                                {status?.whatsapp?.ready ? '✓ Pronto' : 'Non pronto'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Test Section */}
                                    <div className="space-y-2">
                                        <Label>Invia messaggio di test</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="tel"
                                                value={whatsappTestNumber}
                                                onChange={(e) => setWhatsappTestNumber(e.target.value)}
                                                placeholder="+39 333 1234567"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleWhatsappTest}
                                                disabled={isTestingWhatsapp || !whatsappConfig}
                                            >
                                                {isTestingWhatsapp ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                        {!whatsappConfig && (
                                            <p className="text-xs text-amber-600">
                                                Salva la configurazione prima di testare
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            Il numero destinatario deve aver precedentemente inviato un messaggio al tuo numero WhatsApp Business (finestra 24h) o devi usare template approvati Meta.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between mt-6">
                            <CRUDDeleteButton
                                type="button"
                                onClick={handleWhatsappDelete}
                                disabled={!whatsappConfig || deleteWhatsappMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina configurazione
                            </CRUDDeleteButton>

                            <CRUDPrimaryButton
                                type="submit"
                                disabled={saveWhatsappMutation.isPending}
                            >
                                {saveWhatsappMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                )}
                                Salva configurazione WhatsApp
                            </CRUDPrimaryButton>
                        </div>
                    </form>
                </TabsContent>}

                {/* ============================================ */}
                {/* PEC TAB */}
                {/* ============================================ */}
                {showPec && <TabsContent value="pec">
                    <form onSubmit={handlePecSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Configurazione PEC
                                </CardTitle>
                                <CardDescription>
                                    Configura la PEC per invio certificati e comunicazioni ufficiali
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Provider */}
                                <div className="space-y-2">
                                    <Label>Provider PEC *</Label>
                                    <Select
                                        value={pecForm.provider}
                                        onValueChange={(value) => setPecForm(prev => ({ ...prev, provider: value as PecProvider }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pecProviders.map((provider) => (
                                                <SelectItem key={provider.code} value={provider.code}>
                                                    {provider.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {pecProviders.find(p => p.code === pecForm.provider)?.instructions && (
                                        <p className="text-xs text-gray-500">
                                            {pecProviders.find(p => p.code === pecForm.provider)?.instructions}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Host */}
                                    <div className="space-y-2">
                                        <Label>Server SMTP PEC</Label>
                                        <Input
                                            value={pecForm.host}
                                            onChange={(e) => setPecForm(prev => ({ ...prev, host: e.target.value }))}
                                            placeholder="smtps.pec.aruba.it"
                                            disabled={pecForm.provider !== 'CUSTOM'}
                                        />
                                    </div>

                                    {/* Port */}
                                    <div className="space-y-2">
                                        <Label>Porta</Label>
                                        <Input
                                            type="number"
                                            value={pecForm.port}
                                            onChange={(e) => setPecForm(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                                            disabled={pecForm.provider !== 'CUSTOM'}
                                        />
                                    </div>
                                </div>

                                {/* PEC Address */}
                                <div className="space-y-2">
                                    <Label>Indirizzo PEC *</Label>
                                    <Input
                                        type="email"
                                        value={pecForm.pecAddress}
                                        onChange={(e) => setPecForm(prev => ({ ...prev, pecAddress: e.target.value }))}
                                        placeholder="tuaazienda@pec.it"
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <Label>Password PEC *</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPecPassword ? 'text' : 'password'}
                                            value={pecForm.password || ''}
                                            onChange={(e) => setPecForm(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder={pecConfig?.hasPassword ? '••••••••' : 'Password casella PEC'}
                                            required={!pecConfig?.hasPassword}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3"
                                            onClick={() => setShowPecPassword(!showPecPassword)}
                                        >
                                            {showPecPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Sender Name */}
                                <div className="space-y-2">
                                    <Label>Nome mittente</Label>
                                    <Input
                                        value={pecForm.senderName}
                                        onChange={(e) => setPecForm(prev => ({ ...prev, senderName: e.target.value }))}
                                        placeholder="Azienda Srl - Medicina del Lavoro"
                                    />
                                </div>

                                {/* Test Mode */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div>
                                        <Label>Modalità Test</Label>
                                        <p className="text-xs text-gray-500">
                                            In modalità test, le PEC vengono inviate solo al destinatario di test
                                        </p>
                                    </div>
                                    <Switch
                                        checked={pecForm.testMode}
                                        onCheckedChange={(checked) => setPecForm(prev => ({ ...prev, testMode: checked }))}
                                    />
                                </div>

                                {/* Enabled */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div>
                                        <Label>Abilita invio PEC</Label>
                                        <p className="text-xs text-gray-500">
                                            Se disabilitato, le comunicazioni PEC non verranno inviate
                                        </p>
                                    </div>
                                    <Switch
                                        checked={pecForm.enabled}
                                        onCheckedChange={(checked) => setPecForm(prev => ({ ...prev, enabled: checked }))}
                                    />
                                </div>

                                {/* Test Section */}
                                <div className="pt-4 border-t space-y-3">
                                    <Label>Test connessione</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            value={pecTestRecipient}
                                            onChange={(e) => setPecTestRecipient(e.target.value)}
                                            placeholder="destinatario@pec.it"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handlePecTest}
                                            disabled={isTestingPec || !pecConfig}
                                        >
                                            {isTestingPec ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <TestTube className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {!pecConfig && (
                                        <p className="text-xs text-gray-500">
                                            Salva la configurazione prima di testare
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex justify-between mt-6">
                            <CRUDDeleteButton
                                type="button"
                                onClick={handlePecDelete}
                                disabled={!pecConfig || deletePecMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina configurazione
                            </CRUDDeleteButton>

                            <CRUDPrimaryButton
                                type="submit"
                                disabled={savePecMutation.isPending}
                            >
                                {savePecMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                )}
                                Salva configurazione PEC
                            </CRUDPrimaryButton>
                        </div>
                    </form>
                </TabsContent>}

                {/* ============================================ */}
                {/* ROUTING TAB */}
                {/* ============================================ */}
                {showRouting && <TabsContent value="routing">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Route className="w-5 h-5" />
                                Configurazione Routing
                            </CardTitle>
                            <CardDescription>
                                Associa ogni tipo di comunicazione ad una configurazione SMTP/WhatsApp/SMS specifica.
                                Questo ti permette di usare email diverse per fatture, attestati e comunicazioni mediche.
                                <br /><br />
                                <strong>Nota:</strong> Selezionando "Default (Tutti)" verranno usate le configurazioni di entrambi i branch (CLINICA e FORMAZIONE)
                                quando disponibili. Seleziona "Non usare" per disabilitare un canale per una specifica tipologia.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingRouting ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Raggruppa per categoria */}
                                    {['Formazione', 'Clinica', 'Commerciale', 'Marketing', 'Sistema'].map((category) => {
                                        const categoryTypes = (Object.entries(COMMUNICATION_TYPE_LABELS) as [CommunicationType, typeof COMMUNICATION_TYPE_LABELS[CommunicationType]][])
                                            .filter(([, info]) => info.category === category);

                                        if (categoryTypes.length === 0) return null;

                                        return (
                                            <div key={category} className="space-y-4">
                                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                                                    {category}
                                                </h3>
                                                {categoryTypes.map(([commType, typeInfo]) => {
                                                    const currentRouting = routingForm?.[commType] || {
                                                        smtpBranch: 'default' as BranchType,
                                                        whatsappBranch: 'default' as BranchType,
                                                        smsBranch: 'default' as BranchType,
                                                        pecEnabled: false
                                                    };

                                                    return (
                                                        <div key={commType} className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl">{typeInfo.icon}</span>
                                                                <div>
                                                                    <h4 className="font-medium">{typeInfo.label}</h4>
                                                                    <p className="text-sm text-gray-500">{typeInfo.description}</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pl-10">
                                                                {/* SMTP Branch Selection */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs flex items-center gap-1">
                                                                        <Mail className="w-3 h-3" />
                                                                        Email
                                                                    </Label>
                                                                    <Select
                                                                        value={currentRouting.smtpBranch}
                                                                        onValueChange={(value) => {
                                                                            setRoutingForm(prev => {
                                                                                const base = prev || getDefaultRoutingConfig();
                                                                                return {
                                                                                    ...base,
                                                                                    [commType]: {
                                                                                        ...(base[commType] || currentRouting),
                                                                                        smtpBranch: value as BranchType
                                                                                    }
                                                                                };
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {BRANCH_OPTIONS.map(opt => (
                                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                                    {opt.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* WhatsApp Branch Selection */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs flex items-center gap-1">
                                                                        <MessageCircle className="w-3 h-3" />
                                                                        WhatsApp
                                                                    </Label>
                                                                    <Select
                                                                        value={currentRouting.whatsappBranch}
                                                                        onValueChange={(value) => {
                                                                            setRoutingForm(prev => {
                                                                                const base = prev || getDefaultRoutingConfig();
                                                                                return {
                                                                                    ...base,
                                                                                    [commType]: {
                                                                                        ...(base[commType] || currentRouting),
                                                                                        whatsappBranch: value as BranchType
                                                                                    }
                                                                                };
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {BRANCH_OPTIONS.map(opt => (
                                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                                    {opt.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* SMS Branch Selection */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs flex items-center gap-1">
                                                                        <Smartphone className="w-3 h-3" />
                                                                        SMS
                                                                    </Label>
                                                                    <Select
                                                                        value={currentRouting.smsBranch}
                                                                        onValueChange={(value) => {
                                                                            setRoutingForm(prev => {
                                                                                const base = prev || getDefaultRoutingConfig();
                                                                                return {
                                                                                    ...base,
                                                                                    [commType]: {
                                                                                        ...(base[commType] || currentRouting),
                                                                                        smsBranch: value as BranchType
                                                                                    }
                                                                                };
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {BRANCH_OPTIONS.map(opt => (
                                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                                    {opt.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* PEC Enabled Toggle */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs flex items-center gap-1">
                                                                        <Shield className="w-3 h-3" />
                                                                        PEC
                                                                    </Label>
                                                                    <div className="flex items-center h-9">
                                                                        <Switch
                                                                            checked={currentRouting.pecEnabled}
                                                                            onCheckedChange={(checked) => {
                                                                                setRoutingForm(prev => {
                                                                                    const base = prev || getDefaultRoutingConfig();
                                                                                    return {
                                                                                        ...base,
                                                                                        [commType]: {
                                                                                            ...(base[commType] || currentRouting),
                                                                                            pecEnabled: checked
                                                                                        }
                                                                                    };
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="ml-2 text-sm text-gray-500">
                                                                            {currentRouting.pecEnabled ? 'Sì' : 'No'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-4 border-t">
                                        <CRUDPrimaryButton
                                            onClick={() => routingForm && saveRoutingMutation.mutate(routingForm)}
                                            disabled={saveRoutingMutation.isPending || !routingForm}
                                        >
                                            {saveRoutingMutation.isPending ? (
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            )}
                                            Salva configurazione routing
                                        </CRUDPrimaryButton>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>}
            </Tabs>
        </div>
    );
};

export default MessagingConfigPage;
