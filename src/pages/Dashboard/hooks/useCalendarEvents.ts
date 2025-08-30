import { useState, useEffect, useMemo } from 'react';

// Interfacce per i tipi utilizzati nel calendario
interface Course {
  id: string;
  name: string;
  title?: string;
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Company {
  id: string;
  ragioneSociale?: string;
  name?: string;
}

interface Session {
  id: string;
  date: string;
  start: string;
  end: string;
  trainer?: Trainer;
}

interface Schedule {
  id: string;
  course?: Course;
  startDate: string;
  endDate: string;
  location?: string;
  status: string;
  sessions?: Session[];
  companies?: Array<{ company: Company }>;
}

export interface ScheduleEvent {
  id: string;
  scheduleId: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: Schedule;
  status: string;
  tooltip: string;
  sessioniTooltipHtml: string;
}

export type CalendarView = 'month' | 'week' | 'day';

export const useCalendarEvents = (schedulesData: Schedule[]) => {
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [calendarEvents, setCalendarEvents] = useState<ScheduleEvent[]>([]);

  // Helper function to combine date and time
  const combineDateAndTime = (date: string, time: string): string => {
    const dateOnly = date.split('T')[0];
    return `${dateOnly}T${time}:00`;
  };

  // Helper: group sessions by scheduleId+date for month view
  const groupSessionsByDay = useMemo(() => (schedules: Schedule[]) => {
    const grouped: ScheduleEvent[] = [];
    schedules.forEach((s: Schedule) => {
      if (Array.isArray(s.sessions) && s.sessions.length > 0) {
        // Raggruppa per giorno
        const sessionsByDay: Record<string, Session[]> = {};
        s.sessions.forEach((sess: Session) => {
          const day = sess.date.split('T')[0];
          if (!sessionsByDay[day]) sessionsByDay[day] = [];
          sessionsByDay[day].push(sess);
        });
        
        Object.entries(sessionsByDay).forEach(([day, sessions]) => {
          // Tooltip con tutte le sessioni (HTML)
          const allSessions = s.sessions!;
          const sessioniTooltipHtml = allSessions.map((ss: Session, i: number) => {
            const dateStr = new Date(ss.date).toLocaleDateString('it-IT');
            const orario = `${ss.start || '--:--'} - ${ss.end || '--:--'}`;
            const trainer = ss.trainer ? ` (${ss.trainer.firstName} ${ss.trainer.lastName})` : '';
            return `<span style='color:#2563eb;font-weight:700'>Sessione ${i+1}: ${dateStr}, ${orario}${trainer}</span>`;
          }).join('<br>');
          
          // Aziende senza duplicati
          const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale || c.company?.name))].join(', ');
          
          // Orari del giorno
          const sortedSessions = [...sessions].sort((a, b) => a.start.localeCompare(b.start));
          const start = combineDateAndTime(day, sortedSessions[0].start);
          const end = combineDateAndTime(day, sortedSessions[sessions.length-1].end);
          
          // Titolo: aggiungi " - Sessione X" solo se ci sono sessioni in giorni diversi
          let title = `${s.course?.title || s.course?.name || 'Corso'}`;
          const allSameDay = allSessions.every((ss: Session) => ss.date.split('T')[0] === day);
          if (!allSameDay && allSessions.length > 1) {
            // Trova la sessione corrispondente a questo giorno
            const idx = allSessions.findIndex((ss: Session) => ss.date.split('T')[0] === day);
            if (idx !== -1) title += ` - Sessione ${idx + 1}`;
          }
          
          grouped.push({
            id: s.id + '-' + day,
            scheduleId: s.id,
            title,
            start: new Date(start),
            end: new Date(end),
            resource: s,
            status: s.status,
            tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(day).toLocaleDateString('it-IT')}\nStato: ${s.status}`,
            sessioniTooltipHtml
          });
        });
      } else {
        // fallback: usa startDate/endDate della schedule
        const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale || c.company?.name))].join(', ');
        grouped.push({
          id: s.id,
          scheduleId: s.id,
          title: s.course?.title || s.course?.name || 'Corso',
          start: new Date(s.startDate),
          end: new Date(s.endDate),
          resource: s,
          status: s.status,
          tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${s.status}`,
          sessioniTooltipHtml: ''
        });
      }
    });
    return grouped;
  }, [combineDateAndTime]);

  // Helper: eventi separati per sessione (settimana/giorno)
  const mapSessionsIndividually = useMemo(() => (schedules: Schedule[]) => {
    return schedules.flatMap((s: Schedule) => {
      if (Array.isArray(s.sessions) && s.sessions.length > 0) {
        return s.sessions.map((sess: Session, idx: number) => {
          const start = new Date(combineDateAndTime(sess.date, sess.start));
          const end = new Date(combineDateAndTime(sess.date, sess.end));
          const allSessions = s.sessions!;
          const allSameDay = allSessions.every((ss: Session) => ss.date.split('T')[0] === sess.date.split('T')[0]);
          
          let sessionTitle = s.course?.title || s.course?.name || 'Corso';
          if (!allSameDay && allSessions.length > 1) {
            const sessionNumber = ` - Sessione ${allSessions.findIndex((ss: Session) => ss === sess) + 1}`;
            sessionTitle += sessionNumber;
          }
          
          const sessioniTooltipHtml = allSessions.map((ss: Session, i: number) => {
            const dateStr = new Date(ss.date).toLocaleDateString('it-IT');
            const orario = `${ss.start || '--:--'} - ${ss.end || '--:--'}`;
            const trainer = ss.trainer ? ` (${ss.trainer.firstName} ${ss.trainer.lastName})` : '';
            const isCurrent = allSameDay || ss === sess;
            return `<span style='color:${isCurrent ? '#2563eb' : '#1e293b'};font-weight:${isCurrent ? 700 : 400}'>Sessione ${i+1}: ${dateStr}, ${orario}${trainer}</span>`;
          }).join('<br>');
          
          const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale || c.company?.name))].join(', ');
          
          return {
            id: s.id + '-' + (sess.id || idx),
            scheduleId: s.id,
            title: sessionTitle,
            start,
            end,
            allDay: false,
            resource: s,
            status: s.status,
            tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(sess.date).toLocaleDateString('it-IT')}\nStato: ${s.status}`,
            sessioniTooltipHtml
          };
        });
      } else {
        const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale || c.company?.name))].join(', ');
        return [{
          id: s.id,
          scheduleId: s.id,
          title: s.course?.title || s.course?.name || 'Corso',
          start: new Date(s.startDate),
          end: new Date(s.endDate),
          resource: s,
          status: s.status,
          tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${s.status}`,
          sessioniTooltipHtml: ''
        }];
      }
    });
  }, [combineDateAndTime]);

  // Rimappa gli eventi ogni volta che cambia la vista o i dati
  useEffect(() => {
    if (!schedulesData.length) {
      setCalendarEvents([]);
      return;
    }

    // Scegli mapping in base alla vista (default: month)
    let events: ScheduleEvent[];
    if (calendarView === 'month') {
      events = groupSessionsByDay(schedulesData);
    } else {
      events = mapSessionsIndividually(schedulesData);
    }
    
    setCalendarEvents(events);
  }, [calendarView, schedulesData, groupSessionsByDay, mapSessionsIndividually]);

  // Calculate future courses count
  const futureCoursesCount = useMemo(() => {
    const now = new Date();
    // Raggruppa per scheduleId
    const firstSessionBySchedule: Record<string, ScheduleEvent> = {};
    calendarEvents.forEach(e => {
      if (!e.scheduleId) return;
      if (!firstSessionBySchedule[e.scheduleId] || e.start < firstSessionBySchedule[e.scheduleId].start) {
        firstSessionBySchedule[e.scheduleId] = e;
      }
    });
    return Object.values(firstSessionBySchedule).filter((e) => e.start > now).length;
  }, [calendarEvents]);

  return {
    calendarEvents,
    calendarView,
    setCalendarView,
    futureCoursesCount
  };
};