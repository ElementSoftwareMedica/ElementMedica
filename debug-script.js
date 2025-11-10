// ========================================
// SCRIPT DEBUG TOKEN - COPIA NELLA CONSOLE
// ========================================
// Apri http://localhost:5173
// Premi F12 → Console tab
// Copia TUTTO questo script e premi INVIO
// ========================================

console.clear();
console.log('%c🔍 DEBUG TOKEN E PERMESSI', 'font-size: 20px; font-weight: bold; color: #569cd6;');
console.log('');

// 1. VERIFICA TOKEN
const token = localStorage.getItem('access_token');
const refreshToken = localStorage.getItem('refresh_token');
const permsString = localStorage.getItem('permissions');
const userString = localStorage.getItem('user');

if (!token) {
    console.log('%c❌ NESSUN TOKEN TROVATO', 'color: #f48771; font-weight: bold;');
    console.log('%c👉 Fai logout e re-login', 'color: #dcdcaa;');
} else {
    console.log('%c✅ Token trovato', 'color: #4ec9b0; font-weight: bold;');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('');
    
    // Decodifica JWT
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const issued = new Date(payload.iat * 1000);
        const expires = new Date(payload.exp * 1000);
        const now = new Date();
        const minutesAgo = Math.round((now - issued) / 1000 / 60);
        const minutesLeft = Math.round((expires - now) / 1000 / 60);
        
        console.log('%c📅 TOKEN INFO', 'font-weight: bold;');
        console.log('Emesso:', issued.toLocaleString('it-IT'));
        console.log('Scade:', expires.toLocaleString('it-IT'));
        console.log('Età:', minutesAgo, 'minuti fa');
        console.log('Valido ancora:', minutesLeft, 'minuti');
        console.log('');
        
        if (minutesLeft < 0) {
            console.log('%c❌ TOKEN SCADUTO!', 'color: #f48771; font-weight: bold;');
        } else if (minutesAgo < 10) {
            console.log('%c✅ Token fresco (' + minutesAgo + ' minuti)', 'color: #4ec9b0; font-weight: bold;');
        } else {
            console.log('%c⚠️  Token vecchio (' + minutesAgo + ' minuti)', 'color: #dcdcaa; font-weight: bold;');
        }
        console.log('');
        
    } catch (e) {
        console.log('%c❌ Errore decodifica JWT:', 'color: #f48771;', e.message);
        console.log('');
    }
}

// 2. VERIFICA USER
if (userString) {
    const user = JSON.parse(userString);
    console.log('%c👤 USER INFO', 'font-weight: bold;');
    console.log('Email:', user.email);
    console.log('ID:', user.id);
    console.log('Roles:', (user.roles || []).join(', '));
    console.log('');
} else {
    console.log('%c⚠️  Nessun user in localStorage', 'color: #dcdcaa;');
    console.log('');
}

// 3. VERIFICA PERMESSI
if (permsString) {
    const perms = JSON.parse(permsString);
    const allKeys = Object.keys(perms);
    const templateKeys = allKeys.filter(k => 
        k.includes('TEMPLATE') || k.includes('template') || k.includes('google')
    );
    
    console.log('%c🔑 PERMESSI', 'font-weight: bold;');
    console.log('Totali:', allKeys.length);
    console.log('Template/Google:', templateKeys.length);
    console.log('');
    
    if (templateKeys.length < 20) {
        console.log('%c❌ PERMESSI INSUFFICIENTI!', 'color: #f48771; font-weight: bold;');
        console.log('%cTrovati solo ' + templateKeys.length + ' permessi invece di 25+', 'color: #f48771;');
        console.log('');
        console.log('%cPermessi trovati:', 'color: #dcdcaa;');
        templateKeys.forEach(k => console.log('  -', k));
        console.log('');
        console.log('%c👉 SOLUZIONE: Fai logout → Clear storage → Re-login', 'color: #dcdcaa; font-weight: bold;');
    } else {
        console.log('%c✅ PERMESSI OK (' + templateKeys.length + ' permessi)', 'color: #4ec9b0; font-weight: bold;');
        console.log('');
        console.log('%cLista completa:', 'color: #9cdcfe;');
        templateKeys.forEach(k => console.log('  ✓', k));
    }
    console.log('');
} else {
    console.log('%c❌ NESSUN PERMESSO IN localStorage', 'color: #f48771; font-weight: bold;');
    console.log('%c👉 Fai logout e re-login', 'color: #dcdcaa;');
    console.log('');
}

// 4. TEST API CALLS
console.log('%c🌐 TEST API CALLS', 'font-weight: bold; font-size: 16px;');
console.log('');

