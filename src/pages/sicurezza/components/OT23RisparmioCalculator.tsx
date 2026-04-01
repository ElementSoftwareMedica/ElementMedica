/**
 * OT23 Risparmio Calculator Modal
 * Calcolatore risparmio stimato per riduzione tasso INAIL
 * 
 * @component OT23RisparmioCalculator
 * @project P44 - ElementSicurezza
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Euro, Users, TrendingDown, Info, Building2 } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

import { ot23Api, type OT23RisparmioCalcolo, type OT23Catalogo } from '@/services/sicurezzaApi';
import { formatCurrency } from '../../../utils/formatters';

interface OT23RisparmioCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
}

function OT23RisparmioCalculator({
    isOpen,
    onClose
}: OT23RisparmioCalculatorProps) {
    const [premioAnnuale, setPremioAnnuale] = useState<number>(5000);
    const [numeroDipendenti, setNumeroDipendenti] = useState<number>(10);
    const [result, setResult] = useState<OT23RisparmioCalcolo | null>(null);

    // Query - Catalogo per tabella riduzioni
    const { data: catalogo } = useQuery({
        queryKey: ['ot23-catalogo'],
        queryFn: () => ot23Api.getCatalogo(),
        enabled: isOpen
    });

    // Calcola risparmio quando cambiano i valori
    useEffect(() => {
        const calculate = async () => {
            if (premioAnnuale > 0 && numeroDipendenti > 0) {
                try {
                    const calcolo = await ot23Api.calcolaRisparmio(premioAnnuale, numeroDipendenti);
                    setResult(calcolo);
                } catch {
                    // Calcolo locale fallback
                    let percentuale = 5;
                    let fascia = 'Grande (201+)';
                    if (numeroDipendenti <= 10) {
                        percentuale = 28;
                        fascia = 'Micro (1-10)';
                    } else if (numeroDipendenti <= 50) {
                        percentuale = 18;
                        fascia = 'Piccola (11-50)';
                    } else if (numeroDipendenti <= 200) {
                        percentuale = 10;
                        fascia = 'Media (51-200)';
                    }
                    setResult({
                        percentualeRiduzione: percentuale,
                        risparmioAnnuale: premioAnnuale * (percentuale / 100),
                        fasciaAzienda: fascia
                    });
                }
            }
        };

        const timer = setTimeout(calculate, 300);
        return () => clearTimeout(timer);
    }, [premioAnnuale, numeroDipendenti]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600" />
                        Calcolatore Risparmio OT23
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-6">
                    {/* Input Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="flex items-center gap-2 mb-2">
                                <Euro className="w-4 h-4 text-gray-500" />
                                Premio Annuale INAIL (€)
                            </Label>
                            <Input
                                type="number"
                                value={premioAnnuale}
                                onChange={(e) => setPremioAnnuale(Number(e.target.value))}
                                min={0}
                                step={100}
                                className="text-lg"
                            />
                        </div>

                        <div>
                            <Label className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                Numero Dipendenti
                            </Label>
                            <Input
                                type="number"
                                value={numeroDipendenti}
                                onChange={(e) => setNumeroDipendenti(Number(e.target.value))}
                                min={1}
                                className="text-lg"
                            />
                        </div>
                    </div>

                    {/* Result Section */}
                    {result && (
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-3 gap-6 text-center">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Fascia Azienda</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                            <span className="font-semibold text-lg">{result.fasciaAzienda}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Percentuale Riduzione</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <TrendingDown className="w-5 h-5 text-green-500" />
                                            <span className="font-bold text-2xl text-green-600">
                                                {result.percentualeRiduzione}%
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Risparmio Annuale</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Euro className="w-5 h-5 text-emerald-500" />
                                            <span className="font-bold text-2xl text-emerald-600">
                                                {formatCurrency(result.risparmioAnnuale)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabella Riduzioni */}
                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-500" />
                            Tabella Percentuali di Riduzione
                        </h4>
                        <div className="overflow-hidden rounded-lg border dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Fascia</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Dipendenti</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Riduzione</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {(catalogo?.tabellaRiduzioni || [
                                        { da: 1, a: 10, percentuale: 28, label: 'Micro (1-10)' },
                                        { da: 11, a: 50, percentuale: 18, label: 'Piccola (11-50)' },
                                        { da: 51, a: 200, percentuale: 10, label: 'Media (51-200)' },
                                        { da: 201, a: Infinity, percentuale: 5, label: 'Grande (201+)' }
                                    ]).map((fascia, index) => (
                                        <tr
                                            key={index}
                                            className={
                                                result?.fasciaAzienda === fascia.label
                                                    ? 'bg-green-50 dark:bg-green-900/20'
                                                    : ''
                                            }
                                        >
                                            <td className="px-4 py-2 font-medium">{fascia.label}</td>
                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                                {fascia.a === Infinity
                                                    ? `${fascia.da}+`
                                                    : `${fascia.da} - ${fascia.a}`
                                                }
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-green-600">
                                                {fascia.percentuale}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-2">Come funziona?</p>
                        <ul className="space-y-1 list-disc list-inside text-blue-600 dark:text-blue-400">
                            <li>La riduzione si applica al tasso medio di tariffa INAIL</li>
                            <li>Per ottenerla serve un punteggio di almeno 100 punti nel modello OT23</li>
                            <li>La domanda va presentata entro il 28 febbraio di ogni anno</li>
                            <li>La riduzione ha effetto per l'anno successivo alla presentazione</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
export default OT23RisparmioCalculator;