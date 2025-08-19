import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
// @ts-ignore
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './ScheduleCalendar.custom.css';

const locales = {
  'it-IT': it,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
  scheduleId?: string;
  tooltip?: string;
  sessioniTooltipHtml?: string;
  allDay?: boolean;
  status?: string;
}

interface ScheduleCalendarProps {
  events: ScheduleEvent[];
  onSelectSlot?: (slotInfo: any) => void;
  onSelectEvent?: (event: ScheduleEvent) => void;
  eventPropGetter?: (event: any) => any;
  view?: string;
  onView?: (view: string) => void;
}

// Custom event style
const eventStyleGetter = () => {
  return {
    style: {
      backgroundColor: '#2563eb', // Tailwind blue-600
      color: 'white',
      borderRadius: '0.5rem',
      border: 'none',
      padding: '2px 8px',
      fontWeight: 500,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      cursor: 'pointer',
    },
  };
};

// Custom toolbar
function CustomToolbar({ label, onNavigate, onView, views, view }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        <button onClick={() => onNavigate('TODAY')} className="px-3 py-1 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition">Oggi</button>
        <button onClick={() => onNavigate('PREV')} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium shadow hover:bg-gray-200 transition">&lt;</button>
        <button onClick={() => onNavigate('NEXT')} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium shadow hover:bg-gray-200 transition">&gt;</button>
      </div>
      <span className="text-lg font-semibold text-gray-800">{label}</span>
      <div className="flex gap-2">
        {views.map((v: string) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-3 py-1 rounded-lg font-medium transition ${view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {v === Views.MONTH ? 'Mese' : v === Views.WEEK ? 'Settimana' : v === Views.DAY ? 'Giorno' : v}
          </button>
        ))}
      </div>
    </div>
  );
}

