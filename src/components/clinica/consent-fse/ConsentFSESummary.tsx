/**
 * P65 - ConsentFSE Summary Component
 * 
 * Componente compatto per visualizzare riepilogo consensi FSE.
 * Usato nella scheda paziente per mostrare stato veloce.
 * 
 * @module components/clinica/consent-fse
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ChevronRight,
    EyeOff
} from 'lucide-react';
import { usePersonConsents, useObscurationStatus } from '@/hooks/consent-fse';

interface ConsentFSESummaryProps {
    personId: string;
    onViewDetails?: () => void;
    compact?: boolean;
}

/**
 * Riepilogo consensi FSE per scheda paziente
 */
export function ConsentFSESummary({
    personId,
    onViewDetails,
    compact = false
}: ConsentFSESummaryProps) {
    const { data: consents, isLoading } = usePersonConsents(personId);
    const { data: obscuration } = useObscurationStatus(personId);

    if (isLoading) {
        return (
            <Card className={compact ? 'p-3' : ''}>
                <CardContent className="py-4">
                    <div className="animate-pulse flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const summary = consents?.summary;
    const progress = summary ? (summary.given / summary.total) * 100 : 0;
    const hasObscuration = obscuration?.oscuramentoAttivo;

    // Versione compatta per sidebar
    if (compact) {
        return (
            <div
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={onViewDetails}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-teal-600" />
                        <span className="text-sm font-medium">Consensi FSE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={progress >= 50 ? 'default' : 'secondary'}
                            className={progress >= 50 ? 'bg-green-100 text-green-700' : ''}
                        >
                            {summary?.given || 0}/{summary?.total || 0}
                        </Badge>
                        {hasObscuration && (
                            <span title="Oscuramento attivo">
                                <EyeOff className="h-4 w-4 text-red-500" />
                            </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                </div>
            </div>
        );
    }

    // Versione estesa
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-5 w-5 text-teal-600" />
                        Consensi FSE
                    </CardTitle>
                    {onViewDetails && (
                        <Button variant="ghost" size="sm" onClick={onViewDetails}>
                            Gestisci
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completamento</span>
                        <span className="font-medium">
                            {summary?.given || 0} / {summary?.total || 0} consensi
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                    {(summary?.given ?? 0) > 0 && (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            {summary?.given} attivi
                        </Badge>
                    )}
                    {(summary?.revoked ?? 0) > 0 && (
                        <Badge variant="outline" className="gap-1 text-orange-600 border-orange-200">
                            <XCircle className="h-3 w-3" />
                            {summary?.revoked} revocati
                        </Badge>
                    )}
                    {(summary?.pending ?? 0) > 0 && (
                        <Badge variant="outline" className="gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            {summary?.pending} da acquisire
                        </Badge>
                    )}
                </div>

                {/* Oscuramento status */}
                {hasObscuration && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">
                            Oscuramento attivo ({obscuration.tipiDatiOscurati.length} tipi di dati)
                        </span>
                    </div>
                )}

                {/* Critical consents status */}
                {consents?.consents && (
                    <div className="space-y-1 pt-2 border-t">
                        <p className="text-xs text-gray-500 mb-2">Consensi principali:</p>
                        <ConsentStatusLine
                            label="Alimentazione FSE"
                            given={consents.consents.ALIMENTAZIONE?.consentGiven}
                        />
                        <ConsentStatusLine
                            label="Consultazione"
                            given={consents.consents.CONSULTAZIONE?.consentGiven}
                        />
                        <ConsentStatusLine
                            label="Condivisione MC"
                            given={consents.consents.CONDIVISIONE_MC?.consentGiven}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Linea stato singolo consenso
 */
function ConsentStatusLine({ label, given }: { label: string; given?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            {given ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
                <XCircle className="h-4 w-4 text-gray-300" />
            )}
        </div>
    );
}

export default ConsentFSESummary;
