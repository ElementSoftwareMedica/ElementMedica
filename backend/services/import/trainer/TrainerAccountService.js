/**
 * @file TrainerAccountService.js
 * @description Service per creazione automatica account formatori
 * Genera username (nome.cognome con contatore) e password (Password123!)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../../../utils/logger.js';

const prisma = new PrismaClient();

class TrainerAccountService {
  /**
   * Genera username univoco in formato nome.cognome
   * Se esiste già, aggiunge contatore: nome.cognome1, nome.cognome2, ecc.
   * @param {string} email - Email del trainer (non usata, mantenuta per compatibilità)
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @param {string} tenantId - ID tenant
   * @returns {Promise<string>}
   */
  async generateUniqueUsername(email, firstName, lastName, tenantId) {
    // Normalizza nome e cognome (lowercase, rimuovi spazi, rimuovi accenti)
    const normalizedFirstName = firstName
      .toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const normalizedLastName = lastName
      .toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const baseUsername = `${normalizedFirstName}.${normalizedLastName}`;
    let username = baseUsername;
    let counter = 1;

    // Loop fino a trovare username univoco
    while (await this.usernameExists(username, tenantId)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    logger.info(`[TRAINER_ACCOUNT] Generated username: ${username}`);
    return username;
  }

  /**
   * Verifica se username esiste già nel tenant
   * @param {string} username - Username da verificare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<boolean>}
   */
  async usernameExists(username, tenantId) {
    const existing = await prisma.person.findFirst({
      where: {
        username,
        tenantId
      }
    });

    return !!existing;
  }

  /**
   * Genera password standard per tutti i trainer
   * @returns {string} - Password fissa "Password123!"
   */
  generateSecurePassword() {
    return 'Password123!';
  }

  /**
   * Crea account User per un trainer (Person con ruolo TRAINER)
   * @param {string} personId - ID della Person
   * @param {string} email - Email
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{username: string, password: string, userId: string}>}
   */
  async createTrainerAccount(personId, email, firstName, lastName, tenantId) {
    try {
      // Genera username univoco
      const username = await this.generateUniqueUsername(email, firstName, lastName, tenantId);

      // Genera password standard
      const password = this.generateSecurePassword();

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Aggiorna Person con credenziali account
      const updatedPerson = await prisma.person.update({
        where: { id: personId },
        data: {
          username,
          password: hashedPassword
        }
      });

      logger.info(`[TRAINER_ACCOUNT] Created account for person ${personId}: ${username}`);

      return {
        userId: updatedPerson.id,
        username,
        password, // Password in chiaro (da inviare via email)
        mustChangePassword: true
      };
    } catch (error) {
      logger.error('[TRAINER_ACCOUNT] Account creation failed:', error);
      throw new Error(`Errore creazione account: ${error.message}`);
    }
  }

  /**
   * Batch create accounts per multiple trainer persons
   * @param {Array<{personId: string, email: string, firstName: string, lastName: string}>} trainers
   * @param {string} tenantId - ID tenant
   * @returns {Promise<Array<{personId: string, username: string, password: string}>>}
   */
  async batchCreateTrainerAccounts(trainers, tenantId) {
    const results = [];

    try {
      for (const trainer of trainers) {
        const account = await this.createTrainerAccount(
          trainer.personId,
          trainer.email,
          trainer.firstName,
          trainer.lastName,
          tenantId
        );

        results.push({
          personId: trainer.personId,
          username: account.username,
          password: account.password,
          userId: account.userId
        });
      }

      logger.info(`[TRAINER_ACCOUNT] Batch created ${results.length} trainer accounts`);
      return results;
    } catch (error) {
      logger.error('[TRAINER_ACCOUNT] Batch account creation failed:', error);
      throw error;
    }
  }

  /**
   * Genera CSV con credenziali per download
   * @param {Array<{username: string, password: string, firstName: string, lastName: string, email: string}>} credentials
   * @returns {string} - CSV string
   */
  generateCredentialsCSV(credentials) {
    const headers = 'Nome;Cognome;Email;Username;Password';
    const rows = credentials.map(c => 
      `${c.firstName};${c.lastName};${c.email};${c.username};${c.password}`
    );

    return [headers, ...rows].join('\n');
  }
}

export default new TrainerAccountService();