// Custom event renderer per tutte le viste
function CustomEvent({ event }: { event: ScheduleEvent }) {
  // Mostra titolo e orari solo se disponibili
  const start = event.start instanceof Date ? event.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
  const end = event.end instanceof Date ? event.end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: '0.98em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {event.title}
      {start && end && (
        <span style={{ fontWeight: 400, marginLeft: 4, fontSize: '0.95em', color: '#2563eb' }}>
          {` (${start} - ${end})`}
        </span>
      )}
    </div>
  );
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ events, onSelectSlot, onSelectEvent, eventPropGetter, view, onView }) => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [currentView, setCurrentView] = useState(view || 'month');

  useEffect(() => {
    if (view && view !== currentView) setCurrentView(view);
  }, [view]);

  // Wrapper compatibile: clona il child e aggiunge solo overlay/tooltip
  const EventWrapper = (props: any) => {
    const { children, event } = props;
    const [mouse, setMouse] = useState<{x: number, y: number} | null>(null);
    const [hovered, setHovered] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
      // Rimuovi il title nativo dal DOM
      if (ref.current) {
        const el = ref.current;
        if (el.hasAttribute('title')) el.removeAttribute('title');
        // Rimuovi anche dai figli
        Array.from(el.querySelectorAll('[title]')).forEach((n: any) => n.removeAttribute('title'));
      }
    });

    // Calcola colore di hover coerente con lo stato
    let bg = '#2563eb';
    let hoverBg = '#1d4ed8';
    let textColor = '#fff';
    let hoverTextColor = '#fff';
    if (event.status === 'Preventivo') { bg = '#fef9c3'; hoverBg = '#fde047'; textColor = '#b45309'; hoverTextColor = '#b45309'; }
    else if (event.status === 'Confermato') { bg = '#fef3c7'; hoverBg = '#fbbf24'; textColor = '#b45309'; hoverTextColor = '#b45309'; }
    else if (event.status === 'Fatturato') { bg = '#dbeafe'; hoverBg = '#2563eb'; textColor = '#2563eb'; hoverTextColor = '#fff'; }
    else if (event.status === 'Pagato') { bg = '#bbf7d0'; hoverBg = '#22c55e'; textColor = '#15803d'; hoverTextColor = '#fff'; }

    // Tooltip overlay
    const tooltip = hovered && event.tooltip && mouse ? ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        zIndex: 9999,
        background: '#fff',
        color: '#1e293b',
        border: '2px solid #2563eb',
        padding: '12px 16px 12px 16px',
        borderRadius: '10px',
        fontSize: '0.98rem',
        minWidth: 220,
        maxWidth: 320,
        whiteSpace: 'normal',
        boxShadow: '0 4px 18px rgba(37,99,235,0.10)',
        pointerEvents: 'none',
        lineHeight: 1.5,
        top: Math.min(mouse.y + 12, window.innerHeight - 220),
        left: Math.min(mouse.x + 16, window.innerWidth - 320),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontWeight: 600, fontSize: '1.08em', color: '#2563eb', letterSpacing: 0.2, flex: 1, marginRight: 8 }}>{event.title}</div>
          {/* Stato pillola colorata */}
          {event.status && (
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: '0.92em',
              background: event.status === 'Preventivo' ? '#fef9c3'
                        : event.status === 'Confermato' ? '#fef3c7'
                        : event.status === 'Fatturato' ? '#dbeafe'
                        : event.status === 'Pagato' ? '#bbf7d0'
                        : '#e5e7eb',
              color: event.status === 'Preventivo' ? '#b45309'
                    : event.status === 'Confermato' ? '#b45309'
                    : event.status === 'Fatturato' ? '#2563eb'
                    : event.status === 'Pagato' ? '#15803d'
                    : '#334155',
              border: '1px solid #e5e7eb',
              marginLeft: 4,
              minWidth: 0,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>{event.status}</span>
          )}
        </div>
        {/* Aziende */}
        {event.tooltip && (
          <div style={{ marginBottom: 4 }}>
            {(() => {
              // Estrai solo la riga aziende
              const lines = event.tooltip.split('\n');
              const az = lines.find((l: string) => l.startsWith('Aziende:'));
              if (az) return <div style={{ marginBottom: 2 }}><b>Aziende:</b> {az.replace('Aziende: ', '')}</div>;
              return null;
            })()}
          </div>
        )}
        {/* Luogo e Data */}
        {event.tooltip && (() => {
          const lines = event.tooltip.split('\n');
          const luogo = lines.find((l: string) => l.startsWith('Luogo:'));
          const data = lines.find((l: string) => l.startsWith('Data:'));
          return (
            <div style={{ marginBottom: 4 }}>
              {luogo && <div><b>Luogo:</b> {luogo.replace('Luogo: ', '')}</div>}
              {data && <div><b>Data:</b> {data.replace('Data: ', '')}</div>}
            </div>
          );
        })()}
        {/* Sessioni HTML */}
        {event.sessioniTooltipHtml && (
          <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: event.sessioniTooltipHtml }} />
        )}
      </div>,
      document.body
    ) : null;

    // Applica colore di stato e hover inline
    const child = React.cloneElement(React.Children.only(children), {
      ref,
      style: {
        ...(children.props.style || {}),
        backgroundColor: hovered ? hoverBg : bg,
        color: hovered ? hoverTextColor : textColor,
        borderRadius: '0.5rem',
        border: 'none',
        padding: '2px 8px',
        fontWeight: 400,
        fontSize: '0.85rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        whiteSpace: event.view === 'month' ? 'nowrap' : 'normal',
        maxWidth: event.view === 'month' ? 120 : '100%',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      onMouseEnter: (e: any) => {
        setHovered(true);
        setMouse({ x: e.clientX, y: e.clientY });
        if (children.props.onMouseEnter) children.props.onMouseEnter(e);
      },
      onMouseMove: (e: any) => {
        if (hovered) setMouse({ x: e.clientX, y: e.clientY });
        if (children.props.onMouseMove) children.props.onMouseMove(e);
      },
      onMouseLeave: (e: any) => {
        setHovered(false);
        if (children.props.onMouseLeave) children.props.onMouseLeave(e);
      },
    });

    return (
      <>
        {child}
        {tooltip}
      </>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Calendario Corsi Programmati</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500, border: 'none', background: 'transparent' }}
        selectable={!!onSelectSlot}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        views={['month', 'week', 'day']}
        view={currentView}
        onView={(v: string) => {
          setCurrentView(v);
          if (onView) onView(v);
        }}
        messages={{
          month: 'Mese',
          week: 'Settimana',
          day: 'Giorno',
          today: 'Oggi',
          previous: 'Precedente',
          next: 'Successivo',
          agenda: 'Agenda',
          date: 'Data',
          time: 'Ora',
          event: 'Evento',
          noEventsInRange: 'Nessun evento in questo intervallo',
        }}
        popup={false}
        culture="it-IT"
        components={{
          toolbar: CustomToolbar,
          event: (props: any) => <CustomEvent {...props} />, // Usa sempre CustomEvent per tutte le viste
          eventWrapper: EventWrapper
        }}
      />
    </div>
  );
};

export default ScheduleCalendar; 