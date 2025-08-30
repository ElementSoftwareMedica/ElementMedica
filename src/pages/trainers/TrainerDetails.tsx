import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Award,
  Building,
  Calendar,
  ChevronRight,
  CreditCard,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone
} from 'lucide-react';
import { apiGet } from '../../services/api';

const TAX_CODE_REGEX = /^[a-zA-Z]{6}[0-9]{2}[abcdehlmprstABCDEHLMPRST]{1}[0-9]{2}([a-zA-Z]{1}[0-9]{3})[a-zA-Z]{1}$/;

const TrainerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const trainerData = await apiGet(`/trainers/${id}`);
        setTrainer(trainerData);
      } catch (err) {
        setTrainer(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-80">Loading...</div>;
  }

  if (!trainer) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Trainer not found</h2>
          <p className="text-gray-600 mt-2">The trainer you're looking for doesn't exist or has been removed.</p>
          <Link to="/trainers" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Back to Trainers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link 
          to="/trainers" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Back to Trainers
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {trainer.firstName.charAt(0)}{trainer.lastName.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{trainer.firstName} {trainer.lastName}</h1>
              <div className="flex items-center mt-1 gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trainer.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {trainer.status}
                </span>
                {/* Tax Code validation badge */}
                {trainer.tax_code && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    TAX_CODE_REGEX.test(trainer.tax_code) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {TAX_CODE_REGEX.test(trainer.tax_code) ? 'Valid Tax Code' : 'Invalid Tax Code'}
                  </span>
                )}
                {trainer.specialties && trainer.specialties.length > 0 && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{trainer.specialties.join(', ')}</span>
                  </>
                )}
              </div>
              {/* Show ID */}
              <div className="text-xs text-gray-500 mt-1">ID: {trainer.id}</div>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to={`/trainers/${trainer.id}/edit`} className="btn-primary flex items-center">
              <Edit className="h-4 w-4 mr-1" />
              Edit Trainer
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Informazioni di Contatto</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Telefono</span>
                  <span className="block text-sm text-gray-600">{trainer.phone}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Email</span>
                  <span className="block text-sm text-gray-600">{trainer.email}</span>
                </div>
              </li>
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Indirizzo</span>
                  <span className="block text-sm text-gray-600">
                    {trainer.residenceAddress}, {trainer.residenceCity} ({trainer.province}) {trainer.postalCode}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Dati Fiscali</span>
                  <span className="block text-sm text-gray-600">
                    Codice Fiscale: {trainer.tax_code || 'N/A'}<br/>
                    P.IVA: {trainer.vat_number || 'N/A'}<br/>
                    Tariffa Oraria: {trainer.tariffa_oraria ? `€ ${trainer.tariffa_oraria}` : 'N/A'}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Dati Professionali</span>
                  <span className="block text-sm text-gray-600">
                    Codice Albo: {trainer.register_code || 'N/A'}<br/>
                    IBAN: {trainer.iban || 'N/A'}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Data di Nascita</span>
                  <span className="block text-sm text-gray-600">{trainer.birthDate ? new Date(trainer.birthDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Note</span>
                  <span className="block text-sm text-gray-600">{trainer.notes || 'N/A'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Award className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Creato il</span>
                  <span className="block text-sm text-gray-600">{trainer.createdAt ? new Date(trainer.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-800">Aggiornato il</span>
                  <span className="block text-sm text-gray-600">{trainer.updatedAt ? new Date(trainer.updatedAt).toLocaleString() : 'N/A'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Qualifiche</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-full">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Specialità</h3>
                <div className="flex flex-wrap gap-2">
                  {trainer.specialties && trainer.specialties.length > 0 ? (
                    trainer.specialties.map((specialty: string) => (
                      <span key={specialty} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">None</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-full">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Certificazioni</h3>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications && trainer.certifications.length > 0 ? (
                    trainer.certifications.map((cert: string) => (
                      <span key={cert} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {cert}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="#" className="bg-white p-4 rounded-full shadow flex items-center transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Schedule</h3>
            <p className="text-xs text-gray-500">View upcoming sessions</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="#" className="bg-white p-4 rounded-full shadow flex items-center transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 bg-green-100 rounded-lg">
            <Award className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Certifications</h3>
            <p className="text-xs text-gray-500">Manage certifications</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="#" className="bg-white p-4 rounded-full shadow flex items-center transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 bg-amber-100 rounded-lg">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Documents</h3>
            <p className="text-xs text-gray-500">View documents</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
      </div>
    </div>
  );
};

export default TrainerDetails;