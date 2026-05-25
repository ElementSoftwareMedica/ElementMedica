import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    pdf,
} from '@react-pdf/renderer'

// ============================================================
// Types
// ============================================================

export interface GiudizioIdoneita {
    id: string
    tipo: string | null
    esito: string | null
    limitazioni: string | null
    prescrizioni: string | null
    dataEmissione: string | null
    dataScadenza: string | null
    note: string | null
    firmaMedico: string | null
    protocolloNumero: string | null
}

export interface GiudizioIdoneitaPdfProps {
    giudizio: GiudizioIdoneita
    patientName: string
    patientTaxCode?: string
    medicoName: string
    mansioneNome?: string
    generatedAt?: string
}

// ============================================================
// Helpers
// ============================================================

const GIUDIZIO_LABELS: Record<string, string> = {
    IDONEO: 'IDONEO',
    IDONEO_CON_PRESCRIZIONI: 'IDONEO CON PRESCRIZIONI',
    IDONEO_CON_LIMITAZIONI: 'IDONEO CON LIMITAZIONI',
    NON_IDONEO_TEMPORANEO: 'TEMPORANEAMENTE NON IDONEO',
    NON_IDONEO_PERMANENTE: 'NON IDONEO',
}

const TIPI_VISITA_LABELS: Record<string, string> = {
    PREVENTIVA: 'Preventiva',
    PERIODICA: 'Periodica',
    STRAORDINARIA: 'Straordinaria',
    PREASSUNTIVA: 'Preassuntiva',
    CESSAZIONE: 'A cessazione rapporto',
}

function fmtDate(d: string | null | undefined): string {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
        return d
    }
}

// ============================================================
// Styles
// ============================================================

const S = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        paddingTop: 40,
        paddingBottom: 50,
        paddingHorizontal: 45,
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
    },
    // Header
    headerBox: {
        borderBottom: '1.5pt solid #0f766e',
        paddingBottom: 10,
        marginBottom: 16,
    },
    titleMain: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#0f766e',
        letterSpacing: 0.5,
    },
    titleSub: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 2,
    },
    protocolloRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    protocolloText: {
        fontSize: 8,
        color: '#9ca3af',
    },
    // Section
    sectionTitle: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 5,
        marginTop: 12,
    },
    // Info grid
    infoGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 4,
    },
    infoCell: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        padding: '6 8',
    },
    infoCellLabel: {
        fontSize: 8,
        color: '#9ca3af',
        marginBottom: 2,
    },
    infoCellValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
    },
    // Giudizio box
    giudizioBox: {
        borderRadius: 6,
        padding: '10 14',
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    giudizioText: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1,
    },
    // Content block
    contentBlock: {
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        padding: '7 10',
        marginBottom: 8,
    },
    contentBlockLabel: {
        fontSize: 8,
        color: '#6b7280',
        marginBottom: 3,
        fontFamily: 'Helvetica-Bold',
    },
    contentBlockText: {
        fontSize: 10,
        color: '#111827',
        lineHeight: 1.5,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 45,
        right: 45,
        borderTop: '0.5pt solid #e5e7eb',
        paddingTop: 8,
    },
    footerGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerLeft: {
        fontSize: 8,
        color: '#9ca3af',
        lineHeight: 1.4,
    },
    footerRight: {
        fontSize: 8,
        color: '#9ca3af',
        textAlign: 'right',
        lineHeight: 1.4,
    },
    ricorsoBox: {
        marginTop: 20,
        padding: '8 10',
        border: '0.5pt solid #d1d5db',
        borderRadius: 4,
    },
    ricorsoTitle: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
        marginBottom: 3,
    },
    ricorsoText: {
        fontSize: 7.5,
        color: '#6b7280',
        lineHeight: 1.5,
    },
    row: { flexDirection: 'row', gap: 8 },
    divider: { height: '0.5pt', backgroundColor: '#e5e7eb', marginVertical: 8 },
})

// ============================================================
// PDF Document Component
// ============================================================

