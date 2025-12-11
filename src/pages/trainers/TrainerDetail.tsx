import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Award,
    BookOpen,
    Building2,
    Calendar,
    CheckCircle,
    ChevronRight,
    Clock,
    CreditCard,
    Edit,
    Euro,
    FileCheck,
    FileText,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    User,
    UserCheck,
    Download,
    Eye,
    AlertCircle
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { PersonData, Company } from '../../types';
import { getRiskLevelLabel, getCourseTypeLabel } from '../../utils/courseLabels';

/**
 * Pagina di dettaglio formatore elegante - stile EmployeeDetails
 */
export default function TrainerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [trainer, setTrainer] = useState<PersonData | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    // Stati per dati reali
    const [completedCourses, setCompletedCourses] = useState<any[]>([]);
    const [upcomingCourses, setUpcomingCourses] = useState<any[]>([]);
    const [compensi, setCompensi] = useState<any[]>([]);
    const [documenti, setDocumenti] = useState<{ lettereIncarico: any[], registriPresenze: any[] }>({
        lettereIncarico: [],
        registriPresenze: []
    });

    useEffect(() => {
        if (!id || id === 'new') {
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const data = await apiGet(`/api/v1/persons/${id}`) as PersonData;
                setTrainer(data);

                if (data.companyId) {
                    const comp = await apiGet(`/api/v1/companies/${data.companyId}`) as Company;
                    setCompany(comp);
                }

                // Fetch corsi programmati per questo trainer
                try {
                    const schedulesResponse = await apiGet(`/api/v1/schedules?trainerId=${id}`) as any;
                    const schedules = Array.isArray(schedulesResponse)
                        ? schedulesResponse
                        : schedulesResponse?.data || schedulesResponse?.schedules || [];

                    // Corsi completati: status = COMPLETED
                    const completed = schedules.filter((s: any) => s.status === 'COMPLETED');
                    // Corsi programmati: status = PENDING, CONFIRMED, ACTIVE
                    const upcoming = schedules.filter((s: any) =>
                        ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(s.status)
                    );

                    setCompletedCourses(completed);
                    setUpcomingCourses(upcoming);
                } catch (err) {
                    console.warn('Error fetching schedules:', err);
                }

                // Fetch documenti (lettere incarico e registri presenze) per questo trainer
                try {
                    const [lettereResponse, registriResponse] = await Promise.all([
                        apiGet(`/api/v1/lettere-incarico?trainerId=${id}`) as Promise<any>,
                        apiGet(`/api/v1/registri-presenze?formatoreId=${id}`) as Promise<any>
                    ]);

                    const lettere = Array.isArray(lettereResponse) ? lettereResponse : [];
                    const registri = Array.isArray(registriResponse) ? registriResponse : [];

                    setDocumenti({
                        lettereIncarico: lettere.map((l: any) => ({
                            ...l,
                            schedule: l.scheduledCourse
                        })),
                        registriPresenze: registri.map((r: any) => ({
                            ...r,
                            schedule: r.scheduledCourse
                        }))
                    });
                } catch (err) {
                    console.warn('Error fetching documents:', err);
                }

                // Fetch preventivi di tipo COMPENSO_FORMATORE per questo formatore
                try {
                    const preventiviResponse = await apiGet(`/api/v1/preventivi?clienteId=${id}&clienteType=persona&tipoServizio=COMPENSO_FORMATORE`) as any;
                    const preventivi = Array.isArray(preventiviResponse)
                        ? preventiviResponse
                        : preventiviResponse?.data || preventiviResponse?.preventivi || [];
                    setCompensi(preventivi);
                } catch (err) {
                    console.warn('Error fetching compensi:', err);
                }
            } catch (err) {
                console.error('Error fetching trainer data:', err);
                setTrainer(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Caricamento...</p>
                </div>
            </div>
        );
    }

    if (!trainer) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800">Formatore non trovato</h2>
                    <p className="text-gray-600 mt-2">Il formatore che stai cercando non esiste o è stato rimosso.</p>
                    <Link to="/trainers" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        Torna ai Formatori
                    </Link>
                </div>
            </div>
        );
    }

    // Combine documents for display
    const allDocuments = [
        ...documenti.lettereIncarico.map(l => ({ ...l, type: 'lettera' })),
        ...documenti.registriPresenze.map(r => ({ ...r, type: 'registro' }))
    ];

    return (
        <div className="space-y-6">
            {/* Back link */}
            <div>
                <Link
                    to="/trainers"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <ChevronRight className="h-4 w-4 mr-1 transform rotate-180" />
                    Torna ai Formatori
                </Link>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center">
                        {/* Avatar */}
                        <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-white">
                                {trainer.firstName?.charAt(0)}{trainer.lastName?.charAt(0)}
                            </span>
                        </div>

                        {/* Name & Info */}
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {trainer.lastName} {trainer.firstName}
                            </h1>
                            <p className="text-gray-600">
                                {trainer.title || 'Formatore'}
                                {company && (
                                    <>
                                        <span className="mx-2 text-gray-400">•</span>
                                        <span>{company.ragioneSociale || company.name}</span>
                                    </>
                                )}
                            </p>
                            <p className="text-sm text-gray-500">
                                Codice Fiscale: {trainer.taxCode || 'Non disponibile'}
                            </p>
                        </div>
                    </div>

                    {/* Edit Button - Pillola */}
                    <div className="mt-4 md:mt-0">
                        <Link
                            to={`/trainers/${trainer.id}/edit`}
                            className="btn-primary flex items-center rounded-full"
                        >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifica Formatore
                        </Link>
                    </div>
                </div>

                {/* Info Grid 3 Colonne */}
                <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Colonna 1: Informazioni Personali */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni Personali</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Nome Completo</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.lastName}, {trainer.firstName}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Data di Nascita</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.birthDate
                                            ? new Date(trainer.birthDate).toLocaleDateString('it-IT')
                                            : 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Telefono</span>
                                    <span className="block text-sm text-gray-600">{trainer.phone || 'Non disponibile'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Email</span>
                                    <span className="block text-sm text-gray-600">{trainer.email || 'Non disponibile'}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Colonna 2: Informazioni Professionali */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni Professionali</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <GraduationCap className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Specializzazione</span>
                                    <span className="block text-sm text-gray-600">{trainer.title || 'Non specificata'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Prezzo/ora</span>
                                    <span className="block text-sm font-semibold text-gray-900">
                                        {trainer.hourlyRate ? `€${Number(trainer.hourlyRate).toFixed(2)}` : 'Non specificato'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Certificazioni</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.certifications && trainer.certifications.length > 0
                                            ? trainer.certifications.join(', ')
                                            : 'Nessuna certificazione registrata'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Registro Formatori</span>
                                    <span className="block text-sm text-gray-600">
                                        {/* TODO: aggiungere campo registro */}
                                        Non disponibile
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Colonna 3: Residenza */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Residenza</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Indirizzo</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.residenceAddress || 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">Città</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.residenceCity || 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">Provincia</span>
                                    <span className="block text-sm text-gray-600">{trainer.province || 'Non disponibile'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">CAP</span>
                                    <span className="block text-sm text-gray-600">{trainer.postalCode || 'Non disponibile'}</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Sezioni Corsi - Layout affiancato come EmployeeDetails */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Corsi Svolti */}
                <div className="bg-white rounded-lg shadow p-6 h-96">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                            Corsi Svolti
                        </h2>
                        <Link
                            to={`/schedules?trainerId=${id}&status=COMPLETED`}
                            className="text-green-600 hover:text-green-800 flex items-center rounded-full px-3 py-1 hover:bg-green-50 transition-colors"
                        >
                            Vedi Tutti
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3 overflow-y-auto h-80">
                        {completedCourses.length > 0 ? (
                            completedCourses.slice(0, 5).map((schedule: any) => (
                                <Link
                                    key={schedule.id}
                                    to={`/schedules/${schedule.id}`}
                                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-400 hover:bg-green-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <GraduationCap className="h-5 w-5 text-green-600 mr-3" />
                                        <div>
                                            <p className="font-medium text-gray-900">{schedule.course?.title || 'Corso'}</p>
                                            <p className="text-sm text-gray-600">
                                                {schedule.course?.duration || '-'}h
                                                {schedule.course?.riskLevel && (
                                                    <span className="ml-2">• {getRiskLevelLabel(schedule.course.riskLevel, schedule.course.title)}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-green-600">Completato</p>
                                        <p className="text-xs text-gray-500">
                                            {schedule.endDate ? new Date(schedule.endDate).toLocaleDateString('it-IT') : '-'}
                                        </p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <GraduationCap className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nessun corso svolto</p>
                                <p className="text-sm mt-1">
                                    I corsi completati da questo formatore appariranno qui
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Corsi Programmati */}
                <div className="bg-white rounded-lg shadow p-6 h-96">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-orange-600" />
                            Corsi Programmati
                        </h2>
                        <Link
                            to={`/schedules?trainerId=${id}&status=PENDING,CONFIRMED,ACTIVE`}
                            className="text-orange-600 hover:text-orange-800 flex items-center rounded-full px-3 py-1 hover:bg-orange-50 transition-colors"
                        >
                            Vedi Tutti
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3 overflow-y-auto h-80">
                        {upcomingCourses.length > 0 ? (
                            upcomingCourses.slice(0, 5).map((schedule: any) => {
                                const statusColor = schedule.status === 'CONFIRMED' ? 'blue' :
                                    schedule.status === 'ACTIVE' ? 'green' : 'orange';
                                const statusLabel = schedule.status === 'PENDING' ? 'Preventivo' :
                                    schedule.status === 'CONFIRMED' ? 'Confermato' : 'Attivo';
                                return (
                                    <Link
                                        key={schedule.id}
                                        to={`/schedules/${schedule.id}`}
                                        className={`flex items-center justify-between p-3 bg-${statusColor}-50 rounded-lg border-l-4 border-${statusColor}-400 hover:bg-${statusColor}-100 transition-colors`}
                                    >
                                        <div className="flex items-center">
                                            <BookOpen className={`h-5 w-5 text-${statusColor}-600 mr-3`} />
                                            <div>
                                                <p className="font-medium text-gray-900">{schedule.course?.title || 'Corso'}</p>
                                                <p className="text-sm text-gray-600">
                                                    {schedule.course?.duration || '-'}h
                                                    {schedule.course?.riskLevel && (
                                                        <span className="ml-2">• {getRiskLevelLabel(schedule.course.riskLevel, schedule.course.title)}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-medium text-${statusColor}-600`}>{statusLabel}</p>
                                            <p className="text-xs text-gray-500">
                                                {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('it-IT') : '-'}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <BookOpen className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nessun corso programmato</p>
                                <p className="text-sm mt-1">
                                    I corsi futuri assegnati a questo formatore appariranno qui
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sezioni Aggiuntive - Grid 2 colonne */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spettanze */}
                <div className="bg-white rounded-lg shadow p-6 h-96">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <Euro className="h-5 w-5 mr-2 text-purple-600" />
                            Spettanze e Compensi
                        </h2>
                        <Link
                            to={`/preventivi?clienteId=${id}&clienteType=persona&tipoServizio=COMPENSO_FORMATORE`}
                            className="text-purple-600 hover:text-purple-800 flex items-center rounded-full px-3 py-1 hover:bg-purple-50 transition-colors"
                        >
                            Vedi Tutti
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3 overflow-y-auto h-80">
                        {compensi.length > 0 ? (
                            compensi.slice(0, 5).map((preventivo: any) => {
                                const statusColor = preventivo.stato === 'ACCETTATO' ? 'green' :
                                    preventivo.stato === 'ARCHIVIATO' ? 'blue' :
                                        preventivo.stato === 'FATTURATO' ? 'purple' :
                                            preventivo.stato === 'INVIATO' ? 'yellow' : 'gray';
                                const statusLabel = preventivo.stato === 'ACCETTATO' ? 'Accettato' :
                                    preventivo.stato === 'ARCHIVIATO' ? 'Archiviato' :
                                        preventivo.stato === 'FATTURATO' ? 'Fatturato' :
                                            preventivo.stato === 'INVIATO' ? 'Inviato' :
                                                preventivo.stato === 'BOZZA' ? 'Bozza' : preventivo.stato;
                                return (
                                    <Link
                                        key={preventivo.id}
                                        to={`/preventivi/${preventivo.id}`}
                                        className={`flex items-center justify-between p-3 bg-${statusColor}-50 rounded-lg border-l-4 border-${statusColor}-400 hover:bg-${statusColor}-100 transition-colors`}
                                    >
                                        <div className="flex items-center">
                                            <CreditCard className={`h-5 w-5 text-${statusColor}-600 mr-3`} />
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {preventivo.numero || `Preventivo #${preventivo.id?.substring(0, 8)}`}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {preventivo.schedule?.course?.title || preventivo.descrizione || 'Compenso formatore'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-medium text-${statusColor}-600`}>{statusLabel}</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                €{Number(preventivo.importoFinale || preventivo.prezzoTotale || 0).toFixed(2)}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <CreditCard className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nessuna spettanza registrata</p>
                                <p className="text-sm mt-1">
                                    I compensi per questo formatore appariranno qui quando saranno registrati
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Documenti */}
                <div className="bg-white rounded-lg shadow p-6 h-96">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
                            Documenti
                        </h2>
                        <span className="text-sm text-gray-500">
                            {allDocuments.length} documento/i
                        </span>
                    </div>

                    <div className="space-y-3 overflow-y-auto h-80">
                        {allDocuments.length > 0 ? (
                            allDocuments.slice(0, 6).map((doc: any) => {
                                const isLettera = doc.type === 'lettera';
                                const docColor = isLettera ? 'indigo' : 'teal';
                                const docIcon = isLettera ? FileText : FileCheck;
                                const DocIcon = docIcon;
                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center justify-between p-3 bg-${docColor}-50 rounded-lg border-l-4 border-${docColor}-400`}
                                    >
                                        <div className="flex items-center flex-1 min-w-0">
                                            <DocIcon className={`h-5 w-5 text-${docColor}-600 mr-3 flex-shrink-0`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {isLettera ? 'Lettera di Incarico' : 'Registro Presenze'}
                                                </p>
                                                <p className="text-sm text-gray-600 truncate">
                                                    {doc.schedule?.course?.title || 'Corso'}
                                                    {doc.schedule?.company?.ragioneSociale && (
                                                        <span> - {doc.schedule.company.ragioneSociale}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <span className="text-xs text-gray-500">
                                                {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '-'}
                                            </span>
                                            {doc.fileUrl && (
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`p-1 rounded hover:bg-${docColor}-100 text-${docColor}-600`}
                                                    title="Scarica documento"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            )}
                                            {doc.scheduleId && (
                                                <Link
                                                    to={`/schedules/${doc.scheduleId}`}
                                                    className={`p-1 rounded hover:bg-${docColor}-100 text-${docColor}-600`}
                                                    title="Vai al corso"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <FileCheck className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nessun documento disponibile</p>
                                <p className="text-sm mt-1">
                                    Lettere di incarico e registri presenze appariranno qui
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Note Aggiuntive */}
            {trainer.notes && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Note Aggiuntive</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">{trainer.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
