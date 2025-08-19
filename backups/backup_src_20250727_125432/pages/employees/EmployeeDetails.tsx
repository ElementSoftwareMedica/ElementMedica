import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Building2, 
  Edit, 
  FileText,
  GraduationCap,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import EntityProfileHeader from '../../components/shared/EntityProfileHeader';
import { apiGet } from '../../services/api';

const TAX_CODE_REGEX = /^[a-zA-Z]{6}[0-9]{2}[abcdehlmprstABCDEHLMPRST]{1}[0-9]{2}([a-zA-Z]{1}[0-9]{3})[a-zA-Z]{1}$/;

const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    async function fetchData() {
      setLoading(true);
      try {
        const emp = await apiGet(`/api/v1/persons/${id}`);
        setEmployee(emp);
        if (emp.companyId) {
          const comp = await apiGet(`/api/companies/${emp.companyId}`);
          setCompany(comp);
        }
      } catch (err) {
        console.error('Error fetching employee data:', err);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-80">Loading...</div>;
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Employee not found</h2>
          <p className="text-gray-600 mt-2">The employee you're looking for doesn't exist or has been removed.</p>
          <Link to="/employees" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  // Generate some mock data for the employee
  const mockMedicalRecords = [
    {
      id: '1',
      date: new Date(2023, 3, 15),
      type: 'Annual Checkup',
      status: 'Completed',
      notes: 'All tests normal. Recommended exercise program.',
    },
    {
      id: '2',
      date: new Date(2022, 3, 12),
      type: 'Annual Checkup',
      status: 'Completed',
      notes: 'Mild hypertension detected. Follow-up recommended.',
    },
    {
      id: '3',
      date: new Date(2021, 2, 28),
      type: 'Annual Checkup',
      status: 'Completed',
      notes: 'All tests normal.',
    },
  ];

  const mockTrainingRecords = [
    {
      id: '1',
      courseName: 'First Aid Certification',
      completionDate: new Date(2023, 1, 15),
      expiryDate: new Date(2025, 1, 15),
      status: 'Valid',
    },
    {
      id: '2',
      courseName: 'Workplace Safety',
      completionDate: new Date(2023, 5, 10),
      expiryDate: new Date(2024, 5, 10),
      status: 'Valid',
    },
    {
      id: '3',
      courseName: 'Hazardous Materials Handling',
      completionDate: new Date(2022, 8, 23),
      expiryDate: new Date(2023, 8, 23),
      status: 'Expired',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link 
          to="/employees" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Back to Employees
        </Link>
      </div>

      {/* Employee Profile Header */}
      <EntityProfileHeader
        avatarUrl={employee.photo_url}
        initials={employee.firstName?.charAt(0) + employee.lastName?.charAt(0)}
        title={`${employee.firstName} ${employee.lastName}`}
        subtitle={
          <>
            <span>{employee.title}</span>
            {company && <><span className="mx-2 text-gray-400">•</span><span>{company.ragioneSociale || company.name}</span></>}
          </>
        }
        extraInfo={`Codice Fiscale: ${employee.codice_fiscale}`}
        actionButton={
          <Link to={`/employees/${employee.id}/edit`} className="px-4 py-2 flex items-center bg-blue-600 text-white rounded-full shadow-sm text-sm font-medium hover:bg-blue-700 transition-colors">
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Link>
        }
      />

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dettagli Dipendente</h2>
            <div className="mb-2"><span className="font-medium">Cognome:</span> {employee.lastName}</div>
        <div className="mb-2"><span className="font-medium">Nome:</span> {employee.firstName}</div>
            <div className="mb-2"><span className="font-medium">Codice Fiscale:</span> {employee.codice_fiscale}</div>
            <div className="mb-2"><span className="font-medium">Data di Nascita:</span> {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString() : ''}</div>
            <div className="mb-2"><span className="font-medium">Via di Residenza:</span> {employee.residence_address}</div>
            <div className="mb-2"><span className="font-medium">Comune di Residenza:</span> {employee.residence_city}</div>
            <div className="mb-2"><span className="font-medium">Provincia:</span> {employee.province}</div>
            <div className="mb-2"><span className="font-medium">CAP:</span> {employee.postal_code}</div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Employment Information</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Company</span>
                  {company ? (
                    <Link to={`/companies/${company.id}`} className="block text-sm text-blue-600 hover:text-blue-800">
                      {company.ragioneSociale || company.name}
                    </Link>
                  ) : (
                    <span className="block text-sm text-gray-600">N/A</span>
                  )}
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-8">
                  <span className="block text-sm font-medium text-gray-800">Info di Residenza</span>
                  <span className="block text-sm text-gray-600">{[employee.residence_address, employee.residence_city, employee.province, employee.postal_code].filter(Boolean).join(', ')}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-8">
                  <span className="block text-sm font-medium text-gray-800">Position</span>
                  <span className="block text-sm text-gray-600">{employee.title}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-8">
                  <span className="block text-sm font-medium text-gray-800">Employee ID</span>
                  <span className="block text-sm text-gray-600">{employee.employeeId || 'EMP-' + Math.floor(1000 + Math.random() * 9000)}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-8">
                  <span className="block text-sm font-medium text-gray-800">Start Date</span>
                  <span className="block text-sm text-gray-600">{employee.hired_date ? new Date(employee.hired_date).toLocaleDateString() : ''}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-8">
                  <span className="block text-sm font-medium text-gray-800">Status</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    employee.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : employee.status === 'On Leave'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.status}
                  </span>
                </div>
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-4">Health Status</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="mr-4 p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800">Last Medical Examination</span>
                  <span className="block text-sm text-gray-600">April 15, 2023</span>
                  <span className="mt-1 block text-xs text-gray-500">Next scheduled: April 2024</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="mr-4 p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800">Notifications</span>
                  <span className="block text-sm text-gray-600">First Aid certification expiring in 2 months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;