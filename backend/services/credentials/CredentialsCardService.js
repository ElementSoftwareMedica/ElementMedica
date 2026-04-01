/**
 * Credentials Card Service
 * 
 * Genera schede credenziali PDF stampabili per utenti senza email.
 * Include QR code per accesso rapido e istruzioni user-friendly.
 * 
 * @module services/credentials/CredentialsCardService
 * @version 1.0.0
 */

import QRCode from 'qrcode';
import logger from '../../utils/logger.js';

/**
 * Genera HTML per una singola scheda credenziali
 * Design ottimizzato per stampa e leggibilità
 */
function generateCredentialCardHTML(credential, config = {}) {
  const {
    organizationName = 'ElementMedica',
    organizationLogo = null,
    loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173',
    primaryColor = '#0d9488', // teal-600
    showQRCode = true
  } = config;

  return `
    <div class="credential-card">
      <div class="card-header">
        ${organizationLogo ? `<img src="${organizationLogo}" alt="Logo" class="logo" />` : ''}
        <h2>${organizationName}</h2>
        <p class="subtitle">Scheda Credenziali di Accesso</p>
      </div>
      
      <div class="card-body">
        <div class="person-info">
          <h3>👤 ${credential.fullName}</h3>
          ${credential.role ? `<span class="role-badge">${credential.role}</span>` : ''}
        </div>
        
        <div class="credentials-section">
          <div class="credential-item">
            <label>Username</label>
            <div class="credential-value">${credential.username}</div>
          </div>
          <div class="credential-item">
            <label>Password Temporanea</label>
            <div class="credential-value password">${credential.temporaryPassword}</div>
          </div>
        </div>
        
        ${showQRCode && credential.qrCodeDataUrl ? `
        <div class="qr-section">
          <img src="${credential.qrCodeDataUrl}" alt="QR Code Login" class="qr-code" />
          <p class="qr-hint">Scansiona per accedere</p>
        </div>
        ` : ''}
        
        <div class="instructions">
          <h4>📋 Come accedere:</h4>
          <ol>
            <li>Vai su <strong>${loginUrl.replace('https://', '').replace('http://', '')}</strong></li>
            <li>Inserisci il tuo <strong>username</strong></li>
            <li>Inserisci la <strong>password temporanea</strong></li>
            <li>Crea una <strong>nuova password personale</strong></li>
          </ol>
        </div>
        
        <div class="warning">
          ⚠️ <strong>Importante:</strong> Al primo accesso dovrai cambiare la password. 
          Conserva questa scheda in un luogo sicuro e distruggila dopo aver impostato la tua password.
        </div>
      </div>
      
      <div class="card-footer">
        <p>Generato il ${new Date().toLocaleDateString('it-IT')} • ID: ${credential.personId?.substring(0, 8) || 'N/A'}</p>
      </div>
    </div>
  `;
}

/**
 * CSS per le schede credenziali
 * Ottimizzato per stampa A4/A5
 */
const CREDENTIALS_CSS = `
  @page {
    size: A5 landscape;
    margin: 10mm;
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f5f5f5;
    padding: 10mm;
  }
  
  .credential-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    page-break-inside: avoid;
    page-break-after: always;
    max-width: 180mm;
    margin: 0 auto 10mm;
    overflow: hidden;
  }
  
  .credential-card:last-child {
    page-break-after: auto;
  }
  
  .card-header {
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    color: white;
    padding: 15px 20px;
    text-align: center;
  }
  
  .card-header .logo {
    max-height: 40px;
    margin-bottom: 8px;
  }
  
  .card-header h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
  
  .card-header .subtitle {
    font-size: 12px;
    opacity: 0.9;
    margin-top: 4px;
  }
  
  .card-body {
    padding: 20px;
  }
  
  .person-info {
    text-align: center;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .person-info h3 {
    font-size: 18px;
    color: #1f2937;
    margin-bottom: 8px;
  }
  
  .role-badge {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .credentials-section {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .credential-item {
    flex: 1;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
  }
  
  .credential-item label {
    display: block;
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  
  .credential-value {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    word-break: break-all;
  }
  
  .credential-value.password {
    background: #fef3c7;
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px dashed #f59e0b;
  }
  
  .qr-section {
    text-align: center;
    margin: 15px 0;
    padding: 10px;
    background: #f9fafb;
    border-radius: 8px;
  }
  
  .qr-code {
    width: 80px;
    height: 80px;
  }
  
  .qr-hint {
    font-size: 10px;
    color: #6b7280;
    margin-top: 6px;
  }
  
  .instructions {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .instructions h4 {
    font-size: 12px;
    color: #166534;
    margin-bottom: 8px;
  }
  
  .instructions ol {
    margin: 0;
    padding-left: 18px;
    font-size: 11px;
    color: #4b5563;
  }
  
  .instructions li {
    margin-bottom: 4px;
  }
  
  .warning {
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
    padding: 10px 12px;
    font-size: 10px;
    color: #92400e;
    border-radius: 0 6px 6px 0;
  }
  
  .card-footer {
    background: #f3f4f6;
    padding: 8px 20px;
    text-align: center;
    font-size: 9px;
    color: #9ca3af;
  }
  
  /* Print styles */
  @media print {
    body {
      background: white;
      padding: 0;
    }
    
    .credential-card {
      box-shadow: none;
      border: 1px solid #ddd;
    }
  }
`;

