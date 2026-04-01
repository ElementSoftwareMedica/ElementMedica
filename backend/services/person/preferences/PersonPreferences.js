import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

/**
 * Gestisce le preferenze degli utenti
 */
class PersonPreferences {
  /**
   * Preferenze predefinite per un nuovo utente
   */
  static DEFAULT_PREFERENCES = {
    theme: 'light',
    language: 'it',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false
    },
    dashboard: {
      layout: 'default',
      widgets: []
    }
  };

  /**
   * Ottiene le preferenze di una persona per il tenant corrente
   * @param {string} personId - ID della persona
   * @param {string} tenantId - ID del tenant (opzionale, usa il primo profilo attivo)
   * @returns {Promise<Object>} Le preferenze della persona
   */
  static async getPreferences(personId, tenantId = null) {
    try {
      // P48: preferences è in PersonTenantProfile
      const where = {
        personId,
        deletedAt: null,
        isActive: true
      };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where,
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ],
        select: { preferences: true }
      });

      return profile?.preferences || this.DEFAULT_PREFERENCES;
    } catch (error) {
      logger.error('Error getting person preferences:', { error: error.message, personId, tenantId });
      throw error;
    }
  }

  /**
   * Aggiorna le preferenze di una persona per il tenant corrente
   * @param {string} personId - ID della persona
   * @param {Object} preferences - Nuove preferenze
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Le preferenze aggiornate
   */
  static async updatePreferences(personId, preferences, tenantId = null) {
    try {
      // P48: preferences è in PersonTenantProfile
      // Trova il profilo tenant corrente
      const where = {
        personId,
        deletedAt: null,
        isActive: true
      };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where,
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      if (!profile) {
        throw new Error('PersonTenantProfile not found for person');
      }

      // Merge con le preferenze esistenti per evitare di perdere dati
      const currentPreferences = profile?.preferences || this.DEFAULT_PREFERENCES;
      const mergedPreferences = this.mergePreferences(currentPreferences, preferences);

      const updatedProfile = await prisma.personTenantProfile.update({
        where: { id: profile.id },
        data: {
          preferences: mergedPreferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });

      return updatedProfile.preferences;
    } catch (error) {
      logger.error('Error updating person preferences:', { error: error.message, personId, tenantId });
      throw error;
    }
  }

  /**
   * Reset delle preferenze ai valori predefiniti
   * @param {string} personId - ID della persona
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Le preferenze resettate
   */
  static async resetPreferences(personId, tenantId = null) {
    try {
      // P48: preferences è in PersonTenantProfile
      const where = {
        personId,
        deletedAt: null,
        isActive: true
      };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const profile = await prisma.personTenantProfile.findFirst({
        where,
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      if (!profile) {
        throw new Error('PersonTenantProfile not found for person');
      }

      const updatedProfile = await prisma.personTenantProfile.update({
        where: { id: profile.id },
        data: {
          preferences: this.DEFAULT_PREFERENCES,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });

      return updatedProfile.preferences;
    } catch (error) {
      logger.error('Error resetting person preferences:', { error: error.message, personId, tenantId });
      throw error;
    }
  }

  /**
   * Aggiorna una specifica sezione delle preferenze
   * @param {string} personId - ID della persona
   * @param {string} section - Sezione da aggiornare (theme, notifications, etc.)
   * @param {Object} sectionData - Dati della sezione
   * @returns {Promise<Object>} Le preferenze aggiornate
   */
  static async updatePreferenceSection(personId, section, sectionData) {
    try {
      const currentPreferences = await this.getPreferences(personId);
      const updatedPreferences = {
        ...currentPreferences,
        [section]: {
          ...currentPreferences[section],
          ...sectionData
        }
      };

      return await this.updatePreferences(personId, updatedPreferences);
    } catch (error) {
      logger.error('Error updating preference section:', {
        error: error.message,
        personId,
        section
      });
      throw error;
    }
  }

  /**
   * Merge intelligente delle preferenze
   * @param {Object} current - Preferenze attuali
   * @param {Object} updates - Aggiornamenti
   * @returns {Object} Preferenze unite
   */
  static mergePreferences(current, updates) {
    const merged = { ...current };

    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Merge ricorsivo per oggetti annidati
        merged[key] = {
          ...merged[key],
          ...value
        };
      } else {
        // Sostituzione diretta per valori primitivi e array
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Valida le preferenze
   * @param {Object} preferences - Preferenze da validare
   * @returns {Object} Risultato della validazione
   */
  static validatePreferences(preferences) {
    const errors = [];

    // Valida theme
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      errors.push('Theme deve essere light, dark o auto');
    }

    // Valida language
    if (preferences.language && !['it', 'en', 'fr', 'de', 'es'].includes(preferences.language)) {
      errors.push('Language deve essere un codice lingua valido');
    }

    // Valida notifications
    if (preferences.notifications) {
      const { email, push, sms } = preferences.notifications;
      if (email !== undefined && typeof email !== 'boolean') {
        errors.push('notifications.email deve essere boolean');
      }
      if (push !== undefined && typeof push !== 'boolean') {
        errors.push('notifications.push deve essere boolean');
      }
      if (sms !== undefined && typeof sms !== 'boolean') {
        errors.push('notifications.sms deve essere boolean');
      }
    }

    // Valida accessibility
    if (preferences.accessibility) {
      const { highContrast, largeText, reducedMotion } = preferences.accessibility;
      if (highContrast !== undefined && typeof highContrast !== 'boolean') {
        errors.push('accessibility.highContrast deve essere boolean');
      }
      if (largeText !== undefined && typeof largeText !== 'boolean') {
        errors.push('accessibility.largeText deve essere boolean');
      }
      if (reducedMotion !== undefined && typeof reducedMotion !== 'boolean') {
        errors.push('accessibility.reducedMotion deve essere boolean');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Ottiene le preferenze di notifica per una persona
   * @param {string} personId - ID della persona
   * @returns {Promise<Object>} Preferenze di notifica
   */
  static async getNotificationPreferences(personId) {
    try {
      const preferences = await this.getPreferences(personId);
      return preferences.notifications || this.DEFAULT_PREFERENCES.notifications;
    } catch (error) {
      logger.error('Error getting notification preferences:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Ottiene le preferenze di accessibilità per una persona
   * @param {string} personId - ID della persona
   * @returns {Promise<Object>} Preferenze di accessibilità
   */
  static async getAccessibilityPreferences(personId) {
    try {
      const preferences = await this.getPreferences(personId);
      return preferences.accessibility || this.DEFAULT_PREFERENCES.accessibility;
    } catch (error) {
      logger.error('Error getting accessibility preferences:', { error: error.message, personId });
      throw error;
    }
  }
}

export default PersonPreferences;