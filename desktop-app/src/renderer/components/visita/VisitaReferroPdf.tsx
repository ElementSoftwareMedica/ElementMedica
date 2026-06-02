import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    pdf,
} from '@react-pdf/renderer'
import { saveAs } from 'file-saver'

// ============================================================
// Types
// ============================================================

export interface VisitaReferroPdfData {
    visitId: string
    dataOra: string | null
    stato: string
    tipoVisitaMDL: string | null
    prestazioneNome: string | null
    // Patient
    personFirstName: string | null
    personLastName: string | null
    personTaxCode: string | null
    patientBirthDate?: string | null
    patientGender?: string | null
    patientResidenceCity?: string | null
    // Medico
    medicoFirstName: string | null
    medicoLastName: string | null
    // Company
    companyName: string | null
    // Visit structured data
    formValues: Record<string, unknown>
    durataMinuti?: number | null
}

// ============================================================
// Helpers
// ============================================================

function fmtDate(d: string | null | undefined): string {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
        return d
    }
}

function fmtDateTime(d: string | null | undefined): string {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return d }
}

function strVal(v: unknown): string {
    if (v == null || v === '') return ''
    return String(v)
}

// Labels for form keys
const FIELD_LABELS: Record<string, string> = {
    anamnesiLavorativa: 'Anamnesi Lavorativa',
    anamnesiPatologicaRemota: 'Anamnesi Patologica Remota',
    anamnesiPatologicaProssima: 'Anamnesi Patologica Prossima',
    anamnesiFamiliare: 'Anamnesi Familiare',
    anamnesiFisiologica: 'Anamnesi Fisiologica',
    peso: 'Peso (kg)',
    altezza: 'Altezza (cm)',
    paSistolica: 'PA Sistolica (mmHg)',
    paDiastolica: 'PA Diastolica (mmHg)',
    fc: 'FC (bpm)',
    spo2: 'SpO₂ (%)',
    temperatura: 'Temperatura (°C)',
    visusOD: 'Visus OD',
    visusOS: 'Visus OS',
    esameObiettivoGenerale: 'Condizioni Generali',
    esameObiettivoCuore: 'Apparato Cardiovascolare',
    esameObiettivoPolmoni: 'Apparato Respiratorio',
    esameObiettivoAddome: 'Addome',
    esameObiettivoLocomotore: 'Apparato Locomotore',
    esameObiettivoNeurologico: 'Apparato Neurologico',
    esameObiettivoCute: 'Cute e Annessi',
    diagnosiPrincipale: 'Diagnosi Principale',
    codiceICD: 'Codice ICD-10',
    diagnosiSecondaria: 'Diagnosi Secondaria',
    noteDiagnostiche: 'Note Diagnostiche',
    terapia: 'Terapia',
    prescrizioni: 'Prescrizioni',
    noteInterne: 'Note Interne',
    notePazienti: 'Note per il Paziente',
}

const SECTIONS_ORDER: Array<{ key: string; label: string; fields: (keyof typeof FIELD_LABELS)[] }> = [
    {
        key: 'anamnesi', label: 'Anamnesi',
        fields: ['anamnesiLavorativa', 'anamnesiPatologicaRemota', 'anamnesiPatologicaProssima', 'anamnesiFamiliare', 'anamnesiFisiologica']
    },
    {
        key: 'vitali', label: 'Parametri Vitali',
        fields: ['peso', 'altezza', 'paSistolica', 'paDiastolica', 'fc', 'spo2', 'temperatura', 'visusOD', 'visusOS']
    },
    {
        key: 'esame', label: 'Esame Obiettivo',
        fields: ['esameObiettivoGenerale', 'esameObiettivoCuore', 'esameObiettivoPolmoni', 'esameObiettivoAddome', 'esameObiettivoLocomotore', 'esameObiettivoNeurologico', 'esameObiettivoCute']
    },
    {
        key: 'diagnosi', label: 'Diagnosi',
        fields: ['diagnosiPrincipale', 'codiceICD', 'diagnosiSecondaria', 'noteDiagnostiche']
    },
    {
        key: 'terapia', label: 'Terapia & Prescrizioni',
        fields: ['terapia', 'prescrizioni']
    },
    {
        key: 'note', label: 'Note',
        fields: ['noteInterne', 'notePazienti']
    },
]

