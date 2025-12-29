# Script Console Browser: Diagnostica Permessi Template

## ISTRUZIONI

1. Apri il browser su `http://localhost:5173`
2. Premi `F12` per aprire DevTools
3. Vai sulla tab **"Console"**
4. Copia e incolla lo script qui sotto
5. Premi `Enter`

---

## SCRIPT DIAGNOSTICO

```javascript
// ==========================================
// SCRIPT DIAGNOSTICO PERMESSI TEMPLATE
// Copia questo script nella Console Browser
// ==========================================

console.clear();
console.log('🔍 ========================================');
console.log('🔍 DIAGNOSTICA PERMESSI TEMPLATE');
console.log('🔍 ========================================\n');

// 1. Verifica Token
console.log('📋 1. VERIFICA TOKEN:');
const tokenKeys = ['accessToken', 'access_token', 'token', 'authToken'];
let foundToken = null;
let tokenKey = null;

for (const key of tokenKeys) {
  const value = localStorage.getItem(key);
  if (value) {
    foundToken = value;
    tokenKey = key;
    break;
  }
}

if (foundToken) {
  console.log(`✅ Token trovato in localStorage['${tokenKey}']`);
  console.log(`📝 Token (primi 50 caratteri): ${foundToken.substring(0, 50)}...`);
  console.log(`📏 Token length: ${foundToken.length} caratteri`);
  
  // Decode JWT (parte payload)
  try {
    const payload = JSON.parse(atob(foundToken.split('.')[1]));
    console.log('🔓 Token Payload:', {
      personId: payload.personId || payload.id || 'N/A',
      email: payload.email || 'N/A',
      exp: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A',
      expired: payload.exp ? (Date.now() / 1000 > payload.exp) : false
    });
  } catch (e) {
    console.warn('⚠️ Impossibile decodificare payload JWT:', e.message);
  }
} else {
  console.log('❌ NESSUN TOKEN TROVATO in localStorage');
  console.log('💡 Devi fare login!');
}

// 2. Verifica Permessi in LocalStorage
console.log('\n📋 2. VERIFICA PERMESSI IN LOCALSTORAGE:');
const permKeys = ['permissions', 'userPermissions', 'auth'];
let foundPerms = null;
let permsKey = null;

for (const key of permKeys) {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        foundPerms = parsed;
        permsKey = key;
        break;
      }
    } catch (e) {
      // Ignora errori parsing
    }
  }
}

if (foundPerms) {
  console.log(`✅ Permessi trovati in localStorage['${permsKey}']`);
  
  // Cerca permessi template
  const allKeys = Object.keys(foundPerms);
  const templateKeys = allKeys.filter(k => 
    k.toLowerCase().includes('template') || 
    k.toUpperCase().includes('TEMPLATE')
  );
  
  console.log(`📊 Totale permessi: ${allKeys.length}`);
  console.log(`🎯 Permessi template trovati: ${templateKeys.length}`);
  
  if (templateKeys.length > 0) {
    console.log('✅ Permessi template PRESENTI:');
    templateKeys.slice(0, 10).forEach(key => {
      console.log(`  - ${key}: ${foundPerms[key]}`);
    });
    if (templateKeys.length > 10) {
      console.log(`  ... e altri ${templateKeys.length - 10} permessi`);
    }
  } else {
    console.log('❌ NESSUN PERMESSO TEMPLATE TROVATO!');
    console.log('💡 Devi fare LOGOUT e RE-LOGIN per ricaricare i permessi aggiornati');
  }
} else {
  console.log('❌ NESSUN PERMESSO trovato in localStorage');
}

// 3. Verifica AuthContext (se accessibile)
console.log('\n📋 3. VERIFICA AUTHCONTEXT (React):');
try {
  // Cerca il nodo React root
  const root = document.getElementById('root');
  if (root && root._reactRootContainer) {
    console.log('✅ React root trovato');
    console.log('⚠️ Non posso accedere direttamente ad AuthContext da console');
    console.log('💡 Usa React DevTools per ispezionare AuthContext');
  } else {
    console.log('⚠️ React root non trovato o struttura diversa');
  }
} catch (e) {
  console.log('⚠️ Errore accesso React internals:', e.message);
}

// 4. Verifica Cookies
console.log('\n📋 4. VERIFICA COOKIES:');
const cookies = document.cookie.split(';');
const authCookies = cookies.filter(c => 
  c.toLowerCase().includes('token') || 
  c.toLowerCase().includes('auth') ||
  c.toLowerCase().includes('session')
);

if (authCookies.length > 0) {
  console.log(`✅ Cookie di autenticazione trovati: ${authCookies.length}`);
  authCookies.forEach(c => {
    const [name] = c.trim().split('=');
    console.log(`  - ${name}`);
  });
} else {
  console.log('ℹ️ Nessun cookie di autenticazione trovato');
}

// 5. Test API Call (se token presente)
console.log('\n📋 5. TEST API CALL (se token presente):');
if (foundToken) {
  console.log('🚀 Eseguo test GET /api/v1/auth/verify...');
  
  fetch('/api/v1/auth/verify', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${foundToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      return response.json().then(data => {
        console.log('✅ AUTH/VERIFY SUCCESS!');
        console.log('📧 Email:', data.user?.email || 'N/A');
        console.log('👤 Ruoli:', data.user?.roles || []);
        
        if (data.permissions) {
          const templatePerms = Object.keys(data.permissions).filter(k => 
            k.includes('template') || k.includes('TEMPLATE')
          );
          console.log(`🎯 Permessi template nel response: ${templatePerms.length}`);
          
          if (templatePerms.length > 0) {
            console.log('✅ Backend restituisce permessi template!');
            console.log('   Esempi:', templatePerms.slice(0, 5));
          } else {
            console.log('❌ Backend NON restituisce permessi template!');
            console.log('💡 Problema nel backend - controlla rbac.js e user-info.js');
          }
        }
      });
    } else if (response.status === 401) {
      console.log('❌ AUTH/VERIFY FAILED - 401 Unauthorized');
      console.log('💡 Token invalido o scaduto - devi fare RE-LOGIN');
      return response.text().then(text => {
        console.log('📄 Response body:', text.substring(0, 200));
      });
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
      return response.text().then(text => {
        console.log('📄 Response body:', text.substring(0, 200));
      });
    }
  })
  .catch(error => {
    console.log('❌ ERRORE nella chiamata API:', error.message);
  });
} else {
  console.log('⏭️ Skipped - nessun token disponibile');
}

// 6. Riepilogo e Azioni Consigliate
console.log('\n🎯 ========================================');
console.log('🎯 RIEPILOGO E AZIONI CONSIGLIATE');
console.log('🎯 ========================================\n');

if (!foundToken) {
  console.log('🔴 STATO: NON AUTENTICATO');
  console.log('📋 AZIONE: Fai login con admin@example.com / Admin123!');
} else if (foundPerms && foundPerms.permissions) {
  const templatePerms = Object.keys(foundPerms.permissions || foundPerms).filter(k => 
    k.includes('template') || k.includes('TEMPLATE')
  );
  
  if (templatePerms.length === 0) {
    console.log('🟡 STATO: AUTENTICATO ma PERMESSI TEMPLATE MANCANTI');
    console.log('📋 AZIONE RICHIESTA:');
    console.log('   1. Fai LOGOUT (menu utente in alto a destra)');
    console.log('   2. Svuota Local Storage: Application tab → Local Storage → Clear');
    console.log('   3. Fai LOGIN di nuovo con admin@example.com / Admin123!');
    console.log('   4. Ricarica questa diagnostica per verificare');
  } else {
    console.log('🟢 STATO: AUTENTICATO con PERMESSI TEMPLATE');
    console.log('✅ Dovresti poter accedere a /settings/templates');
    console.log('📋 Se vedi ancora errori 401:');
    console.log('   - Verifica Network tab che le chiamate usino il token corretto');
    console.log('   - Prova hard refresh (Cmd+Shift+R / Ctrl+Shift+R)');
  }
} else {
  console.log('🟡 STATO: AUTENTICATO ma struttura permessi sconosciuta');
  console.log('📋 AZIONE: Fai LOGOUT + RE-LOGIN per ricaricare dati auth');
}

console.log('\n📚 DOCUMENTAZIONE: Vedi GUIDA_URGENTE_LOGOUT_LOGIN.md');
console.log('🎯 ========================================\n');
```

