import React from 'react';
import { 
  Building2,
  Calendar,
  Edit,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  Trash2,
  User,
  Users
} from 'lucide-react';

interface CompanySite {
  id: string;
  siteName: string;
  citta: string;
  indirizzo: string;
  cap: string;
  provincia: string;
  personaRiferimento?: string;
  telefono?: string;
  mail?: string;
  dvr?: string;
  rsppId?: string;
  medicoCompetenteId?: string;
  ultimoSopralluogo?: string;
  prossimoSopralluogo?: string;
  valutazioneSopralluogo?: string;
  sopralluogoEseguitoDa?: string;
  rspp?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  medicoCompetente?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface SiteCardProps {
  site: CompanySite;
  isDefault?: boolean;
  onEdit: (site: CompanySite) => void;
  onDelete: (siteId: string) => void;
  onManageDVR: (siteId: string, siteName: string) => void;
  onManageSopralluogo: (siteId: string, siteName: string) => void;
  onManageReparto: (siteId: string, siteName: string) => void;
}

const SiteCard: React.FC<SiteCardProps> = ({
  site,
  isDefault = false,
  onEdit,
  onDelete,
  onManageDVR,
  onManageSopralluogo,
  onManageReparto
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Header della card */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{site.siteName}</h3>
              <div className="flex items-center mt-1">
                {isDefault && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full mr-2">
                    Sede Principale
                  </span>
                )}
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Sede
                </span>
              </div>
            </div>
          </div>
          
          {/* Azioni */}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => onManageDVR(site.id, site.siteName)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
              title="Gestisci DVR"
            >
              <FileText className="h-3 w-3 mr-1" />
              DVR
            </button>
            <button
              onClick={() => onManageSopralluogo(site.id, site.siteName)}
              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center"
              title="Gestisci Sopralluoghi"
            >
              <Eye className="h-3 w-3 mr-1" />
              Sopralluogo
            </button>
            <button
              onClick={() => onManageReparto(site.id, site.siteName)}
              className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors flex items-center"
              title="Gestisci Reparti"
            >
              <Users className="h-3 w-3 mr-1" />
              Reparti
            </button>
            <button
              onClick={() => onEdit(site)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
              title="Modifica sede"
            >
              <Edit className="h-3 w-3 mr-1" />
              Modifica
            </button>
            <button
              onClick={() => onDelete(site.id)}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-full transition-colors flex items-center"
              title="Elimina sede"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Elimina
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto della card */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Informazioni di base */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
              Ubicazione
            </h4>
            <div className="space-y-2">
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div>{site.indirizzo}</div>
                  <div className="text-gray-500">
                    {site.cap} {site.citta} ({site.provincia})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
              Contatti
            </h4>
            <div className="space-y-2">
              {site.personaRiferimento && (
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{site.personaRiferimento}</span>
                </div>
              )}
              {site.telefono && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{site.telefono}</span>
                </div>
              )}
              {site.mail && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{site.mail}</span>
                </div>
              )}
              {!site.personaRiferimento && !site.telefono && !site.mail && (
                <div className="text-sm text-gray-400 italic">
                  Nessun contatto disponibile
                </div>
              )}
            </div>
          </div>

          {/* Sicurezza */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
              Sicurezza
            </h4>
            <div className="space-y-2">
              {site.rspp && (
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>RSPP: {site.rspp.firstName} {site.rspp.lastName}</span>
                </div>
              )}
              {site.medicoCompetente && (
                <div className="flex items-center text-sm text-gray-600">
                  <Stethoscope className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>MC: {site.medicoCompetente.firstName} {site.medicoCompetente.lastName}</span>
                </div>
              )}
              {site.dvr && (
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>DVR: {site.dvr}</span>
                </div>
              )}
              {!site.rspp && !site.medicoCompetente && !site.dvr && (
                <div className="text-sm text-gray-400 italic">
                  Nessuna informazione di sicurezza
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sopralluogo */}
        {(site.ultimoSopralluogo || site.prossimoSopralluogo || site.valutazioneSopralluogo) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Informazioni Sopralluogo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
              {site.ultimoSopralluogo && (
                <div>
                  <span className="font-medium text-gray-700">Ultimo:</span>
                  <div>{new Date(site.ultimoSopralluogo).toLocaleDateString('it-IT')}</div>
                </div>
              )}
              {site.prossimoSopralluogo && (
                <div>
                  <span className="font-medium text-gray-700">Prossimo:</span>
                  <div>{new Date(site.prossimoSopralluogo).toLocaleDateString('it-IT')}</div>
                </div>
              )}
              {site.valutazioneSopralluogo && (
                <div className="md:col-span-3">
                  <span className="font-medium text-gray-700">Valutazione:</span>
                  <div className="mt-1">{site.valutazioneSopralluogo}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteCard;