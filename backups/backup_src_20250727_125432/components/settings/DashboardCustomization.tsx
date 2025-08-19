/**
 * Dashboard Customization Component
 * Week 14 Implementation - Dashboard Layout and Widget Preferences
 */

import React, { useState } from 'react';
import { Layout, Grid, BarChart3, Users, Calendar, Settings, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { usePreferences } from '../../context/PreferencesContext';
import { DashboardLayout, DashboardWidget } from '../../types/preferences';

interface DashboardCustomizationProps {
  className?: string;
}

const LAYOUT_OPTIONS: { value: DashboardLayout; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'grid',
    label: 'Griglia',
    description: 'Layout a griglia con widget di dimensioni uniformi',
    icon: <Grid className="w-4 h-4" />
  },
  {
    value: 'masonry',
    label: 'Masonry',
    description: 'Layout dinamico con widget di altezze variabili',
    icon: <Layout className="w-4 h-4" />
  },
  {
    value: 'sidebar',
    label: 'Sidebar',
    description: 'Layout con sidebar laterale e contenuto principale',
    icon: <BarChart3 className="w-4 h-4" />
  }
];

const AVAILABLE_WIDGETS: { id: string; name: string; description: string; icon: React.ReactNode; category: string }[] = [
  {
    id: 'overview',
    name: 'Panoramica',
    description: 'Statistiche generali e metriche principali',
    icon: <BarChart3 className="w-4 h-4" />,
    category: 'Analytics'
  },
  {
    id: 'recent-activity',
    name: 'Attività Recenti',
    description: 'Ultime azioni e modifiche nel sistema',
    icon: <Calendar className="w-4 h-4" />,
    category: 'Activity'
  },
  {
    id: 'user-stats',
    name: 'Statistiche Utenti',
    description: 'Dati e metriche sugli utenti attivi',
    icon: <Users className="w-4 h-4" />,
    category: 'Analytics'
  },
  {
    id: 'quick-actions',
    name: 'Azioni Rapide',
    description: 'Scorciatoie per le operazioni più comuni',
    icon: <Settings className="w-4 h-4" />,
    category: 'Tools'
  },
  {
    id: 'notifications',
    name: 'Notifiche',
    description: 'Centro notifiche e messaggi importanti',
    icon: <Calendar className="w-4 h-4" />,
    category: 'Communication'
  },
  {
    id: 'calendar',
    name: 'Calendario',
    description: 'Eventi e appuntamenti programmati',
    icon: <Calendar className="w-4 h-4" />,
    category: 'Planning'
  }
];

const WIDGET_CATEGORIES = [
  { id: 'all', name: 'Tutti' },
  { id: 'Analytics', name: 'Analytics' },
  { id: 'Activity', name: 'Attività' },
  { id: 'Tools', name: 'Strumenti' },
  { id: 'Communication', name: 'Comunicazione' },
  { id: 'Planning', name: 'Pianificazione' }
];

