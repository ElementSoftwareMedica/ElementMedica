/**
 * SEOConfigForm Component
 * Form per gestire la configurazione SEO di una pagina o corso
 * FASE 1: SEO Foundation
 */

import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/services/api';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Save, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SEOConfigFormProps {
  entityType: 'page' | 'course';
  entityId: string;
  onSave?: () => void;
}

const SEOConfigForm: React.FC<SEOConfigFormProps> = ({
  entityType,
  entityId,
  onSave
}) => {
  const [config, setConfig] = useState({
    title: '',
    description: '',
    keywords: [] as string[],
    canonicalUrl: '',
    noindex: false,
    nofollow: false,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website' as 'website' | 'article' | 'profile',
    twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
    twitterSite: '',
    twitterCreator: '',
    twitterImage: ''
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validation, setValidation] = useState<{
    title?: string;
    description?: string;
  }>({});

  // Load existing config
  useEffect(() => {
    fetchConfig();
  }, [entityType, entityId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ success: boolean; data: typeof config }>(`/api/v1/seo/config/${entityType}/${entityId}`);
      if (data.success && data.data) {
        setConfig({
          ...data.data,
          keywords: data.data.keywords || []
        });
      }
    } catch (err) {
      // Config not found or not yet created — use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/v1/seo/config', {
        entityType,
        entityId,
        ...config
      });

      if (!data.success) {
        throw new Error('Errore nel salvataggio della configurazione SEO');
      }

      setSuccess(true);
      if (onSave) onSave();

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !config.keywords.includes(keywordInput.trim())) {
      setConfig({
        ...config,
        keywords: [...config.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setConfig({
      ...config,
      keywords: config.keywords.filter(k => k !== keyword)
    });
  };

  // Validate fields
  useEffect(() => {
    const newValidation: any = {};

    if (config.title.length > 60) {
      newValidation.title = 'Title should be max 60 characters for optimal SEO';
    }

    if (config.description.length > 160) {
      newValidation.description = 'Description should be max 160 characters for optimal SEO';
    }

    setValidation(newValidation);
  }, [config.title, config.description]);

  if (loading) {
    return <div>Loading SEO configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>SEO configuration saved successfully!</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="opengraph">Open Graph</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic SEO Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic SEO Settings</CardTitle>
              <CardDescription>Configure essential meta tags for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Page title (max 60 chars)"
                  maxLength={70}
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${config.title.length > 60 ? 'text-red-500' : 'text-gray-500'}`}>
                    {config.title.length}/60 characters
                  </span>
                  {validation.title && (
                    <span className="text-xs text-yellow-600">{validation.title}</span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Page description (max 160 chars)"
                  rows={3}
                  maxLength={200}
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${config.description.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>
                    {config.description.length}/160 characters
                  </span>
                  {validation.description && (
                    <span className="text-xs text-yellow-600">{validation.description}</span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="keywords"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword and press Enter"
                  />
                  <Button type="button" onClick={addKeyword}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                {config.keywords.length > 10 && (
                  <span className="text-xs text-yellow-600 mt-1">Max 10 keywords recommended</span>
                )}
              </div>

              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  type="url"
                  value={config.canonicalUrl}
                  onChange={(e) => setConfig({ ...config, canonicalUrl: e.target.value })}
                  placeholder="https://example.com/page"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="noindex"
                    checked={config.noindex}
                    onCheckedChange={(checked) => setConfig({ ...config, noindex: checked })}
                  />
                  <Label htmlFor="noindex">No Index</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="nofollow"
                    checked={config.nofollow}
                    onCheckedChange={(checked) => setConfig({ ...config, nofollow: checked })}
                  />
                  <Label htmlFor="nofollow">No Follow</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Open Graph Tab */}
        <TabsContent value="opengraph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Graph Settings</CardTitle>
              <CardDescription>Optimize how your page appears when shared on social media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={config.ogTitle}
                  onChange={(e) => setConfig({ ...config, ogTitle: e.target.value })}
                  placeholder="Title for social media (defaults to SEO title)"
                />
              </div>

              <div>
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={config.ogDescription}
                  onChange={(e) => setConfig({ ...config, ogDescription: e.target.value })}
                  placeholder="Description for social media"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="ogImage">OG Image URL</Label>
                <Input
                  id="ogImage"
                  type="url"
                  value={config.ogImage}
                  onChange={(e) => setConfig({ ...config, ogImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
                {config.ogImage && (
                  <img src={config.ogImage} alt="OG Preview" className="mt-2 max-w-xs rounded border" />
                )}
              </div>

              <div>
                <Label htmlFor="ogType">OG Type</Label>
                <select
                  id="ogType"
                  value={config.ogType}
                  onChange={(e) => setConfig({ ...config, ogType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="website">Website</option>
                  <option value="article">Article</option>
                  <option value="profile">Profile</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twitter Tab */}
        <TabsContent value="twitter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twitter Card Settings</CardTitle>
              <CardDescription>Optimize how your page appears on Twitter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitterCard">Twitter Card Type</Label>
                <select
                  id="twitterCard"
                  value={config.twitterCard}
                  onChange={(e) => setConfig({ ...config, twitterCard: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary Large Image</option>
                </select>
              </div>

              <div>
                <Label htmlFor="twitterSite">Twitter Site Handle</Label>
                <Input
                  id="twitterSite"
                  value={config.twitterSite}
                  onChange={(e) => setConfig({ ...config, twitterSite: e.target.value })}
                  placeholder="@username"
                />
              </div>

              <div>
                <Label htmlFor="twitterCreator">Twitter Creator Handle</Label>
                <Input
                  id="twitterCreator"
                  value={config.twitterCreator}
                  onChange={(e) => setConfig({ ...config, twitterCreator: e.target.value })}
                  placeholder="@username"
                />
              </div>

              <div>
                <Label htmlFor="twitterImage">Twitter Image URL</Label>
                <Input
                  id="twitterImage"
                  type="url"
                  value={config.twitterImage}
                  onChange={(e) => setConfig({ ...config, twitterImage: e.target.value })}
                  placeholder="https://example.com/image.jpg (defaults to OG image)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Structured data and advanced SEO options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Structured data (JSON-LD) is automatically generated based on the entity type.
                  Custom structured data configuration will be available in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={fetchConfig}
          disabled={loading}
        >
          <Eye className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !config.title || !config.description}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save SEO Config'}
        </Button>
      </div>
    </div>
  );
};

export default SEOConfigForm;
