import React from 'react';
import { CompanyPreviewTableProps } from './types';

// Componente per visualizzare la tabella delle aziende con supporto per sedi multiple
const CompanyPreviewTable: React.FC<CompanyPreviewTableProps> = ({ processedData }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ragione Sociale
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              P.IVA
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Codice Fiscale
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sede/Città
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Indirizzo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Persona Riferimento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contatti
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              DVR/Reparti
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Azione
            </th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((company, index) => (
            <tr key={index} className={`
              ${company._isExisting ? 'bg-yellow-50' : 'bg-white'}
              ${company._isNewSite ? 'bg-blue-50' : ''}
              ${company._isDuplicateSite ? 'bg-red-50' : ''}
              ${company._isNewCompanyWithSite ? 'bg-green-50' : ''}
              hover:bg-gray-50
            `}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {company.ragioneSociale}
                {(company._isExisting || company._isNewCompanyWithSite) && (
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company._isNewSite ? 'bg-blue-100 text-blue-800' :
                    company._isDuplicateSite ? 'bg-red-100 text-red-800' :
                    company._isNewCompanyWithSite ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {company._isNewSite ? 'Nuova Sede' : 
                     company._isDuplicateSite ? 'Sede Duplicata' : 
                     company._isNewCompanyWithSite ? 'Nuova Azienda + Sede' :
                     'Esistente'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.piva}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.codiceFiscale}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.nomeSede && (
                  <div>
                    <div className="font-medium">{company.nomeSede}</div>
                    <div className="text-xs text-gray-400">Nome sede</div>
                  </div>
                )}
                {company.citta && (
                  <div>
                    <div>{company.citta}</div>
                    {company.provincia && <span className="text-xs text-gray-400">({company.provincia})</span>}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.indirizzo || company.sedeAzienda}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.personaRiferimento}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  {company.telefono && <div>{company.telefono}</div>}
                  {company.mail && <div className="text-xs">{company.mail}</div>}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.dvr && (
                  <div className="text-xs">
                    <div>DVR: {company.dvr}</div>
                  </div>
                )}
                {company.reparti && (
                  <div className="text-xs">
                    <div>Reparti: {company.reparti}</div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {company._isDuplicateSite ? (
                  <span className="text-red-600">Duplicato</span>
                ) : company._isNewSite ? (
                  <span className="text-blue-600">Nuova Sede</span>
                ) : company._isNewCompanyWithSite ? (
                  <span className="text-green-600">Crea + Sede</span>
                ) : company._isExisting ? (
                  <span className="text-yellow-600">Aggiorna</span>
                ) : (
                  <span className="text-green-600">Crea</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyPreviewTable;