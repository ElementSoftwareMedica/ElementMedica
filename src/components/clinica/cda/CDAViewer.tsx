/**
 * P65 Fase 4 - CDA Viewer Component
 * 
 * Visualizzatore documenti CDA in formato human-readable
 * Supporta visualizzazione strutturata e XML raw
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FileText,
    Code,
    Download,
    CheckCircle,
    XCircle,
    AlertTriangle,
    User,
    Building2,
    Calendar,
    Shield,
    Stethoscope,
    ClipboardList
} from 'lucide-react';
import { type CDADocument, getCDAXmlDownloadUrl } from '@/services/cda-api';
import { cn } from '@/design-system/utils';

// ============================================
// TYPES
// ============================================

interface CDAViewerProps {
    cdaDocument?: CDADocument | null;
    xml?: string;
    showRawXml?: boolean;
    downloadEnabled?: boolean;
    onValidate?: () => void;
    isValidating?: boolean;
    className?: string;
}

interface ParsedCDA {
    title: string;
    effectiveTime: string;
    confidentialityCode: string;
    patient: {
        name: string;
        codiceFiscale?: string;
        gender?: string;
        birthDate?: string;
    };
    author: {
        name: string;
        prefix?: string;
    };
    custodian: string;
    sections: Array<{
        code: string;
        title: string;
        content: string;
    }>;
}

// ============================================
// XML PARSER
// ============================================

function parseCDAXml(xml: string): ParsedCDA | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');

        const getTextContent = (selector: string): string => {
            const element = doc.querySelector(selector);
            return element?.textContent?.trim() || '';
        };

        const getAttribute = (selector: string, attr: string): string => {
            const element = doc.querySelector(selector);
            return element?.getAttribute(attr) || '';
        };

        // Parse patient
        const patientGiven = getTextContent('recordTarget patientRole patient name given');
        const patientFamily = getTextContent('recordTarget patientRole patient name family');
        const patientCF = getAttribute('recordTarget patientRole id[root="2.16.840.1.113883.2.9.4.3.2"]', 'extension');
        const patientGender = getAttribute('recordTarget patientRole patient administrativeGenderCode', 'code');
        const patientBirth = getAttribute('recordTarget patientRole patient birthTime', 'value');

        // Parse author
        const authorPrefix = getTextContent('author assignedAuthor assignedPerson name prefix');
        const authorGiven = getTextContent('author assignedAuthor assignedPerson name given');
        const authorFamily = getTextContent('author assignedAuthor assignedPerson name family');

        // Parse sections
        const sections: ParsedCDA['sections'] = [];
        const sectionElements = doc.querySelectorAll('structuredBody component section');
        sectionElements.forEach((section) => {
            const code = section.querySelector('code')?.getAttribute('code') || '';
            const title = section.querySelector('title')?.textContent?.trim() || '';
            const text = section.querySelector('text')?.textContent?.trim() || '';
            if (title || text) {
                sections.push({ code, title, content: text });
            }
        });

        return {
            title: getTextContent('title'),
            effectiveTime: getAttribute('effectiveTime', 'value'),
            confidentialityCode: getAttribute('confidentialityCode', 'code'),
            patient: {
                name: `${patientGiven} ${patientFamily}`.trim(),
                codiceFiscale: patientCF,
                gender: patientGender === 'M' ? 'Maschio' : patientGender === 'F' ? 'Femmina' : undefined,
                birthDate: patientBirth ? formatHL7Date(patientBirth) : undefined
            },
            author: {
                name: `${authorGiven} ${authorFamily}`.trim(),
                prefix: authorPrefix
            },
            custodian: getTextContent('custodian assignedCustodian representedCustodianOrganization name'),
            sections
        };
    } catch (error) {
        return null;
    }
}

function formatHL7Date(hl7Date: string): string {
    if (!hl7Date || hl7Date.length < 8) return hl7Date;
    const year = hl7Date.substring(0, 4);
    const month = hl7Date.substring(4, 6);
    const day = hl7Date.substring(6, 8);
    return `${day}/${month}/${year}`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function ValidationBadge({ validato, errori, warnings }: {
    validato: boolean;
    errori: string[];
    warnings: string[];
}) {
    if (!validato && errori.length === 0) {
        return (
            <Badge variant="outline" className="text-gray-500">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Non validato
            </Badge>
        );
    }

    if (errori.length > 0) {
        return (
            <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                {errori.length} errori
            </Badge>
        );
    }

    return (
        <Badge variant="default" className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Valido {warnings.length > 0 && `(${warnings.length} avvisi)`}
        </Badge>
    );
}

function InfoRow({ icon: Icon, label, value, className }: {
    icon: React.ElementType;
    label: string;
    value?: string;
    className?: string;
}) {
    if (!value) return null;
    return (
        <div className={cn("flex items-center gap-2 text-sm", className)}>
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function SectionCard({ section }: { section: ParsedCDA['sections'][0] }) {
    return (
        <Card className="bg-muted/30">
            <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    {section.title || `Sezione ${section.code}`}
                    {section.code && (
                        <Badge variant="outline" className="text-xs font-normal">
                            LOINC: {section.code}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
                <p className="text-sm whitespace-pre-wrap">{section.content}</p>
            </CardContent>
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CDAViewer({
    cdaDocument,
    xml,
    showRawXml = true,
    downloadEnabled = true,
    onValidate,
    isValidating,
    className
}: CDAViewerProps) {
    const [activeTab, setActiveTab] = useState<'rendered' | 'xml'>('rendered');

    const cdaXml = xml || cdaDocument?.cdaXml || '';
    const parsedCDA = useMemo(() => parseCDAXml(cdaXml), [cdaXml]);

    if (!cdaXml) {
        return (
            <Card className={cn("p-6 text-center text-muted-foreground", className)}>
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun documento CDA disponibile</p>
            </Card>
        );
    }

    const handleDownload = () => {
        if (cdaDocument) {
            const url = getCDAXmlDownloadUrl(cdaDocument.sourceType, cdaDocument.sourceId);
            window.open(url, '_blank');
        } else if (xml) {
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'documento_cda.xml';
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <div>
                            <CardTitle className="text-base">
                                {cdaDocument?.titoloDocumento || parsedCDA?.title || 'Documento CDA'}
                            </CardTitle>
                            {cdaDocument && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {cdaDocument.sourceType} • Hash: {cdaDocument.hashXml.substring(0, 12)}...
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {cdaDocument && (
                            <ValidationBadge
                                validato={cdaDocument.validato}
                                errori={cdaDocument.erroriValidazione}
                                warnings={cdaDocument.warningsValidazione}
                            />
                        )}

                        {onValidate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onValidate}
                                disabled={isValidating}
                            >
                                <Shield className="w-4 h-4 mr-1" />
                                {isValidating ? 'Validazione...' : 'Valida'}
                            </Button>
                        )}

                        {downloadEnabled && (
                            <Button variant="outline" size="sm" onClick={handleDownload}>
                                <Download className="w-4 h-4 mr-1" />
                                XML
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rendered' | 'xml')}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="rendered" className="gap-1">
                            <FileText className="w-4 h-4" />
                            Visualizzazione
                        </TabsTrigger>
                        {showRawXml && (
                            <TabsTrigger value="xml" className="gap-1">
                                <Code className="w-4 h-4" />
                                XML
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="rendered" className="space-y-4">
                        {parsedCDA ? (
                            <>
                                {/* Header Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                            <User className="w-4 h-4" /> Paziente
                                        </h4>
                                        <InfoRow icon={User} label="Nome" value={parsedCDA.patient.name} />
                                        <InfoRow icon={Shield} label="C.F." value={parsedCDA.patient.codiceFiscale} />
                                        <InfoRow icon={Calendar} label="Nascita" value={parsedCDA.patient.birthDate} />
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4" /> Autore
                                        </h4>
                                        <InfoRow
                                            icon={Stethoscope}
                                            label="Medico"
                                            value={`${parsedCDA.author.prefix || ''} ${parsedCDA.author.name}`.trim()}
                                        />
                                        <InfoRow icon={Building2} label="Struttura" value={parsedCDA.custodian} />
                                        <InfoRow icon={Calendar} label="Data" value={formatHL7Date(parsedCDA.effectiveTime)} />
                                    </div>
                                </div>

                                {/* Sections */}
                                {parsedCDA.sections.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-sm">Contenuto Documento</h4>
                                        {parsedCDA.sections.map((section, idx) => (
                                            <SectionCard key={idx} section={section} />
                                        ))}
                                    </div>
                                )}

                                {parsedCDA.sections.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                        Nessuna sezione strutturata trovata nel documento
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                                <p>Impossibile interpretare il documento CDA</p>
                                <p className="text-xs mt-1">Visualizza la tab XML per vedere il contenuto raw</p>
                            </div>
                        )}
                    </TabsContent>

                    {showRawXml && (
                        <TabsContent value="xml">
                            <div className="relative">
                                <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-xs font-mono max-h-[500px] overflow-y-auto">
                                    <code>{cdaXml}</code>
                                </pre>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>

                {/* Validation Errors/Warnings */}
                {cdaDocument && (cdaDocument.erroriValidazione.length > 0 || cdaDocument.warningsValidazione.length > 0) && (
                    <div className="mt-4 space-y-2">
                        {cdaDocument.erroriValidazione.map((err, idx) => (
                            <div key={`err-${idx}`} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{err}</span>
                            </div>
                        ))}
                        {cdaDocument.warningsValidazione.map((warn, idx) => (
                            <div key={`warn-${idx}`} className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{warn}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default CDAViewer;
