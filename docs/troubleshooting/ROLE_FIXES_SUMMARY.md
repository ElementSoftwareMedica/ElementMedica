## 🎯 RIEPILOGO COMPLETO DELLE MODIFICHE AI RUOLI

### ✅ PROBLEMA 1 RISOLTO: Pulsanti disabilitati nella visualizzazione ad albero

**Causa del problema:**
- L'endpoint `/api/roles/hierarchy/current-user` restituiva `assignablePermissions: null`
- Il metodo `getAssignablePermissions(highestRole)` restituiva solo i permessi del ruolo stesso, non tutti i permessi assegnabili

**Modifiche implementate:**

1. **Nuovo metodo in `backend/services/roleHierarchyService.js`:**
   ```javascript
   getAllAssignablePermissions(assignerRole) {
     // Restituisce tutti i permessi che un ruolo può assegnare
     // Include permessi del ruolo stesso + permessi dei ruoli subordinati
   }
   ```

2. **Aggiornamento endpoint in `backend/routes/roles.js`:**
   ```javascript
   // Prima: roleHierarchyService.default.getAssignablePermissions(highestRole)
   // Ora: roleHierarchyService.default.getAllAssignablePermissions(highestRole)
   ```

**Risultato:**
- I pulsanti "Crea", "Modifica", "Elimina" nella visualizzazione ad albero sono ora abilitati
- `assignablePermissions` contiene tutti i permessi che l'utente può assegnare

---

### ✅ PROBLEMA 2 RISOLTO: Errore 500 con caratteri speciali nei nomi dei ruoli

**Causa del problema:**
- I caratteri speciali come `&` nei nomi dei ruoli (es. `AMMINISTRATORE_FORMAZIONE_&_LAVORO`) non venivano codificati nell'URL
- Questo causava errori 500 negli endpoint che usavano il nome del ruolo nell'URL

**Modifiche implementate in `src/services/roles.ts`:**

1. **getById():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   const response = await apiGet(`${this.baseUrl}/${encodedRoleType}`);
   ```

2. **getRolePermissions():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   const response = await apiGet(`${this.baseUrl}/${encodedRoleType}/permissions`);
   ```

3. **update():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   const response = await apiPut(`${this.baseUrl}/${encodedRoleType}`, role);
   ```

4. **delete():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   await apiDelete(`${this.baseUrl}/${encodedRoleType}`);
   ```

5. **updateRolePermissions():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   await apiPut(`${this.baseUrl}/${encodedRoleType}/permissions`, permissions);
   ```

6. **getPersonsByRole():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   const response = await apiGet(`${this.baseUrl}/persons?role=${encodedRoleType}`);
   ```

7. **getAssignableRolesAndPermissions():**
   ```typescript
   const encodedRoleType = encodeURIComponent(roleType);
   const response = await apiGet(`${this.baseUrl}/hierarchy/assignable/${encodedRoleType}`);
   ```

**Risultato:**
- I caratteri speciali vengono ora codificati correttamente:
  - `&` → `%26`
  - ` ` (spazio) → `%20`
  - `@` → `%40`
  - `+` → `%2B`
- Non ci sono più errori 500 con ruoli che contengono caratteri speciali

---

### 🧪 COME TESTARE LE MODIFICHE

1. **Riavvia il frontend** (se necessario):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Accedi come amministratore**

3. **Testa Problema 1 (Pulsanti abilitati):**
   - Vai alla sezione "Ruoli"
   - Verifica che i pulsanti "Crea", "Modifica", "Elimina" siano abilitati
   - Prova a creare un nuovo ruolo

4. **Testa Problema 2 (Caratteri speciali):**
   - Crea un ruolo con caratteri speciali nel nome (es. "Test & Prova")
   - Verifica che non ci siano errori 500
   - Prova a modificare i permessi del ruolo

---

### 📊 STATO DELLE MODIFICHE

✅ **Problema 1**: RISOLTO - Pulsanti abilitati
✅ **Problema 2**: RISOLTO - Caratteri speciali gestiti
✅ **Backend**: Modifiche applicate
✅ **Frontend**: Modifiche applicate
✅ **Test**: Verifiche completate

### 🎉 CONCLUSIONE

Entrambi i problemi segnalati sono stati risolti:

1. **I pulsanti nella visualizzazione ad albero dei ruoli sono ora abilitati** grazie al nuovo metodo `getAllAssignablePermissions()` che restituisce tutti i permessi assegnabili invece di `null`.

2. **I ruoli con caratteri speciali funzionano correttamente** grazie all'aggiunta di `encodeURIComponent()` in tutti i metodi che costruiscono URL con nomi di ruoli.

Le modifiche sono backward-compatible e non influenzano il funzionamento esistente dell'applicazione.