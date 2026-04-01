/**
 * P68 - Timbratura Badge Widget
 * Widget per timbratura rapida visibile nell'header per i dipendenti
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    Clock,
    LogIn,
    LogOut,
    Coffee,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { timbraturaApi, TipoTimbratura } from '../api';

const STATO_CONFIG = {
    // Backend returns these state names
    IN_SEDE: {
        label: 'In sede',
        color: 'bg-emerald-500',
        icon: CheckCircle,
        nextAction: 'USCITA' as TipoTimbratura,
        nextLabel: 'Timbra Uscita',
    },
    IN_PAUSA: {
        label: 'In pausa',
        color: 'bg-amber-500',
        icon: Coffee,
        nextAction: 'FINE_PAUSA' as TipoTimbratura,
        nextLabel: 'Fine Pausa',
    },
    FUORI_SEDE: {
        label: 'Fuori sede',
        color: 'bg-gray-400',
        icon: LogOut,
        nextAction: 'ENTRATA' as TipoTimbratura,
        nextLabel: 'Timbra Entrata',
    },
};

interface TimbraturaBadgeProps {
    className?: string;
}

const TimbraturaBadge: React.FC<TimbraturaBadgeProps> = ({ className }) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['hr', 'timbratura', 'stato-oggi'],
        queryFn: timbraturaApi.getStatoOggi,
        refetchInterval: 60000, // Refresh every minute
        retry: false, // Don't retry if user doesn't have HR profile
    });

    const timbraMutation = useMutation({
        mutationFn: timbraturaApi.timbra,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'timbratura'] });
            const statoLabel = STATO_CONFIG[result.data.statoAttuale as keyof typeof STATO_CONFIG]?.label || result.data.statoAttuale;
            showToast({
                message: `Timbratura registrata. Stato: ${statoLabel}`,
                type: 'success',
            });
        },
        onError: () => {
            showToast({
                message: 'Impossibile registrare la timbratura',
                type: 'error',
            });
        },
    });

    // Don't show if user doesn't have HR profile or error
    if (error || !data?.data) {
        return null;
    }

    // Handle case where user has no HR profile or timbratura not required
    const responseData = data.data;
    if (!responseData.hasHRProfile || responseData.timbraturaObbligatoria === false) {
        return null;
    }

    const { statoAttuale, ultimaTimbratura, timbratureOggi = [] } = responseData;
    const config = STATO_CONFIG[statoAttuale as keyof typeof STATO_CONFIG] || STATO_CONFIG.FUORI_SEDE;
    const StatusIcon = config.icon;

    // Calculate worked hours today
    let oreLavorate = 0;
    let entrata: Date | null = null;

    for (const t of timbratureOggi || []) {
        if (t.tipo === 'ENTRATA' || t.tipo === 'FINE_PAUSA') {
            entrata = parseISO(t.dataOra);
        } else if ((t.tipo === 'USCITA' || t.tipo === 'INIZIO_PAUSA') && entrata) {
            const uscita = parseISO(t.dataOra);
            oreLavorate += (uscita.getTime() - entrata.getTime()) / (1000 * 60 * 60);
            entrata = null;
        }
    }

    // If currently working, add time since last entry
    if (statoAttuale === 'IN_SEDE' && entrata) {
        oreLavorate += (new Date().getTime() - entrata.getTime()) / (1000 * 60 * 60);
    }

    const oreFormattate = `${Math.floor(oreLavorate)}h ${Math.round((oreLavorate % 1) * 60)}m`;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors ${className}`}
                >
                    <span className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{oreFormattate}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                            <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{config.label}</p>
                            <p className="text-sm text-gray-500">Ore oggi: {oreFormattate}</p>
                        </div>
                    </div>

                    {/* Last badge */}
                    {ultimaTimbratura && (
                        <div className="text-sm text-gray-600 border-t pt-3">
                            <p>Ultima timbratura:</p>
                            <p className="font-medium">
                                {format(parseISO(ultimaTimbratura.dataOra), 'HH:mm', { locale: it })} -{' '}
                                {ultimaTimbratura.tipo.replace('_', ' ')}
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    <Button
                        onClick={() => timbraMutation.mutate(config.nextAction)}
                        disabled={timbraMutation.isPending}
                        className={`w-full ${statoAttuale === 'IN_SEDE'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                    >
                        {timbraMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : statoAttuale === 'FUORI_SEDE' ? (
                            <LogIn className="w-4 h-4 mr-2" />
                        ) : statoAttuale === 'IN_PAUSA' ? (
                            <Coffee className="w-4 h-4 mr-2" />
                        ) : (
                            <LogOut className="w-4 h-4 mr-2" />
                        )}
                        {config.nextLabel}
                    </Button>

                    {/* Quick action for pause - only when IN_SEDE */}
                    {statoAttuale === 'IN_SEDE' && (
                        <Button
                            variant="outline"
                            onClick={() => timbraMutation.mutate('INIZIO_PAUSA')}
                            disabled={timbraMutation.isPending}
                            className="w-full"
                        >
                            <Coffee className="w-4 h-4 mr-2" />
                            Inizia Pausa
                        </Button>
                    )}

                    {/* Today's timeline */}
                    {timbratureOggi.length > 0 && (
                        <div className="border-t pt-3">
                            <p className="text-xs text-gray-500 mb-2">Timbrature oggi:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {timbratureOggi.map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        <span className="font-mono text-gray-600">
                                            {format(parseISO(t.dataOra), 'HH:mm')}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${t.tipo.includes('ENTRATA') || t.tipo.includes('FINE')
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {t.tipo.replace('_', ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default TimbraturaBadge;