---

## INTERPRETAZIONE RISULTATI

### ✅ TUTTO OK - Output Esempio:
```
✅ Token trovato in localStorage['accessToken']
📊 Totale permessi: 127
🎯 Permessi template trovati: 19
✅ Permessi template PRESENTI:
  - VIEW_TEMPLATES: true
  - CREATE_TEMPLATES: true
  ...
📡 Response status: 200 OK
✅ AUTH/VERIFY SUCCESS!
🟢 STATO: AUTENTICATO con PERMESSI TEMPLATE
```

### ❌ PROBLEMA - Token Vecchio:
```
✅ Token trovato in localStorage['accessToken']
📊 Totale permessi: 108
🎯 Permessi template trovati: 0
❌ NESSUN PERMESSO TEMPLATE TROVATO!
📡 Response status: 401 Unauthorized
🟡 STATO: AUTENTICATO ma PERMESSI TEMPLATE MANCANTI
📋 AZIONE: LOGOUT + RE-LOGIN
```

### ❌ PROBLEMA - Nessun Token:
```
❌ NESSUN TOKEN TROVATO in localStorage
🔴 STATO: NON AUTENTICATO
📋 AZIONE: Fai login con admin@example.com / Admin123!
```

---

## AZIONI IMMEDIATE

Basandoti sull'output dello script:

