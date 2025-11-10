import { useCallback, useEffect, useState } from 'react';
import { normalizeAttendanceData as normalizeAttendanceDataUtil } from '../utils';

export function useAttendance(
  selectedPersons: (string | number)[],
  existingEvent?: unknown
) {
  const [attendance, setAttendance] = useState<Record<number, (string | number)[]>>({});

  const handleAttendanceChange = useCallback(
    (dateIdx: number, personId: string | number, isPresent: boolean) => {
      const id = String(personId);
      setAttendance(prev => {
        const current = prev[dateIdx] ? prev[dateIdx].map(String) : [];
        let updatedForDate: (string | number)[];
        if (isPresent) {
          updatedForDate = Array.from(new Set([...current, id]));
        } else {
          updatedForDate = current.filter(pid => String(pid) !== id);
        }
        return { ...prev, [dateIdx]: updatedForDate };
      });
    },
    []
  );

  const handleSelectAllForDate = useCallback(
    (dateIdx: number) => {
      setAttendance(prev => ({
        ...prev,
        [dateIdx]: [...new Set(selectedPersons.map(String))],
      }));
    },
    [selectedPersons]
  );

  const handleSelectNoneForDate = useCallback((dateIdx: number) => {
    setAttendance(prev => ({
      ...prev,
      [dateIdx]: [],
    }));
  }, []);

  // Initialize attendance data from existing event (edit mode)
  useEffect(() => {
    const event = existingEvent as { attendance?: Record<string | number, (string | number)[]> } | undefined;
    if (event && event.attendance && typeof event.attendance === 'object') {
      const normalized = normalizeAttendanceDataUtil(event.attendance as Record<string, (string | number)[]>);
      if (Object.keys(normalized).length > 0) {
        setAttendance(normalized);
      }
    }
  }, [existingEvent]);

  return {
    attendance,
    setAttendance,
    handleAttendanceChange,
    handleSelectAllForDate,
    handleSelectNoneForDate,
  } as const;
}