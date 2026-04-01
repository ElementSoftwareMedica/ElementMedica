/**
 * TariffazioneQuestionarioConfig
 * 
 * P61 - Componente per configurare tariffazione su questionario medico
 * Da usare in form di creazione/modifica template questionario
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Settings, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiGet } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface TariffazioneConfigProps {
    /** Se il questionario è fatturabile */
    fatturabile: boolean;
    /** Se è un servizio a pagamento (non coperto da convenzioni) */
    isPagamento: boolean;
    /** ID voce tariffario collegata */
    voceTariffarioId?: string;
    /** Prezzo default se non c'è voce tariffario */
    prezzoDefault?: number;
    /** Callback su cambio valori */
    onChange: (values: TariffazioneValues) => void;
    /** Tenant ID per caricare voci tariffario */
    disabled?: boolean;
}

export interface TariffazioneValues {
    fatturabile: boolean;
    isPagamento: boolean;
    voceTariffarioId?: string;
    prezzoDefault?: number;
}

interface VoceTariffario {
    id: string;
    codice: string;
    nome: string;
    prezzoBase: number;
    tariffario: {
        id: string;
        nome: string;
    };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TariffazioneQuestionarioConfig({
    fatturabile,
    isPagamento,
    voceTariffarioId,
    prezzoDefault,
    onChange,
    disabled = false,
}: TariffazioneConfigProps) {
    const [internalFatturabile, setInternalFatturabile] = useState(fatturabile);
    const [internalIsPagamento, setInternalIsPagamento] = useState(isPagamento);
    const [internalVoceId, setInternalVoceId] = useState(voceTariffarioId);
    const [internalPrezzo, setInternalPrezzo] = useState(prezzoDefault);

    // Carica voci tariffario disponibili
    const { data: vociTariffario, isLoading: isLoadingVoci } = useQuery({
        queryKey: ['voci-tariffario-list'],
        queryFn: () => apiGet<{ data: VoceTariffario[] }>('/api/v1/tariffari/voci?limit=100'),
        select: (res) => res.data,
        staleTime: 5 * 60 * 1000, // 5 min cache
    });

    const handleFatturabileChange = (checked: boolean) => {
        setInternalFatturabile(checked);
        if (!checked) {
            // Se disabilitiamo fatturabile, resettiamo gli altri campi
            setInternalIsPagamento(false);
            setInternalVoceId(undefined);
            setInternalPrezzo(undefined);
        }
        onChange({
            fatturabile: checked,
            isPagamento: checked ? internalIsPagamento : false,
            voceTariffarioId: checked ? internalVoceId : undefined,
            prezzoDefault: checked ? internalPrezzo : undefined,
        });
    };

    const handleIsPagamentoChange = (checked: boolean) => {
        setInternalIsPagamento(checked);
        onChange({
            fatturabile: internalFatturabile,
            isPagamento: checked,
            voceTariffarioId: internalVoceId,
            prezzoDefault: internalPrezzo,
        });
    };

    const handleVoceChange = (value: string) => {
        const voceId = value === 'none' ? undefined : value;
        setInternalVoceId(voceId);
        onChange({
            fatturabile: internalFatturabile,
            isPagamento: internalIsPagamento,
            voceTariffarioId: voceId,
            prezzoDefault: internalPrezzo,
        });
    };

    const handlePrezzoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const prezzo = e.target.value ? parseFloat(e.target.value) : undefined;
        setInternalPrezzo(prezzo);
        onChange({
            fatturabile: internalFatturabile,
            isPagamento: internalIsPagamento,
            voceTariffarioId: internalVoceId,
            prezzoDefault: prezzo,
        });
    };

    const selectedVoce = vociTariffario?.find((v) => v.id === internalVoceId);

    return (
        <Card className="mt-4">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Tariffazione Questionario
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Switch Fatturabile */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fatturabile">Fatturabile</Label>
                        <span title="Se attivo, genera un movimento contabile quando il questionario viene compilato in una visita di sorveglianza sanitaria.">
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </span>
                    </div>
                    <Switch
                        id="fatturabile"
                        checked={internalFatturabile}
                        onCheckedChange={handleFatturabileChange}
                        disabled={disabled}
                    />
                </div>

                {internalFatturabile && (
                    <>
                        {/* Switch Servizio a Pagamento */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="isPagamento">Servizio a pagamento</Label>
                                <span title="Se attivo, il servizio non è coperto da convenzioni standard e deve essere pagato separatamente.">
                                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                                </span>
                            </div>
                            <Switch
                                id="isPagamento"
                                checked={internalIsPagamento}
                                onCheckedChange={handleIsPagamentoChange}
                                disabled={disabled}
                            />
                        </div>

                        {/* Select Voce Tariffario */}
                        <div className="space-y-2">
                            <Label htmlFor="voceTariffario">Voce Tariffario</Label>
                            <div className={disabled || isLoadingVoci ? 'pointer-events-none opacity-50' : ''}>
                                <Select
                                    value={internalVoceId || 'none'}
                                    onValueChange={handleVoceChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona voce tariffario (opzionale)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nessuna voce tariffario</SelectItem>
                                        {vociTariffario?.map((voce) => (
                                            <SelectItem key={voce.id} value={voce.id}>
                                                {voce.codice} - {voce.nome} (€{voce.prezzoBase})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedVoce && (
                                <p className="text-xs text-gray-500">
                                    Tariffario: {selectedVoce.tariffario.nome} | Prezzo base: €{selectedVoce.prezzoBase}
                                </p>
                            )}
                        </div>

                        {/* Input Prezzo Default */}
                        <div className="space-y-2">
                            <Label htmlFor="prezzoDefault">Prezzo Default (€)</Label>
                            <Input
                                id="prezzoDefault"
                                type="number"
                                step="0.01"
                                min="0"
                                value={internalPrezzo ?? ''}
                                onChange={handlePrezzoChange}
                                placeholder="Prezzo se non c'è voce tariffario"
                                disabled={disabled}
                            />
                            <p className="text-xs text-gray-500">
                                Usato se non è selezionata una voce tariffario o l'azienda non ha tariffario associato.
                            </p>
                        </div>

                        {/* Info riepilogativa */}
                        <Alert className="mt-2">
                            <Settings className="h-4 w-4" />
                            <AlertDescription>
                                {selectedVoce ? (
                                    <>
                                        Prezzo: <strong>€{selectedVoce.prezzoBase}</strong> (da voce tariffario)
                                    </>
                                ) : internalPrezzo ? (
                                    <>
                                        Prezzo: <strong>€{internalPrezzo}</strong> (default)
                                    </>
                                ) : (
                                    'Nessun prezzo configurato - il questionario sarà gratuito'
                                )}
                            </AlertDescription>
                        </Alert>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default TariffazioneQuestionarioConfig;
