/**
 * GDPR — Pagina Consensi & Privacy
 *
 * Gestione dei consensi dell'utente (concedi/revoca) + impostazioni privacy.
 * Sostituisce i vecchi tab MUI `ConsentManagementTab` + `PrivacySettingsTab`.
 */

import React, { useMemo, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Settings,
  CheckCircle2,
  XCircle,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useGDPRConsent } from '../../../hooks/useGDPRConsent';
import { usePrivacySettings } from '../../../hooks/usePrivacySettings';
import { useToast } from '../../../hooks/useToast';
import { ConsentType, PrivacySettingsFormData, PrivacySettings } from '../../../types/gdpr';
import { GDPRPageHeader } from './GDPRPageHeader';
import { GDPRConfirmDialog } from './GDPRConfirmDialog';

// Etichette e descrizioni in italiano per i tipi di consenso
const CONSENT_LABELS: Record<ConsentType, { label: string; description: string }> = {
  data_processing: {
    label: 'Trattamento dei dati',
    description: 'Trattamento dei dati personali per le funzionalità principali del servizio.'
  },
  authentication: {
    label: 'Autenticazione',
    description: 'Necessario per il login e le funzioni di sicurezza dell’account.'
  },
  functional: {
    label: 'Funzionalità',
    description: 'Abilita funzionalità avanzate e personalizzazione dell’esperienza.'
  },
  analytics: {
    label: 'Analitiche e prestazioni',
    description: 'Ci aiuta a migliorare il servizio tramite analisi d’uso anonime.'
  },
  marketing: {
    label: 'Comunicazioni marketing',
    description: 'Ricezione di email promozionali e materiale di marketing.'
  },
  third_party_sharing: {
    label: 'Condivisione con terze parti',
    description: 'Condivisione di dati con partner fidati per servizi avanzati.'
  }
};

const CONSENT_ORDER: ConsentType[] = [
  'data_processing',
  'authentication',
  'functional',
  'analytics',
  'marketing',
  'third_party_sharing'
];

// Impostazioni privacy booleane mostrate (chiave → etichetta/descrizione IT)
const PRIVACY_FIELDS: { key: keyof PrivacySettingsFormData; label: string; description: string }[] = [
  { key: 'dataProcessingConsent', label: 'Consenso al trattamento', description: 'Consenti il trattamento dei dati per le funzionalità principali.' },
  { key: 'analyticsConsent', label: 'Consenso analitiche', description: 'Consenti la raccolta di statistiche d’uso per migliorare il servizio.' },
  { key: 'marketingConsent', label: 'Consenso marketing', description: 'Consenti l’uso dei dati per comunicazioni promozionali.' },
  { key: 'emailNotifications', label: 'Notifiche email', description: 'Ricevi notifiche email per aggiornamenti importanti.' },
  { key: 'marketingEmails', label: 'Email promozionali', description: 'Ricevi newsletter ed email promozionali.' },
  { key: 'analyticsTracking', label: 'Tracciamento analitico', description: 'Consenti il tracciamento a fini statistici.' },
  { key: 'thirdPartySharing', label: 'Condivisione terze parti', description: 'Consenti la condivisione di dati anonimizzati con partner fidati.' },
  { key: 'dataRetentionOptOut', label: 'Opt-out conservazione dati', description: 'Rinuncia alla conservazione estesa oltre gli obblighi di legge.' },
  { key: 'autoDeleteInactive', label: 'Auto-eliminazione inattivi', description: 'Elimina automaticamente i dati dopo un periodo di inattività.' },
  { key: 'twoFactorAuth', label: 'Autenticazione a due fattori', description: 'Abilita la 2FA per una maggiore sicurezza.' }
];