function GiudizioIdoneitaDocument({
    giudizio,
    patientName,
    patientTaxCode,
    medicoName,
    mansioneNome,
    generatedAt,
}: GiudizioIdoneitaPdfProps) {
    const esito = giudizio.esito || ''
    const esitoLabel = GIUDIZIO_LABELS[esito] ?? esito

    const giudizioStyle: { backgroundColor: string; color: string } = (() => {
        switch (esito) {
            case 'IDONEO': return { backgroundColor: '#dcfce7', color: '#166534' }
            case 'IDONEO_CON_PRESCRIZIONI': return { backgroundColor: '#fef9c3', color: '#854d0e' }
            case 'IDONEO_CON_LIMITAZIONI': return { backgroundColor: '#ffedd5', color: '#9a3412' }
            case 'NON_IDONEO_TEMPORANEO': return { backgroundColor: '#fee2e2', color: '#991b1b' }
            case 'NON_IDONEO_PERMANENTE': return { backgroundColor: '#fce7f3', color: '#9d174d' }
            default: return { backgroundColor: '#f3f4f6', color: '#374151' }
        }
    })()

    const emissione = fmtDate(giudizio.dataEmissione)
    const scadenza = fmtDate(giudizio.dataScadenza)
    const tipo = giudizio.tipo ? (TIPI_VISITA_LABELS[giudizio.tipo] ?? giudizio.tipo) : '—'

    return (
        <Document title={`Giudizio Idoneità — ${patientName}`} author="ElementMedica">
            <Page size="A4" style={S.page}>

                {/* Header */}
                <View style={S.headerBox}>
                    <Text style={S.titleMain}>GIUDIZIO DI IDONEITÀ ALLA MANSIONE</Text>
                    <Text style={S.titleSub}>Art. 41 D.Lgs 81/2008 — Sorveglianza Sanitaria</Text>
                    {giudizio.protocolloNumero && (
                        <View style={S.protocolloRow}>
                            <Text style={S.protocolloText}>Protocollo n° {giudizio.protocolloNumero}</Text>
                        </View>
                    )}
                </View>

                {/* Dati lavoratore + visita */}
                <Text style={S.sectionTitle}>Dati lavoratore e visita</Text>
                <View style={S.infoGrid}>
                    <View style={S.infoCell}>
                        <Text style={S.infoCellLabel}>LAVORATORE</Text>
                        <Text style={S.infoCellValue}>{patientName || '—'}</Text>
                        {patientTaxCode && <Text style={[S.infoCellLabel, { marginTop: 2 }]}>C.F. {patientTaxCode}</Text>}
                    </View>
                    <View style={S.infoCell}>
                        <Text style={S.infoCellLabel}>MEDICO COMPETENTE</Text>
                        <Text style={S.infoCellValue}>{medicoName || '—'}</Text>
                    </View>
                </View>
                <View style={[S.infoGrid, { marginTop: 4 }]}>
                    {mansioneNome && (
                        <View style={S.infoCell}>
                            <Text style={S.infoCellLabel}>MANSIONE</Text>
                            <Text style={S.infoCellValue}>{mansioneNome}</Text>
                        </View>
                    )}
                    <View style={S.infoCell}>
                        <Text style={S.infoCellLabel}>TIPO VISITA</Text>
                        <Text style={S.infoCellValue}>{tipo}</Text>
                    </View>
                    <View style={S.infoCell}>
                        <Text style={S.infoCellLabel}>DATA EMISSIONE</Text>
                        <Text style={S.infoCellValue}>{emissione}</Text>
                    </View>
                    {giudizio.dataScadenza && (
                        <View style={S.infoCell}>
                            <Text style={S.infoCellLabel}>SCADENZA</Text>
                            <Text style={S.infoCellValue}>{scadenza}</Text>
                        </View>
                    )}
                </View>

                {/* Giudizio */}
                <Text style={S.sectionTitle}>Esito</Text>
                <View style={[S.giudizioBox, { backgroundColor: giudizioStyle.backgroundColor }]}>
                    <Text style={[S.giudizioText, { color: giudizioStyle.color }]}>{esitoLabel}</Text>
                </View>

                {/* Prescrizioni */}
                {giudizio.prescrizioni && (
                    <>
                        <View style={S.divider} />
                        <View style={S.contentBlock}>
                            <Text style={S.contentBlockLabel}>PRESCRIZIONI</Text>
                            <Text style={S.contentBlockText}>{giudizio.prescrizioni}</Text>
                        </View>
                    </>
                )}

                {/* Limitazioni */}
                {giudizio.limitazioni && (
                    <View style={S.contentBlock}>
                        <Text style={S.contentBlockLabel}>LIMITAZIONI</Text>
                        <Text style={S.contentBlockText}>{giudizio.limitazioni}</Text>
                    </View>
                )}

                {/* Note */}
                {giudizio.note && (
                    <View style={S.contentBlock}>
                        <Text style={S.contentBlockLabel}>NOTE</Text>
                        <Text style={S.contentBlockText}>{giudizio.note}</Text>
                    </View>
                )}

                {/* Ricorso */}
                <View style={S.ricorsoBox}>
                    <Text style={S.ricorsoTitle}>AVVISO — Diritto di Ricorso (Art. 41 c.9 D.Lgs 81/2008)</Text>
                    <Text style={S.ricorsoText}>
                        Avverso il giudizio del Medico Competente è ammesso ricorso,
                        entro 30 giorni dalla data di comunicazione del giudizio medesimo,
                        all'organo di vigilanza territorialmente competente (ASL / ATS).
                        L'organo di vigilanza, dopo ulteriori accertamenti, conferma o
                        revoca il giudizio del Medico Competente.
                    </Text>
                </View>

                {/* Footer */}
                <View style={S.footer} fixed>
                    <View style={S.footerGrid}>
                        <Text style={S.footerLeft}>
                            {'Generato con ElementMedica Desktop\n'}
                            {'Documento conforme Art. 41 D.Lgs 81/2008 — copia per il lavoratore'}
                        </Text>
                        <Text style={S.footerRight}>
                            {`Generato il: ${fmtDate(generatedAt || new Date().toISOString())}\n`}
                            {medicoName ? `Medico: ${medicoName}` : ''}
                        </Text>
                    </View>
                </View>

            </Page>
        </Document>
    )
}

// ============================================================
// Download utility
// ============================================================

export async function downloadGiudizioPdf(props: GiudizioIdoneitaPdfProps): Promise<void> {
    const blob = await pdf(<GiudizioIdoneitaDocument {...props} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const name = props.patientName.replace(/\s+/g, '_') || 'lavoratore'
    const date = props.giudizio.dataEmissione?.split('T')[0] || new Date().toISOString().split('T')[0]
    a.download = `Giudizio_Idoneita_${name}_${date}.pdf`
    a.click()
    URL.revokeObjectURL(url)
}
