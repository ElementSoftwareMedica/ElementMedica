import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  AlertTriangle,
  Building2,
  Calendar,
  ChevronRight,
  Edit,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User
} from 'lucide-react';

import EntityProfileHeader from '../../components/shared/EntityProfileHeader';
import { apiGet } from '../../services/api';
import { PersonData, Company } from '../../types';

const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<PersonData | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    async function fetchData() {
      setLoading(true);
      try {
        const emp = await apiGet(`/api/v1/persons/${id}`) as PersonData;
        setEmployee(emp);
        if (emp.companyId) {
          const comp = await apiGet(`/api/v1/companies/${emp.companyId}`) as Company;
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

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{employee.firstName} {employee.lastName}</h1>
              <p className="text-gray-600">
                {employee.title}
                {company && <><span className="mx-2 text-gray-400">•</span><span>{company.ragioneSociale || company.name}</span></>}
              </p>
              <p className="text-sm text-gray-500">Codice Fiscale: {employee.taxCode || 'Non disponibile'}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to={`/employees/${employee.id}/edit`} className="btn-primary flex items-center rounded-full">
              <Edit className="h-4 w-4 mr-1" />
              Modifica Dipendente
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni Personali</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Nome Completo</span>
                  <span className="block text-sm text-gray-600">{employee.lastName}, {employee.firstName}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Data di Nascita</span>
                  <span className="block text-sm text-gray-600">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('it-IT') : 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Telefono</span>
                  <span className="block text-sm text-gray-600">{employee.phone || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Email</span>
                  <span className="block text-sm text-gray-600">{employee.email || 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni Lavorative</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Azienda</span>
                  {company ? (
                    <Link to={`/companies/${company.id}`} className="block text-sm text-blue-600 hover:text-blue-800">
                      {company.ragioneSociale || company.name}
                    </Link>
                  ) : (
                    <span className="block text-sm text-gray-600">Non assegnata</span>
                  )}
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Posizione</span>
                  <span className="block text-sm text-gray-600">{employee.title || 'Non specificata'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">ID Dipendente</span>
                  <span className="block text-sm text-gray-600">{employee.employeeId || 'EMP-' + Math.floor(1000 + Math.random() * 9000)}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Data Assunzione</span>
                  <span className="block text-sm text-gray-600">{employee.hiredDate ? new Date(employee.hiredDate).toLocaleDateString('it-IT') : 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Residenza</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Indirizzo</span>
                  <span className="block text-sm text-gray-600">{employee.residenceAddress || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Città</span>
                  <span className="block text-sm text-gray-600">{employee.residenceCity || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Provincia</span>
                  <span className="block text-sm text-gray-600">{employee.province || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">CAP</span>
                  <span className="block text-sm text-gray-600">{employee.postalCode || 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formazione e Certificazioni - Layout affiancato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formazione Section */}
        <div className="bg-white rounded-lg shadow p-6 h-96">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
              Formazione Completata
            </h2>
            <button className="text-blue-600 hover:text-blue-800 flex items-center">
              Vedi Tutto
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-3 overflow-y-auto h-80">
            {mockTrainingRecords.map((record) => (
              <div key={record.id} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                record.status === 'Valid' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
              }`}>
                <div className="flex items-center">
                  <GraduationCap className={`h-5 w-5 mr-3 ${
                    record.status === 'Valid' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{record.courseName}</p>
                    <p className="text-sm text-gray-600">Completato: {record.completionDate.toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    record.status === 'Valid' ? 'text-green-600' : 'text-red-600'
                  }`}>{record.status === 'Valid' ? 'Valido' : 'Scaduto'}</p>
                  <p className="text-xs text-gray-500">Scade: {record.expiryDate.toLocaleDateString('it-IT')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visite Mediche Section */}
        <div className="bg-white rounded-lg shadow p-6 h-96">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-purple-600" />
              Visite Mediche
            </h2>
            <button className="text-purple-600 hover:text-purple-800 flex items-center">
              Vedi Tutte
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-3 overflow-y-auto h-80">
            {mockMedicalRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{record.type}</p>
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">{record.status}</p>
                  <p className="text-xs text-gray-500">{record.date.toLocaleDateString('it-IT')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sezione aggiuntiva per compatibilità */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Stato Lavorativo</h2>
            <div className="space-y-3">
              <div>
                <span className="block text-sm font-medium text-gray-800">Stato</span>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  employee.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : employee.status === 'On Leave'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {employee.status || 'Attivo'}
                </span>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-4">Stato Sanitario</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="mr-4 p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800">Ultima Visita Medica</span>
                  <span className="block text-sm text-gray-600">15 Aprile 2023</span>
                  <span className="mt-1 block text-xs text-gray-500">Prossima programmata: Aprile 2024</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="mr-4 p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800">Notifiche</span>
                  <span className="block text-sm text-gray-600">Certificazione Primo Soccorso in scadenza tra 2 mesi</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Note Aggiuntive</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                {employee.notes || 'Nessuna nota aggiuntiva disponibile per questo dipendente.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;