if (!token) {
    console.log('%c⚠️  Saltato - nessun token disponibile', 'color: #dcdcaa;');
} else {
    // Test 1: /auth/me
    console.log('%c📡 Test 1: GET /api/v1/auth/me', 'color: #9cdcfe;');
    fetch('/api/v1/auth/me', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(r => {
        console.log('Status:', r.status, r.statusText);
        if (r.ok) {
            return r.json().then(data => {
                const templatePerms = Object.keys(data.permissions || {}).filter(k =>
                    k.includes('TEMPLATE') || k.includes('template') || k.includes('google')
                ).length;
                console.log('%c✅ Risposta OK', 'color: #4ec9b0;');
                console.log('Email:', data.email);
                console.log('Permessi template dal backend:', templatePerms);
                if (templatePerms >= 20) {
                    console.log('%c✅ Backend restituisce tutti i permessi!', 'color: #4ec9b0; font-weight: bold;');
                } else {
                    console.log('%c❌ Backend NON restituisce tutti i permessi', 'color: #f48771; font-weight: bold;');
                }
            });
        } else {
            return r.text().then(text => {
                console.log('%c❌ Errore ' + r.status, 'color: #f48771; font-weight: bold;');
                console.log('Risposta:', text.substring(0, 200));
            });
        }
    })
    .catch(err => {
        console.log('%c❌ Errore chiamata:', 'color: #f48771;', err.message);
    })
    .finally(() => console.log(''));

    // Test 2: /google/status
    setTimeout(() => {
        console.log('%c📡 Test 2: GET /api/v1/google/status', 'color: #9cdcfe;');
        fetch('/api/v1/google/status', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(r => {
            console.log('Status:', r.status, r.statusText);
            if (r.ok) {
                return r.json().then(data => {
                    console.log('%c✅ Risposta OK', 'color: #4ec9b0;');
                    console.log('Connected:', data.data.connected);
                });
            } else {
                return r.text().then(text => {
                    console.log('%c❌ Errore ' + r.status, 'color: #f48771; font-weight: bold;');
                    console.log('Risposta:', text.substring(0, 200));
                });
            }
        })
        .catch(err => {
            console.log('%c❌ Errore chiamata:', 'color: #f48771;', err.message);
        })
        .finally(() => console.log(''));
    }, 1000);

    // Test 3: /templates
    setTimeout(() => {
        console.log('%c📡 Test 3: GET /api/v1/templates', 'color: #9cdcfe;');
        fetch('/api/v1/templates', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(r => {
            console.log('Status:', r.status, r.statusText);
            if (r.ok) {
                return r.json().then(data => {
                    console.log('%c✅ Risposta OK', 'color: #4ec9b0;');
                    console.log('Templates count:', (data.data || []).length);
                });
            } else {
                return r.text().then(text => {
                    console.log('%c❌ Errore ' + r.status, 'color: #f48771; font-weight: bold;');
                    console.log('Risposta:', text.substring(0, 200));
                });
            }
        })
        .catch(err => {
            console.log('%c❌ Errore chiamata:', 'color: #f48771;', err.message);
        })
        .finally(() => {
            console.log('');
            console.log('%c' + '='.repeat(60), 'color: #3e3e42;');
            console.log('%c📋 RIEPILOGO', 'font-size: 18px; font-weight: bold; color: #569cd6;');
            console.log('');
        });
    }, 2000);

    // Riepilogo finale
    setTimeout(() => {
        const perms = permsString ? JSON.parse(permsString) : {};
        const templatePerms = Object.keys(perms).filter(k => 
            k.includes('TEMPLATE') || k.includes('template') || k.includes('google')
        ).length;

        if (templatePerms >= 20) {
            console.log('%c✅ TOKEN OK - HAI TUTTI I PERMESSI!', 'color: #4ec9b0; font-size: 16px; font-weight: bold;');
            console.log('');
            console.log('%c👉 Se vedi ancora 401, il problema è nel backend middleware', 'color: #dcdcaa;');
            console.log('%c   Dimmi e verificherò rbac.js e le route', 'color: #dcdcaa;');
        } else {
            console.log('%c❌ TOKEN VECCHIO - PERMESSI MANCANTI', 'color: #f48771; font-size: 16px; font-weight: bold;');
            console.log('');
            console.log('%c👉 SOLUZIONE:', 'color: #dcdcaa; font-weight: bold;');
            console.log('%c   1. Esegui: localStorage.clear(); sessionStorage.clear();', 'color: #9cdcfe;');
            console.log('%c   2. Ricarica pagina (Cmd+R)', 'color: #9cdcfe;');
            console.log('%c   3. Fai re-login', 'color: #9cdcfe;');
        }
        console.log('');
    }, 3000);
}
