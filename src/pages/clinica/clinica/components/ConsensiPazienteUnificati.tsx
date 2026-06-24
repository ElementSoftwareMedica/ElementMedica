/**
 * Consensi paziente — gestione unificata (GDPR)
 *
 * Vista operatore dei consensi del paziente (ConsentRecord), con vocabolario unico
 * condiviso con la firma tablet (consentType === codice modulo). L'operatore può
 * abilitare/negare un consenso per il paziente; ogni azione è tracciata in
 * ConsentRecord + audit trail. I consensi firmati a tablet compaiono già qui
 * (sincronizzati alla firma) e sono dettagliati nel pannello "Consensi firmati".
 *
 * Richiede ruolo global_admin / data_protection_officer per scrivere (grant/revoke
 * on-behalf) e leggere i consensi di un altro soggetto.
 */

import React, { useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useGDPRConsent } from '../../../../hooks/useGDPRConsent';
import { useToast } from '../../../../hooks/useToast';
import { ConsentType } from '../../../../types/gdpr';
import { GDPRConfirmDialog } from '../../../management/gdpr/GDPRConfirmDialog';

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
      checked ? 'bg-blue-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const fmtDate = (value: unknown): string => {
  if (!value) return '';
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT', { dateStyle: 'medium' });
};

interface Props {
  personId: string;
}

export const ConsensiPazienteUnificati: React.FC<Props> = ({ personId }) => {
  const {
    modules,
    modulesLoading,
    loading,
    error,
    grantConsent,
    withdrawConsent,
    hasConsent,
    getConsentByType
  } = useGDPRConsent({ personId });

  const { showToast } = useToast();
  const [confirm, setConfirm] = useState<{ codice: string; titolo: string; grant: boolean } | null>(null);
  const [processing, setProcessing] = useState(false);

  const list = useMemo(
    () => (modules || []).map((m) => ({ codice: m.codice, titolo: m.titolo, descrizione: m.sottotitolo || '' })),
    [modules]
  );

  const handleConfirm = async () => {
    if (!confirm) return;
    setProcessing(true);
    try {
      if (confirm.grant) {
        await grantConsent({ consentType: confirm.codice as ConsentType, purpose: confirm.titolo });
        showToast({ type: 'success', message: `Consenso "${confirm.titolo}" registrato.` });
      } else {
        await withdrawConsent({ consentType: confirm.codice as ConsentType, reason: 'Revoca da operatore' });
        showToast({ type: 'success', message: `Consenso "${confirm.titolo}" revocato.` });
      }
    } catch {
      showToast({ type: 'error', message: 'Operazione non riuscita. Verifica i permessi e riprova.' });
    } finally {
      setProcessing(false);
      setConfirm(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">Gestione consensi (GDPR)</h3>
      </div>

      <div className="px-6 py-3 bg-blue-50/60 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-200">
          Vocabolario unico con la firma tablet: i consensi firmati dal paziente su tablet compaiono qui.
          Abilitare/negare un consenso lo registra in ConsentRecord e nell’audit trail.
        </p>
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
          Impossibile gestire i consensi: permessi insufficienti o errore di caricamento.
        </div>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {modulesLoading && list.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">Caricamento…</div>
        ) : list.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">Nessun modulo consenso configurato.</div>
        ) : (
          list.map((item) => {
            const granted = hasConsent(item.codice);
            const rec = getConsentByType(item.codice);
            const when = granted ? fmtDate(rec?.consentDate) : fmtDate(rec?.withdrawnAt);
            return (
              <div key={item.codice} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.titolo}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                        granted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {granted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {granted ? 'Concesso' : 'Non concesso'}
                    </span>
                  </div>
                  {item.descrizione && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.descrizione}</p>
                  )}
                  {when && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {granted ? 'Concesso il' : 'Revocato il'} {when}
                    </p>
                  )}
                </div>
                <Toggle
                  checked={granted}
                  disabled={loading || processing}
                  onChange={() => setConfirm({ codice: item.codice, titolo: item.titolo, grant: !granted })}
                />
              </div>
            );
          })
        )}
      </div>

      <GDPRConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.grant ? 'Registra consenso' : 'Revoca consenso'}
        description={
          confirm ? (
            <span>
              Vuoi {confirm.grant ? 'registrare' : 'revocare'} il consenso <strong>{confirm.titolo}</strong> per
              questo paziente?
            </span>
          ) : null
        }
        confirmLabel={confirm?.grant ? 'Registra' : 'Revoca'}
        destructive={confirm ? !confirm.grant : false}
        loading={processing}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default ConsensiPazienteUnificati;