### Se vedi "PERMESSI TEMPLATE MANCANTI":
1. **Logout**: Click menu utente → Logout
2. **Svuota Storage**: F12 → Application → Local Storage → Clear
3. **Login**: Usa `admin@example.com` / `Admin123!`
4. **Verifica**: Riesegui questo script

### Se vedi "NON AUTENTICATO":
1. **Login diretto**: Vai su login page
2. **Usa credenziali**: `admin@example.com` / `Admin123!`
3. **Verifica**: Riesegui questo script

### Se vedi "Response 401" anche con token:
1. **Backend issue**: Token rifiutato dal backend
2. **Verifica backend**: Controlla che API server sia attivo su porta 4001
3. **Check logs**: Guarda `/tmp/api-server-new.log` per errori

---

## TROUBLESHOOTING RAPIDO

### Errore: "fetch is not defined"
- Stai usando console Node.js invece che browser
- **Soluzione**: Apri browser su localhost:5173, poi F12 → Console

### Errore: "localStorage is not defined"
- Stai usando console Node.js invece che browser
- **Soluzione**: Apri browser su localhost:5173, poi F12 → Console

### Output: "React root non trovato"
- Normale, non è un problema
- Il React internals non è accessibile da console standard

### Nessun output dopo "Test API Call"
- La chiamata è asincrona, attendi 2-3 secondi
- Se non appare nulla, controlla Network tab per vedere la richiesta

---

## PROSSIMI PASSI

Dopo aver eseguito lo script e seguito le azioni consigliate:

1. ✅ Riesegui lo script per confermare fix
2. ✅ Vai su `/settings/templates` e verifica funzionamento
3. ✅ Check Network tab: tutte le chiamate devono essere HTTP 200
4. ✅ Se ancora problemi, copia output script e invia per supporto

---

**NOTA**: Questo script è SOLO diagnostico, non modifica nulla. Puoi eseguirlo tutte le volte che vuoi.