/**
 * Servizio per generazione schede credenziali
 */
class CredentialsCardService {

  /**
   * Genera QR code come data URL
   * @param {string} url - URL da codificare
   * @returns {Promise<string>} QR code come data URL
   */
  static async generateQRCode(url) {
    try {
      return await QRCode.toDataURL(url, {
        width: 150,
        margin: 1,
        color: {
          dark: '#0d9488',
          light: '#ffffff'
        }
      });
    } catch (error) {
      logger.error('Failed to generate QR code', { error: error.message });
      return null;
    }
  }

  /**
   * Prepara i dati delle credenziali per la generazione
   * @param {Object} person - Dati persona
   * @param {string} temporaryPassword - Password temporanea
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} Dati credenziali con QR code
   */
  static async prepareCredentialData(person, temporaryPassword, options = {}) {
    const loginUrl = options.loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

    // P48: email è in PersonTenantProfile, non in Person
    const profileEmail = person.tenantProfiles?.[0]?.email || null;

    // Genera QR code con URL di login pre-compilato con username
    const qrUrl = `${loginUrl}/login?username=${encodeURIComponent(person.username || profileEmail || '')}`;
    const qrCodeDataUrl = await this.generateQRCode(qrUrl);

    return {
      personId: person.id,
      fullName: `${person.firstName} ${person.lastName}`,
      username: person.username || profileEmail,
      email: profileEmail,
      temporaryPassword,
      role: options.roleName || this.getRoleName(person.roleType || person.globalRole),
      qrCodeDataUrl,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Traduce il tipo ruolo in nome leggibile
   */
  static getRoleName(roleType) {
    const roleNames = {
      'EMPLOYEE': 'Dipendente',
      'MANAGER': 'Responsabile',
      'ADMIN': 'Amministratore',
      'SUPER_ADMIN': 'Super Admin',
      'TRAINER': 'Formatore',
      'EXTERNAL_TRAINER': 'Formatore Esterno',
      'MEDICO': 'Medico',
      'RSPP': 'RSPP',
      'HR': 'Risorse Umane'
    };
    return roleNames[roleType] || roleType;
  }

  /**
   * Genera HTML completo per una o più schede credenziali
   * @param {Array<Object>} credentials - Array di dati credenziali
   * @param {Object} config - Configurazione (organizationName, loginUrl, etc.)
   * @returns {string} HTML completo pronto per stampa/PDF
   */
  static generateHTML(credentials, config = {}) {
    const credentialsArray = Array.isArray(credentials) ? credentials : [credentials];

    const cardsHTML = credentialsArray
      .map(cred => generateCredentialCardHTML(cred, config))
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schede Credenziali - ${config.organizationName || 'ElementMedica'}</title>
  <style>${CREDENTIALS_CSS}</style>
</head>
<body>
  ${cardsHTML}
</body>
</html>
    `;
  }

  /**
   * Genera schede credenziali per un batch di persone importate
   * @param {Array<Object>} importResults - Risultati import con person + password
   * @param {Object} config - Configurazione organizzazione
   * @returns {Promise<Object>} HTML e dati per download/stampa
   */
  static async generateBatchCredentials(importResults, config = {}) {
    const credentials = [];
    const withEmail = [];
    const withoutEmail = [];

    for (const result of importResults) {
      if (!result.person || !result.temporaryPassword) continue;

      const credentialData = await this.prepareCredentialData(
        result.person,
        result.temporaryPassword,
        config
      );

      credentials.push(credentialData);

      if (result.person.tenantProfiles?.[0]?.email) {
        withEmail.push(credentialData);
      } else {
        withoutEmail.push(credentialData);
      }
    }

    const html = this.generateHTML(credentials, config);

    return {
      html,
      credentials,
      summary: {
        total: credentials.length,
        withEmail: withEmail.length,
        withoutEmail: withoutEmail.length
      },
      // Per utenti senza email, le schede sono l'unico modo
      printRequired: withoutEmail
    };
  }

  /**
   * Genera una singola scheda credenziali
   * @param {Object} person - Dati persona
   * @param {string} temporaryPassword - Password temporanea
   * @param {Object} config - Configurazione
   * @returns {Promise<Object>} HTML e dati credenziali
   */
  static async generateSingleCard(person, temporaryPassword, config = {}) {
    const credentialData = await this.prepareCredentialData(person, temporaryPassword, config);
    const html = this.generateHTML([credentialData], config);

    return {
      html,
      credential: credentialData
    };
  }
}

export default CredentialsCardService;
