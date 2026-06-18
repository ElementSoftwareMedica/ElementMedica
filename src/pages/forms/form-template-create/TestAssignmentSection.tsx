/**
 * TestAssignmentSection Component
 * 
 * Section for configuring form template as a test for courses/trainers.
 */

import React from 'react';
import {
    ClipboardCheck,
    GraduationCap,
    Users,
    BookOpen,
    Timer
} from 'lucide-react';
import { ElegantSelect } from '@/components/ui/ElegantSelect';
import type { TestAssignmentConfig, FormTemplateData } from './types';
import type { Course } from '../../../types/courses';

interface TestAssignmentSectionProps {
    testAssignment: TestAssignmentConfig;
    onUpdate: (updates: Partial<TestAssignmentConfig>) => void;
    onToggle: () => void;
    availableCourses: Course[];
    loadingCourses: boolean;
}

const TestAssignmentSection: React.FC<TestAssignmentSectionProps> = ({
    testAssignment,
    onUpdate,
    onToggle,
    availableCourses,
    loadingCourses
}) => {
    const updateCourseBinding = (updates: Partial<TestAssignmentConfig['courseBinding']>) => {
        onUpdate({
            courseBinding: {
                ...testAssignment.courseBinding,
                ...updates
            }
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold">Associazione come Test</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">
                        {testAssignment.enabled ? 'Attivo' : 'Disattivo'}
                    </span>
                    <div
                        className={`relative w-11 h-6 rounded-full transition-colors ${testAssignment.enabled ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                        onClick={onToggle}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${testAssignment.enabled ? 'translate-x-5' : ''
                            }`} />
                    </div>
                </label>
            </div>

            {testAssignment.enabled && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    {/* Target Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Destinatari del Test
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${testAssignment.targetType === 'course'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="targetType"
                                    value="course"
                                    checked={testAssignment.targetType === 'course'}
                                    onChange={() => onUpdate({ targetType: 'course' })}
                                    className="sr-only"
                                />
                                <GraduationCap className={`w-8 h-8 mb-2 ${testAssignment.targetType === 'course' ? 'text-purple-600' : 'text-gray-400'
                                    }`} />
                                <span className="text-sm font-medium">Partecipanti Corso</span>
                                <span className="text-xs text-gray-500 text-center mt-1">Test per chi frequenta i corsi</span>
                            </label>

                            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${testAssignment.targetType === 'trainer'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="targetType"
                                    value="trainer"
                                    checked={testAssignment.targetType === 'trainer'}
                                    onChange={() => onUpdate({ targetType: 'trainer', testType: 'TRAINER_EVALUATION' })}
                                    className="sr-only"
                                />
                                <Users className={`w-8 h-8 mb-2 ${testAssignment.targetType === 'trainer' ? 'text-purple-600' : 'text-gray-400'
                                    }`} />
                                <span className="text-sm font-medium">Valutazione Formatori</span>
                                <span className="text-xs text-gray-500 text-center mt-1">Questionario gradimento docenti</span>
                            </label>

                            <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${testAssignment.targetType === 'both'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="targetType"
                                    value="both"
                                    checked={testAssignment.targetType === 'both'}
                                    onChange={() => onUpdate({ targetType: 'both' })}
                                    className="sr-only"
                                />
                                <BookOpen className={`w-8 h-8 mb-2 ${testAssignment.targetType === 'both' ? 'text-purple-600' : 'text-gray-400'
                                    }`} />
                                <span className="text-sm font-medium">Entrambi</span>
                                <span className="text-xs text-gray-500 text-center mt-1">Test e valutazione insieme</span>
                            </label>
                        </div>
                    </div>

                    {/* Course Binding */}
                    {(testAssignment.targetType === 'course' || testAssignment.targetType === 'both') && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Associazione ai Corsi
                            </h3>

                            {/* All courses toggle */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={testAssignment.courseBinding.allCourses}
                                        onChange={(e) => updateCourseBinding({
                                            allCourses: e.target.checked,
                                            specificCourseId: e.target.checked ? null : testAssignment.courseBinding.specificCourseId
                                        })}
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">Applica a tutti i corsi</span>
                                </label>
                            </div>

                            {!testAssignment.courseBinding.allCourses && (
                                <>
                                    {/* Specific course selection */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Corso Specifico (opzionale)</label>
                                        <ElegantSelect
                                            value={testAssignment.courseBinding.specificCourseId || ''}
                                            onChange={(v) => updateCourseBinding({ specificCourseId: v || null })}
                                            placeholder="-- Seleziona un corso --"
                                            options={availableCourses.map(course => ({
                                                value: course.id,
                                                label: `${course.code ? `[${course.code}] ` : ''}${course.title}`
                                            }))}
                                        />
                                    </div>

                                    {/* Risk Level Filter */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Livelli di Rischio</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(['ALTO', 'MEDIO', 'BASSO'] as const).map(level => (
                                                <label
                                                    key={level}
                                                    className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${testAssignment.courseBinding.riskLevels.includes(level)
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={testAssignment.courseBinding.riskLevels.includes(level)}
                                                        onChange={(e) => {
                                                            const current = testAssignment.courseBinding.riskLevels;
                                                            const updated = e.target.checked
                                                                ? [...current, level]
                                                                : current.filter(l => l !== level);
                                                            updateCourseBinding({ riskLevels: updated });
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    {level === 'ALTO' ? '🔴 Alto' : level === 'MEDIO' ? '🟡 Medio' : '🟢 Basso'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Course Type Filter */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Tipo Corso</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(['PRIMO_CORSO', 'AGGIORNAMENTO'] as const).map(type => (
                                                <label
                                                    key={type}
                                                    className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${testAssignment.courseBinding.courseTypes.includes(type)
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={testAssignment.courseBinding.courseTypes.includes(type)}
                                                        onChange={(e) => {
                                                            const current = testAssignment.courseBinding.courseTypes;
                                                            const updated = e.target.checked
                                                                ? [...current, type]
                                                                : current.filter(t => t !== type);
                                                            updateCourseBinding({ courseTypes: updated });
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    {type === 'PRIMO_CORSO' ? '📚 Primo Corso' : '🔄 Aggiornamento'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Test Type and Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di Test</label>
                            <select
                                value={testAssignment.testType}
                                onChange={(e) => onUpdate({ testType: e.target.value as TestAssignmentConfig['testType'] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="INITIAL">📝 Test Iniziale</option>
                                <option value="FINAL">✅ Test Finale</option>
                                <option value="INTERMEDIATE">📊 Test Intermedio</option>
                                <option value="ASSESSMENT">📋 Valutazione</option>
                                <option value="CERTIFICATION">🎓 Certificazione</option>
                                <option value="TRAINER_EVALUATION">⭐ Valutazione Formatore</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={testAssignment.isRequired}
                                    onChange={(e) => onUpdate({ isRequired: e.target.checked })}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Test Obbligatorio</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <span className="flex items-center gap-1">
                                    <ClipboardCheck className="w-4 h-4" />
                                    Punteggio Minimo (%)
                                </span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={testAssignment.passingScore || ''}
                                onChange={(e) => onUpdate({ passingScore: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="Es. 60"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <span className="flex items-center gap-1">
                                    <Timer className="w-4 h-4" />
                                    Tempo Limite (minuti)
                                </span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={testAssignment.timeLimit || ''}
                                onChange={(e) => onUpdate({ timeLimit: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="Es. 30"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestAssignmentSection;