// ============================================================
// PDF Styles
// ============================================================

const S = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 9.5,
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 42,
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
    },
    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '1.5pt solid #0f766e',
        paddingBottom: 8,
        marginBottom: 14,
    },
    titleMain: {
        fontSize: 15,
        fontFamily: 'Helvetica-Bold',
        color: '#0f766e',
        letterSpacing: 0.5,
    },
    titleSub: {
        fontSize: 8.5,
        color: '#6b7280',
        marginTop: 2,
    },
    docRef: {
        fontSize: 8,
        color: '#9ca3af',
        textAlign: 'right',
    },
    // Patient box
    patientBox: {
        backgroundColor: '#f0fdf4',
        borderRadius: 4,
        border: '1pt solid #bbf7d0',
        padding: 10,
        marginBottom: 12,
    },
    patientName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#14532d',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    infoItem: {
        fontSize: 8.5,
        color: '#374151',
    },
    infoLabel: {
        fontFamily: 'Helvetica-Bold',
        color: '#6b7280',
    },
    // Visit info row
    visitInfoBox: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    visitInfoItem: {
        flex: 1,
        backgroundColor: '#f9fafb',
        border: '1pt solid #e5e7eb',
        borderRadius: 4,
        padding: 7,
    },
    visitInfoLabel: {
        fontSize: 7.5,
        color: '#9ca3af',
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    visitInfoValue: {
        fontSize: 9,
        color: '#1f2937',
        fontFamily: 'Helvetica-Bold',
    },
    // Sections
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#0f766e',
        borderBottom: '0.8pt solid #d1fae5',
        paddingBottom: 3,
        marginBottom: 7,
        marginTop: 12,
    },
    fieldRow: {
        marginBottom: 6,
    },
    fieldLabel: {
        fontSize: 7.5,
        color: '#6b7280',
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    fieldValue: {
        fontSize: 9.5,
        color: '#111827',
        lineHeight: 1.5,
    },
    // Two-column grid for vitals
    twoColRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4,
    },
    twoColItem: {
        width: '45%',
        marginBottom: 4,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 42,
        right: 42,
        borderTop: '0.8pt solid #e5e7eb',
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 7.5,
        color: '#9ca3af',
    },
    // Signature
    signatureBox: {
        marginTop: 24,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    signatureLine: {
        width: 180,
        borderTop: '1pt solid #374151',
        paddingTop: 4,
        fontSize: 8,
        color: '#374151',
        textAlign: 'center',
    },
})

// ============================================================
// PDF Document Component
// ============================================================

