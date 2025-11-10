# Script Forzatura Logout Completo

**Data**: 6 novembre 2025  
**Problema**: Token vecchio nel browser non viene aggiornato  
**Soluzione**: Invalidazione refresh token + clear storage forzato  

---

## ✅ AZIONE BACKEND COMPLETATA

```sql
-- Eseguito sul database dev_db:
DELETE FROM refresh_tokens WHERE "personId" IN (
  SELECT id FROM persons WHERE email = 'admin@example.com'
);
-- Risultato: 32 refresh token eliminati
```

**Effetto**: Il browser NON può più usare il vecchio refresh token per rigenerare access token vecchi.

---

## 🔴 AZIONE UTENTE RICHIESTA

### Step 1: Apri Browser Console

```
1. Vai su http://localhost:5173 (pagina corrente va bene)
2. Premi F12 (o Cmd+Option+I su Mac)
3. Click su tab "Console"
```

### Step 2: Esegui Script di Pulizia

**Copia e incolla questo script nella Console, poi premi INVIO**:

```javascript
// ========================================
// SCRIPT FORZATURA LOGOUT COMPLETO
// ========================================

console.log('🧹 Inizio pulizia forzata...');

// 1. Salva le chiavi prima di eliminare (per debug)
const oldKeys = Object.keys(localStorage);
console.log('📦 Keys in localStorage prima:', oldKeys);

// 2. Clear localStorage
localStorage.clear();
console.log('✅ localStorage.clear() eseguito');

// 3. Clear sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage.clear() eseguito');

// 4. Delete cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cookies eliminati');

// 5. Verifica pulizia
const remainingKeys = Object.keys(localStorage);
console.log('📦 Keys in localStorage dopo:', remainingKeys);

if (remainingKeys.length === 0) {
  console.log('✅✅✅ PULIZIA COMPLETATA CON SUCCESSO ✅✅✅');
  console.log('');
  console.log('🔄 Sto ricaricando la pagina...');
  
  // 6. Ricarica la pagina dopo 2 secondi
  setTimeout(() => {
    location.reload(true); // Hard reload
  }, 2000);
  
} else {
  console.error('❌ Pulizia non riuscita, keys rimanenti:', remainingKeys);
  console.log('🔄 Prova a chiudere e riaprire il browser completamente');
}
```

### Step 3: Aspetta il Reload

La pagina si ricaricherà automaticamente dopo 2 secondi.

### Step 4: Re-Login

```
1. Dovresti vedere la pagina di login
2. Inserisci:
   - Email: admin@example.com
   - Password: Admin123!
3. Click "Login"
```

### Step 5: Vai a Templates

```
1. Dopo login, vai a: http://localhost:5173/settings/templates
2. Apri Console (F12)
3. Verifica che NON ci siano errori 401
```

---

## 🧪 Script di Verifica (Dopo Re-Login)

**Esegui questo nella Console per verificare che il nuovo token sia corretto**:

```javascript
// ========================================
// VERIFICA TOKEN AGGIORNATO
// ========================================

console.log('🔍 Verifico token e permessi...');

// 1. Leggi token
const token = localStorage.getItem('access_token');
if (!token) {
  console.error('❌ Nessun token trovato - fai login!');
} else {
  console.log('✅ Token presente:', token.substring(0, 30) + '...');
  
  // 2. Decodifica JWT
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const issued = new Date(payload.iat * 1000);
    const expires = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('📅 Token emesso:', issued.toLocaleString('it-IT'));
    console.log('⏰ Token scade:', expires.toLocaleString('it-IT'));
    console.log('⏱️  Valido ancora per:', Math.round((expires - now) / 1000 / 60), 'minuti');
    
    // 3. Verifica se è stato emesso DOPO la pulizia (negli ultimi 5 minuti)
    const minutesAgo = (now - issued) / 1000 / 60;
    if (minutesAgo < 5) {
      console.log('✅ Token FRESCO (emesso', Math.round(minutesAgo), 'minuti fa)');
    } else {
      console.warn('⚠️  Token vecchio (emesso', Math.round(minutesAgo), 'minuti fa)');
      console.log('   → Fai logout e re-login di nuovo');
    }
    
  } catch (e) {
    console.error('❌ Errore decodifica token:', e);
  }
  
  // 4. Leggi permessi da localStorage
  const permsString = localStorage.getItem('permissions');
  if (!permsString) {
    console.warn('⚠️  Nessun permesso in localStorage');
  } else {
    const perms = JSON.parse(permsString);
    const allKeys = Object.keys(perms);
    const templateKeys = allKeys.filter(k => 
      k.includes('TEMPLATE') || k.includes('template') || k.includes('google')
    );
    
    console.log('🔑 Permessi totali:', allKeys.length);
    console.log('🎯 Permessi template/google:', templateKeys.length);
    
    if (templateKeys.length >= 20) {
      console.log('✅✅✅ TOKEN AGGIORNATO CON TUTTI I PERMESSI ✅✅✅');
      console.log('');
      console.log('Lista permessi template/google:');
      templateKeys.forEach(k => console.log('  -', k));
    } else {
      console.error('❌ Token NON aggiornato - solo', templateKeys.length, 'permessi');
      console.log('   → Fai logout, clear storage, e re-login');
    }
  }
}

// 5. Test chiamata API
console.log('');
console.log('🌐 Test chiamata API /auth/me...');
fetch('/api/v1/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(r => r.json())
.then(data => {
  const templatePerms = Object.keys(data.permissions || {}).filter(k =>
    k.includes('TEMPLATE') || k.includes('template') || k.includes('google')
  );
  console.log('🎯 Permessi template/google dal backend:', templatePerms.length);
  if (templatePerms.length >= 20) {
    console.log('✅ Backend restituisce permessi corretti!');
  } else {
    console.error('❌ Backend NON restituisce tutti i permessi');
  }
})
.catch(err => {
  console.error('❌ Errore chiamata API:', err.message);
});
```

