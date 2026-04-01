/**
 * P65 - ConsentFSE Form Component
 * 
 * Form per raccolta consensi FSE con:
 * - Checkbox per ogni tipo di consenso
 * - Selezione modalità raccolta
 * - Supporto deleghe
 * - Visualizzazione riferimenti legali
 * 
 * @module components/clinica/consent-fse
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, FileCheck, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';
import { useConsentFSE } from '@/hooks/consent-fse';
import type { UpsertConsentRequest, ConsentMapItem } from '@/services/consent-fse-api';

interface ConsentFSEFormProps {
    personId: string;
    personName?: string;
    readOnly?: boolean;
    onSaveComplete?: () => void;
    showObscuration?: boolean;
}

/**
 * Componente principale per gestione consensi FSE
 */
export function ConsentFSEForm({
    personId,
    personName,
    readOnly = false,
    onSaveComplete,
    showObscuration = true
}: ConsentFSEFormProps) {
    const {
        types,
        consents,
        obscuration,
        isLoading,
        isUpdating,
        batchUpsertConsents,
        setObscuration,
        refetch
    } = useConsentFSE(personId);

    // Stato locale per modifiche pending
    const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
    const [selectedMethod, setSelectedMethod] = useState<string>('DIGITALE_FIRMA_GRAFOMETRICA');
    const [pendingObscuration, setPendingObscuration] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Inizializza stato oscuramento quando cambia
    useEffect(() => {
        if (obscuration?.tipiDatiOscurati) {
            setPendingObscuration(obscuration.tipiDatiOscurati);
        }
    }, [obscuration?.tipiDatiOscurati]);

    // Raggruppa consensi per categoria
    const groupedConsents = useMemo(() => {
        if (!consents?.consents) return { base: [], mdl: [] };

        const base: [string, ConsentMapItem][] = [];
        const mdl: [string, ConsentMapItem][] = [];

        Object.entries(consents.consents).forEach(([key, value]) => {
            if (key.startsWith('CONDIVISIONE_')) {
                mdl.push([key, value]);
            } else {
                base.push([key, value]);
            }
        });

        return { base, mdl };
    }, [consents?.consents]);

    // Gestisce cambio checkbox consenso
    const handleConsentChange = (tipoConsenso: string, checked: boolean) => {
        setPendingChanges(prev => ({
            ...prev,
            [tipoConsenso]: checked
        }));
        setHasChanges(true);
    };

    // Gestisce cambio checkbox oscuramento
    const handleObscurationChange = (tipo: string, checked: boolean) => {
        setPendingObscuration(prev => {
            if (checked) {
                return [...prev, tipo];
            }
            return prev.filter(t => t !== tipo);
        });
        setHasChanges(true);
    };

    // Salva tutti i consensi modificati
    const handleSave = async () => {
        // Prepara consensi da salvare
        const consentsToSave: UpsertConsentRequest[] = Object.entries(pendingChanges).map(
            ([tipoConsenso, consentGiven]) => ({
                tipoConsenso,
                consentGiven,
                modalitaRaccolta: selectedMethod
            })
        );

        if (consentsToSave.length > 0) {
            batchUpsertConsents(consentsToSave);
        }

        // Salva oscuramento se modificato
        if (showObscuration && pendingObscuration.join(',') !== obscuration?.tipiDatiOscurati.join(',')) {
            setObscuration(pendingObscuration);
        }

        setPendingChanges({});
        setHasChanges(false);
        onSaveComplete?.();
    };

    // Ottiene stato effettivo del consenso (con pending changes)
    const getConsentValue = (tipoConsenso: string): boolean => {
        if (tipoConsenso in pendingChanges) {
            return pendingChanges[tipoConsenso];
        }
        return consents?.consents[tipoConsenso]?.consentGiven || false;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-3 text-gray-600">Caricamento consensi FSE...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-teal-600" />
                        <div>
                            <CardTitle>Consensi FSE - Fascicolo Sanitario Elettronico</CardTitle>
                            <CardDescription>
                                {personName && <span className="font-medium">{personName}</span>}
                                {' - '}Art. 12 D.L. 179/2012
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {consents?.summary.given || 0} / {consents?.summary.total || 0} consensi attivi
                            </Badge>
                            {(consents?.summary?.revoked ?? 0) > 0 && (
                                <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {consents?.summary?.revoked} revocati
                                </Badge>
                            )}
                        </div>

                        {/* Selezione modalità raccolta */}
                        {!readOnly && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-gray-600">Modalità raccolta:</Label>
                                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                                    <SelectTrigger className="w-[240px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types?.collectionMethods.map(method => (
                                            <SelectItem key={method.tipo} value={method.tipo}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Consensi Base FSE */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                        Consensi Base FSE
                    </CardTitle>
                    <CardDescription>
                        Consensi obbligatori per l'utilizzo del Fascicolo Sanitario Elettronico
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {groupedConsents.base.map(([tipo, item]) => (
                        <ConsentCheckbox
                            key={tipo}
                            tipo={tipo}
                            item={item}
                            checked={getConsentValue(tipo)}
                            onChange={(checked) => handleConsentChange(tipo, checked)}
                            readOnly={readOnly}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Consensi MDL */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        Consensi Medicina del Lavoro
                    </CardTitle>
                    <CardDescription>
                        Consensi per condivisione dati con figure aziendali (D.Lgs. 81/2008)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {groupedConsents.mdl.map(([tipo, item]) => (
                        <ConsentCheckbox
                            key={tipo}
                            tipo={tipo}
                            item={item}
                            checked={getConsentValue(tipo)}
                            onChange={(checked) => handleConsentChange(tipo, checked)}
                            readOnly={readOnly}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Oscuramento Dati */}
            {showObscuration && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Oscuramento Dati Sensibili
                        </CardTitle>
                        <CardDescription>
                            Seleziona i tipi di dati da oscurare nel FSE (Art. 5 D.L. 179/2012)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!consents?.consents.ALIMENTAZIONE?.consentGiven ? (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    L'oscuramento dati è disponibile solo dopo aver attivato il consenso all'alimentazione FSE.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {types?.clinicalDataTypes.map(dataType => (
                                    <div
                                        key={dataType.tipo}
                                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                                    >
                                        <Checkbox
                                            id={`obscure-${dataType.tipo}`}
                                            checked={pendingObscuration.includes(dataType.tipo)}
                                            onCheckedChange={(checked) => handleObscurationChange(dataType.tipo, checked as boolean)}
                                            disabled={readOnly}
                                        />
                                        <Label
                                            htmlFor={`obscure-${dataType.tipo}`}
                                            className="text-sm cursor-pointer flex-1"
                                        >
                                            {dataType.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Azioni */}
            {!readOnly && (
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setPendingChanges({});
                            setPendingObscuration(obscuration?.tipiDatiOscurati || []);
                            setHasChanges(false);
                            refetch();
                        }}
                        disabled={!hasChanges || isUpdating}
                    >
                        Annulla modifiche
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isUpdating}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Salva consensi
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * Componente checkbox singolo consenso
 */
interface ConsentCheckboxProps {
    tipo: string;
    item: ConsentMapItem;
    checked: boolean;
    onChange: (checked: boolean) => void;
    readOnly?: boolean;
}

function ConsentCheckbox({ tipo, item, checked, onChange, readOnly }: ConsentCheckboxProps) {
    return (
        <div className={`
      p-4 border rounded-lg transition-colors
      ${checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
      ${item.isExpired ? 'opacity-60' : ''}
    `}>
            <div className="flex items-start gap-3">
                <Checkbox
                    id={`consent-${tipo}`}
                    checked={checked}
                    onCheckedChange={(value) => onChange(value as boolean)}
                    disabled={readOnly}
                    className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <Label
                            htmlFor={`consent-${tipo}`}
                            className="font-medium cursor-pointer"
                        >
                            {item.label}
                        </Label>
                        {item.required && (
                            <Badge variant="destructive" className="text-xs">
                                Obbligatorio
                            </Badge>
                        )}
                        {item.isExpired && (
                            <Badge variant="secondary" className="text-xs">
                                Scaduto
                            </Badge>
                        )}
                        {item.consent?.revokedAt && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                Revocato
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {item.legalReference}
                    </p>
                    {item.consent?.delegato && (
                        <p className="text-xs text-blue-600">
                            Delegato: {item.consent.delegato.firstName} {item.consent.delegato.lastName}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ConsentFSEForm;