// Toggle riutilizzabile (Tailwind, no MUI)
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked,
  onChange,
  disabled
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }> = ({
  icon,
  label,
  value,
  tone = 'text-blue-600 bg-blue-100'
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </div>
    <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
  </div>
);

const toFormData = (s: PrivacySettings): PrivacySettingsFormData => ({
  profileVisibility: s.profileVisibility,
  emailNotifications: s.emailNotifications,
  marketingEmails: s.marketingEmails,
  analyticsTracking: s.analyticsTracking,
  thirdPartySharing: s.thirdPartySharing,
  dataRetentionPeriod: s.dataRetentionPeriod,
  autoDeleteInactive: s.autoDeleteInactive,
  twoFactorAuth: s.twoFactorAuth,
  sessionTimeout: s.sessionTimeout,
  dataProcessingConsent: s.dataProcessingConsent,
  marketingConsent: s.marketingConsent,
  analyticsConsent: s.analyticsConsent,
  dataRetentionOptOut: s.dataRetentionOptOut
});

export const GDPRConsentPage: React.FC = () => {
  const {
    consents,
    loading,
    error,
    grantConsent,
    withdrawConsent,
    refreshConsents,
    getConsentStats,
    hasConsent
  } = useGDPRConsent();

  const privacy = usePrivacySettings();
  const { showToast } = useToast();

  const stats = getConsentStats();
  const complianceScore = privacy.getComplianceScore();
  const recommendations = privacy.getComplianceRecommendations();

  const [confirm, setConfirm] = useState<{ type: ConsentType; grant: boolean } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const consentList = useMemo(
    () => CONSENT_ORDER.filter((t) => CONSENT_LABELS[t]),
    []
  );

  const handleRefresh = () => {
    void refreshConsents();
    void privacy.refreshSettings();
  };

  const handleConfirmConsent = async () => {
    if (!confirm) return;
    setProcessing(true);
    try {
      if (confirm.grant) {
        await grantConsent({ consentType: confirm.type, purpose: CONSENT_LABELS[confirm.type].label });
        showToast({ type: 'success', message: `Consenso "${CONSENT_LABELS[confirm.type].label}" concesso.` });
      } else {
        await withdrawConsent({ consentType: confirm.type, reason: 'Revoca da parte dell’utente' });
        showToast({ type: 'success', message: `Consenso "${CONSENT_LABELS[confirm.type].label}" revocato.` });
      }
    } catch {
      showToast({ type: 'error', message: 'Operazione sui consensi non riuscita. Riprova.' });
    } finally {
      setProcessing(false);
      setConfirm(null);
    }
  };

  const handlePrivacyToggle = async (key: keyof PrivacySettingsFormData, value: boolean) => {
    if (!privacy.settings) return;
    setSavingKey(key);
    try {
      await privacy.updatePrivacySettings({ ...toFormData(privacy.settings), [key]: value });
      showToast({ type: 'success', message: 'Impostazione privacy aggiornata.' });
    } catch {
      showToast({ type: 'error', message: 'Aggiornamento impostazione non riuscito.' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async () => {
    try {
      await privacy.resetToDefaults();
      showToast({ type: 'success', message: 'Impostazioni privacy ripristinate ai valori predefiniti.' });
    } catch {
      showToast({ type: 'error', message: 'Ripristino non riuscito.' });
    } finally {
      setResetOpen(false);
    }
  };

  const scoreTone =
    complianceScore >= 90
      ? 'bg-emerald-100 text-emerald-700'
      : complianceScore >= 70
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <GDPRPageHeader
        icon={Shield}
        title="Consensi e Privacy"
        subtitle="Gestisci i consensi al trattamento e le tue preferenze sulla privacy"
        onRefresh={handleRefresh}
        refreshing={loading || privacy.loading}
        rightSlot={
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${scoreTone}`}>
            <BarChart3 className="h-4 w-4" />
            <span>Compliance: {complianceScore}%</span>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Consensi attivi" value={stats.active} tone="text-emerald-600 bg-emerald-100" />
        <StatCard icon={<ShieldOff className="h-5 w-5" />} label="Consensi revocati" value={stats.withdrawn} tone="text-amber-600 bg-amber-100" />
        <StatCard icon={<Shield className="h-5 w-5" />} label="Totale gestiti" value={stats.total} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Tasso consenso" value={`${stats.percentage}%`} tone="text-indigo-600 bg-indigo-100" />
      </div>

      {(error || privacy.error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm">
          {error || privacy.error}
        </div>
      )}

      {/* Gestione Consensi */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">Gestione consensi</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {consentList.map((type) => {
            const granted = hasConsent(type);
            const info = CONSENT_LABELS[type];
            return (
              <div key={type} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{info.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                        granted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {granted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {granted ? 'Concesso' : 'Non concesso'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{info.description}</p>
                </div>
                <Toggle
                  checked={granted}
                  disabled={loading}
                  onChange={() => setConfirm({ type, grant: !granted })}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Impostazioni Privacy + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">Impostazioni privacy</h2>
            </div>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              disabled={privacy.loading || !privacy.settings}
              className="text-sm text-amber-700 hover:underline disabled:opacity-50"
            >
              Ripristina predefiniti
            </button>
          </div>

          {!privacy.settings ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              {privacy.loading ? 'Caricamento impostazioni…' : 'Impostazioni privacy non disponibili.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {PRIVACY_FIELDS.map(({ key, label, description }) => {
                const value = Boolean(privacy.settings?.[key as keyof PrivacySettings]);
                return (
                  <div key={key} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                    </div>
                    <Toggle
                      checked={value}
                      disabled={savingKey === key || privacy.loading}
                      onChange={(v) => handlePrivacyToggle(key, v)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Compliance & raccomandazioni */}
        <section className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-3">Score compliance</h3>
            <div className="text-center mb-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-50">{complianceScore}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  complianceScore >= 90 ? 'bg-emerald-500' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Raccomandazioni</h3>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-500">Nessuna raccomandazione. Le tue impostazioni sono a posto!</p>
            ) : (
              <ul className="space-y-3">
                {recommendations.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{rec.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{rec.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <GDPRConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.grant ? 'Concedi consenso' : 'Revoca consenso'}
        description={
          confirm ? (
            <span>
              Vuoi {confirm.grant ? 'concedere' : 'revocare'} il consenso per{' '}
              <strong>{CONSENT_LABELS[confirm.type].label}</strong>?
            </span>
          ) : null
        }
        confirmLabel={confirm?.grant ? 'Concedi' : 'Revoca'}
        destructive={confirm ? !confirm.grant : false}
        loading={processing}
        onConfirm={handleConfirmConsent}
      />

      <GDPRConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Ripristina impostazioni privacy"
        description="Tutte le preferenze sulla privacy verranno riportate ai valori predefiniti. Vuoi continuare?"
        confirmLabel="Ripristina"
        destructive
        loading={privacy.loading}
        onConfirm={handleReset}
      />
    </div>
  );
};

export default GDPRConsentPage;
