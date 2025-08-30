/**
 * User Preferences Types
 * Week 14 Implementation - User Preferences and Settings
 */

// Theme preferences
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

// Language preferences
export type LanguageCode = 'it' | 'en' | 'fr' | 'de' | 'es';

// Notification preferences
export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    types: {
      system: boolean;
      security: boolean;
      updates: boolean;
      marketing: boolean;
      reminders: boolean;
    };
  };
  push: {
    enabled: boolean;
    types: {
      system: boolean;
      security: boolean;
      updates: boolean;
      reminders: boolean;
    };
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

// Dashboard customization
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'calendar' | 'activity';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  columns: number;
  compact: boolean;
}

// User preferences main interface
export interface UserPreferences {
  id: string;
  userId: string;
  theme: ThemeMode;
  themeColor: ThemeColor;
  language: LanguageCode;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
  dashboard: DashboardLayout;
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    activityTracking: boolean;
    dataCollection: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Admin settings types
export interface SystemConfiguration {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportEmail: string;
  defaultLanguage: LanguageCode;
  defaultTheme: ThemeMode;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number; // minutes
  maxFileUploadSize: number; // MB
  allowedFileTypes: string[];
}

export interface FeatureFlags {
  enableBetaFeatures: boolean;
  enableAdvancedReporting: boolean;
  enableAPIAccess: boolean;
  enableMultiTenant: boolean;
  enableGDPRCompliance: boolean;
  enableAuditLogs: boolean;
  enableNotifications: boolean;
  enableFileSharing: boolean;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  startTime?: string;
  endTime?: string;
  allowedIPs: string[];
  allowAdminAccess: boolean;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  retention: number; // days
  includeFiles: boolean;
  includeDatabase: boolean;
  destination: 'local' | 's3' | 'ftp';
  config: Record<string, unknown>;
}

export interface AdminSettings {
  id: string;
  system: SystemConfiguration;
  features: FeatureFlags;
  maintenance: MaintenanceSettings;
  backup: BackupSettings;
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      maxAge: number; // days
    };
    twoFactorAuth: {
      required: boolean;
      methods: ('email' | 'sms' | 'app')[];
    };
    ipWhitelist: string[];
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      blockDuration: number; // minutes
    };
  };
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface PreferencesApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Hook return types
// Removed UseUserPreferencesReturn - now using unified PreferencesContextType

export interface UseThemeReturn {
  theme: ThemeMode;
  themeColor: ThemeColor;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  setThemeColor: (color: ThemeColor) => void;
  toggleTheme: () => void;
  applyTheme: (theme: ThemeMode) => void;
}

export interface UseLanguageReturn {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  availableLanguages: { code: LanguageCode; name: string; flag: string }[];
  t: (key: string, params?: Record<string, unknown>) => string;
}

export interface UseNotificationsReturn {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  testNotification: (type: keyof NotificationPreferences) => Promise<void>;
}

export interface UseAdminSettingsReturn {
  settings: AdminSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<AdminSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => void;
  importSettings: (file: File) => Promise<void>;
}

// Form data types
export interface UserPreferencesFormData {
  theme: ThemeMode;
  themeColor: ThemeColor;
  language: LanguageCode;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
  accessibility: UserPreferences['accessibility'];
  privacy: UserPreferences['privacy'];
}

export interface AdminSettingsFormData {
  system: SystemConfiguration;
  features: FeatureFlags;
  maintenance: MaintenanceSettings;
  backup: BackupSettings;
  security: AdminSettings['security'];
}

// Context types
export interface PreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => void;
  importPreferences: (file: File) => Promise<void>;
  // Additional utility methods
  getPreference: <K extends keyof UserPreferences>(key: K) => UserPreferences[K] | undefined;
  updateSinglePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  isLoaded: () => boolean;
  getThemePreferences: () => { theme: ThemeMode; themeColor: ThemeColor; accessibility: UserPreferences['accessibility'] } | null;
  getNotificationPreferences: () => NotificationPreferences | null;
  getDashboardPreferences: () => UserPreferences['dashboard'] | null;
  refresh: () => Promise<void>;
}

export interface ThemeContextType {
  theme: ThemeMode;
  themeColor: ThemeColor;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  setThemeColor: (color: ThemeColor) => void;
  toggleTheme: () => void;
}

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  availableLanguages: { code: LanguageCode; name: string; flag: string }[];
  t: (key: string, params?: Record<string, unknown>) => string;
}

// Default values
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'auto',
  themeColor: 'blue',
  language: 'it',
  timezone: 'Europe/Rome',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  notifications: {
    email: {
      enabled: true,
      frequency: 'daily',
      types: {
        system: true,
        security: true,
        updates: true,
        marketing: false,
        reminders: true
      }
    },
    push: {
      enabled: true,
      types: {
        system: true,
        security: true,
        updates: false,
        reminders: true
      }
    },
    inApp: {
      enabled: true,
      sound: true,
      desktop: true
    }
  },
  dashboard: {
    widgets: [],
    columns: 3,
    compact: false
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReader: false
  },
  privacy: {
    profileVisibility: 'contacts',
    activityTracking: true,
    dataCollection: true
  }
};

export const DEFAULT_ADMIN_SETTINGS: Omit<AdminSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  system: {
    siteName: 'My Application',
    siteDescription: 'A modern web application',
    contactEmail: 'contact@example.com',
    supportEmail: 'support@example.com',
    defaultLanguage: 'it',
    defaultTheme: 'auto',
    allowRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 60,
    maxFileUploadSize: 10,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'gif']
  },
  features: {
    enableBetaFeatures: false,
    enableAdvancedReporting: true,
    enableAPIAccess: true,
    enableMultiTenant: true,
    enableGDPRCompliance: true,
    enableAuditLogs: true,
    enableNotifications: true,
    enableFileSharing: true
  },
  maintenance: {
    enabled: false,
    message: 'Il sistema è in manutenzione. Riprova più tardi.',
    allowedIPs: [],
    allowAdminAccess: true
  },
  backup: {
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retention: 30,
    includeFiles: true,
    includeDatabase: true,
    destination: 'local',
    config: {}
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      maxAge: 90
    },
    twoFactorAuth: {
      required: false,
      methods: ['email']
    },
    ipWhitelist: [],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      blockDuration: 15
    }
  }
};