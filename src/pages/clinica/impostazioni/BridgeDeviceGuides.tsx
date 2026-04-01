/**
 * BridgeDeviceGuides
 * 
 * Expandable setup guides for each supported medical device.
 * 
 * @module pages/clinica/impostazioni/BridgeDeviceGuides
 */

import { useState } from 'react';
import {
    Monitor,
    ChevronDown,
    ChevronUp,
    FolderOpen,
    FileText,
    Zap,
} from 'lucide-react';
import { SUPPORTED_DEVICES } from './bridgeSettingsData';

export default function BridgeDeviceGuides() {
    const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-teal-600" />
                    Dispositivi supportati e guida alla configurazione
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    Clicca su un dispositivo per visualizzare la guida di configurazione passo-passo
                </p>
            </div>
            <div className="divide-y divide-gray-100">
                {SUPPORTED_DEVICES.map((device) => {
                    const DevIcon = device.icon;
                    const isExpanded = expandedDevice === device.type;
                    return (
                        <div key={device.type}>
                            <button
                                onClick={() => setExpandedDevice(isExpanded ? null : device.type)}
                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="p-2 rounded-lg bg-teal-50">
                                    <DevIcon className="w-6 h-6 text-teal-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-gray-800">{device.name}</h4>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{device.type}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">{device.description}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                                    <div className="text-right">
                                        <p className="text-gray-400">Software</p>
                                        <p className="font-medium text-gray-600">{device.software}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400">Protocollo</p>
                                        <p className="font-medium text-gray-600">{device.protocol}</p>
                                    </div>
                                </div>
                                <div className="text-gray-400">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-5 pb-5 bg-gray-50/50">
                                    <div className="ml-12 space-y-4">
                                        <div className="space-y-3">
                                            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                                <Zap className="w-4 h-4 text-teal-500" />
                                                Procedura di configurazione
                                            </h5>
                                            {device.setupSteps.map((step, idx) => (
                                                <div key={idx} className="flex gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-800">{step.title}</p>
                                                        <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                                                        {step.detail && (
                                                            <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1 font-mono">
                                                                {step.detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                                            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                                                <FolderOpen className="w-3.5 h-3.5" />
                                                Percorsi predefiniti
                                            </h5>
                                            <div className="space-y-1.5 font-mono text-xs">
                                                <div className="flex items-start gap-2">
                                                    <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-gray-500">Eseguibile:</span>
                                                    <span className="text-gray-700 break-all">{device.defaultPaths.executable}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <FolderOpen className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-gray-500">GDT Input:</span>
                                                    <span className="text-gray-700 break-all">{device.defaultPaths.gdtInput}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <FolderOpen className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-gray-500">GDT Output:</span>
                                                    <span className="text-gray-700 break-all">{device.defaultPaths.gdtOutput}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
