import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiGet } from '../api/api';

interface ScheduledCourse {
  id: string;
  course: {
    title: string;
  };
  startDate: string;
  endDate: string;
  location: string;
  hasAttestati?: boolean;
}

interface GenerateAttestatiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (scheduledCourseId: string) => void;
}

const GenerateAttestatiModal: React.FC<GenerateAttestatiModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [scheduledCourses, setScheduledCourses] = useState<ScheduledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'nuovi' | 'fatti'>('nuovi');

  useEffect(() => {
    if (isOpen) {
      fetchScheduledCourses();
    }
  }, [isOpen]);

  const fetchScheduledCourses = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/schedules-with-attestati');
      setScheduledCourses(data);
    } catch (error) {
      console.error('Error fetching scheduled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Genera Attestati</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">Caricamento corsi...</div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button
                    className={`px-4 py-2 rounded-t-lg font-medium border-b-2 transition-all ${tab === 'nuovi' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                    onClick={() => setTab('nuovi')}
                  >
                    Nuovi Corsi
                  </button>
                  <button
                    className={`px-4 py-2 rounded-t-lg font-medium border-b-2 transition-all ${tab === 'fatti' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                    onClick={() => setTab('fatti')}
                  >
                    Corsi già Fatti
                  </button>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona il corso
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleziona un corso...</option>
                  {scheduledCourses
                    .filter(c => tab === 'nuovi' ? !c.hasAttestati : c.hasAttestati)
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course.title} - {new Date(course.startDate).toLocaleDateString('it-IT')} - {course.location}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (selectedCourseId) {
                      onGenerate(selectedCourseId);
                      onClose();
                    }
                  }}
                  disabled={!selectedCourseId}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-xl ${
                    selectedCourseId
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Genera Attestati
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateAttestatiModal;