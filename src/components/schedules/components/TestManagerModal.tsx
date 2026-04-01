/**
 * TestManagerModal Component
 * Modal per gestire test e questionari di uno schedule
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
    AlertCircle,
    X
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { useToast } from '../../../hooks/useToast';
import {
    getTestsForCourse,
    getTestResultsForSchedule,
    getTestStatsForSchedule,
    testTypeLabels,
    riskLevelLabels,
    courseTypeLabels,
    type CourseTestAssignment,
    type CourseTestResult,
    type TestStats
} from '../../../services/courseTestsService';

interface TestManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    scheduleId?: string | number | null;
    courseId?: string;
    riskLevel?: string;
    courseType?: string;
    courseName?: string;
    persons?: Array<{
        id: string | number;
        firstName: string;
        lastName: string;
        email?: string;
    }>;
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

export const TestManagerModal: React.FC<TestManagerModalProps> = ({
    isOpen,
    onClose,
    scheduleId,
    courseId,
    riskLevel,
    courseType,
    courseName,
    persons = []
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tests, setTests] = useState<TestWithResults[]>([]);
    const [stats, setStats] = useState<TestStats[]>([]);
    const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
    const { showToast } = useToast();

    // Carica test e risultati
    const loadTestsAndResults = useCallback(async () => {
        if (!courseId) {
            setError('Nessun corso selezionato');
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
                try {
                    [resultsData, statsData] = await Promise.all([
                        getTestResultsForSchedule(String(scheduleId)),
                        getTestStatsForSchedule(String(scheduleId))
                    ]);
                } catch {
                    // Results might not exist yet - ignore
                }
            }

            // Combina test con i loro risultati
            const testsWithResults: TestWithResults[] = testsData.map(test => {
                const testResults = resultsData.filter(r => r.courseTestAssignmentId === test.id);
                const testStatsData = statsData.find(s => s.testType === test.testType);

                return {
                    ...test,
                    results: testResults,
                    stats: {
                        total: persons.length,
                        completed: testResults.length,
                        passed: testResults.filter(r => r.passed).length,
                        failed: testResults.filter(r => r.passed === false).length,
                        avgScore: testStatsData?.avgScore || null
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

    // Carica quando si apre il modal
    useEffect(() => {
        if (isOpen && courseId) {
            loadTestsAndResults();
        }
    }, [isOpen, courseId, loadTestsAndResults]);

    const toggleTest = (testId: string) => {
        setExpandedTests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(testId)) {
                newSet.delete(testId);
            } else {
                newSet.add(testId);
            }
            return newSet;
        });
    };

    const getStatusIcon = (test: TestWithResults) => {
        if (test.stats.completed === 0) {
            return <Clock className="h-5 w-5 text-gray-400" />;
        }
        if (test.stats.completed === test.stats.total && test.stats.passed === test.stats.total) {
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        }
        if (test.stats.failed > 0) {
            return <XCircle className="h-5 w-5 text-red-500" />;
        }
        return <Clock className="h-5 w-5 text-amber-500" />;
    };

    const getStatusText = (test: TestWithResults) => {
        if (test.stats.completed === 0) {
            return 'Non iniziato';
        }
        if (test.stats.completed === test.stats.total) {
            return test.stats.passed === test.stats.total ? 'Completato' : 'Completato con errori';
        }
        return `${test.stats.completed}/${test.stats.total} completati`;
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050] p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <FileQuestion className="h-5 w-5" />
                            Test e Questionari
                        </h2>
                        {courseName && (
                            <p className="text-indigo-100 dark:text-indigo-200 text-sm mt-1">{courseName}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                    {/* Info badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {riskLevel && (
                            <span className="inline-flex items-center px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-full text-sm">
                                Rischio: {riskLevelLabels[riskLevel] || riskLevel}
                            </span>
                        )}
                        {courseType && (
                            <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                                {courseTypeLabels[courseType] || courseType}
                            </span>
                        )}
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            <Users className="h-4 w-4 mr-1" />
                            {persons.length} partecipanti
                        </span>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* No course ID warning */}
                    {!courseId && !loading && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
                            <AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
                            <p className="text-amber-700 dark:text-amber-300">Seleziona un corso per visualizzare i test disponibili.</p>
                        </div>
                    )}

                    {/* No schedule ID warning */}
                    {courseId && !scheduleId && !loading && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center mb-4">
                            <AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
                            <p className="text-amber-700 dark:text-amber-300 mb-2">Salva il corso per abilitare la gestione dei test.</p>
                            <p className="text-amber-600 dark:text-amber-400 text-sm">I test verranno associati allo schedule dopo il salvataggio.</p>
                        </div>
                    )}

                    {/* No tests */}
                    {!loading && !error && courseId && tests.length === 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                            <FileQuestion className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nessun test disponibile</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Non ci sono test configurati per questo corso{riskLevel ? ` con rischio ${riskLevelLabels[riskLevel] || riskLevel}` : ''}.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                I test possono essere configurati dall'amministratore in Impostazioni → Form Templates.
                            </p>
                        </div>
                    )}

                    {/* Test List */}
                    {!loading && tests.length > 0 && (
                        <div className="space-y-4">
                            {tests.map(test => (
                                <div
                                    key={test.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                >
                                    {/* Test Header */}
                                    <div
                                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                                        onClick={() => toggleTest(test.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(test)}
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {test.formTemplate?.name || testTypeLabels[test.testType] || 'Test'}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded text-xs">
                                                        {testTypeLabels[test.testType]}
                                                    </span>
                                                    {test.isRequired && (
                                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded text-xs">
                                                            Obbligatorio
                                                        </span>
                                                    )}
                                                    {test.passingScore && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            Soglia: {test.passingScore}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Progress */}
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {test.stats.completed}/{test.stats.total}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{getStatusText(test)}</div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${test.stats.failed > 0 ? 'bg-red-500' :
                                                        test.stats.completed === test.stats.total ? 'bg-green-500' : 'bg-indigo-500'
                                                        }`}
                                                    style={{ width: `${(test.stats.completed / test.stats.total) * 100}%` }}
                                                />
                                            </div>

                                            {expandedTests.has(test.id) ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Test Details (expanded) */}
                                    {expandedTests.has(test.id) && (
                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                                            {/* Stats */}
                                            {test.stats.avgScore !== null && (
                                                <div className="mb-4 flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <BarChart3 className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                                        <span className="text-gray-600 dark:text-gray-400">Punteggio medio:</span>
                                                        <span className="font-medium dark:text-gray-200">{test.stats.avgScore.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Participants */}
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Partecipanti</h4>
                                                {persons.map(person => {
                                                    const result = test.results.find(r => String(r.personId) === String(person.id));
                                                    return (
                                                        <div
                                                            key={person.id}
                                                            className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {result ? (
                                                                    result.passed ? (
                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                    ) : result.passed === false ? (
                                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                                    ) : (
                                                                        <Clock className="h-4 w-4 text-amber-500" />
                                                                    )
                                                                ) : (
                                                                    <Clock className="h-4 w-4 text-gray-400" />
                                                                )}
                                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    {person.firstName} {person.lastName}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {result?.score !== null && result?.score !== undefined && (
                                                                    <span className={`text-sm font-medium ${result.passed ? 'text-green-600' : 'text-red-600'
                                                                        }`}>
                                                                        {result.score}%
                                                                    </span>
                                                                )}
                                                                {!result && scheduleId && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-xs"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // TODO: Open test send modal
                                                                            showToast({ message: `Inviare test a ${person.firstName} ${person.lastName}`, type: 'info' });
                                                                        }}
                                                                    >
                                                                        <Send className="h-3 w-3 mr-1" />
                                                                        Invia
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Actions */}
                                            {scheduleId && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                                                    <Button variant="outline" size="sm">
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        Anteprima Test
                                                    </Button>
                                                    <Button variant="primary" size="sm">
                                                        <Send className="h-4 w-4 mr-1" />
                                                        Invia a tutti
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <button
                        onClick={loadTestsAndResults}
                        className="text-sm flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </button>
                    <Button variant="secondary" onClick={onClose}>
                        Chiudi
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TestManagerModal;
