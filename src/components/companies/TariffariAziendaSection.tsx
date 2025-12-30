/**
 * TariffariAziendaSection
 * 
 * Sezione per visualizzare e gestire i tariffari associati ad un'azienda
 * Da integrare in CompanyDetails
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Euro,
    Plus,
    Copy,
    Calendar,
    ChevronRight,
    FileText,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    Button,
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '../../design-system';
import { useToast } from '../../hooks/useToast';
import {
    tariffariAziendaliApi,
    TariffarioAziendaleListItem,
    TariffarioAziendaleSimple
} from '../../services/tariffarioAziendaleApi';

interface TariffariAziendaSectionProps {
    companyId: string;
    companyName?: string;
}

const TariffariAziendaSection: React.FC<TariffariAziendaSectionProps> = ({
    companyId,
    companyName
}) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [tariffari, setTariffari] = useState<TariffarioAziendaleListItem[]>([]);
    const [tariffariBase, setTariffariBase] = useState<TariffarioAziendaleSimple[]>([]);

    // Load tariffari
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [companyRes, baseRes] = await Promise.all([
                    tariffariAziendaliApi.getAll({ companyId }),
                    tariffariAziendaliApi.getBase()
                ]);

                if (companyRes.success) {
                    setTariffari(companyRes.data || []);
                }

                if (baseRes.success) {
                    setTariffariBase(baseRes.data || []);
                }
            } catch (error) {
                console.error('Error loading tariffari:', error);
                showToast({ message: 'Errore nel caricamento dei tariffari', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        if (companyId) {
            loadData();
        }
    }, [companyId]);

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT');
    };

    // Get tariffario status
    const getTariffarioStatus = (t: TariffarioAziendaleListItem) => {
        const now = new Date();
        const validoDa = new Date(t.validoDa);
        const validoA = t.validoA ? new Date(t.validoA) : null;

        if (!t.attivo) {
            return { label: 'Non attivo', variant: 'secondary' as const };
        }
        if (validoDa > now) {
            return { label: 'Futuro', variant: 'outline' as const };
        }
        if (validoA && validoA < now) {
            return { label: 'Scaduto', variant: 'destructive' as const };
        }
        return { label: 'Attivo', variant: 'default' as const };
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Euro className="h-5 w-5 text-green-600" />
                        Tariffari Medicina Lavoro
                    </CardTitle>
                    <div className="flex gap-2">
                        {/* Clone from base dropdown */}
                        {tariffariBase.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Copy className="h-4 w-4 mr-2" />
                                        Da Template
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {tariffariBase.map((t) => (
                                        <DropdownMenuItem
                                            key={t.id}
                                            onClick={() => navigate(`/management/tariffari-aziende/${t.id}/clone?companyId=${companyId}`)}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            {t.nome}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Create new */}
                        <Button
                            size="sm"
                            onClick={() => navigate(`/management/tariffari-aziende/nuovo?companyId=${companyId}`)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuovo
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : tariffari.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">Nessun tariffario associato</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Crea un nuovo tariffario o clona da un template base
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tariffari.map((t) => {
                            const status = getTariffarioStatus(t);
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => navigate(`/management/tariffari-aziende/${t.id}`)}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg 
                             cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{t.nome}</h4>
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {t.codice}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(t.validoDa)}
                                                {t.validoA && ` - ${formatDate(t.validoA)}`}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Euro className="h-3 w-3" />
                                                {t._count?.voci || 0} voci
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Link to management */}
                {tariffari.length > 0 && (
                    <div className="mt-4 pt-4 border-t text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/management/tariffari-aziende?companyId=${companyId}`)}
                        >
                            Gestisci tutti i tariffari
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TariffariAziendaSection;