function VisitaRefertoPdfDoc({ data }: { data: VisitaReferroPdfData }): JSX.Element {
    const patientFullName = [data.personLastName, data.personFirstName].filter(Boolean).join(' ') || 'Paziente'
    const medicoFullName = ['Dott.', data.medicoLastName, data.medicoFirstName].filter(Boolean).join(' ') || 'Medico'
    const now = new Date().toLocaleString('it-IT')

    // Determine which sections/fields have data
    const sectionsWithData = SECTIONS_ORDER.map(s => ({
        ...s,
        rows: s.fields
            .filter(f => {
                const v = strVal(data.formValues[f])
                return v.length > 0
            })
            .map(f => ({ label: FIELD_LABELS[f] || f, value: strVal(data.formValues[f]) }))
    })).filter(s => s.rows.length > 0)

    const isVitalsSection = (key: string) => key === 'vitali'

    return (
        <Document title={`Referto Visita — ${patientFullName}`} author={medicoFullName}>
            <Page size="A4" style={S.page}>
                {/* Header */}
                <View style={S.headerRow}>
                    <View>
                        <Text style={S.titleMain}>REFERTO DI VISITA MEDICA</Text>
                        <Text style={S.titleSub}>
                            {data.tipoVisitaMDL ? `Medicina del Lavoro — ${data.tipoVisitaMDL}` : 'Visita Medica'}
                            {data.prestazioneNome ? ` · ${data.prestazioneNome}` : ''}
                        </Text>
                    </View>
                    <View>
                        <Text style={S.docRef}>Data: {fmtDateTime(data.dataOra)}</Text>
                        <Text style={S.docRef}>Generato il: {now}</Text>
                    </View>
                </View>

                {/* Patient info */}
                <View style={S.patientBox}>
                    <Text style={S.patientName}>{patientFullName}</Text>
                    <View style={S.infoRow}>
                        {data.personTaxCode && (
                            <Text style={S.infoItem}><Text style={S.infoLabel}>CF: </Text>{data.personTaxCode}</Text>
                        )}
                        {data.patientBirthDate && (
                            <Text style={S.infoItem}><Text style={S.infoLabel}>Nascita: </Text>{fmtDate(data.patientBirthDate)}</Text>
                        )}
                        {data.patientGender && (
                            <Text style={S.infoItem}><Text style={S.infoLabel}>Sesso: </Text>{data.patientGender === 'M' ? 'Maschio' : 'Femmina'}</Text>
                        )}
                        {data.patientResidenceCity && (
                            <Text style={S.infoItem}><Text style={S.infoLabel}>Residenza: </Text>{data.patientResidenceCity}</Text>
                        )}
                        {data.companyName && (
                            <Text style={S.infoItem}><Text style={S.infoLabel}>Azienda: </Text>{data.companyName}</Text>
                        )}
                    </View>
                </View>

                {/* Visit metadata */}
                <View style={S.visitInfoBox}>
                    <View style={S.visitInfoItem}>
                        <Text style={S.visitInfoLabel}>Prestazione</Text>
                        <Text style={S.visitInfoValue}>{data.prestazioneNome || 'Visita medica'}</Text>
                    </View>
                    <View style={S.visitInfoItem}>
                        <Text style={S.visitInfoLabel}>Data visita</Text>
                        <Text style={S.visitInfoValue}>{fmtDateTime(data.dataOra)}</Text>
                    </View>
                    <View style={S.visitInfoItem}>
                        <Text style={S.visitInfoLabel}>Medico</Text>
                        <Text style={S.visitInfoValue}>{medicoFullName}</Text>
                    </View>
                </View>

                {/* Clinical sections */}
                {sectionsWithData.map(section => (
                    <View key={section.key} wrap={false}>
                        <Text style={S.sectionTitle}>{section.label}</Text>
                        {isVitalsSection(section.key) ? (
                            <View style={S.twoColRow}>
                                {section.rows.map(row => (
                                    <View key={row.label} style={S.twoColItem}>
                                        <Text style={S.fieldLabel}>{row.label}</Text>
                                        <Text style={S.fieldValue}>{row.value}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            section.rows.map(row => (
                                <View key={row.label} style={S.fieldRow}>
                                    <Text style={S.fieldLabel}>{row.label}</Text>
                                    <Text style={S.fieldValue}>{row.value}</Text>
                                </View>
                            ))
                        )}
                    </View>
                ))}

                {/* Signature */}
                <View style={S.signatureBox}>
                    <Text style={S.signatureLine}>{medicoFullName}</Text>
                </View>

                {/* Footer */}
                <View style={S.footer} fixed>
                    <Text style={S.footerText}>Documento generato dal sistema ElementMedica Desktop</Text>
                    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} di ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}

// ============================================================
// Download Function (dynamically imported)
// ============================================================

export async function createVisitaReferroPdfBlob(data: VisitaReferroPdfData): Promise<Blob> {
    return pdf(<VisitaRefertoPdfDoc data={data} />).toBlob()
}

export async function downloadVisitaReferroPdf(data: VisitaReferroPdfData): Promise<void> {
    const blob = await createVisitaReferroPdfBlob(data)
    const patientSlug = [data.personLastName, data.personFirstName].filter(Boolean).join('_').replace(/\s+/g, '_') || 'Paziente'
    const dateSlug = data.dataOra ? new Date(data.dataOra).toISOString().split('T')[0] : 'data'
    saveAs(blob, `Referto_${patientSlug}_${dateSlug}.pdf`)
}
