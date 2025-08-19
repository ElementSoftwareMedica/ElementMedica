import React from 'react';
import { 
  AlertTriangle,
  Calendar
} from 'lucide-react';
import ScheduleCalendar from '../../components/dashboard/ScheduleCalendar';
import ScheduleEventModalLazy from '../../components/schedules/ScheduleEventModal.lazy';
import { DashboardStats, DashboardCharts, RecentActivity, DashboardAlerts } from './components';
import { useDashboardData, useCalendarEvents, useScheduleCreation } from './hooks';

const DashboardRefactored: React.FC = () => {
  // Custom hooks for data and functionality
  const {
    data,
    counters,
    loading,
    error,
    refreshData
  } = useDashboardData();

  const {
    calendarEvents,
    calendarView,
    setCalendarView,
    futureCoursesCount
  } = useCalendarEvents(data.schedules);

  const {
    showForm,
    selectedSlot,
    error: scheduleError,
    handleCreateSchedule,
    handleSelectSlot,
    closeForm
  } = useScheduleCreation(refreshData);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Panoramica generale del sistema di formazione</p>
        </div>

        {/* Error Alert for Schedule Creation */}
        {scheduleError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Errore</h3>
                <p className="text-sm text-red-700 mt-1">{scheduleError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8">
          <DashboardStats 
            counters={counters} 
            futureCoursesCount={futureCoursesCount} 
          />
        </div>

        {/* Calendar Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Calendario Corsi</h2>
              <div className="flex space-x-2">
                {(['month', 'week', 'day'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      calendarView === view
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {view === 'month' ? 'Mese' : view === 'week' ? 'Settimana' : 'Giorno'}
                  </button>
                ))}
              </div>
            </div>
            
            <ScheduleCalendar
              events={calendarEvents}
              onSelectSlot={handleSelectSlot}
              view={calendarView}
              onViewChange={setCalendarView}
            />
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <DashboardCharts />
        </div>

        {/* Bottom Section: Recent Activity and Alerts */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <RecentActivity />
          <DashboardAlerts />
        </div>

        {/* Schedule Creation Modal */}
        {showForm && selectedSlot && (
          <ScheduleEventModalLazy
            isOpen={showForm}
            onClose={closeForm}
            onSave={handleCreateSchedule}
            trainings={data.courses.map((c: any) => ({ ...c, title: c.title || c.name }))}
            trainers={data.trainers}
            companies={data.companies}
            employees={data.employees}
            existingEvent={undefined}
            initialDate={
              selectedSlot
                ? selectedSlot.start.getFullYear() +
                  '-' +
                  String(selectedSlot.start.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(selectedSlot.start.getDate()).padStart(2, '0')
                : undefined
            }
            initialStartTime={
              selectedSlot && !selectedSlot.isAllDay
                ? String(selectedSlot.start.getHours()).padStart(2, '0') +
                  ':' +
                  String(selectedSlot.start.getMinutes()).padStart(2, '0')
                : undefined
            }
            initialEndTime={
              selectedSlot && !selectedSlot.isAllDay
                ? String(selectedSlot.end.getHours()).padStart(2, '0') +
                  ':' +
                  String(selectedSlot.end.getMinutes()).padStart(2, '0')
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
};

export default DashboardRefactored;