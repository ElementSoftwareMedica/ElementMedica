/**
 * TestManager Component
 * Gestisce la visualizzazione e invio dei test per uno schedule
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileQuestion,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Send,
    ExternalLink,
    BarChart3,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { useToast } from '../../../hooks/useToast';
import {
    getTestsForCourse,
    getTestResultsForSchedule,
    getTestStatsForSchedule,
    testTypeLabels,
    type CourseTestAssignment,
    type CourseTestResult,
    type TestStats
} from '../../../services/courseTestsService';

interface TestManagerProps {
    scheduleId?: string | number | null;
    courseId?: string;
    riskLevel?: string;
    courseType?: string;
    persons?: Array<{
        id: string | number;
        firstName: string;
        lastName: string;
        email?: string;
    }>;
    attendance?: Record<number, (string | number)[]>;
    onSendTest?: (testId: string, personIds: string[]) => void;
    readOnly?: boolean;
}

interface TestWithResults extends CourseTestAssignment {
    results: CourseTestResult[];
    stats: {
        total: number;
        completed: number;
        passed: number;
        failed: number;
        avgScore: number | null;
    };
}

export const TestManager: React.FC<TestManagerProps> = ({
    scheduleId,
    courseId,
    riskLevel,
    courseType,
    persons = [],
    attendance = {},
    onSendTest,
    readOnly = false
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tests, setTests] = useState<TestWithResults[]>([]);
    const [stats, setStats] = useState<TestStats[]>([]);
    const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
    const { showToast } = useToast();

    // Carica test e risultati
    const loadTestsAndResults = useCallback(async () => {
        // Defensive check: courseId must be a valid non-empty string
        if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Carica test applicabili per il corso
            const testsData = await getTestsForCourse(courseId, { riskLevel, courseType });

            // Se abbiamo uno scheduleId, carica anche i risultati
            let resultsData: CourseTestResult[] = [];
            let statsData: TestStats[] = [];

            if (scheduleId) {
                [resultsData, statsData] = await Promise.all([
                    getTestResultsForSchedule(String(scheduleId)),
                    getTestStatsForSchedule(String(scheduleId))
                ]);
            }

            // Combina test con i loro risultati
            const testsWithResults: TestWithResults[] = testsData.map(test => {
                const testResults = resultsData.filter(r => r.courseTestAssignmentId === test.id);
                const testStats = statsData.find(s => s.testType === test.testType);

                return {
                    ...test,
                    results: testResults,
                    stats: testStats ? {
                        total: testStats.total,
                        completed: testStats.completed,
                        passed: testStats.passed,
                        failed: testStats.failed,
                        avgScore: testStats.avgScore
                    } : {
                        total: persons.length,
                        completed: 0,
                        passed: 0,
                        failed: 0,
                        avgScore: null
                    }
                };
            });

            setTests(testsWithResults);
            setStats(statsData);
        } catch (err) {
            setError('Errore nel caricamento dei test');
        } finally {
            setLoading(false);
        }
    }, [courseId, riskLevel, courseType, scheduleId, persons.length]);

    useEffect(() => {
        loadTestsAndResults();
    }, [loadTestsAndResults]);

    // Toggle espansione test
    const toggleExpand = (testId: string) => {
        setExpandedTests(prev => {
            const next = new Set(prev);
            if (next.has(testId)) {
                next.delete(testId);
            } else {
                next.add(testId);
            }
            return next;
        });
    };

    // Ottieni partecipanti che non hanno ancora completato un test
    const getPendingParticipants = (test: TestWithResults) => {
        const completedPersonIds = new Set(
            test.results.filter(r => r.completedAt).map(r => r.personId)
        );
        return persons.filter(p => !completedPersonIds.has(String(p.id)));
    };

    // Handler per invio test
    const handleSendTest = (test: TestWithResults) => {
        if (!onSendTest) return;

        const pendingParticipants = getPendingParticipants(test);
        const personIds = pendingParticipants.map(p => String(p.id));

        if (personIds.length === 0) {
            showToast({ message: 'Tutti i partecipanti hanno già completato questo test', type: 'info' });
            return;
        }

        onSendTest(test.id, personIds);
    };

    // Colore badge in base allo status
    const getStatusBadgeColor = (test: TestWithResults) => {
        const { completed, total, passed, failed } = test.stats;

        if (completed === 0) return 'bg-gray-100 text-gray-600';
        if (completed < total) return 'bg-yellow-100 text-yellow-700';
        if (failed > 0) return 'bg-red-100 text-red-700';
        return 'bg-green-100 text-green-700';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400 mr-3" />
                <span className="text-gray-600 dark:text-gray-400">Caricamento test...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                    <span className="text-red-700 dark:text-red-400">{error}</span>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={loadTestsAndResults}
                >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Riprova
                </Button>
            </div>
        );
    }

    if (tests.length === 0) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                <FileQuestion className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nessun test configurato
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Non ci sono test associati a questo tipo di corso.
                    {!readOnly && ' Puoi configurare i test dalle impostazioni dei corsi.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header con statistiche globali */}
            {scheduleId && stats.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-3">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Riepilogo Test
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{testTypeLabels[stat.testType] || stat.testType}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        {stat.completed}/{stat.total}
                                    </span>
                                    {stat.avgScore !== null && (
                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                            ({stat.avgScore.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-green-600 dark:text-green-400">{stat.passed}✓</span>
                                    <span className="text-xs text-red-600 dark:text-red-400">{stat.failed}✗</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lista test */}
            {tests.map(test => {
                const isExpanded = expandedTests.has(test.id);
                const pendingCount = getPendingParticipants(test).length;

                return (
                    <div
                        key={test.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                        {/* Test Header */}
                        <div
                            className="bg-white dark:bg-gray-800 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => toggleExpand(test.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${test.testType === 'INITIAL' ? 'bg-blue-100 text-blue-600' :
                                    test.testType === 'FINAL' ? 'bg-purple-100 text-purple-600' :
                                        test.testType === 'CERTIFICATION' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-gray-100 text-gray-600'
                                    }`}>
                                    <FileQuestion className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        {test.formTemplate?.name || 'Test'}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeColor(test)}`}>
                                            {testTypeLabels[test.testType] || test.testType}
                                        </span>
                                        {test.passingScore && (
                                            <span className="text-gray-400 dark:text-gray-500">
                                                Soglia: {test.passingScore}%
                                            </span>
                                        )}
                                        {test.timeLimit && (
                                            <span className="flex items-center text-gray-400 dark:text-gray-500">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {test.timeLimit} min
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Stats badge */}
                                {scheduleId && (
                                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadgeColor(test)}`}>
                                        {test.stats.completed}/{test.stats.total}
                                        {test.stats.passed > 0 && (
                                            <span className="ml-1">
                                                ({test.stats.passed}<CheckCircle className="h-3 w-3 inline ml-0.5" />)
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Send button */}
                                {!readOnly && onSendTest && pendingCount > 0 && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSendTest(test);
                                        }}
                                    >
                                        <Send className="h-4 w-4 mr-1" />
                                        Invia ({pendingCount})
                                    </Button>
                                )}

                                {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                                {test.formTemplate?.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {test.formTemplate.description}
                                    </p>
                                )}

                                {/* Risultati partecipanti */}
                                {scheduleId && test.results.length > 0 ? (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                            <Users className="h-4 w-4 mr-1" />
                                            Risultati Partecipanti ({test.results.length})
                                        </h5>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                                            {test.results.map(result => (
                                                <div
                                                    key={result.id}
                                                    className="p-3 flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                            {result.person?.lastName?.[0]}{result.person?.firstName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {result.person?.lastName} {result.person?.firstName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {result.person?.email}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {result.completedAt ? (
                                                            <>
                                                                <div className="text-right">
                                                                    <p className={`text-sm font-bold ${result.passed ? 'text-green-600' : result.passed === false ? 'text-red-600' : 'text-gray-600'
                                                                        }`}>
                                                                        {result.score !== null ? `${result.score}%` : '-'}
                                                                    </p>
                                                                    {result.timeSpent && (
                                                                        <p className="text-xs text-gray-400">
                                                                            {Math.floor(result.timeSpent / 60)} min
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {result.passed !== null && (
                                                                    result.passed ? (
                                                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                                                    ) : (
                                                                        <XCircle className="h-5 w-5 text-red-500" />
                                                                    )
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="flex items-center text-yellow-600 text-sm">
                                                                <Clock className="h-4 w-4 mr-1" />
                                                                In corso
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : scheduleId ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                        Nessun risultato ancora disponibile
                                    </p>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            {test.isRequired ? (
                                                <span className="flex items-center justify-center text-orange-600 dark:text-orange-400">
                                                    <AlertCircle className="h-4 w-4 mr-1" />
                                                    Test obbligatorio
                                                </span>
                                            ) : (
                                                'Test opzionale'
                                            )}
                                        </p>
                                        {test.formTemplate?.form_fields && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {test.formTemplate.form_fields.length} domande
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Preview link */}
                                {!readOnly && test.formTemplate?.id && (
                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                        <a
                                            href={`/form-templates/${test.formTemplate.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            Visualizza Form
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Refresh button */}
            {scheduleId && (
                <div className="flex justify-center pt-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={loadTestsAndResults}
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Aggiorna Risultati
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TestManager;
