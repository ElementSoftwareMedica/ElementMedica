/**
 * Scoring Service
 * Gestisce il calcolo dei punteggi per quiz e test
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Calcola il punteggio per una submission di quiz/test
 * 
 * @param {Object} params
 * @param {string} params.tenantId - ID tenant
 * @param {string} params.templateId - ID template del form
 * @param {Object} params.formData - Dati della submission (risposte utente)
 * @returns {Promise<Object>} Risultato scoring con score, maxScore, percentage, results
 */
export const calculateQuizScore = async ({ tenantId, templateId, formData }) => {
  try {
    // Recupera template con campi che hanno enableQuizMode
    const template = await prisma.formTemplate.findFirst({
      where: {
        id: templateId,
        tenantId,
        deletedAt: null
      },
      include: {
        form_fields: {
          where: { 
            isActive: true
          }
        }
      }
    });

    if (!template || !template.form_fields) {
      logger.warn('Template not found or has no fields', { templateId, tenantId });
      return {
        score: 0,
        maxScore: 0,
        percentage: 0,
        passed: false,
        results: [],
        error: 'Template not found'
      };
    }

    // Filtra solo i campi con quiz mode abilitato
    const quizFields = template.form_fields.filter(field => {
      // enableQuizMode può essere nella root o dentro scoring JSON
      return field.enableQuizMode === true || 
             (field.scoring && field.scoring.enabled === true);
    });

    if (quizFields.length === 0) {
      logger.info('No quiz fields found in template', { templateId });
      return {
        score: 0,
        maxScore: 0,
        percentage: 0,
        passed: false,
        results: [],
        message: 'No quiz fields configured'
      };
    }

    let totalScore = 0;
    let totalMaxScore = 0;
    const fieldResults = [];

    // Calcola punteggio per ogni campo quiz
    for (const field of quizFields) {
      const userAnswer = formData[field.name];
      
      if (!field.options || !Array.isArray(field.options)) {
        logger.warn('Quiz field has no options', { fieldId: field.id, fieldName: field.name });
        continue;
      }

      const correctOptions = field.options.filter(opt => opt.isCorrect === true);
      
      if (correctOptions.length === 0) {
        logger.warn('Quiz field has no correct answers marked', { fieldId: field.id, fieldName: field.name });
        continue;
      }

      // Calcola punteggio basato sul tipo di campo
      const fieldResult = calculateFieldScore({
        field,
        userAnswer,
        correctOptions
      });

      totalScore += fieldResult.score;
      totalMaxScore += fieldResult.maxScore;
      fieldResults.push({
        fieldId: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        fieldType: field.type,
        ...fieldResult
      });
    }

    // Calcola percentuale e passed
    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    
    // Determina passing score (default 60%)
    const passingScore = template.settings?.passingScore || 60;
    const passed = percentage >= passingScore;

    const result = {
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: Math.round(percentage * 100) / 100, // 2 decimali
      passed,
      passingScore,
      results: fieldResults,
      totalQuestions: quizFields.length,
      correctAnswers: fieldResults.filter(r => r.correct).length
    };

    logger.info('Quiz score calculated', {
      templateId,
      tenantId,
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
      passed: result.passed
    });

    return result;
  } catch (error) {
    logger.error('Error calculating quiz score', {
      error: error.message,
      stack: error.stack,
      templateId,
      tenantId
    });
    
    // Ritorna struttura vuota in caso di errore
    return {
      score: 0,
      maxScore: 0,
      percentage: 0,
      passed: false,
      results: [],
      error: error.message
    };
  }
};

/**
 * Calcola il punteggio per un singolo campo
 * 
 * @param {Object} params
 * @param {Object} params.field - Campo del form
 * @param {any} params.userAnswer - Risposta dell'utente
 * @param {Array} params.correctOptions - Opzioni corrette
 * @returns {Object} Risultato con score, maxScore, correct, details
 */
