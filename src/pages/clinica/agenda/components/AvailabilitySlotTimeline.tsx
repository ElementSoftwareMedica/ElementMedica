import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import type { Appuntamento, SlotDisponibilita } from '../../../../services/clinicaApi';

type AvailabilitySlotTimelineProps = {
    slot: SlotDisponibilita;
    appointments: Appuntamento[];
    durationMinutes: number;
    selectedDate?: string;
    selectedTime?: string;
    selectedMedicoId?: string;
    selectedAmbulatorioId?: string;
    dayKey: string;
    label?: string;
    meta?: string;
    doctorLabel?: string;
    onSelect: (slot: SlotDisponibilita, time: string) => void;
};

const timeToMinutes = (time?: string | null) => {
    if (!time) return 0;
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return (hours * 60) + minutes;
};

const minutesToTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const getTimeFromDateTime = (value?: string | Date | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
    startA < endB && startB < endA;

const appointmentLabel = (appointment: Appuntamento) => {
    const patient = appointment.paziente
        ? `${appointment.paziente.cognome || appointment.paziente.lastName || ''} ${appointment.paziente.nome || appointment.paziente.firstName || ''}`.trim()
        : '';
    return patient || appointment.prestazione?.nome || 'Appuntamento';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const roundToStep = (value: number, step = 5) => Math.round(value / step) * step;

const AvailabilitySlotTimeline: React.FC<AvailabilitySlotTimelineProps> = ({
    slot,
    appointments,
    durationMinutes,
    selectedDate,
    selectedTime,
    selectedMedicoId,
    selectedAmbulatorioId,
    dayKey,
    label,
    meta,
    doctorLabel,
    onSelect,
}) => {
    const [hoverStart, setHoverStart] = useState<number | null>(null);
    const slotStart = timeToMinutes(slot.oraInizio);
    const slotEnd = Math.max(timeToMinutes(slot.oraFine), slotStart + Math.max(durationMinutes, 5));
    const totalMinutes = Math.max(slotEnd - slotStart, 15);
    const height = clamp(totalMinutes * 1.25, 118, 260);
    const duration = clamp(durationMinutes || 30, 5, totalMinutes);
    const latestStart = Math.max(slotStart, slotEnd - duration);

    const visibleAppointments = useMemo(() => (
        appointments
            .filter(app => !slot.medicoId || app.medicoId === slot.medicoId)
            .map(app => {
                const start = timeToMinutes(getTimeFromDateTime(app.dataOra));
                const end = start + (app.durataMinuti || duration || 30);
                return { appointment: app, start, end };
            })
            .filter(item => rangesOverlap(item.start, item.end, slotStart, slotEnd))
    ), [appointments, duration, slot.medicoId, slotEnd, slotStart]);

    const selectedStart = selectedTime ? timeToMinutes(selectedTime) : null;
    const selectedInSlot = selectedDate === dayKey
        && selectedStart !== null
        && selectedStart >= slotStart
        && selectedStart <= latestStart
        && (!selectedMedicoId || selectedMedicoId === slot.medicoId)
        && (!selectedAmbulatorioId || selectedAmbulatorioId === slot.ambulatorioId);

    const previewStart = hoverStart ?? (selectedInSlot ? selectedStart : null);
    const previewEnd = previewStart !== null ? previewStart + duration : null;
    const previewOverlaps = previewStart !== null && visibleAppointments.some(item =>
        rangesOverlap(previewStart, previewStart + duration, item.start, item.end)
    );

    const markers = useMemo(() => {
        const list: number[] = [];
        const step = totalMinutes <= 120 ? 15 : 30;
        const first = Math.ceil(slotStart / step) * step;
        for (let current = first; current <= slotEnd; current += step) {
            list.push(current);
        }
        return list;
    }, [slotEnd, slotStart, totalMinutes]);

    const topFor = (minutes: number) => `${((minutes - slotStart) / totalMinutes) * 100}%`;
    const heightFor = (start: number, end: number) => `${(Math.max(end - start, 5) / totalMinutes) * 100}%`;

    return (
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm sm:p-2 dark:border-gray-700 dark:bg-gray-800">
            {doctorLabel && (
                <div className="mb-1.5 truncate rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700 sm:text-[11px] dark:bg-teal-900/20 dark:text-teal-300">
                    {doctorLabel}
                </div>
            )}
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="flex items-center gap-1 text-[10px] font-bold tabular-nums text-slate-700 sm:text-[11px] dark:text-slate-200">
                        <Clock className="h-2.5 w-2.5 text-teal-600 sm:h-3 sm:w-3" />
                        {slot.oraInizio}-{slot.oraFine}
                    </p>
                    {label && <p className="truncate text-[10px] font-medium text-slate-500">{label}</p>}
                </div>
                {meta && <span className="hidden max-w-[120px] truncate text-right text-[10px] text-slate-400 md:inline">{meta}</span>}
            </div>

            <div
                role="button"
                tabIndex={0}
                className="relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white dark:border-slate-700 dark:from-slate-900/40 dark:to-slate-900/10"
                style={{ height }}
                onMouseMove={event => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const relative = clamp((event.clientY - rect.top) / rect.height, 0, 1);
                    const raw = slotStart + (relative * totalMinutes);
                    setHoverStart(clamp(roundToStep(raw, 5), slotStart, latestStart));
                }}
                onMouseLeave={() => setHoverStart(null)}
                onClick={() => {
                    const start = hoverStart ?? (selectedInSlot ? selectedStart : slotStart);
                    if (start !== null) onSelect(slot, minutesToTime(start));
                }}
                onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const start = hoverStart ?? (selectedInSlot ? selectedStart : slotStart);
                        if (start !== null) onSelect(slot, minutesToTime(start));
                    }
                }}
                title="Muovi il mouse nello slot e clicca sull'orario desiderato"
            >
                {markers.map(marker => (
                    <div
                        key={marker}
                        className="pointer-events-none absolute left-0 right-0 border-t border-slate-200/80 dark:border-slate-700/70"
                        style={{ top: topFor(marker) }}
                    >
                        <span className="absolute left-0.5 top-0 -translate-y-1/2 rounded bg-white/90 px-0.5 text-[8px] font-semibold tabular-nums text-slate-400 sm:left-1 sm:px-1 sm:text-[9px] dark:bg-slate-900/80">
                            {minutesToTime(marker)}
                        </span>
                    </div>
                ))}

                {visibleAppointments.map(({ appointment, start, end }) => (
                    <div
                        key={appointment.id}
                        className="absolute left-[34px] right-1 rounded-md border border-amber-300 bg-amber-100/95 px-1.5 py-1 text-[9px] font-semibold text-amber-900 shadow-sm sm:left-[44px] sm:px-2 sm:text-[10px]"
                        style={{
                            top: topFor(Math.max(start, slotStart)),
                            height: heightFor(Math.max(start, slotStart), Math.min(end, slotEnd)),
                            minHeight: 22,
                        }}
                    >
                        <span className="block truncate tabular-nums">
                            {minutesToTime(start)}-{minutesToTime(end)}
                        </span>
                        <span className="block truncate font-medium opacity-80">{appointmentLabel(appointment)}</span>
                    </div>
                ))}

                {previewStart !== null && previewEnd !== null && (
                    <div
                        className={`absolute left-[34px] right-1 rounded-md border px-1.5 py-1 text-[9px] font-bold shadow-lg transition-colors sm:left-[44px] sm:px-2 sm:text-[10px] ${previewOverlaps
                            ? 'border-orange-400 bg-orange-50/95 text-orange-800'
                            : 'border-teal-500 bg-teal-50/95 text-teal-800'}`}
                        style={{
                            top: topFor(previewStart),
                            height: heightFor(previewStart, Math.min(previewEnd, slotEnd)),
                            minHeight: 24,
                        }}
                    >
                        <span className="block tabular-nums">{minutesToTime(previewStart)}-{minutesToTime(previewEnd)}</span>
                        <span className="block text-[9px] font-semibold uppercase tracking-wide">
                            {previewOverlaps ? 'Overbooking' : 'Nuovo'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailabilitySlotTimeline;
