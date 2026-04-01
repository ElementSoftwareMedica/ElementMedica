/**
 * HTML pages for Bridge activation setup UI.
 * Self-contained HTML with inline CSS and JS.
 * 
 * @module activation/pages
 */

/**
 * Main activation page - user enters license key
 */
export function setupPageHtml(defaultServerUrl: string): string {
    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ElementMedica Bridge - Attivazione</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        }
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo h1 {
            font-size: 24px;
            color: #0d9488;
            margin-bottom: 4px;
        }
        .logo p {
            color: #6b7280;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 6px;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            text-align: center;
            text-transform: uppercase;
            transition: border-color 0.2s;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #0d9488;
        }
        input[type="text"].error {
            border-color: #ef4444;
        }
        .hint {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 4px;
        }
        .btn {
            width: 100%;
            padding: 14px;
            background: #0d9488;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover { background: #0f766e; }
        .btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .btn.loading {
            position: relative;
            color: transparent;
        }
        .btn.loading::after {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            top: 50%;
            left: 50%;
            margin: -10px 0 0 -10px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 16px;
            display: none;
        }
        .message.error {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
            display: block;
        }
        .message.success {
            background: #f0fdf4;
            color: #16a34a;
            border: 1px solid #bbf7d0;
            display: block;
        }
        .advanced {
            margin-top: 24px;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
        }
        .advanced summary {
            font-size: 13px;
            color: #6b7280;
            cursor: pointer;
        }
        .advanced input {
            margin-top: 8px;
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 13px;
        }
        .steps {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #f3f4f6;
        }
        .steps h3 {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 12px;
        }
        .steps ol {
            padding-left: 20px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.8;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <h1>ElementMedica Bridge</h1>
            <p>Medical Device Bridge - Attivazione</p>
        </div>
        <form id="activationForm">
            <div class="form-group">
                <label for="licenseKey">Codice di Attivazione</label>
                <input type="text" id="licenseKey" placeholder="ELEM-XXXX-XXXX-XXXX"
                       maxlength="19" autocomplete="off" autofocus>
                <p class="hint">Il codice si trova nelle impostazioni Bridge della webapp</p>
            </div>
            <button type="submit" class="btn" id="submitBtn">Attiva Bridge</button>
            <div class="message" id="message"></div>
        </form>
        <details class="advanced">
            <summary>Impostazioni avanzate</summary>
            <input type="text" id="serverUrl" value="${defaultServerUrl}" placeholder="URL Server">
        </details>
        <div class="steps">
            <h3>Come funziona</h3>
            <ol>
                <li>L'amministratore genera un codice dalla webapp</li>
                <li>Inserisci il codice qui sopra</li>
                <li>Il Bridge si configura automaticamente</li>
                <li>Configuri i dispositivi medici</li>
            </ol>
        </div>
    </div>
    <script>
        const form = document.getElementById('activationForm');
        const input = document.getElementById('licenseKey');
        const serverUrlInput = document.getElementById('serverUrl');
        const btn = document.getElementById('submitBtn');
        const msg = document.getElementById('message');
        const CANONICAL_SERVER_URL = 'https://www.elementmedica.com';

        function normalizeServerUrl(raw) {
            const value = (raw || '').trim();
            if (!value) return CANONICAL_SERVER_URL;

            let withProtocol = value;
            if (!/^https?:\/\//i.test(withProtocol)) {
                withProtocol = 'https://' + withProtocol;
            }

            try {
                const parsed = new URL(withProtocol);
                const host = (parsed.hostname || '').toLowerCase();
                if (host === 'app.elementmedica.com' || host === 'elementmedica.com' || host === 'www.elementmedica.com') {
                    return CANONICAL_SERVER_URL;
                }
                return (parsed.protocol + '//' + parsed.host).replace(/\/+$/, '');
            } catch (_err) {
                return CANONICAL_SERVER_URL;
            }
        }

        serverUrlInput.value = normalizeServerUrl(serverUrlInput.value || CANONICAL_SERVER_URL);

        // Auto-format license key with dashes
        input.addEventListener('input', function(e) {
            let val = this.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            if (val.length > 4) {
                val = val.substring(0, 4) + '-' + val.substring(4);
            }
            if (val.length > 9) {
                val = val.substring(0, 9) + '-' + val.substring(9);
            }
            if (val.length > 14) {
                val = val.substring(0, 14) + '-' + val.substring(14);
            }
            this.value = val.substring(0, 19);
            this.classList.remove('error');
            msg.className = 'message';
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const key = input.value.trim();
            if (key.length < 19) {
                input.classList.add('error');
                msg.className = 'message error';
                msg.textContent = 'Inserire il codice completo (formato: ELEM-XXXX-XXXX-XXXX)';
                return;
            }

            btn.disabled = true;
            btn.classList.add('loading');
            btn.textContent = 'Attivazione...';
            msg.className = 'message';

            try {
                const serverUrl = normalizeServerUrl(serverUrlInput.value);
                serverUrlInput.value = serverUrl;
                const res = await fetch('/api/activate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ licenseKey: key, serverUrl }),
                });
                const data = await res.json();

                if (data.success) {
                    msg.className = 'message success';
                    msg.textContent = 'Attivazione completata! Reindirizzamento...';
                    setTimeout(() => {
                        if (data.data?.hasDevices) {
                            window.location.href = '/setup/complete';
                        } else {
                            window.location.href = '/setup/devices';
                        }
                    }, 1000);
                } else {
                    msg.className = 'message error';
                    let errorText = data.error;
                    if (data.activatedOn) {
                        errorText += ' (Computer: ' + data.activatedOn + ')';
                    }
                    msg.textContent = errorText;
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    btn.textContent = 'Attiva Bridge';
                }
            } catch (err) {
                msg.className = 'message error';
                msg.textContent = 'Errore di connessione. Verificare che il server sia raggiungibile.';
                btn.disabled = false;
                btn.classList.remove('loading');
                btn.textContent = 'Attiva Bridge';
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Device configuration page - configure local medical devices
 * @param currentDevices  Optional array of currently-saved device configs (for pre-population)
 */
export function deviceSetupPageHtml(currentDevices?: Array<Record<string, unknown>>): string {
    function escHtml(v: unknown): string {
        return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const edan = currentDevices?.find((d) => d.type === 'edan-ecg');
    const mir = currentDevices?.find((d) => d.type === 'mir-spirometer');
    const oscilla = currentDevices?.find((d) => d.type === 'oscilla-audiometer');

    const edanChecked = edan?.enabled ? 'checked' : '';
    const edanVisible = edan?.enabled ? ' visible' : '';
    const edanExeVal = escHtml(edan?.executable || 'C:\\Program Files\\EDAN\\ECGViewer.exe');
    const edanInputVal = escHtml(edan?.gdtInputDir || 'C:\\GDT\\EDAN\\Input');
    const edanOutputVal = escHtml(edan?.gdtOutputDir || 'C:\\GDT\\EDAN\\Output');
    const edanPdfVal = escHtml(edan?.pdfOutputDir || edan?.gdtOutputDir || 'C:\\GDT\\EDAN\\Output');
    const edanPdfCustomized = (edan && String(edan.pdfOutputDir || '') !== String(edan.gdtOutputDir || '')) ? 'true' : 'false';

    const mirChecked = mir?.enabled ? 'checked' : '';
    const mirVisible = mir?.enabled ? ' visible' : '';
    const mirExeVal = escHtml(mir?.executable || 'C:\\Program Files\\MIR\\WinspiroPRO\\Winspiro.exe');
    const mirInputVal = escHtml(mir?.gdtInputDir || 'C:\\GDT\\MIR\\Input');
    const mirOutputVal = escHtml(mir?.gdtOutputDir || 'C:\\GDT\\MIR\\Output');
    const mirPdfVal = escHtml(mir?.pdfOutputDir || mir?.gdtOutputDir || 'C:\\GDT\\MIR\\Output');
    const mirPdfCustomized = (mir && String(mir.pdfOutputDir || '') !== String(mir.gdtOutputDir || '')) ? 'true' : 'false';

    const oscillaChecked = oscilla?.enabled ? 'checked' : '';
    const oscillaVisible = oscilla?.enabled ? ' visible' : '';
    const oscillaExeVal = escHtml(oscilla?.executable || 'C:\\Program Files\\Oscilla\\AudioConsole.exe');
    const oscillaInputVal = escHtml(oscilla?.gdtInputDir || 'C:\\GDT\\OSCILLA\\Input');
    const oscillaOutputVal = escHtml(oscilla?.gdtOutputDir || 'C:\\GDT\\OSCILLA\\Output');
    const oscillaPdfVal = escHtml(oscilla?.pdfOutputDir || oscilla?.gdtOutputDir || 'C:\\GDT\\OSCILLA\\Output');
    const oscillaPdfCustomized = (oscilla && String(oscilla.pdfOutputDir || '') !== String(oscilla.gdtOutputDir || '')) ? 'true' : 'false';

    const hasCurrentConfig = (currentDevices?.length ?? 0) > 0;
    const configBanner = hasCurrentConfig
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:13px;color:#16a34a;">&#10003; Configurazione salvata caricata &mdash; modifica e salva per aggiornare</div>`
        : '';

    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ElementMedica Bridge - Configurazione Dispositivi</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f3f4f6;
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 640px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .header h1 {
            font-size: 22px;
            color: #0d9488;
            margin-bottom: 4px;
        }
        .header p {
            color: #6b7280;
            font-size: 14px;
        }
        .device-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .device-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        .device-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        .device-icon.ecg { background: #fef3c7; }
        .device-icon.spiro { background: #dbeafe; }
        .device-icon.audio { background: #ede9fe; }
        .device-header h3 { font-size: 16px; color: #1f2937; }
        .device-header p { font-size: 13px; color: #6b7280; }
        .toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        .toggle input[type="checkbox"] {
            width: 40px;
            height: 22px;
            appearance: none;
            background: #d1d5db;
            border-radius: 11px;
            position: relative;
            cursor: pointer;
            transition: background 0.2s;
        }
        .toggle input[type="checkbox"]::after {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: transform 0.2s;
        }
        .toggle input[type="checkbox"]:checked {
            background: #0d9488;
        }
        .toggle input[type="checkbox"]:checked::after {
            transform: translateX(18px);
        }
        .toggle label {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
        }
        .device-fields {
            display: none;
        }
        .device-fields.visible {
            display: block;
        }
        .field {
            margin-bottom: 12px;
        }
        .field label {
            display: block;
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        .field input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 14px;
        }
        .field input:focus {
            outline: none;
            border-color: #0d9488;
        }
        .btn {
            width: 100%;
            padding: 14px;
            background: #0d9488;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 16px;
            transition: background 0.2s;
        }
        .btn:hover { background: #0f766e; }
        .btn:disabled { background: #9ca3af; cursor: not-allowed; }
        .btn-skip {
            width: 100%;
            padding: 12px;
            background: transparent;
            color: #6b7280;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 8px;
        }
        .btn-skip:hover { background: #f9fafb; }
        .message {
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 12px;
            display: none;
        }
        .message.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; display: block; }
        .message.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Configurazione Dispositivi</h1>
            <p>Seleziona e configura i dispositivi medici collegati a questo computer</p>
        </div>

        ${configBanner}

        <div class="device-card">
            <div class="device-header">
                <div class="device-icon ecg">&#9829;</div>
                <div>
                    <h3>Edan ECG</h3>
                    <p>Elettrocardiografo - Edan SE-1515</p>
                </div>
            </div>
            <div class="toggle">
                <input type="checkbox" id="edanEnabled" onchange="toggleDevice('edan')" ${edanChecked}>
                <label for="edanEnabled">Installato su questo PC</label>
            </div>
            <div class="device-fields${edanVisible}" id="edanFields">
                <div class="field">
                    <label>Percorso software Edan</label>
                    <input type="text" id="edanExe" value="${edanExeVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Input</label>
                    <input type="text" id="edanInput" value="${edanInputVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Output</label>
                    <input type="text" id="edanOutput" value="${edanOutputVal}" oninput="onGdtOutputChange('edan')">
                </div>
                <div class="field">
                    <label>Cartella PDF Referti <span style="color:#9ca3af;font-weight:400">(se diversa da GDT Output)</span></label>
                    <input type="text" id="edanPdfOutput" value="${edanPdfVal}" placeholder="Uguale a GDT Output se non specificato" oninput="onPdfOutputCustomized('edan')" data-customized="${edanPdfCustomized}">
                </div>
            </div>
        </div>

        <div class="device-card">
            <div class="device-header">
                <div class="device-icon spiro">&#127744;</div>
                <div>
                    <h3>MIR Spirometro</h3>
                    <p>Spirometro - MIR MiniSpir / WinspiroPRO</p>
                </div>
            </div>
            <div class="toggle">
                <input type="checkbox" id="mirEnabled" onchange="toggleDevice('mir')" ${mirChecked}>
                <label for="mirEnabled">Installato su questo PC</label>
            </div>
            <div class="device-fields${mirVisible}" id="mirFields">
                <div class="field">
                    <label>Percorso WinspiroPRO</label>
                    <input type="text" id="mirExe" value="${mirExeVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Input</label>
                    <input type="text" id="mirInput" value="${mirInputVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Output</label>
                    <input type="text" id="mirOutput" value="${mirOutputVal}" oninput="onGdtOutputChange('mir')">
                </div>
                <div class="field">
                    <label>Cartella PDF Referti <span style="color:#9ca3af;font-weight:400">(se diversa da GDT Output)</span></label>
                    <input type="text" id="mirPdfOutput" value="${mirPdfVal}" placeholder="Uguale a GDT Output se non specificato" oninput="onPdfOutputCustomized('mir')" data-customized="${mirPdfCustomized}">
                </div>
            </div>
        </div>

        <div class="device-card">
            <div class="device-header">
                <div class="device-icon audio">&#128266;</div>
                <div>
                    <h3>Oscilla Audiometro</h3>
                    <p>Audiometro - Oscilla TSA / AudioConsole</p>
                </div>
            </div>
            <div class="toggle">
                <input type="checkbox" id="oscillaEnabled" onchange="toggleDevice('oscilla')" ${oscillaChecked}>
                <label for="oscillaEnabled">Installato su questo PC</label>
            </div>
            <div class="device-fields${oscillaVisible}" id="oscillaFields">
                <div class="field">
                    <label>Percorso AudioConsole</label>
                    <input type="text" id="oscillaExe" value="${oscillaExeVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Input</label>
                    <input type="text" id="oscillaInput" value="${oscillaInputVal}">
                </div>
                <div class="field">
                    <label>Cartella GDT Output</label>
                    <input type="text" id="oscillaOutput" value="${oscillaOutputVal}" oninput="onGdtOutputChange('oscilla')">
                </div>
                <div class="field">
                    <label>Cartella PDF Referti <span style="color:#9ca3af;font-weight:400">(se diversa da GDT Output)</span></label>
                    <input type="text" id="oscillaPdfOutput" value="${oscillaPdfVal}" placeholder="Uguale a GDT Output se non specificato" oninput="onPdfOutputCustomized('oscilla')" data-customized="${oscillaPdfCustomized}">
                </div>
            </div>
        </div>

        <button class="btn" id="saveBtn" onclick="saveDevices()">Salva e Avvia Bridge</button>
        <button class="btn-skip" onclick="skipDevices()">Configura dopo (avvia senza dispositivi)</button>
        <div class="message" id="message"></div>
    </div>

    <script>
        function toggleDevice(name) {
            const checked = document.getElementById(name + 'Enabled').checked;
            const fields = document.getElementById(name + 'Fields');
            fields.classList.toggle('visible', checked);
        }

        // When GDT Output changes, auto-sync PDF Output unless user already customized it
        function onGdtOutputChange(name) {
            const pdfEl = document.getElementById(name + 'PdfOutput');
            if (pdfEl.dataset.customized !== 'true') {
                pdfEl.value = document.getElementById(name + 'Output').value;
            }
        }

        // Mark PDF Output as manually customized so auto-sync stops
        function onPdfOutputCustomized(name) {
            const pdfEl = document.getElementById(name + 'PdfOutput');
            const gdtVal = document.getElementById(name + 'Output').value;
            pdfEl.dataset.customized = (pdfEl.value !== gdtVal) ? 'true' : 'false';
        }

        function collectDevices() {
            const devices = [];
            if (document.getElementById('edanEnabled').checked) {
                devices.push({
                    type: 'edan-ecg',
                    enabled: true,
                    gdtId: 'EDAN_ECG',
                    gdtInputDir: document.getElementById('edanInput').value,
                    gdtOutputDir: document.getElementById('edanOutput').value,
                    pdfOutputDir: document.getElementById('edanPdfOutput').value || document.getElementById('edanOutput').value,
                    executable: document.getElementById('edanExe').value,
                    examType: 'ecg',
                    displayName: 'Edan ECG',
                });
            }
            if (document.getElementById('mirEnabled').checked) {
                devices.push({
                    type: 'mir-spirometer',
                    enabled: true,
                    gdtId: 'WINSPIRO',
                    gdtInputDir: document.getElementById('mirInput').value,
                    gdtOutputDir: document.getElementById('mirOutput').value,
                    pdfOutputDir: document.getElementById('mirPdfOutput').value || document.getElementById('mirOutput').value,
                    executable: document.getElementById('mirExe').value,
                    examType: 'spirometry',
                    displayName: 'MIR Spirometro',
                });
            }
            if (document.getElementById('oscillaEnabled').checked) {
                devices.push({
                    type: 'oscilla-audiometer',
                    enabled: true,
                    gdtId: 'OSCILLA',
                    gdtInputDir: document.getElementById('oscillaInput').value,
                    gdtOutputDir: document.getElementById('oscillaOutput').value,
                    pdfOutputDir: document.getElementById('oscillaPdfOutput').value || document.getElementById('oscillaOutput').value,
                    executable: document.getElementById('oscillaExe').value,
                    examType: 'audiometry',
                    displayName: 'Oscilla Audiometro',
                });
            }
            return devices;
        }

        async function postSaveDevices(devices) {
            const res = await fetch('/api/save-devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ devices }),
            });

            let data = null;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            return { ok: res.ok, status: res.status, data };
        }

        async function saveDevicesWithRetry(devices) {
            // 5 retries with progressive backoff — covers bridge restart window
            // Delays: 1s, 2s, 3s, 4s → total up to ~10s wait
            const maxAttempts = 5;
            const delayMs = [1000, 2000, 3000, 4000];
            let lastError = 'Errore nel salvataggio della configurazione';
            const msg = document.getElementById('message');

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const result = await postSaveDevices(devices);
                    if (result.ok && result.data && result.data.success) {
                        return result.data;
                    }

                    lastError = (result.data && result.data.error)
                        ? result.data.error
                        : 'Errore HTTP ' + result.status;
                } catch {
                    lastError = 'Bridge non raggiungibile.';
                    if (attempt < maxAttempts && msg) {
                        msg.className = 'message error';
                        msg.textContent = 'Bridge in riavvio, attendi... (tentativo ' + attempt + '/' + maxAttempts + ')';
                    }
                }

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs[attempt - 1] || 2000));
                }
            }

            throw new Error(lastError + ' Assicurarsi che il Bridge sia in esecuzione e riprovare.');
        }

        async function saveDevices() {
            const btn = document.getElementById('saveBtn');
            const msg = document.getElementById('message');
            btn.disabled = true;
            btn.textContent = 'Salvataggio...';
            msg.className = 'message';

            try {
                const data = await saveDevicesWithRetry(collectDevices());

                if (data.success) {
                    msg.className = 'message success';
                    msg.textContent = 'Configurazione salvata! Il Bridge si sta riavviando...';
                    setTimeout(() => {
                        window.location.href = '/setup/complete';
                    }, 2000);
                } else {
                    msg.className = 'message error';
                    msg.textContent = data.error;
                    btn.disabled = false;
                    btn.textContent = 'Salva e Avvia Bridge';
                }
            } catch (err) {
                msg.className = 'message error';
                msg.textContent = err && err.message ? err.message : 'Errore nel salvataggio';
                btn.disabled = false;
                btn.textContent = 'Salva e Avvia Bridge';
            }
        }

        async function skipDevices() {
            const msg = document.getElementById('message');
            try {
                const data = await saveDevicesWithRetry([]);
                if (data.success) {
                    msg.className = 'message success';
                    msg.textContent = 'Bridge in avvio senza dispositivi...';
                    setTimeout(() => {
                        window.location.href = '/setup/complete';
                    }, 2000);
                }
            } catch {
                window.location.href = '/setup/complete';
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Activation complete page
 */
export function activationCompleteHtml(): string {
    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ElementMedica Bridge - Pronto</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            text-align: center;
        }
        .check {
            width: 64px;
            height: 64px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
            color: white;
        }
        h1 { font-size: 22px; color: #1f2937; margin-bottom: 8px; }
        p { color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .info {
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            border-radius: 8px;
            padding: 16px;
            text-align: left;
            font-size: 14px;
            color: #0f766e;
        }
        .info strong { display: block; margin-bottom: 4px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="check">&#10003;</div>
        <h1>Bridge Attivato e Pronto</h1>
        <p>
            Il Medical Device Bridge e' stato configurato correttamente.
            Puoi chiudere questa finestra. Il Bridge funzionera' in background.
        </p>
        <div class="info">
            <strong>Prossimi passi:</strong>
            Apri la webapp ElementMedica, vai su Impostazioni &rarr; Medical Device Bridge &rarr;
            Diagnostica per verificare che tutto funzioni.
        </div>
    </div>
</body>
</html>`;
}