function calculateFieldScore({ field, userAnswer, correctOptions }) {
  const fieldType = field.type;
  
  // Calcola max score per questo campo
  const maxScore = correctOptions.reduce((sum, opt) => {
    return sum + (opt.points || 1);
  }, 0);

  // Se l'utente non ha risposto
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return {
      score: 0,
      maxScore,
      correct: false,
      userAnswer: null,
      correctAnswer: correctOptions.map(o => o.value),
      details: 'No answer provided'
    };
  }

  // RADIO / MULTIPLE_CHOICE (singola risposta corretta)
  if (fieldType === 'radio' || fieldType === 'multiple_choice') {
    const correctOption = correctOptions.find(opt => opt.value === userAnswer);
    
    if (correctOption) {
      return {
        score: correctOption.points || 1,
        maxScore,
        correct: true,
        userAnswer,
        correctAnswer: correctOptions[0].value,
        points: correctOption.points || 1
      };
    } else {
      return {
        score: 0,
        maxScore,
        correct: false,
        userAnswer,
        correctAnswer: correctOptions[0].value,
        points: 0
      };
    }
  }

  // CHECKBOX (multiple risposte corrette)
  if (fieldType === 'checkbox') {
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const correctValues = correctOptions.map(opt => opt.value);
    
    // Verifica se tutte le risposte corrette sono selezionate
    // E nessuna risposta errata è selezionata
    const allCorrectSelected = correctValues.every(v => userAnswers.includes(v));
    const noWrongSelected = userAnswers.every(v => correctValues.includes(v));
    
    const isFullyCorrect = allCorrectSelected && noWrongSelected;
    
    if (isFullyCorrect) {
      return {
        score: maxScore,
        maxScore,
        correct: true,
        userAnswer: userAnswers,
        correctAnswer: correctValues,
        details: 'All correct options selected, no wrong options'
      };
    } else {
      // Punteggio parziale opzionale (commentato per ora)
      // const correctCount = userAnswers.filter(v => correctValues.includes(v)).length;
      // const partialScore = (correctCount / correctValues.length) * maxScore;
      
      return {
        score: 0,
        maxScore,
        correct: false,
        userAnswer: userAnswers,
        correctAnswer: correctValues,
        details: `Expected ${correctValues.length} correct answers, got ${userAnswers.length}`
      };
    }
  }

  // SELECT (singola risposta)
  if (fieldType === 'select') {
    const correctOption = correctOptions.find(opt => opt.value === userAnswer);
    
    if (correctOption) {
      return {
        score: correctOption.points || 1,
        maxScore,
        correct: true,
        userAnswer,
        correctAnswer: correctOptions[0].value,
        points: correctOption.points || 1
      };
    } else {
      return {
        score: 0,
        maxScore,
        correct: false,
        userAnswer,
        correctAnswer: correctOptions[0].value,
        points: 0
      };
    }
  }

  // Tipo non supportato per scoring
  logger.warn('Field type not supported for scoring', { fieldType, fieldId: field.id });
  return {
    score: 0,
    maxScore: 0,
    correct: false,
    userAnswer,
    correctAnswer: null,
    details: `Field type ${fieldType} not supported for scoring`
  };
}

/**
 * Salva il punteggio di un quiz in una submission esistente
 * 
 * @param {Object} params
 * @param {string} params.submissionId - ID submission
 * @param {Object} params.scoringResult - Risultato da calculateQuizScore
 * @returns {Promise<Object>} Submission aggiornata
 */
export const saveQuizScore = async ({ submissionId, scoringResult }) => {
  try {
    const updatedSubmission = await prisma.contactSubmission.update({
      where: { id: submissionId },
      data: {
        score: scoringResult.score,
        maxScore: scoringResult.maxScore,
        passed: scoringResult.passed,
        metadata: {
          ...scoringResult.metadata,
          scoring: {
            percentage: scoringResult.percentage,
            passingScore: scoringResult.passingScore,
            totalQuestions: scoringResult.totalQuestions,
            correctAnswers: scoringResult.correctAnswers,
            fieldResults: scoringResult.results,
            calculatedAt: new Date().toISOString()
          }
        }
      }
    });

    logger.info('Quiz score saved', {
      submissionId,
      score: scoringResult.score,
      maxScore: scoringResult.maxScore,
      passed: scoringResult.passed
    });

    return updatedSubmission;
  } catch (error) {
    logger.error('Error saving quiz score', {
      error: error.message,
      submissionId,
      scoringResult
    });
    throw error;
  }
};

export default {
  calculateQuizScore,
  saveQuizScore
};
