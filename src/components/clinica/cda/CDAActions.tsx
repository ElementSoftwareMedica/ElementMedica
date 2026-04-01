/**
 * P65 Fase 4 - CDA Actions Component
 * 
 * Bottoni e azioni per generazione/gestione CDA
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Download, Eye, RefreshCw } from 'lucide-react';
import { CDAViewer } from './CDAViewer';
import {
    useCDADocument,
    useGenerateCDAFromReferto,
    useGenerateCDAFromGiudizio,
    useValidateCDA
} from '@/hooks/cda';
import { type CDASourceType } from '@/services/cda-api';
import { cn } from '@/design-system/utils';

// ============================================
// TYPES
// ============================================

interface CDAActionsProps {
    sourceType: CDASourceType;
    sourceId: string;
    showPreview?: boolean;
    variant?: 'default' | 'compact';
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function CDAActions({
    sourceType,
    sourceId,
    showPreview = true,
    variant = 'default',
    className
}: CDAActionsProps) {
    const [showViewer, setShowViewer] = useState(false);

    const { data: cdaDocument, isLoading: isLoadingDoc } = useCDADocument(sourceType, sourceId);
    const generateReferto = useGenerateCDAFromReferto();
    const generateGiudizio = useGenerateCDAFromGiudizio();
    const validateCDA = useValidateCDA();

    const isGenerating = generateReferto.isPending || generateGiudizio.isPending;

    const handleGenerate = async () => {
        if (sourceType === 'REFERTO') {
            await generateReferto.mutateAsync(sourceId);
        } else if (sourceType === 'GIUDIZIO_IDONEITA') {
            await generateGiudizio.mutateAsync(sourceId);
        }
    };

    const handleValidate = () => {
        if (cdaDocument?.id) {
            validateCDA.mutate(cdaDocument.id);
        }
    };

    const hasCDA = !!cdaDocument;

    if (variant === 'compact') {
        return (
            <>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={hasCDA ? () => setShowViewer(true) : handleGenerate}
                    disabled={isGenerating || isLoadingDoc}
                    className={cn("gap-1", className)}
                >
                    {isGenerating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : hasCDA ? (
                        <Eye className="w-3 h-3" />
                    ) : (
                        <FileText className="w-3 h-3" />
                    )}
                    {hasCDA ? 'CDA' : 'Genera CDA'}
                </Button>

                <Dialog open={showViewer} onOpenChange={setShowViewer}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Documento CDA</DialogTitle>
                        </DialogHeader>
                        <CDAViewer
                            cdaDocument={cdaDocument}
                            onValidate={handleValidate}
                            isValidating={validateCDA.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {!hasCDA ? (
                <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating || isLoadingDoc}
                >
                    {isGenerating ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generazione...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4 mr-2" />
                            Genera CDA HL7
                        </>
                    )}
                </Button>
            ) : (
                <>
                    {showPreview && (
                        <Button
                            variant="outline"
                            onClick={() => setShowViewer(true)}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizza CDA
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                        Rigenera
                    </Button>
                </>
            )}

            <Dialog open={showViewer} onOpenChange={setShowViewer}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Documento CDA HL7</DialogTitle>
                    </DialogHeader>
                    <CDAViewer
                        cdaDocument={cdaDocument}
                        onValidate={handleValidate}
                        isValidating={validateCDA.isPending}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default CDAActions;