const DashboardCustomization: React.FC<DashboardCustomizationProps> = ({ className = '' }) => {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const handleLayoutChange = async (layout: DashboardLayout) => {
    if (!preferences) return;
    
    const updatedDashboard = {
      ...preferences.dashboard,
      layout
    };
    
    await updatePreferences({ dashboard: updatedDashboard });
  };

  const handleWidgetToggle = async (widgetId: string, enabled: boolean) => {
    if (!preferences) return;
    
    const updatedWidgets = preferences.dashboard.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, enabled } : widget
    );
    
    const updatedDashboard = {
      ...preferences.dashboard,
      widgets: updatedWidgets
    };
    
    await updatePreferences({ dashboard: updatedDashboard });
  };

  const handleWidgetReorder = async (fromIndex: number, toIndex: number) => {
    if (!preferences) return;
    
    const updatedWidgets = [...preferences.dashboard.widgets];
    const [movedWidget] = updatedWidgets.splice(fromIndex, 1);
    updatedWidgets.splice(toIndex, 0, movedWidget);
    
    // Update order values
    const reorderedWidgets = updatedWidgets.map((widget, index) => ({
      ...widget,
      order: index
    }));
    
    const updatedDashboard = {
      ...preferences.dashboard,
      widgets: reorderedWidgets
    };
    
    await updatePreferences({ dashboard: updatedDashboard });
  };

  const handleCompactModeToggle = async (compact: boolean) => {
    if (!preferences) return;
    
    const updatedDashboard = {
      ...preferences.dashboard,
      compact
    };
    
    await updatePreferences({ dashboard: updatedDashboard });
  };

  const resetToDefault = async () => {
    if (!preferences) return;
    
    const defaultDashboard = {
      layout: 'grid' as DashboardLayout,
      widgets: AVAILABLE_WIDGETS.map((widget, index) => ({
        id: widget.id,
        enabled: index < 4, // Enable first 4 widgets by default
        order: index,
        size: 'medium' as const
      })),
      compact: false
    };
    
    await updatePreferences({ dashboard: defaultDashboard });
  };

  const filteredWidgets = selectedCategory === 'all' 
    ? AVAILABLE_WIDGETS 
    : AVAILABLE_WIDGETS.filter(widget => widget.category === selectedCategory);

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Caricamento impostazioni...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Layout Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Layout Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LAYOUT_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  preferences.dashboard.layout === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleLayoutChange(option.value)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                  {preferences.dashboard.layout === option.value && (
                    <Badge variant="default" className="ml-auto">Attivo</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Modalità compatta</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Riduce la spaziatura tra i widget per mostrare più contenuto
              </p>
            </div>
            <Switch
              checked={preferences.dashboard.compact}
              onCheckedChange={handleCompactModeToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Widget Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Grid className="w-5 h-5" />
              Widget Dashboard
            </CardTitle>
            <Button
              onClick={resetToDefault}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              Ripristina Default
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {WIDGET_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
          
          <Separator />
          
          {/* Widget List */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Widget Disponibili</Label>
            <div className="space-y-2">
              {filteredWidgets.map((widget) => {
                const userWidget = preferences.dashboard.widgets.find(w => w.id === widget.id);
                const isEnabled = userWidget?.enabled || false;
                
                return (
                  <div
                    key={widget.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isEnabled 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {widget.icon}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{widget.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {widget.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {widget.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isEnabled && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <GripVertical className="w-3 h-3" />
                          <span>#{userWidget?.order || 0}</span>
                        </div>
                      )}
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleWidgetToggle(widget.id, checked)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Widgets Order */}
      {preferences.dashboard.widgets.some(w => w.enabled) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="w-5 h-5" />
              Ordine Widget Attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Trascina i widget per riordinarli nella dashboard
              </p>
              
              {preferences.dashboard.widgets
                .filter(w => w.enabled)
                .sort((a, b) => a.order - b.order)
                .map((widget, index) => {
                  const widgetInfo = AVAILABLE_WIDGETS.find(w => w.id === widget.id);
                  if (!widgetInfo) return null;
                  
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      draggable
                      onDragStart={() => setDraggedWidget(widget.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedWidget && draggedWidget !== widget.id) {
                          const fromIndex = preferences.dashboard.widgets.findIndex(w => w.id === draggedWidget);
                          const toIndex = preferences.dashboard.widgets.findIndex(w => w.id === widget.id);
                          handleWidgetReorder(fromIndex, toIndex);
                        }
                        setDraggedWidget(null);
                      }}
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                      <div className="flex items-center gap-2">
                        {widgetInfo.icon}
                        <span className="font-medium">{widgetInfo.name}</span>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        Posizione {index + 1}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Preview */}
      <Alert>
        <Eye className="w-4 h-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Anteprima Configurazione</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Layout:</span> {LAYOUT_OPTIONS.find(l => l.value === preferences.dashboard.layout)?.label}
              </div>
              <div>
                <span className="font-medium">Widget attivi:</span> {preferences.dashboard.widgets.filter(w => w.enabled).length}
              </div>
              <div>
                <span className="font-medium">Modalità:</span> {preferences.dashboard.compact ? 'Compatta' : 'Standard'}
              </div>
              <div>
                <span className="font-medium">Ultimo aggiornamento:</span> {new Date().toLocaleTimeString('it-IT')}
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DashboardCustomization;