# Test Multi-Brand - Checklist Verifica

## ✅ Passi Completati

1. **Environment Files Creati**:
   - `.env.element-formazione` → VITE_BRAND_ID=element-formazione
   - `.env.element-medica` → VITE_BRAND_ID=element-medica

2. **Vite Config Aggiornato**:
   - loadEnv() per caricare .env corretto
   - Proxy target corretto (4001)
   - Port specifiche (5173, 5174)

3. **API Service Aggiornato**:
   - Header X-Frontend-Id iniettato GLOBALMENTE
   - import.meta.env.VITE_BRAND_ID utilizzato

4. **Server Attivi**:
   - ✅ Element Formazione: http://localhost:5173
   - ✅ Element Medica: http://localhost:5174
   - ✅ Backend: http://localhost:4001

## 🧪 Test da Fare nel Browser

### Test 1: Verificare Header X-Frontend-Id

**Formazione (5173)**:
1. Apri http://localhost:5173
2. DevTools → Network
3. Reload pagina
4. Seleziona chiamata `/api/v1/cms/pages/slug/homepage`
5. Tab "Headers" → Request Headers
6. **CERCA**: `X-Frontend-Id: element-formazione`

**Medica (5174)**:
1. Apri http://localhost:5174
2. DevTools → Network
3. Reload pagina
4. Seleziona chiamata `/api/v1/cms/pages/slug/homepage`
5. Tab "Headers" → Request Headers
6. **CERCA**: `X-Frontend-Id: element-medica`

### Test 2: Verificare Contenuti Diversi

**NOTA**: Attualmente entrambi mostreranno STESSA homepage perché:
- Database non ha tenant separati
- Tutte le pagine hanno stesso `tenantId`

**Soluzione**:
1. Creare tenant nel database
2. Creare pagine CMS specifiche per Element Medica
3. Backend filtrerà automaticamente in base a X-Frontend-Id

## 🔍 Debug Console

Nel browser console dovresti vedere:
- **Formazione**: Nessun log specifico brand
- **Medica**: Nessun log specifico brand

Gli header sono SILENZIOSI - non producono log visibili.

## 📝 Prossimi Step

Se gli header sono corretti:

### Opzione A: Creare Tenant Database
```sql
-- 1. Crea tenant
INSERT INTO tenants (id, name) VALUES 
  ('tenant-id-formazione', 'Element Formazione'),
  ('tenant-id-medica', 'Element Medica');

-- 2. Tag existing content
UPDATE cms_pages SET tenant_id = 'tenant-id-formazione' WHERE tenant_id IS NULL;
```

### Opzione B: Backend Brand Detection
Verificare che `backend/middleware/brandDetection.js`:
- Rilevi header X-Frontend-Id
- Filtri pagine CMS per tenant corretto
- Restituisca content diverso per brand diverso

## ❌ Troubleshooting

### Problema: Header non visibile
**Causa**: Browser cache o HMR non ha ricaricato
**Fix**: Hard reload (Cmd+Shift+R) o restart server

### Problema: Entrambi mostrano stesso content
**Causa**: Backend non ha tenant separati
**Fix**: Creare tenant e pagine CMS separate

### Problema: ERR_CONNECTION_REFUSED
**Causa**: Server crashato
**Fix**: `npm run dev:formazione` e `npm run dev:medica`

---

**Status**: 🟡 Infrastruttura pronta, awaiting content CMS
**Next**: Verificare header nel browser → Creare tenant database
