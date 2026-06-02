/**
 * CourseEnrollmentWidget
 * 
 * "Island Architecture" component for course enrollment.
 * Dynamic widget that renders inside static CMS course pages.
 * 
 * Allows public users to request enrollment in a scheduled course
 * by filling a form with their personal data.
 * 
 * API: POST /api/v1/public/courses/enroll
 * 
 * @module components/public/CourseEnrollmentWidget
 */

import React, { useState } from 'react';
import { CheckCircle, Loader2, Send, User, Mail, Phone, Building2, AlertCircle } from 'lucide-react';

interface CourseEnrollmentWidgetProps {
  scheduleId: string;
  courseTitle?: string;
  courseDate?: string;
  onSuccess?: () => void;
}

interface EnrollmentForm {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  codiceFiscale: string;
  azienda: string;
  pivaAzienda: string;
  ruolo: string;
  note: string;
}

const initialForm: EnrollmentForm = {
  nome: '',
  cognome: '',
  email: '',
  telefono: '',
  codiceFiscale: '',
  azienda: '',
  pivaAzienda: '',
  ruolo: '',
  note: ''
};

// API calls use relative paths — Vite proxy handles /api/* → backend

const CourseEnrollmentWidget: React.FC<CourseEnrollmentWidgetProps> = ({
  scheduleId,
  courseTitle,
  courseDate,
  onSuccess
}) => {
  const [form, setForm] = useState<EnrollmentForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompanyFields, setShowCompanyFields] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Client-side validation
    if (!form.nome.trim() || !form.cognome.trim() || !form.email.trim() || !form.telefono.trim()) {
      setError('Compila tutti i campi obbligatori.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/public/courses/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frontend-Id': import.meta.env.VITE_BRAND_ID || 'element-sicurezza'
        },
        body: JSON.stringify({
          scheduleId,
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim(),
          ...(form.codiceFiscale && { codiceFiscale: form.codiceFiscale.trim() }),
          ...(form.azienda && { azienda: form.azienda.trim() }),
          ...(form.pivaAzienda && { pivaAzienda: form.pivaAzienda.trim() }),
          ...(form.ruolo && { ruolo: form.ruolo.trim() }),
          ...(form.note && { note: form.note.trim() })
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Errore nell\'invio della richiesta.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-green-200">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Richiesta Inviata!</h3>
        <p className="text-gray-600 mb-2">
          La tua richiesta di iscrizione{courseTitle ? ` a "${courseTitle}"` : ''} è stata ricevuta.
        </p>
        <p className="text-sm text-gray-500">
          Ti contatteremo via email per la conferma e i dettagli di pagamento.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 text-white" style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary-600), var(--color-primary-700))' }}>
        <h3 className="text-lg font-bold mb-1">Richiedi Iscrizione</h3>
        {courseTitle && <p className="text-white/80 text-sm">{courseTitle}</p>}
        {courseDate && <p className="text-white/70 text-xs mt-1">{courseDate}</p>}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Mario"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cognome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cognome"
              value={form.cognome}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="Rossi"
            />
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="mario@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="+39 333 123 4567"
              />
            </div>
          </div>
        </div>

        {/* Codice Fiscale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
          <input
            type="text"
            name="codiceFiscale"
            value={form.codiceFiscale}
            onChange={handleChange}
            maxLength={16}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm uppercase"
            placeholder="RSSMRA80A01H501U"
          />
        </div>

        {/* Company toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowCompanyFields(!showCompanyFields)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Building2 className="w-4 h-4" />
            {showCompanyFields ? 'Nascondi dati aziendali' : 'Iscrizione aziendale? Aggiungi dati azienda'}
          </button>
        </div>

        {/* Company fields */}
        {showCompanyFields && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
                <input
                  type="text"
                  name="azienda"
                  value={form.azienda}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Nome azienda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA Azienda</label>
                <input
                  type="text"
                  name="pivaAzienda"
                  value={form.pivaAzienda}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="12345678901"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo in azienda</label>
              <input
                type="text"
                name="ruolo"
                value={form.ruolo}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="es. Responsabile Sicurezza"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
            placeholder="Informazioni aggiuntive (opzionale)"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Invio in corso...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Invia Richiesta di Iscrizione
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Inviando la richiesta accetti la nostra{' '}
          <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
          Ti contatteremo per la conferma.
        </p>
      </form>
    </div>
  );
};

export default CourseEnrollmentWidget;
