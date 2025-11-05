/**
 * Editor State Types
 * Settings/Templates Redesign Project
 */

import { Editor } from '@tiptap/react';
import { MarkerDefinition, TemplateLayout, TemplateStyles } from './template.types';

export interface EditorState {
  content: string;
  header: string;
  footer: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export interface EditorConfig {
  autoSave: boolean;
  autoSaveInterval: number; // milliseconds
  showMarkerHints: boolean;
  enableSpellCheck: boolean;
}

export interface EditorToolbarConfig {
  showBasicFormatting: boolean;
  showAdvancedFormatting: boolean;
  showAlignment: boolean;
  showLists: boolean;
  showTables: boolean;
  showImages: boolean;
  showMarkerInsertion: boolean;
}

export interface EditorContextValue {
  editor: Editor | null;
  headerEditor: Editor | null;
  footerEditor: Editor | null;
  state: EditorState;
  config: EditorConfig;
  actions: EditorActions;
}

export interface EditorActions {
  updateContent: (content: string) => void;
  updateHeader: (header: string) => void;
  updateFooter: (footer: string) => void;
  insertMarker: (marker: MarkerDefinition) => void;
  save: () => Promise<void>;
  reset: () => void;
  setError: (error: string | null) => void;
}

export interface MarkerInsertPosition {
  from: number;
  to: number;
}

export interface AutocompleteState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number } | null;
  filteredMarkers: MarkerDefinition[];
  selectedIndex: number;
}

export interface LayoutConfigState extends TemplateLayout {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface StylesConfigState extends TemplateStyles {
  isValid: boolean;
  errors: Record<string, string>;
}

export type EditorMode = 'edit' | 'preview' | 'split';

export interface EditorViewState {
  mode: EditorMode;
  showSidebar: boolean;
  activeSidebarTab: 'layout' | 'styles' | 'markers' | 'versions';
  zoom: number;
}
