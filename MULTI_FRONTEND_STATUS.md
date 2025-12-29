# 🎉 Sistema Multi-Frontend ATTIVO!

## 📍 URLs Disponibili

### 🔵 Element Formazione
- **URL**: http://localhost:5173
- **Brand**: element-formazione
- **Servizi**: Formazione + Medicina del Lavoro + RSPP
- **Target**: Aziende che cercano corsi di formazione

### 🟢 Element Medica  
- **URL**: http://localhost:5174
- **Brand**: element-medica
- **Servizi**: Poliambulatorio + Medicina del Lavoro (primario)
- **Target**: Pazienti privati + Medicina del lavoro aziendale

### 🔧 Backend
- **API**: http://localhost:4003/api
- **Health**: http://localhost:4001/health

## ✅ Cosa Funziona Ora

### 1. Brand Detection Automatico
Ogni frontend invia automaticamente l'header `X-Frontend-Id`:
- **Port 5173** → `X-Frontend-Id: element-formazione`
- **Port 5174** → `X-Frontend-Id: element-medica`

### 2. Pagine CMS Separate
Il backend restituisce pagine diverse in base al brand:
```
GET /api/v1/cms/pages/slug/homepage
Header: X-Frontend-Id: element-formazione
→ Homepage Element Formazione

GET /api/v1/cms/pages/slug/homepage  
Header: X-Frontend-Id: element-medica
→ Homepage Element Medica
```

### 3. Stesso Backend, Stesso Database
- ✅ Single backend (4003)
- ✅ Single database
- ✅ Multi-tenant con filtro automatico
- ✅ Nessun dato duplicato

## 🎨 Differenze Visive

### Element Formazione (5173)
- **Colori**: Primary blue-gray (#0891b2)
- **Tema**: Formazione professionale
- **Homepage**: Focus su corsi di formazione
- **Menu**: Corsi, RSPP, Medicina del Lavoro, Servizi

### Element Medica (5174)
- **Colori**: Medical cyan (#06b6d4)
- **Tema**: Medical/Healthcare
- **Homepage**: Focus su medicina del lavoro + poliambulatorio
- **Menu**: Medicina del Lavoro, Specialità, Prenotazioni

## 📝 Come Testare

### Test 1: Verifica Brand Detection

**Formazione (5173)**:
```bash
# Apri browser DevTools → Network
# Vai su http://localhost:5173
# Seleziona chiamata API
# Verifica header: X-Frontend-Id: element-formazione
```

**Medica (5174)**:
```bash
# Apri browser DevTools → Network  
# Vai su http://localhost:5174
# Seleziona chiamata API
# Verifica header: X-Frontend-Id: element-medica
```

### Test 2: Verifica Pagine Diverse

**Formazione**: http://localhost:5173/
- Dovresti vedere homepage con focus formazione
- Menu con "Corsi" prominente
- CTA "Scopri i Corsi"

**Medica**: http://localhost:5174/
- Dovresti vedere homepage con focus medicina
- Menu con "Prenota Visita" prominente  
- CTA "Prenota Online"

### Test 3: Verifica Corsi Filtrati

**Formazione**: http://localhost:5173/corsi
- ✅ Mostra tutti i corsi

**Medica**: http://localhost:5174/corsi
- ❌ Array vuoto (Element Medica NON ha corsi)

## 🔄 Comandi Utili

### Avvio Server

```bash
# Solo Formazione (5173)
npm run dev:formazione

# Solo Medica (5174)  
npm run dev:medica

# Entrambi (parallelo)
npm run dev:both
```

### Stop Server

```bash
# Killa tutti i Vite
pkill -f vite

# Killa porta specifica
lsof -ti:5173 | xargs kill -9
lsof -ti:5174 | xargs kill -9
```

### Build Production

```bash
# Build singoli
npm run build:formazione  # → dist/element-formazione/
npm run build:medica      # → dist/element-medica/

# Build entrambi
npm run build:both
```

## 📂 File Configurazione

```
.env.element-formazione     → Config per porta 5173
.env.element-medica         → Config per porta 5174
src/services/api.ts         → Inietta X-Frontend-Id
src/config/brands.config.ts → Configurazione brand
backend/middleware/brandDetection.js → Rileva brand
```

## 🐛 Troubleshooting

### Problema: Pagine identiche su entrambi i domini

**Causa**: CMS non ha pagine separate per brand

**Soluzione**:
1. Vai su CMS Admin
2. Seleziona brand dal dropdown
3. Crea pagine specifiche per quel brand
4. Verifica `tenant_id` corretto nel database

### Problema: Errore "X-Frontend-Id non trovato"

**Causa**: Header non iniettato

**Verifica**:
1. File `.env.element-formazione` esiste?
2. Console Vite mostra "Loading config for mode: element-formazione"?
3. Network tab mostra header `X-Frontend-Id`?

### Problema: Porta già in uso

```bash
# Libera porta
lsof -ti:5173 | xargs kill -9
lsof -ti:5174 | xargs kill -9

# Riavvia
npm run dev:formazione
npm run dev:medica
```

## 🎯 Prossimi Step

### 1. Creare Contenuti CMS per Element Medica
- [ ] Homepage poliambulatorio
- [ ] Pagina Medicina del Lavoro
- [ ] Pagina Specialità
- [ ] Pagina Contatti

### 2. Popolare Database Tenants
```sql
INSERT INTO tenants (id, name) VALUES 
  ('tenant-id-formazione', 'Element Formazione'),
  ('tenant-id-medica', 'Element Medica');
```

### 3. Taggare Contenuti Esistenti
```sql
-- Tag existing content as Element Formazione
UPDATE cms_pages SET tenant_id = 'tenant-id-formazione' WHERE tenant_id IS NULL;
UPDATE courses SET tenant_id = 'tenant-id-formazione' WHERE tenant_id IS NULL;
```

### 4. Testing Multi-Brand
- [ ] Test isolamento dati
- [ ] Test navigation cross-brand
- [ ] Test SEO metadata per brand
- [ ] Test performance dual-frontend

## 📚 Documentazione

- **Setup**: `docs/MULTI_FRONTEND_SETUP.md`
- **Deployment**: `docs/technical/MULTI_FRONTEND_DEPLOYMENT.md`  
- **Project Plan**: `docs/project/MULTI_FRONTEND_PROJECT_PLAN.md`
- **Summary**: `docs/EXECUTIVE_SUMMARY.md`

## 🚀 Status

- ✅ **Infrastructure**: 100% Complete
- ✅ **Brand Detection**: 100% Complete
- ✅ **Backend Middleware**: 100% Complete
- ✅ **Frontend Configuration**: 100% Complete
- ⏳ **CMS Content**: 0% (da popolare)
- ⏳ **Database Tenants**: 0% (da creare)
- ⏳ **Production Deploy**: 0% (futuro)

---

**Creato**: 19 Novembre 2025  
**Status**: ✅ PRONTO PER CONTENUTI CMS
