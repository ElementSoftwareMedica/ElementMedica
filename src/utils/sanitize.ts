/**
 * Sanitizzazione HTML — R26 Security
 *
 * Wrapper attorno a DOMPurify per proteggere tutti i punti `dangerouslySetInnerHTML`
 * da attacchi XSS.
 *
 * Utilizzo:
 *   import { sanitizeHtml } from '@/utils/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizza una stringa HTML rimuovendo script, eventi inline e attributi pericolosi.
 * Sicuro per rendering in `dangerouslySetInnerHTML`.
 *
 * @param dirty - HTML grezzo da sanitizzare
 * @returns HTML sanitizzato privo di vettori XSS
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    // Permetti attributi di stile e classi per preservare la formattazione
    ALLOWED_ATTR: ['class', 'style', 'href', 'src', 'alt', 'title', 'target', 'rel', 'id'],
    // Non permettere elementi audio/video/iframe (non necessari per contenuto medico)
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit'],
  });
}

/**
 * Sanitizza HTML con profilo più permissivo per l'editor (include stile avanzato)
 * Usare SOLO per contenuti generati da utenti admin fidati (es. editor WYSIWYG)
 */
export function sanitizeRichHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: [
      'class', 'style', 'href', 'src', 'alt', 'title', 'target', 'rel', 'id',
      'width', 'height', 'colspan', 'rowspan', 'data-*'
    ],
    FORBID_TAGS: ['script', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}
