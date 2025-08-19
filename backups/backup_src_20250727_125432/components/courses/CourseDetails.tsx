import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Clock, 
  Calendar, 
  Award, 
  CheckCircle, 
  Users, 
  FileText, 
  Edit,
  GraduationCap,
  BookOpen,
  MessageCircle,
  Star,
  Download,
  Trash2,
  UserPlus
} from 'lucide-react';
import EntityProfileHeader from '../../components/shared/EntityProfileHeader';
import { Button } from '../../design-system/atoms/Button';
import { apiGet } from '../../api/api';

const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const data = await apiGet(`/courses/${id}`);
        setCourse(data);
      } catch (e) {
        setNotFound(true);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCourse();
  }, [id]);

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'employees'>('overview');
  
  if (loading) {
    return <div className="flex items-center justify-center h-80 text-gray-500">Loading...</div>;
  }
  if (notFound || !course) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Course not found</h2>
          <p className="text-gray-600 mt-2">The course you're looking for doesn't exist or has been removed.</p>
          <Link to="/courses" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  // Mock data for course details
  const courseModules = [
    { id: 1, title: 'Introduction to Safety Principles', duration: '45 mins' },
    { id: 2, title: 'Identifying Emergency Situations', duration: '60 mins' },
    { id: 3, title: 'Basic First Aid Techniques', duration: '90 mins' },
    { id: 4, title: 'CPR and AED Training', duration: '120 mins' },
    { id: 5, title: 'Handling Specific Injuries', duration: '60 mins' },
    { id: 6, title: 'Practical Assessment', duration: '90 mins' }
  ];

  const courseSessions = [
    { id: 1, date: 'June 15, 2023', time: '9:00 AM - 5:00 PM', location: 'Training Room A', instructor: 'Dr. Sarah Johnson', seats: 20, available: 8 },
    { id: 2, date: 'July 10, 2023', time: '9:00 AM - 5:00 PM', location: 'Training Room B', instructor: 'Dr. Michael Chen', seats: 20, available: 15 },
    { id: 3, date: 'August 5, 2023', time: '9:00 AM - 5:00 PM', location: 'Conference Center', instructor: 'Dr. Sarah Johnson', seats: 30, available: 30 }
  ];

  const enrolledEmployees = [
    { id: 'e1', name: 'Michael Johnson', company: 'Acme Corporation', status: 'Completed', completionDate: 'May 12, 2023' },
    { id: 'e2', name: 'Emma Martinez', company: 'Acme Corporation', status: 'In Progress', completionDate: '-' },
    { id: 'e4', name: 'Sophia Garcia', company: 'HealthPlus Medical', status: 'Completed', completionDate: 'Apr 28, 2023' },
    { id: 'e6', name: 'Olivia Brown', company: 'EduForward Academy', status: 'Enrolled', completionDate: '-' },
    { id: 'e8', name: 'Ava Miller', company: 'Acme Corporation', status: 'Completed', completionDate: 'May 15, 2023' }
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link 
          to="/courses" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Back to Courses
        </Link>
      </div>

      {/* Course Header */}
      <EntityProfileHeader
        icon={<GraduationCap className="h-16 w-16" />}
        title={course.title}
        subtitle={
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">{course.category}</span>
        }
        extraInfo={<span className="text-sm text-gray-600">Codice: {course.code || 'N/A'}</span>}
        statusBadge={
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            course.status === 'Active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {course.status}
          </span>
        }
        actionButton={
          <Button
            variant="primary"
            shape="pill"
            leftIcon={<Edit className="h-4 w-4" />}
            onClick={() => navigate(`/courses/${id}/edit`)}
          >
            Modifica
          </Button>
        }
        bgGradient="from-amber-500 to-amber-600"
      />

      {/* Course Details Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dettagli Corso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-2"><span className="font-medium">Corso:</span> {course.title}</div>
            <div className="mb-2"><span className="font-medium">Durata corso:</span> {course.duration}</div>
            <div className="mb-2"><span className="font-medium">Anni validità:</span> {course.validityYears || 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">Durata corso aggiornamento:</span> {course.renewalDuration || 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">€/persona:</span> {course.pricePerPerson ? `€${course.pricePerPerson}` : 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">Certificazioni:</span> {course.certifications || 'N/A'}</div>
          </div>
          <div>
            <div className="mb-2"><span className="font-medium">Max persone:</span> {course.maxPeople || 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">Normativa:</span> {course.regulation || 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">Contenuti:</span> {course.contents || 'N/A'}</div>
            <div className="mb-2"><span className="font-medium">Codice:</span> {course.code || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upcoming Sessions
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Enrolled Employees
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Description</h2>
              <p className="text-gray-600">{course.description}</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">What You'll Learn</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Handle emergency situations with confidence</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Perform basic first aid procedures</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Administer CPR correctly</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Use AED devices effectively</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Respond to various injury scenarios</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="ml-2 text-gray-600">Meet workplace safety requirements</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Course Content</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {courseModules.map((module, index) => (
                  <div key={module.id} className={`flex items-center justify-between p-4 ${
                    index !== courseModules.length - 1 ? 'border-b border-gray-200' : ''
                  }`}>
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">{module.id}</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-800">{module.title}</h3>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="ml-1 text-xs text-gray-500">{module.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500">
                        {index < 2 ? 'Preview Available' : 'Full Access'}
                      </span>
                      <BookOpen className={`ml-2 h-4 w-4 ${
                        index < 2 ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Requirements</h2>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <div className="h-5 w-5 text-blue-500 flex items-center justify-center mt-0.5">•</div>
                  <span className="ml-2 text-gray-600">No prerequisites required - this course is suitable for beginners</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 text-blue-500 flex items-center justify-center mt-0.5">•</div>
                  <span className="ml-2 text-gray-600">Participants should be physically able to perform CPR techniques</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 text-blue-500 flex items-center justify-center mt-0.5">•</div>
                  <span className="ml-2 text-gray-600">Comfortable clothing recommended for practical exercises</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Certification</h2>
              <div className="bg-blue-50 p-4 rounded-lg flex items-start">
                <Award className="h-10 w-10 text-blue-600 mt-1 flex-shrink-0" />
                <div className="ml-4">
                  <h3 className="font-medium text-gray-800">Official First Aid Certification</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upon successful completion of this course, participants will receive an official First Aid certification valid for 2 years.
                    This certification meets OSHA workplace requirements and is recognized nationwide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h2>
              <Button
                variant="primary"
                shape="pill"
                leftIcon={<Calendar className="h-4 w-4" />}
                onClick={() => {/* Implementare logica */}}
              >
                Nuova sessione
              </Button>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Time
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Location
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Instructor
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Availability
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {courseSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {session.date}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {session.time}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {session.location}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {session.instructor}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`${session.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {session.available} / {session.seats} seats available
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 transition-colors">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 p-4 bg-amber-50 rounded-full">
              <div className="flex items-start">
                <Calendar className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-800">Session Information</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    All sessions include the same curriculum and hands-on practice. Participants only need to attend one full-day session to complete the course. 
                    Additional dates will be added based on demand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Enrolled Employees</h2>
              <Button
                variant="primary"
                shape="pill"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => {/* Implementare logica */}}
              >
                Iscrivi Dipendenti
              </Button>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Employee
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Company
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Completion Date
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {enrolledEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {employee.company}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : employee.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {employee.completionDate}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          shape="pill"
                          size="sm"
                          leftIcon={employee.status === 'Completed' ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        >
                          {employee.status === 'Completed' ? 'Scarica Certificato' : 'Visualizza Dettagli'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-full flex items-start">
              <MessageCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">Feedback Summary</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Overall, course participants have rated this course {course.rating}/5 with positive feedback on the practical exercises 
                  and instructor knowledge. Most commonly requested improvement is additional practice time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;