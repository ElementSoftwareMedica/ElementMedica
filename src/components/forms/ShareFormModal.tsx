/**
 * Share Form Modal Component
 * Generazione link condivisione e QR code per form templates
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../design-system/molecules/Modal';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Badge } from '../../design-system/atoms/Badge';
import { 
  Link, 
  Copy, 
  QrCode, 
  Check, 
  Globe, 
  Lock,
  Calendar,
  Users,
  X
} from 'lucide-react';
import type { FormTemplate } from '../../services/formTemplates';
import { formTemplatesService } from '../../services/formTemplates';
import QRCodeStyling from 'qr-code-styling';
import { useToast } from '../../hooks/useToast';

interface ShareFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: FormTemplate;
}

interface ShareSettings {
  requireAuth: boolean;
  allowAnonymous: boolean;
  expiresAt?: string;
  maxSubmissions?: number;
  customSlug?: string;
}

export const ShareFormModal: React.FC<ShareFormModalProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ShareSettings>({
    requireAuth: template ? !template.isPublic : true,
    allowAnonymous: template ? template.allowAnonymous : false,
    expiresAt: '',
    maxSubmissions: undefined,
    customSlug: ''
  });
  const [shareUrl, setShareUrl] = useState('');
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);

  // Debug log
  useEffect(() => {
  }, [isOpen, template]);

  // Update settings when template changes
  useEffect(() => {
    if (template) {
      setSettings(prev => ({
        ...prev,
        requireAuth: !template.isPublic,
        allowAnonymous: template.allowAnonymous
      }));
    }
  }, [template]);

  // Genera URL condivisione
  useEffect(() => {
    if (!template) return;

    const baseUrl = window.location.origin;
    const slug = settings.customSlug || template.id;
    
    // TUTTE le opzioni usano /form/:id
    // Le impostazioni di autenticazione (requireAuth, allowAnonymous) sono salvate 
    // solo nel database e controllate dal backend, non cambiano l'URL
    const path = `/form/${slug}`;
    
    let url = `${baseUrl}${path}`;
    
    // Aggiungi parametri query
    const params = new URLSearchParams();
    if (settings.expiresAt) {
      params.append('expires', settings.expiresAt);
    }
    if (settings.maxSubmissions) {
      params.append('maxSub', settings.maxSubmissions.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    setShareUrl(url);
  }, [template, settings]);

  // Genera QR Code
  useEffect(() => {
    if (!shareUrl) return;

    const qrCodeInstance = new QRCodeStyling({
      width: 256,
      height: 256,
      type: 'svg',
      data: shareUrl,
      // Logo rimosso per evitare errori se non esiste
      dotsOptions: {
        color: '#1d4ed8',
        type: 'rounded'
      },
      backgroundOptions: {
        color: '#ffffff',
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: '#1d4ed8'
      },
      cornersDotOptions: {
        type: 'dot',
        color: '#1d4ed8'
      }
    });

    setQrCode(qrCodeInstance);
  }, [shareUrl]);

  // Render QR code nel canvas
  useEffect(() => {
    if (!qrCode || !isOpen) return;

    // Retry logic per assicurarsi che il container sia montato
    const renderQR = () => {
      const qrContainer = document.getElementById('qr-code-container');
      if (qrContainer) {
        qrContainer.innerHTML = '';
        try {
          qrCode.append(qrContainer);
        } catch (error) {
        }
      } else {
        // Retry dopo un breve delay
        setTimeout(renderQR, 100);
      }
    };

    // Usa setTimeout per assicurarsi che il DOM sia pronto
    setTimeout(renderQR, 50);
  }, [qrCode, isOpen]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;
    
    qrCode.download({
      name: `qr-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      extension: 'png'
    });
  };

  const handleCopyEmbedCode = async () => {
    const embedCode = `<iframe 
  src="${shareUrl}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;
    
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
    }
  };

  const handleSave = async () => {
    if (!template) return;
    
    setSaving(true);
    try {
      
      // Salva le impostazioni sul template
      await formTemplatesService.updateFormTemplate(template.id, {
        isPublic: !settings.requireAuth,
        allowAnonymous: settings.allowAnonymous
        // Note: expiresAt, maxSubmissions, customSlug richiedono estensioni DB
        // TODO: Aggiungere queste colonne al database e includerle qui
      });
      
      onClose();
    } catch (error) {
      showToast({ message: 'Errore nel salvataggio delle impostazioni. Riprova.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Non renderizzare se template è undefined
  if (!template) {
    return null;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Condividi Form" 
      size="lg"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      loading={saving}
    >
      <div className="space-y-6">
        
        {/* Template Info */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={template.isPublic ? 'default' : 'secondary'} size="sm">
                {template.isPublic ? 'Pubblico' : 'Privato'}
              </Badge>
              {template.allowAnonymous && (
                <Badge variant="secondary" size="sm">
                  Anonimo consentito
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Share Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Accesso e Privacy</h4>
          
          {/* Access Type Options */}
          <div className="space-y-2">
            {/* Opzione 1: Form privato con dati utente */}
            <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="accessTypeShare"
                checked={settings.requireAuth && !settings.allowAnonymous}
                onChange={() => setSettings(prev => ({ ...prev, requireAuth: true, allowAnonymous: false }))}
                className="mt-0.5 mr-3"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">🔒 Autenticato con raccolta dati</div>
                <div className="text-xs text-gray-500">Richiede login e raccoglie informazioni sull'utente</div>
              </div>
            </label>

            {/* Opzione 2: Form privato anonimo */}
            <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="accessTypeShare"
                checked={settings.requireAuth && settings.allowAnonymous}
                onChange={() => setSettings(prev => ({ ...prev, requireAuth: true, allowAnonymous: true }))}
                className="mt-0.5 mr-3"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">🔒 Autenticato anonimo</div>
                <div className="text-xs text-gray-500">Richiede login ma non raccoglie informazioni</div>
              </div>
            </label>

            {/* Opzione 3: Form pubblico */}
            <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="accessTypeShare"
                checked={!settings.requireAuth}
                onChange={() => setSettings(prev => ({ ...prev, requireAuth: false, allowAnonymous: true }))}
                className="mt-0.5 mr-3"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">🌐 Pubblico (senza login)</div>
                <div className="text-xs text-gray-500">Chiunque con il link può compilare</div>
              </div>
            </label>
          </div>

          {/* Custom Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug Personalizzato (opzionale)
            </label>
            <Input
              value={settings.customSlug}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
              }))}
              placeholder={`form-${template.id.slice(0, 8)}`}
              leftIcon={<Link className="w-4 h-4" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              URL personalizzato più facile da ricordare
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Scadenza (opzionale)
            </label>
            <Input
              type="datetime-local"
              value={settings.expiresAt}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                expiresAt: e.target.value 
              }))}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Il form non accetterà più risposte dopo questa data
            </p>
          </div>

          {/* Max Submissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Massimo Invii (opzionale)
            </label>
            <Input
              type="number"
              value={settings.maxSubmissions || ''}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                maxSubmissions: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              placeholder="Illimitato"
              leftIcon={<Users className="w-4 h-4" />}
              min={1}
            />
            <p className="text-xs text-gray-500 mt-1">
              Numero massimo di risposte accettate
            </p>
          </div>
        </div>

        {/* Generated URL */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Link di Condivisione</h4>
          
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="secondary"
              onClick={handleCopyUrl}
              leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiato!' : 'Copia'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(shareUrl, '_blank')}
              leftIcon={<Globe className="w-4 h-4" />}
              className="flex-1"
            >
              Apri in Nuova Tab
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyEmbedCode}
              leftIcon={<Copy className="w-4 h-4" />}
              className="flex-1"
            >
              Copia Codice Embed
            </Button>
          </div>
        </div>

        {/* QR Code */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code
          </h4>
          
          <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
            <div id="qr-code-container" className="bg-white p-4 rounded-lg shadow-sm"></div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleDownloadQR}
                leftIcon={<QrCode className="w-4 h-4" />}
              >
                Scarica QR Code
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-600 max-w-sm">
              Stampa o condividi questo QR code per permettere agli utenti di accedere 
              velocemente al form scansionandolo con il telefono
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={saving}
          >
            Annulla
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            loading={saving}
          >
            Salva Impostazioni
          </Button>
        </div>

      </div>
    </Modal>
  );
};

export default ShareFormModal;
