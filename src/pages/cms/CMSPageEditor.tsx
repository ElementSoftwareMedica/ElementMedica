/**
 * CMS Page Editor
 * 
 * Form per creare/modificare pagine CMS
 * 
 * Features:
 * - Form completo (titolo, slug, content, SEO)
 * - Layout selector
 * - Content editor (structured fields)
 * - Validazione campi
 * - Save Draft / Publish
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Eye, AlertCircle, FileText } from 'lucide-react';
import {
  useCreateCMSPage,
  useUpdateCMSPage,
} from '../../hooks/cms/useCMSPages';
import { CMSPage, CreateCMSPageData, UpdateCMSPageData } from '../../services/cmsPagesService';
import cmsPagesService from '../../services/cmsPagesService';

interface CMSPageEditorProps {
  page: CMSPage | null;
  isCreating: boolean;
  targetTenantId?: string;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  title: string;
  slug: string;
  layout: 'full-width' | 'boxed' | 'sidebar-left' | 'sidebar-right';
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string; // Comma-separated keywords
  ogImage: string; // URL to OG image
  // Content fields (structured)
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
}

const CMSPageEditor: React.FC<CMSPageEditorProps> = ({
  page,
  isCreating,
  targetTenantId,
  onClose,
  onSave,
}) => {
  // State
  const [formData, setFormData] = useState<FormData>({
    title: '',
    slug: '',
    layout: 'full-width',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    ogImage: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');

  // Mutations
  const createMutation = useCreateCMSPage();
  const updateMutation = useUpdateCMSPage();

  // Initialize form data from page
  useEffect(() => {
    if (page) {
      const keywords = page.content?.seo?.keywords || [];
      // Support both NEW format (content.hero.title) and LEGACY format (content.heroTitle)
      const heroTitle = page.content?.hero?.title || page.content?.heroTitle || '';
      const heroSubtitle = page.content?.hero?.subtitle || page.content?.heroSubtitle || '';
      const heroDescription = page.content?.hero?.description || page.content?.heroDescription || '';

      setFormData({
        title: page.title || '',
        slug: page.slug || '',
        layout: page.layout || 'full-width',
        seoTitle: page.seoTitle || '',
        seoDescription: page.seoDescription || '',
        seoKeywords: Array.isArray(keywords) ? keywords.join(', ') : '',
        ogImage: page.content?.seo?.ogImage || '',
        heroTitle,
        heroSubtitle,
        heroDescription,
      });

      // Initialize JSON editor with full content
      const contentJson = JSON.stringify(page.content || {}, null, 2);
      setJsonContent(contentJson);
    } else {
      // Reset when no page (creating new)
      setJsonContent('{}');
    }
  }, [page]);

  // Handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Auto-generate slug from title
    if (name === 'title' && isCreating) {
      const generatedSlug = cmsPagesService.generateSlug(value);
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Il titolo è obbligatorio';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Lo slug è obbligatorio';
    } else if (!cmsPagesService.validateSlug(formData.slug)) {
      newErrors.slug = 'Lo slug può contenere solo lettere minuscole, numeri e trattini';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publish: boolean = false) => {
    if (!validate()) {
      return;
    }

    try {
      let content;

      // If advanced editor is used and JSON is modified, use that
      if (showAdvancedEditor && jsonContent.trim()) {
        try {
          content = JSON.parse(jsonContent);
        } catch (error) {
          setErrors({ json: 'JSON non valido. Controlla la sintassi.' });
          return;
        }
      } else {
        // Parse keywords from comma-separated string to array
        const keywordsArray = formData.seoKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);

        // Preserve existing content structure
        const existingContent = page?.content || {};

        // Build hero object in correct format
        const hero = {
          ...(existingContent.hero || {}),
          title: formData.heroTitle,
          subtitle: formData.heroSubtitle,
          description: formData.heroDescription,
        };

        content = {
          ...existingContent,
          hero,
          seo: {
            ...(existingContent.seo || {}),
            keywords: keywordsArray,
            ogImage: formData.ogImage || undefined,
            twitterCard: 'summary_large_image' as const,
          },
          // Preserve sections and other content
          sections: existingContent.sections || [],
          metadata: existingContent.metadata || {},
        };
      }

      if (isCreating) {
        // Create new page
        const data: CreateCMSPageData = {
          title: formData.title,
          slug: formData.slug,
          layout: formData.layout,
          content,
          seoTitle: formData.seoTitle || undefined,
          seoDescription: formData.seoDescription || undefined,
          ...(targetTenantId && { tenantId: targetTenantId }),
        };

        await createMutation.mutateAsync(data);
      } else if (page) {
        // Update existing page
        const data: UpdateCMSPageData = {
          title: formData.title,
          slug: formData.slug,
          layout: formData.layout,
          content,
          seoTitle: formData.seoTitle || undefined,
          seoDescription: formData.seoDescription || undefined,
        };

        await updateMutation.mutateAsync({ id: page.id, data });
      }

      onSave();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Save error:', error);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="cms-page-editor">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">
            {isCreating ? 'Nuova Pagina CMS' : `Modifica: ${page?.title}`}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Informazioni Base</h3>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Es. Home Page"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${errors.slug ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="es. home-page"
            />
            {errors.slug && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.slug}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              URL: /{formData.slug || 'slug'}
            </p>
          </div>

          {/* Layout */}
          <div>
            <label htmlFor="layout" className="block text-sm font-medium text-gray-700 mb-1">
              Layout
            </label>
            <select
              id="layout"
              name="layout"
              value={formData.layout}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="full-width">Full Width</option>
              <option value="boxed">Boxed</option>
              <option value="sidebar-left">Sidebar Left</option>
              <option value="sidebar-right">Sidebar Right</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Contenuto</h3>
            {page && page.content && (
              <div className="text-sm text-gray-600">
                {page.content.sections?.length || 0} sezioni • {page.content.hero ? '✓' : '✗'} Hero
              </div>
            )}
          </div>

          {page && !isCreating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Pagina "{page.slug}":</strong> Stai modificando contenuti esistenti.
                I campi qui sotto mostrano solo l'Hero section. Per modificare sezioni, statistiche,
                card e altri contenuti avanzati, usa l'Editor Avanzato sotto.
              </p>
            </div>
          )}

          {/* Hero Title */}
          <div>
            <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Titolo Hero
            </label>
            <input
              type="text"
              id="heroTitle"
              name="heroTitle"
              value={formData.heroTitle}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es. Benvenuti in Element Sicurezza"
            />
          </div>

          {/* Hero Subtitle */}
          <div>
            <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700 mb-1">
              Sottotitolo Hero
            </label>
            <input
              type="text"
              id="heroSubtitle"
              name="heroSubtitle"
              value={formData.heroSubtitle}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es. La tua crescita professionale inizia qui"
            />
          </div>

          {/* Hero Description */}
          <div>
            <label htmlFor="heroDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione Hero
            </label>
            <textarea
              id="heroDescription"
              name="heroDescription"
              value={formData.heroDescription}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrizione dettagliata..."
            />
          </div>

          {/* Advanced Content Editor */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAdvancedEditor(!showAdvancedEditor);
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <FileText className="w-4 h-4" />
              {showAdvancedEditor ? 'Nascondi' : 'Mostra'} Editor Avanzato (JSON Completo)
            </button>

            {showAdvancedEditor && (
              <div className="mt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Editor Avanzato:</strong> Qui puoi vedere e modificare il contenuto JSON completo della pagina,
                    incluse tutte le sezioni (cards, features, stats, ecc.). Modifica con cautela per evitare errori di sintassi.
                  </p>
                </div>
                <div className="mb-2 text-xs text-gray-600">
                  Caratteri JSON: {jsonContent.length} | Valido: {(() => {
                    try { JSON.parse(jsonContent); return '✅'; } catch { return '❌'; }
                  })()}
                </div>
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder='{"hero": {...}, "sections": [...], "seo": {...}}'
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Formato JSON - Vedi <code className="bg-gray-100 px-1 rounded">docs/technical/CMS_CONTENT_STRUCTURE.md</code> per la documentazione completa
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SEO Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">SEO</h3>

          {/* SEO Title */}
          <div>
            <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Titolo SEO
            </label>
            <input
              type="text"
              id="seoTitle"
              name="seoTitle"
              value={formData.seoTitle}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Titolo per i motori di ricerca"
              maxLength={60}
            />
            <p className="text-gray-500 text-xs mt-1">
              {formData.seoTitle.length}/60 caratteri
            </p>
          </div>

          {/* SEO Description */}
          <div>
            <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione SEO
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              value={formData.seoDescription}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrizione per i motori di ricerca"
              maxLength={160}
            />
            <p className="text-gray-500 text-xs mt-1">
              {formData.seoDescription.length}/160 caratteri
            </p>
          </div>

          {/* SEO Keywords */}
          <div>
            <label htmlFor="seoKeywords" className="block text-sm font-medium text-gray-700 mb-1">
              Keywords SEO
            </label>
            <input
              type="text"
              id="seoKeywords"
              name="seoKeywords"
              value={formData.seoKeywords}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sicurezza lavoro, RSPP, corsi formazione (separati da virgola)"
            />
            <p className="text-gray-500 text-xs mt-1">
              Inserisci le parole chiave separate da virgola
            </p>
          </div>

          {/* OG Image */}
          <div>
            <label htmlFor="ogImage" className="block text-sm font-medium text-gray-700 mb-1">
              Immagine Social (OG Image)
            </label>
            <input
              type="url"
              id="ogImage"
              name="ogImage"
              value={formData.ogImage}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-gray-500 text-xs mt-1">
              URL dell'immagine per la condivisione su social media (Facebook, Twitter, LinkedIn)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Salvataggio...' : 'Salva Bozza'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMSPageEditor;
