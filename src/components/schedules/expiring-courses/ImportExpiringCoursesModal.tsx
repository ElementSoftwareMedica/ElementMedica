/**
 * ImportExpiringCoursesModal Component
 * 
 * Modal for importing expiring courses from CSV file.
 */

import React, { useState } from 'react';
import {
    Upload,
    Download,
    FileDown,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    X
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { apiPost } from '../../../services/api';
import type { ImportResults } from './types';

/** Parsa la data da vari formati (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd) a yyyy-mm-dd */
const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;

    // Try dd/mm/yyyy or dd-mm-yyyy
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try yyyy-mm-dd (already correct format)
    const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
};

interface ImportExpiringCoursesModalProps {
    onClose: () => void;
    onImported: () => void;
}

export const ImportExpiringCoursesModal: React.FC<ImportExpiringCoursesModalProps> = ({ onClose, onImported }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ImportResults | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResults(null);
        }
    };

    const downloadTemplate = () => {
        const headers = ['CodiceFiscale', 'NomeCorso', 'DataCompletamento', 'LivelloRischio', 'TipoCorso', 'Note'];
        const exampleRows = [
            ['RSSMRA80A01H501X', 'Formazione Generale', '15/03/2024', 'BASSO', 'GENERALE', 'Corso esterno'],
            ['VRDLGI75B02F205Y', 'Formazione Specifica', '20/06/2024', 'ALTO', 'SPECIFICA', ''],
        ];

        const csvContent = [
            headers.join(';'),
            ...exampleRows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template-import-corsi-scadenza.csv';
        link.click();
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Detect separator (comma or semicolon)
            const firstLine = lines[0];
            const separator = firstLine.includes(';') ? ';' : ',';

            const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());

            const records = lines.slice(1).map(line => {
                const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
                const record: Record<string, string> = {};
                headers.forEach((header, i) => {
                    record[header] = values[i] || '';
                });

                // Parse date from dd/mm/yyyy format
                const rawDate = record.datacompletamento || record.completeddate || record.datacorso || record.data;
                const parsedDate = parseDate(rawDate);

                return {
                    taxCode: record.codicefiscale || record.taxcode || record.cf,
                    courseName: record.nomecorso || record.course || record.corso || record.coursename,
                    riskLevel: record.livellorischio || record.risklevel || record.rischio,
                    courseType: record.tipocorso || record.coursetype || record.tipo,
                    completedDate: parsedDate,
                    notes: record.note || record.notes
                };
            }).filter(r => r.taxCode && r.courseName && r.completedDate);

            // Use apiPost for authenticated request
            const response = await apiPost<{ results: ImportResults }>(
                '/api/v1/schedules/import-expiring-courses',
                { records }
            );

            setResults(response.results);

            if (response.results?.imported?.length > 0) {
                setTimeout(onImported, 2000);
            }
        } catch (err) {
            console.error('Import error:', err);
            setResults({
                imported: [],
                errors: [{ error: 'Errore durante l\'importazione. Verifica il formato del file.' }],
                skipped: []
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Upload className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Importa Corsi in Scadenza</h3>
                            <p className="text-sm text-gray-500">Carica corsi completati presso enti esterni</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4">
                    {/* Template download */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileDown className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Template CSV</p>
                                    <p className="text-xs text-blue-600">Formato data: dd/mm/yyyy</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-blue-600 border-blue-300">
                                <Download className="h-4 w-4 mr-1" />
                                Scarica
                            </Button>
                        </div>
                    </div>

                    {/* Column info */}
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Colonne richieste:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">CodiceFiscale</span>
                                <span className="text-gray-500"> *</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">NomeCorso</span>
                                <span className="text-gray-500"> *</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">DataCompletamento</span>
                                <span className="text-gray-500"> * (dd/mm/yyyy)</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">LivelloRischio</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">TipoCorso</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <span className="text-gray-500">Note</span>
                            </div>
                        </div>
                    </div>

                    {/* File input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleziona file CSV
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                        />
                        {file && (
                            <p className="mt-1 text-xs text-gray-500">
                                File selezionato: {file.name}
                            </p>
                        )}
                    </div>

                    {/* Results */}
                    {results && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                            {results.imported.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {results.imported.length} record importati con successo
                                </div>
                            )}
                            {results.skipped.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-yellow-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    {results.skipped.length} record saltati (già esistenti)
                                </div>
                            )}
                            {results.errors.length > 0 && (
                                <div className="text-sm text-red-600">
                                    <div className="flex items-center gap-2 mb-1">
                                        <XCircle className="h-4 w-4" />
                                        {results.errors.length} errori:
                                    </div>
                                    <ul className="text-xs ml-6 list-disc">
                                        {results.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>{err.error}</li>
                                        ))}
                                        {results.errors.length > 5 && (
                                            <li>...e altri {results.errors.length - 5}</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Chiudi
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Importazione...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Importa
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
