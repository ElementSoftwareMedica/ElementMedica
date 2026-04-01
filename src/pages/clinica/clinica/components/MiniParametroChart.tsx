/**
 * MiniParametroChart - Compact inline chart for vital signs parameters
 * 
 * Displays a small sparkline-style chart showing the historical trend
 * of a specific vital sign parameter (pressure, weight, temperature, etc.)
 * 
 * Features:
 * - Compact size suitable for inline display next to form fields
 * - Shows up to 8 data points (minimum 2 to show trend)
 * - BMI-aware trend coloring (increasing BMI is not always positive)
 * - Hover to expand with more details
 * - Click to open full chart view
 * 
 * @module pages/clinica/clinica/components/MiniParametroChart
 * @project P52 - Clinical Visit Template System
 * @session S54 - Chart improvements & BMI logic
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight, BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pazientiApi } from '../../../../services/clinicaApi';

/**
 * Fields where "up" trend is NOT positive (higher = worse)
 * BMI: being overweight is not always good
 * Glicemia: higher blood sugar is typically bad
 * Temperatura: higher temperature may indicate fever
 */
const INVERSE_TREND_FIELDS = ['bmi', 'glicemia', 'temperatura'];

interface MiniParametroChartProps {
    pazienteId: string;
    fieldName: string;
    fieldLabel: string;
    currentValue?: number;
    onOpenFullChart?: () => void;
}

interface ParametroDataPoint {
    dataOra: string;
    valore: number;
}

/**
 * Get trend color based on field type and direction
 * For BMI/glicemia/temperatura: increasing = red, decreasing = green
 * For everything else: increasing = green, decreasing = red
 */
function getTrendColor(trend: 'up' | 'down' | 'stable', fieldName: string): string {
    if (trend === 'stable') return '#6b7280'; // gray
    const isInverse = INVERSE_TREND_FIELDS.includes(fieldName.toLowerCase());
    if (trend === 'up') return isInverse ? '#ef4444' : '#10b981'; // red if inverse, green otherwise
    return isInverse ? '#10b981' : '#ef4444'; // green if inverse down, red otherwise
}

function getTrendColorClass(trend: 'up' | 'down' | 'stable', fieldName: string): string {
    if (trend === 'stable') return 'text-gray-400';
    const isInverse = INVERSE_TREND_FIELDS.includes(fieldName.toLowerCase());
    if (trend === 'up') return isInverse ? 'text-red-500' : 'text-green-500';
    return isInverse ? 'text-green-500' : 'text-red-500';
}

const MiniParametroChart: React.FC<MiniParametroChartProps> = ({
    pazienteId,
    fieldName,
    fieldLabel,
    currentValue,
    onOpenFullChart
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Show tooltip immediately, cancel any pending hide */
    const handleMouseEnter = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setIsExpanded(true);
    }, []);

    /** Hide tooltip with 300ms delay so user can move mouse into the tooltip */
    const handleMouseLeave = useCallback(() => {
        hideTimeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            hideTimeoutRef.current = null;
        }, 300);
    }, []);

    // Fetch historical data for this parameter
    const { data: historicalData, isLoading } = useQuery({
        queryKey: ['paziente-parametro-storico', pazienteId, fieldName],
        queryFn: async () => {
            // Try to get data from paziente storico
            try {
                const response = await pazientiApi.getStorico(pazienteId);
                // Response is { visite, referti, appuntamenti } directly
                if (response?.visite) {
                    // Extract the specific field values from past visits
                    const dataPoints: ParametroDataPoint[] = [];

                    for (const visita of response.visite) {
                        if (visita.datiStrutturati && typeof visita.datiStrutturati === 'object') {
                            const dati = visita.datiStrutturati as Record<string, unknown>;
                            const value = dati[fieldName];

                            if (typeof value === 'number') {
                                dataPoints.push({
                                    dataOra: visita.dataOra || visita.createdAt,
                                    valore: value
                                });
                            }
                        }
                    }

                    // Sort by date (most recent last) and take last 8
                    return dataPoints
                        .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())
                        .slice(-8);
                }
            } catch {
                // Silently fail - no historical data available
            }
            return [];
        },
        enabled: !!pazienteId && !!fieldName,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Calculate trend
    const trend = useMemo(() => {
        if (!historicalData || historicalData.length < 2) return null;

        const recent = historicalData.slice(-3);
        const firstValue = recent[0].valore;
        const lastValue = recent[recent.length - 1].valore;
        const percentChange = ((lastValue - firstValue) / firstValue) * 100;

        if (percentChange > 2) return 'up';
        if (percentChange < -2) return 'down';
        return 'stable';
    }, [historicalData]);

    // Render sparkline SVG
    const sparkline = useMemo(() => {
        if (!historicalData || historicalData.length < 2) return null;

        const values = historicalData.map(d => d.valore);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const width = 60;
        const height = 20;
        const padding = 2;

        const points = values.map((v, i) => {
            const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((v - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg width={width} height={height} className="inline-block">
                <polyline
                    fill="none"
                    stroke={trend ? getTrendColor(trend, fieldName) : '#6b7280'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
                {/* Current value dot */}
                {values.length > 0 && (
                    <circle
                        cx={width - padding}
                        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - 2 * padding)}
                        r="2"
                        fill={trend ? getTrendColor(trend, fieldName) : '#6b7280'}
                    />
                )}
            </svg>
        );
    }, [historicalData, trend, fieldName]);

    // Don't show if no historical data and no current value
    if (!isLoading && (!historicalData || historicalData.length === 0) && !currentValue) {
        return null;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="inline-flex items-center gap-1 ml-2 text-gray-400">
                <div className="w-10 h-4 bg-gray-100 animate-pulse rounded" />
            </div>
        );
    }

    return (
        <div
            className="relative inline-flex items-center gap-1.5 ml-2 cursor-pointer group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onOpenFullChart}
            title={`Storico ${fieldLabel} - Click per vedere dettagli`}
        >
            {/* Sparkline */}
            {sparkline}

            {/* Trend indicator with field-aware coloring */}
            {trend && (
                <span className={getTrendColorClass(trend, fieldName)}>
                    {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {trend === 'stable' && <Minus className="w-3 h-3" />}
                </span>
            )}

            {/* Expanded tooltip — stays open while hovered (300ms leave delay) */}
            {isExpanded && historicalData && historicalData.length > 0 && (
                <div
                    className="absolute z-50 top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-48"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 text-sm">
                            Storico {fieldLabel}
                        </span>
                        <BarChart2 className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-1">
                        {historicalData.slice(-5).reverse().map((point, index) => (
                            <div
                                key={index}
                                className="flex justify-between text-xs text-gray-600"
                            >
                                <span>
                                    {new Date(point.dataOra).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit'
                                    })}
                                </span>
                                <span className="font-medium">{point.valore}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenFullChart?.();
                        }}
                    >
                        Vedi grafico completo <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MiniParametroChart;
