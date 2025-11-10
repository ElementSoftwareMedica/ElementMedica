// ========================================
// SCRIPT VERIFICA TOKEN - VERSIONE CORRETTA
// ========================================
// Il sistema usa 'authToken' non 'access_token'!
// ========================================

console.clear();
console.log('%c🔍 VERIFICA TOKEN (CHIAVE CORRETTA)', 'font-size: 20px; font-weight: bold; color: #569cd6;');
console.log('');

// Cerca tutte le varianti di token
const authToken = localStorage.getItem('authToken');  // ✅ CHIAVE CORRETTA
const accessToken = localStorage.getItem('access_token');  // ❌ Chiave vecchia
const token = localStorage.getItem('token');  // ❌ Chiave legacy

const actualToken = authToken || accessToken || token;

console.log('📦 Storage Keys:');
console.log('  authToken:', authToken ? '✅ Presente' : '❌ Assente');
console.log('  access_token:', accessToken ? '⚠️  Presente (chiave vecchia)' : '✅ Assente');
console.log('  token:', token ? '⚠️  Presente (chiave legacy)' : '✅ Assente');
console.log('');

if (!actualToken) {
    console.log('%c❌ NESSUN TOKEN TROVATO IN NESSUNA CHIAVE', 'color: #f48771; font-weight: bold;');
    console.log('%c👉 Verifica che il login sia andato a buon fine', 'color: #dcdcaa;');
    console.log('%c   Controlla la Console durante il login per errori', 'color: #dcdcaa;');
} else {
    console.log('%c✅ Token trovato in:', authToken ? 'authToken (corretto)' : (accessToken ? 'access_token (vecchio)' : 'token (legacy)'), 'color: #4ec9b0; font-weight: bold;');
    console.log('Token:', actualToken.substring(0, 50) + '...');
    console.log('');
    
    // Decodifica JWT
    try {
        const payload = JSON.parse(atob(actualToken.split('.')[1]));
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

// Verifica permessi
const permsString = localStorage.getItem('permissions');
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
    } else {
        console.log('%c✅ PERMESSI OK (' + templateKeys.length + ' permessi)', 'color: #4ec9b0; font-weight: bold;');
        console.log('');
        console.log('%cLista completa:', 'color: #9cdcfe;');
        templateKeys.forEach(k => console.log('  ✓', k));
    }
    console.log('');
} else {
    console.log('%c❌ NESSUN PERMESSO IN localStorage', 'color: #f48771; font-weight: bold;');
    console.log('');
}

// Test API
if (actualToken) {
    console.log('%c🌐 TEST API CALL', 'font-weight: bold; font-size: 16px;');
    console.log('');
    
    console.log('%c📡 Test: GET /api/v1/google/status', 'color: #9cdcfe;');
    fetch('/api/v1/google/status', {
        headers: {
            'Authorization': 'Bearer ' + actualToken
        }
    })
    .then(r => {
        console.log('Status:', r.status, r.statusText);
        if (r.ok) {
            return r.json().then(data => {
                console.log('%c✅ Risposta OK', 'color: #4ec9b0;');
                console.log('Connected:', data.data.connected);
                console.log('');
                console.log('%c✅✅✅ TUTTO FUNZIONA!', 'color: #4ec9b0; font-size: 18px; font-weight: bold;');
                console.log('%cSe vedi ancora 401, ricarica la pagina (Cmd+R)', 'color: #dcdcaa;');
            });
        } else {
            return r.text().then(text => {
                console.log('%c❌ Errore ' + r.status, 'color: #f48771; font-weight: bold;');
                console.log('Risposta:', text.substring(0, 200));
                console.log('');
                console.log('%c⚠️  Il backend rifiuta il token', 'color: #dcdcaa;');
                console.log('%c👉 Verifica che rbac.js sia aggiornato', 'color: #dcdcaa;');
            });
        }
    })
    .catch(err => {
        console.log('%c❌ Errore chiamata:', 'color: #f48771;', err.message);
    });
}