---

## 📊 Risultati Attesi

### Dopo Script di Pulizia
```
🧹 Inizio pulizia forzata...
📦 Keys in localStorage prima: ["access_token", "refresh_token", "user", "permissions", ...]
✅ localStorage.clear() eseguito
✅ sessionStorage.clear() eseguito
✅ Cookies eliminati
📦 Keys in localStorage dopo: []
✅✅✅ PULIZIA COMPLETATA CON SUCCESSO ✅✅✅
🔄 Sto ricaricando la pagina...
```

### Dopo Re-Login e Script di Verifica
```
🔍 Verifico token e permessi...
✅ Token presente: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...
📅 Token emesso: 06/11/2025, 22:45:30
⏰ Token scade: 07/11/2025, 22:45:30
⏱️  Valido ancora per: 1439 minuti
✅ Token FRESCO (emesso 0 minuti fa)
🔑 Permessi totali: 145
🎯 Permessi template/google: 25
✅✅✅ TOKEN AGGIORNATO CON TUTTI I PERMESSI ✅✅✅

Lista permessi template/google:
  - VIEW_TEMPLATES
  - CREATE_TEMPLATES
  - EDIT_TEMPLATES
  - DELETE_TEMPLATES
  - MANAGE_TEMPLATES
  - templates:read
  - templates:create
  - templates:edit
  - templates:update
  - templates:delete
  - templates:manage
  - templates:duplicate
  - templates:view_versions
  - templates:restore_version
  - google:connect
  - google:import
  - google:manage
  ... (25 totali)

🌐 Test chiamata API /auth/me...
🎯 Permessi template/google dal backend: 25
✅ Backend restituisce permessi corretti!
```

---

## ❌ Cosa Fare Se Ancora Non Funziona

### Se vedi ancora 401 dopo logout/re-login:

**1. Verifica che i server siano attivi**:
```bash
# Nel terminale
curl http://localhost:4001/health
curl http://localhost:4003/health
curl http://localhost:5173
```

**2. Restart completo del backend**:
```bash
# Nel terminale
cd /Users/matteo.michielon/project\ 2.0\ VS/backend
lsof -ti:4001 | xargs kill -9
lsof -ti:4003 | xargs kill -9
NODE_ENV=development node servers/api-server.js &
NODE_ENV=development node servers/proxy-server.js &
```

**3. Verifica permessi nel database**:
```bash
# Nel terminale
PGPASSWORD=postgres psql -h localhost -U postgres -d dev_db << 'EOF'
SELECT pr.type, p.name 
FROM person_roles pr 
JOIN persons pers ON pr."personId" = pers.id
JOIN permissions p ON pr."permissionId" = p.id
WHERE pers.email = 'admin@example.com'
AND p.name LIKE '%template%' OR p.name LIKE '%google%';
EOF
```

**4. Chiudi COMPLETAMENTE il browser**:
```
- Mac: Cmd+Q (NON solo chiudere tab)
- Riapri browser
- Vai a http://localhost:5173
- Re-login
```

---

## 📝 Checklist Finale

- [ ] Script pulizia eseguito con successo
- [ ] Pagina ricaricata automaticamente
- [ ] Login fatto con admin@example.com / Admin123!
- [ ] Script verifica mostra 25 permessi template/google
- [ ] Console non mostra errori 401
- [ ] Network tab mostra:
  - ✅ GET /api/v1/templates → 200 OK
  - ✅ GET /api/v1/google/status → 200 OK
- [ ] GoogleIntegrationPanel visibile sulla pagina
- [ ] Menu template mostra "Duplica" e "Storico Versioni"

---

## 🔧 Debugging Avanzato

### Se il token continua a essere vecchio:

**Controlla il codice di AuthContext**:
```bash
# Verifica se AuthContext carica permessi da /auth/verify o /auth/me
grep -n "auth/verify\|auth/me" src/context/AuthContext.tsx
```

**Verifica interceptor axios**:
```bash
# Controlla se c'è un interceptor che aggiunge automaticamente il token
grep -n "interceptors.request" src/services/api.ts
```

**Clear cache del browser Chrome**:
```
1. Apri Chrome
2. Cmd+Shift+Delete (Mac) o Ctrl+Shift+Delete (Windows)
3. Seleziona "Tutto" come intervallo di tempo
4. Spunta: Cookies, Cache, Storage
5. Click "Cancella dati"
6. Riavvia Chrome
```

---

**Status**: 🔴 AZIONE UTENTE RICHIESTA  
**Backend**: ✅ Refresh token invalidati (32 eliminati)  
**Prossimo Step**: Esegui script di pulizia nel browser → Re-login
