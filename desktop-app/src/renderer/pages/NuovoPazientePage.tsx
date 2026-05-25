import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, UserPlus, Save } from 'lucide-react'
import { useDesktopAuth } from '../context/DesktopAuthContext'

export function NuovoPazientePage(): JSX.Element {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { user, currentTenantId } = useDesktopAuth()

    // Pre-fill companyId if coming from AziendaDetailPage
    const prefilledCompanyId = params.get('companyId') || ''
    const prefilledCompanyName = params.get('companyName') || ''

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [taxCode, setTaxCode] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = (): boolean => {
        const e: Record<string, string> = {}
        if (!firstName.trim()) e.firstName = 'Nome obbligatorio'
        if (!lastName.trim()) e.lastName = 'Cognome obbligatorio'
        if (taxCode && taxCode.length !== 16) e.taxCode = 'Codice fiscale non valido (16 caratteri)'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = useCallback(async () => {
        if (!validate() || !window.desktopApi || !user) return
        setSaving(true)

        try {
            const effectiveTenantId = currentTenantId ?? user.tenantId
            const now = new Date().toISOString()

            const result = await window.desktopApi.db.insert({
                table: 'patients',
                data: {
                    tenantId: effectiveTenantId,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    taxCode: taxCode.trim().toUpperCase() || null,
                    birthDate: birthDate || null,
                    gender: gender || null,
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    status: 'ACTIVE',
                    companyTenantProfileId: prefilledCompanyId || null,
                    companyName: prefilledCompanyName || null,
                    createdAt: now,
                    updatedAt: now,
                }
            }) as { id: string; _localId: string }

            // Enqueue sync: CREATE personTenantProfile (backend will also create Person if needed)
            await window.desktopApi.sync.enqueue({
                type: 'CREATE',
                entity: 'patients',
                entityId: result.id,
                localId: result._localId,
                payload: {
                    tenantId: effectiveTenantId,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    taxCode: taxCode.trim().toUpperCase() || null,
                    birthDate: birthDate || null,
                    gender: gender || null,
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    status: 'ACTIVE',
                    companyTenantProfileId: prefilledCompanyId || null,
                }
            })

            // Navigate to the new patient's detail page
            navigate(`/pazienti/${result.id}`, { replace: true })
        } finally {
            setSaving(false)
        }
    }, [firstName, lastName, taxCode, birthDate, gender, email, phone, prefilledCompanyId, prefilledCompanyName, user, currentTenantId, navigate])

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-teal-600" />
                        Nuovo Lavoratore
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Il lavoratore verrà sincronizzato al prossimo upload
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                {prefilledCompanyName && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 text-sm text-teal-800">
                        Azienda: <strong>{prefilledCompanyName}</strong>
                    </div>
                )}

                {/* Nome / Cognome */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Nome <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Mario"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.firstName ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Cognome <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Rossi"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.lastName ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                    </div>
                </div>

                {/* Codice Fiscale */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Codice Fiscale</label>
                    <input
                        type="text"
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value.toUpperCase())}
                        placeholder="RSSMRA80A01H501A"
                        maxLength={16}
                        className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.taxCode ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.taxCode && <p className="text-xs text-red-500 mt-1">{errors.taxCode}</p>}
                </div>

                {/* Data Nascita / Sesso */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Data di Nascita</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Sesso</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="">Seleziona...</option>
                            <option value="M">Maschio</option>
                            <option value="F">Femmina</option>
                        </select>
                    </div>
                </div>

                {/* Email / Telefono */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="mario.rossi@esempio.it"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Telefono</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+39 333 1234567"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Annulla
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {saving ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-white" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    Crea Lavoratore
                </button>
            </div>
        </div>
    )
}
