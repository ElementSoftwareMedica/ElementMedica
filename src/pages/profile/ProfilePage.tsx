/**
 * ProfilePage — Pagina profilo utente
 * Permette di modificare dati personali e cambiare password.
 */

import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/auth/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPut } from '../../services/api';

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    birthDate: string;
    taxCode: string;
    phone: string;
}

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [tab, setTab] = useState<'profile' | 'password'>('profile');
    const [saving, setSaving] = useState(false);

    // Profile form
    const [profile, setProfile] = useState<ProfileData>({
        firstName: '',
        lastName: '',
        email: '',
        birthDate: '',
        taxCode: '',
        phone: ''
    });

    // Password form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Load profile from /auth/me
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await apiGet<{
                    firstName: string;
                    lastName: string;
                    email: string;
                    birthDate?: string | null;
                    taxCode?: string | null;
                    phone?: string | null;
                }>('/api/v1/auth/me');
                setProfile({
                    firstName: data.firstName ?? '',
                    lastName: data.lastName ?? '',
                    email: data.email ?? '',
                    birthDate: data.birthDate ? data.birthDate.substring(0, 10) : '',
                    taxCode: data.taxCode ?? '',
                    phone: data.phone ?? ''
                });
            } catch {
                showToast({ message: 'Errore nel caricamento del profilo', type: 'error' });
            }
        };
        loadProfile();
    }, []);

    const handleProfileSave = async () => {
        setSaving(true);
        try {
            await apiPut('/api/v1/auth/me/profile', {
                firstName: profile.firstName,
                lastName: profile.lastName,
                birthDate: profile.birthDate || null,
                taxCode: profile.taxCode || null,
                phone: profile.phone || null
            });
            showToast({ message: 'Profilo aggiornato con successo', type: 'success' });
        } catch {
            showToast({ message: 'Errore durante il salvataggio', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSave = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast({ message: 'Le password non coincidono', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            await apiPut('/api/v1/auth/me/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            showToast({ message: 'Password aggiornata con successo', type: 'success' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message;
            showToast({ message: msg ?? 'Errore durante il cambio password', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const passwordStrength = (pw: string) => {
        if (pw.length === 0) return null;
        const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /\d/.test(pw), /[^a-zA-Z0-9]/.test(pw)];
        const score = checks.filter(Boolean).length;
        if (score <= 2) return { label: 'Debole', color: 'bg-red-400' };
        if (score === 3) return { label: 'Media', color: 'bg-yellow-400' };
        if (score === 4) return { label: 'Buona', color: 'bg-blue-400' };
        return { label: 'Ottima', color: 'bg-green-400' };
    };

    const strength = passwordStrength(passwordForm.newPassword);

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Il mio profilo</h1>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setTab('profile')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'profile' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <User className="h-4 w-4 inline mr-1.5" />
                    Dati personali
                </button>
                <button
                    onClick={() => setTab('password')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'password' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Lock className="h-4 w-4 inline mr-1.5" />
                    Sicurezza
                </button>
            </div>

            {/* Profile Tab */}
            {tab === 'profile' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Per cambiare l'email contatta l'amministratore.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data di nascita</label>
                            <input
                                type="date"
                                value={profile.birthDate}
                                onChange={e => setProfile(p => ({ ...p, birthDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                            <input
                                type="text"
                                value={profile.taxCode}
                                onChange={e => setProfile(p => ({ ...p, taxCode: e.target.value.toUpperCase() }))}
                                maxLength={16}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 uppercase"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            placeholder="+39 000 000 0000"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleProfileSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Salva modifiche
                        </button>
                    </div>
                </div>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password attuale</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={passwordForm.currentPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                placeholder="Password attuale"
                            />
                            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-2.5 text-gray-400">
                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={passwordForm.newPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                placeholder="Almeno 8 caratteri"
                            />
                            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-2.5 text-gray-400">
                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {strength && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.label === 'Debole' ? '25%' : strength.label === 'Media' ? '50%' : strength.label === 'Buona' ? '75%' : '100%' }} />
                                </div>
                                <span className="text-xs text-gray-500">{strength.label}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conferma nuova password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={passwordForm.confirmPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                placeholder="Ripeti la nuova password"
                            />
                            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-2.5 text-gray-400">
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {passwordForm.confirmPassword && (
                            passwordForm.newPassword === passwordForm.confirmPassword
                                ? <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Le password coincidono</p>
                                : <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Le password non coincidono</p>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                        <p className="font-medium text-gray-600">Requisiti password:</p>
                        <ul className="space-y-0.5 list-disc list-inside">
                            <li>Almeno 8 caratteri</li>
                            <li>Almeno una lettera maiuscola</li>
                            <li>Almeno una lettera minuscola</li>
                            <li>Almeno un numero</li>
                        </ul>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handlePasswordSave}
                            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                            className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                            Aggiorna password
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
