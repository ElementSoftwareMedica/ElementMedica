import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Clock, MapPin, Users, Download } from 'lucide-react';
import { useCourses } from '../../hooks/useCourses';
import { useTrainers } from '../../hooks/useTrainers';
import CourseParticipantsList from '../../components/courses/CourseParticipantsList';
import CourseScheduleForm from '../../components/courses/CourseScheduleForm';
import ParticipantsPDF from '../../components/courses/ParticipantsPDF';

export default function CourseSchedule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, scheduleCourse } = useCourses();
  const { trainers } = useTrainers();
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  const course = courses.find(c => c.id === id);

  if (!course) {
    return <div>Course not found</div>;
  }

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.start);
    setShowScheduleForm(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
  };

  const handleScheduleSubmit = async (scheduleData: any) => {
    try {
      await scheduleCourse(scheduleData);
      setShowScheduleForm(false);
      // Refresh calendar data
    } catch (error) {
      console.error('Failed to schedule course:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
          <p className="text-gray-500">Schedule and manage course sessions</p>
        </div>
        <button
          onClick={() => setShowScheduleForm(true)}
          className="btn-primary"
        >
          Schedule New Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              events={[]} // We'll populate this with actual course schedule data
            />
          </div>
        </div>

        <div className="space-y-6">
          {selectedEvent ? (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Session Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-gray-600">
                    {selectedEvent.start.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-gray-600">
                    {selectedEvent.extendedProps.location}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-gray-600">
                    {selectedEvent.extendedProps.participants} participants
                  </span>
                </div>

                <PDFDownloadLink
                  document={<ParticipantsPDF event={selectedEvent} />}
                  fileName="participants-list.pdf"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Participants List
                </PDFDownloadLink>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500 text-center">
                Select a session to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {showScheduleForm && (
        <CourseScheduleForm
          course={course}
          initialDate={selectedDate}
          trainers={trainers}
          onSubmit={handleScheduleSubmit}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
}