import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit,
  FileText,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  User,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import EntityProfileHeader from '../../components/shared/EntityProfileHeader';
import EntitySchedulesSection from '../../components/shared/EntitySchedulesSection';
import { apiGet } from '../../services/api';
import { clinicaApi } from '../../services/clinicaApi';
import { PersonTenantProfilesWidget } from '../../components/person/PersonTenantProfilesWidget';
import { ProfiloSaluteCard } from '../../components/clinica/ProfiloSaluteCard';
import { PersonData, Company } from '../../types';
import { extractGenderFromTaxCode } from '../../utils/codiceFiscale';
import { PersonCredentialsModal } from '../../components/persons/PersonCredentialsModal';

const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canSeeMedicalData = user?.roles?.some(r =>
    ['MEDICO', 'ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN'].includes(r)
  ) ?? false;

  const [employee, setEmployee] = useState<PersonData | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  // Medicina del Lavoro
  const [mdlMansioni, setMdlMansioni] = useState<any[]>([]);
  const [mdlRischi, setMdlRischi] = useState<any[]>([]);
  const [mdlGiudizi, setMdlGiudizi] = useState<any[]>([]);
  const [mdlVisite, setMdlVisite] = useState<any[]>([]);
  const [mdlProtocolli, setMdlProtocolli] = useState<any[]>([]);
  const [mdlLoading, setMdlLoading] = useState(false);
  const [profiloSaluteExpanded, setProfiloSaluteExpanded] = useState(false);

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
        // P48/P49: Extract company data from tenantProfiles (companyId is actually companyTenantProfileId)
        const profile = (emp as any).tenantProfiles?.[0];
        const companyData = profile?.companyTenantProfile?.company;
        if (companyData) {
          setCompany(companyData as Company);
        }
      } catch (err) {
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Fetch Medicina del Lavoro data when employee is available
  useEffect(() => {
    if (!id || id === 'new' || !employee) return;
    const fetchMdlData = async () => {
      setMdlLoading(true);
      try {
        const [rischiResult, giudiziResult, visiteResult] = await Promise.allSettled([
          apiGet<any>(`/api/v1/clinica/mansioni/worker/${id}/risks`),
          apiGet<any>(`/api/v1/clinica/giudizi-idoneita?personId=${id}&limit=10`),
          apiGet<any>(`/api/v1/clinica/visite/paziente/${id}`)
        ]);
        if (rischiResult.status === 'fulfilled') {
          const r = rischiResult.value;
          const payload = r?.data || r || {};
          setMdlRischi(Array.isArray(payload?.rischi) ? payload.rischi : (Array.isArray(payload) ? payload : []));
          const mansioniList = Array.isArray(payload?.mansioni) ? payload.mansioni : [];
          setMdlMansioni(mansioniList);

          // Fetch protocolli per ogni mansione
          if (mansioniList.length > 0) {
            try {
              const protoResults = await Promise.allSettled(
                mansioniList.map((m: any) => clinicaApi.protocolliSanitari.getByMansione(m.id))
              );
              const allProto: any[] = [];
              protoResults.forEach(pr => {
                if (pr.status === 'fulfilled' && Array.isArray(pr.value)) {
                  allProto.push(...pr.value.filter((p: any) => p.isAttivo));
                }
              });
              setMdlProtocolli(allProto);
            } catch { /* protocolli are optional */ }
          }
        }
        if (giudiziResult.status === 'fulfilled') {
          const g = giudiziResult.value;
          const list = Array.isArray(g) ? g : (g?.data || g?.giudizi || []);
          setMdlGiudizi(list);
        }
        if (visiteResult.status === 'fulfilled') {
          const v = visiteResult.value;
          setMdlVisite(Array.isArray(v) ? v : (v?.data || []));
        }
      } catch {
        // MDL data is optional - silently fail
      } finally {
        setMdlLoading(false);
      }
    };
    fetchMdlData();
  }, [id, employee]);

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

  const renderMdlCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          Medicina del Lavoro
        </h2>
      </div>

      {mdlLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent mr-2" />
          Caricamento dati sanitari...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visite Mediche */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Visite Mediche
            </h3>
            {mdlVisite.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                Nessuna visita medica registrata.
              </div>
            ) : (
              <div className="space-y-3">
                {mdlVisite.slice(0, 10).map((visita: any, idx: number) => {
                  const giudizioVisita = mdlGiudizi.find((g: any) =>
                    g.visitaId === visita.id || (g.dataVisita && visita.dataVisita && g.dataVisita === visita.dataVisita)
                  );
                  const accertamenti = visita.appuntamento?.prestazioni || [];
                  const questionari = visita.documentiModulistica || [];
                  return (
                    <Link
                      key={visita.id || idx}
                      to={`/poliambulatorio/visite/${visita.id}`}
                      className="block bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <Stethoscope className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {(visita.tipo || visita.tipoVisita || visita.tipoVisitaMDL || 'Visita medica').replace(/_/g, ' ')}
                            </p>
                            {visita.motivoVisita && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{visita.motivoVisita}</p>
                            )}
                            {(visita.medicoCompetente || visita.medico) && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                MC: {(visita.medicoCompetente || visita.medico).lastName} {(visita.medicoCompetente || visita.medico).firstName}
                              </p>
                            )}
                            {giudizioVisita && (
                              <p className={`text-xs font-medium mt-1 ${(giudizioVisita.tipoGiudizio || '').startsWith('IDONEO') && !(giudizioVisita.tipoGiudizio || '').includes('NON')
                                ? 'text-green-600 dark:text-green-400'
                                : (giudizioVisita.tipoGiudizio || '').startsWith('NON_IDONEO')
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                Giudizio: {(giudizioVisita.tipoGiudizio || giudizioVisita.tipo || '').replace(/_/g, ' ')}
                              </p>
                            )}
                            {accertamenti.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {accertamenti.slice(0, 4).map((acc: any) => (
                                  <span key={acc.id} className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700 px-1.5 py-0.5 rounded">
                                    {acc.prestazione?.nome || acc.prestazione?.codice || 'Accertamento'}
                                  </span>
                                ))}
                                {accertamenti.length > 4 && (
                                  <span className="text-[10px] text-purple-400 px-1 py-0.5">+{accertamenti.length - 4}</span>
                                )}
                              </div>
                            )}
                            {questionari.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {questionari.slice(0, 4).map((q: any) => (
                                  <span key={q.id} className="text-[10px] bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-1.5 py-0.5 rounded">
                                    {q.documentoTemplate?.nome || 'Questionario'}
                                  </span>
                                ))}
                                {questionari.length > 4 && (
                                  <span className="text-[10px] text-teal-400 px-1 py-0.5">+{questionari.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(visita.dataVisita || visita.dataOra) ? new Date(visita.dataVisita || visita.dataOra).toLocaleDateString('it-IT') : ''}
                          </span>
                          {visita.stato && (
                            <p className={`text-xs font-medium mt-0.5 ${visita.stato === 'COMPLETATA' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {visita.stato.replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mansioni e Rischi */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-teal-500" />
                Mansioni e Rischi Lavorativi
              </h3>
              {(mdlMansioni.length === 0 && mdlRischi.length === 0) ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                  Nessuna mansione assegnata.
                </div>
              ) : (
                <div className="space-y-3">
                  {mdlMansioni.length > 0 && mdlMansioni.map((mansione: any, idx: number) => (
                    <Link
                      key={mansione.id || idx}
                      to={`/poliambulatorio/mdl/mansioni/${mansione.id}`}
                      className="block bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {mansione.codice || mansione.denominazione || `Mansione ${idx + 1}`}
                          </p>
                          {mansione.denominazione && mansione.codice && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {mansione.denominazione}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                      </div>
                    </Link>
                  ))}
                  {mdlRischi.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Rischi associati:</p>
                      <div className="flex flex-wrap gap-1">
                        {mdlRischi.map((r: any, rIdx: number) => (
                          <span key={rIdx} className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                            <Shield className="h-3 w-3" />
                            {r.codiceRischio || r.nome || r.name || r}
                            {r.livello && <span className="text-[10px] opacity-70 ml-0.5">({r.livello})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Protocolli Sanitari */}
            {mdlProtocolli.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-500" />
                  Protocollo Sanitario
                </h3>
                <div className="space-y-3">
                  {mdlProtocolli.map((proto: any) => (
                    <Link
                      key={proto.id}
                      to={`/poliambulatorio/mdl/protocolli-sanitari/${proto.id}`}
                      className="block bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-teal-800 dark:text-teal-300">
                          {proto.codice} — {proto.denominazione}
                        </span>
                        <span className="text-xs text-teal-600 dark:text-teal-400">
                          {proto.prestazioni?.length || proto._count?.prestazioni || 0} prestazioni
                        </span>
                      </div>
                      {proto.prestazioni && proto.prestazioni.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {proto.prestazioni.slice(0, 5).map((pp: any) => (
                            <span key={pp.id} className="text-[11px] bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-700 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                              {pp.prestazione?.nome || pp.prestazioneId}
                              {pp.isObbligatoria && <span className="ml-0.5 text-teal-500">*</span>}
                            </span>
                          ))}
                          {proto.prestazioni.length > 5 && (
                            <span className="text-[11px] text-teal-500 px-1.5 py-0.5">
                              +{proto.prestazioni.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Giudizi di Idoneità */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-500" />
                Giudizi di Idoneità
              </h3>
              {mdlGiudizi.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                  Nessun giudizio di idoneità registrato.
                </div>
              ) : (
                <div className="space-y-2">
                  {mdlGiudizi.slice(0, 5).map((g: any, idx: number) => {
                    const tipo = g.tipoGiudizio || g.tipo || '';
                    const isIdoneo = tipo.startsWith('IDONEO') && !tipo.includes('NON');
                    const isNonIdoneo = tipo.startsWith('NON_IDONEO');
                    const accertamentiGiudizio = g.visita?.appuntamento?.prestazioni || [];
                    const mansioneLabel = g.mansioni?.[0]?.mansione?.codice || g.mansione?.codice || '';
                    return (
                      <Link
                        key={g.id || idx}
                        to={`/poliambulatorio/mdl/giudizi-idoneita/${g.id}`}
                        className="block bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            {isIdoneo ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : isNonIdoneo ? (
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className={`text-sm font-medium ${isIdoneo ? 'text-green-700 dark:text-green-400' : isNonIdoneo ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                {tipo.replace(/_/g, ' ')}
                              </p>
                              {(g.dataVisita || g.dataEmissione) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Visita: {new Date(g.dataVisita || g.dataEmissione).toLocaleDateString('it-IT')}
                                </p>
                              )}
                              {g.dataScadenza && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Scade: {new Date(g.dataScadenza).toLocaleDateString('it-IT')}
                                </p>
                              )}
                              {mansioneLabel && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  Mansione: {mansioneLabel}
                                </p>
                              )}
                              {accertamentiGiudizio.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {accertamentiGiudizio.slice(0, 3).map((acc: any) => (
                                    <span key={acc.id} className="text-[10px] bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-1.5 py-0.5 rounded">
                                      {acc.prestazione?.nome || acc.prestazione?.codice || 'Accertamento'}
                                    </span>
                                  ))}
                                  {accertamentiGiudizio.length > 3 && (
                                    <span className="text-[10px] text-teal-400 px-1 py-0.5">+{accertamentiGiudizio.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-50">{employee.lastName} {employee.firstName}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {employee.title || 'Dipendente'}
                {company && <><span className="mx-2 text-gray-400">•</span><span>{company.ragioneSociale}</span></>}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Codice Fiscale: {employee.taxCode || 'Non disponibile'}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <button
              onClick={() => setShowCredentialsModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <KeyRound className="h-4 w-4" />
              Credenziali
            </button>
            <Link to={`/employees/${employee.id}/edit`} className="btn-primary flex items-center rounded-full">
              <Edit className="h-4 w-4 mr-1" />
              Modifica Dipendente
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 mb-3">Informazioni Personali</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Nome Completo</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.lastName}, {employee.firstName}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Data di Nascita</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('it-IT') : 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Sesso</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      const g = (employee.gender as string) ||
                        (employee.taxCode && (employee.taxCode as string).length === 16
                          ? extractGenderFromTaxCode(employee.taxCode as string)
                          : null);
                      if (!g) return 'Non disponibile';
                      if (g === 'MALE') return 'Maschio';
                      if (g === 'FEMALE') return 'Femmina';
                      return g;
                    })()}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Telefono</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.phone || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Email</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.email || 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 mb-3">Informazioni Lavorative</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Profilo Professionale</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.title || 'Non specificato'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Azienda</span>
                  {company ? (
                    <Link to={`/companies/${company.id}`} className="block text-sm text-blue-600 hover:text-blue-800">
                      {company.ragioneSociale}
                    </Link>
                  ) : (
                    <span className="block text-sm text-gray-600 dark:text-gray-400">Non assegnata</span>
                  )}
                </div>
              </li>
              <li className="flex items-start">
                <ClipboardList className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Mansioni</span>
                  {mdlMansioni.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {mdlMansioni.map((m: any, idx: number) => (
                        <span key={m.id || idx} className="inline-flex items-center text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-2 py-0.5 rounded-full">
                          {m.codice || m.denominazione || `Mansione ${idx + 1}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="block text-sm text-gray-600 dark:text-gray-400">Nessuna mansione assegnata</span>
                  )}
                </div>
              </li>
              <li className="flex items-start">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Protocollo Sanitario</span>
                  {mdlProtocolli.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {mdlProtocolli.map((p: any) => (
                        <Link
                          key={p.id}
                          to={`/poliambulatorio/mdl/protocolli-sanitari/${p.id}`}
                          className="inline-flex items-center text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-2 py-0.5 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50"
                        >
                          {p.codice} — {p.denominazione}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="block text-sm text-gray-600 dark:text-gray-400">Nessun protocollo attivo</span>
                  )}
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Data Assunzione</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.hiredDate ? new Date(employee.hiredDate).toLocaleDateString('it-IT') : 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 mb-3">Residenza</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Indirizzo</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.residenceAddress || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Città</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.residenceCity || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">Provincia</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.province || 'Non disponibile'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800 dark:text-gray-50">CAP</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{employee.postalCode || 'Non disponibile'}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Profilo di Salute — sezione collassabile */}
        {id && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {canSeeMedicalData ? (
              <>
                <button
                  type="button"
                  onClick={() => setProfiloSaluteExpanded(!profiloSaluteExpanded)}
                  className="w-full flex items-center justify-between mb-3 group"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-teal-500" />
                    Profilo di Salute
                  </h3>
                  <ChevronDown className={`h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${profiloSaluteExpanded ? 'rotate-180' : ''}`} />
                </button>
                {profiloSaluteExpanded && (
                  <ProfiloSaluteCard personId={id} tabLayout />
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 dark:bg-gray-700/30 dark:border-gray-600">
                <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dati sanitari riservati</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accesso riservato al Medico Competente e agli amministratori</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card ordering: MDL prima dei Corsi se ha dati clinici */}
      {(mdlVisite.length > 0 || mdlGiudizi.length > 0 || mdlMansioni.length > 0 || mdlProtocolli.length > 0) ? (
        <>
          {/* Medicina del Lavoro (priorità — ha dati) */}
          {renderMdlCard()}

          {/* Corsi Frequentati */}
          <EntitySchedulesSection
            entityType="person"
            entityId={id!}
            title="Corsi Frequentati"
            showDocuments={true}
            maxItems={5}
            showQuickDownloads={true}
          />
        </>
      ) : (
        <>
          {/* Corsi Frequentati (priorità — nessun dato MDL) */}
          <EntitySchedulesSection
            entityType="person"
            entityId={id!}
            title="Corsi Frequentati"
            showDocuments={true}
            maxItems={5}
            showQuickDownloads={true}
          />

          {/* Medicina del Lavoro (vuoto) */}
          {renderMdlCard()}
        </>
      )}

      {/* Profili Multi-Tenant — solo per amministratori */}
      {user?.roles?.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r)) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
          <PersonTenantProfilesWidget
            personId={id!}
            compactMode={false}
            editable={false}
            theme="blue"
          />
        </div>
      )}

      {/* Modal gestione credenziali */}
      {employee && (
        <PersonCredentialsModal
          open={showCredentialsModal}
          onOpenChange={setShowCredentialsModal}
          persons={[{
            id: employee.id,
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            email: employee.email ?? undefined,
          }]}
        />
      )}
    </div>
  );
};

export default EmployeeDetails;