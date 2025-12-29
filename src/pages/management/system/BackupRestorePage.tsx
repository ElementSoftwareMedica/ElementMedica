/**
 * Backup & Restore Page - Management Section
 * 
 * Wrapper for the existing BackupRestoreTab component
 * Adds management-specific header and styling
 * 
 * @module pages/management/system/BackupRestorePage
 * @project 43 - Tenant Roles Management System
 */

import React from 'react';
import { Database, Shield, Clock, HardDrive } from 'lucide-react';
import BackupRestoreTab from '../../settings/BackupRestoreTab';

const BackupRestorePage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Database className="w-7 h-7 text-purple-600" />
                        Backup & Restore
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestione backup e ripristino dati del sistema
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Export Selettivo</div>
                            <div className="text-sm text-gray-500">Seleziona entità da esportare</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Restore Sicuro</div>
                            <div className="text-sm text-gray-500">Preview prima del ripristino</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Storico Backup</div>
                            <div className="text-sm text-gray-500">Visualizza backup precedenti</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm text-amber-800">
                        <strong>Importante:</strong> Prima di eseguire un restore, assicurati di avere un backup recente dei dati attuali. 
                        Il restore sovrascriverà i dati esistenti nelle entità selezionate.
                    </p>
                </div>
            </div>

            {/* Existing BackupRestoreTab Component */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <BackupRestoreTab />
            </div>
        </div>
    );
};

export default BackupRestorePage;
