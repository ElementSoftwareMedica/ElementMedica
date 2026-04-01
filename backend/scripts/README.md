# Backend Scripts

Questa cartella contiene tutti gli script di utilità per Element Sicurezza e Element Medica.

## 📁 Struttura Cartelle

```
scripts/
├── seeds/           → Script per popolare il database (CMS, corsi, utenti)
├── templates/       → Script per gestire template (documenti, certificati)
├── permissions/     → Script per gestione permessi e ruoli
├── setup/           → Script di setup iniziale
├── maintenance/     → Script di manutenzione DB
├── cms-redesign/    → Script di redesign pagine CMS (Element Sicurezza)
├── cms-analysis/    → Script di verifica stato CMS
├── testing/         → Script di test e debug
├── debug/           → Script di debugging avanzato
└── test/            → Test unitari
```

## 🌱 Scripts Principali

### Seed Database CMS

```bash
# Ripristina tutte le pagine CMS
cd backend
node scripts/seeds/seed-cms-pages.js

# Opzioni disponibili:
node scripts/seeds/seed-cms-pages.js --dry-run     # Preview senza modifiche
node scripts/seeds/seed-cms-pages.js --force       # Sovrascrive pagine esistenti
node scripts/seeds/seed-cms-pages.js --tenant=X    # Solo un tenant specifico
```

### Seed Corsi Pubblici

```bash
node scripts/seeds/seed-public-courses.js
```

### Template Documenti

```bash
# Crea template certificato
node scripts/templates/create-default-certificate-template.js

# Crea template lettera incarico
node scripts/templates/create-default-letter-template.js

# Crea template foglio presenze
node scripts/templates/create-default-attendance-template.js

# Crea tutti i template mancanti
node scripts/templates/create-missing-templates.cjs
```

### Permessi

```bash
# Assegna permessi admin
node scripts/setup/assign-companies-permissions-to-admin.js

# Verifica permessi
node scripts/permissions/check-permissions.js
```

## 🔑 Tenant IDs

| Brand | Tenant ID |
|-------|-----------|
| Element Sicurezza | `d2bbc5b0-344c-47c7-8ef5-f57755293372` |
| Element Medica | `tenant-element-medica-001` |

## 📄 Pagine CMS

### Element Sicurezza (11 pagine)
- `homepage` - Homepage principale
- `corsi` - Catalogo corsi sicurezza
- `medicina-del-lavoro` - Servizio medicina del lavoro
- `rspp` - Servizio RSPP esterno
- `servizi` - Panoramica servizi
- `contatti` - Form contatto
- `chi-siamo` - Chi siamo
- `carriere` - Lavora con noi
- `privacy-policy` - Privacy policy
- `cookie-policy` - Cookie policy
- `termini` - Termini di servizio

### Element Medica (7 pagine)
- `medica-homepage` - Homepage Element Medica
- `medica-visite-specialistiche` - Visite specialistiche
- `medica-medicina-del-lavoro` - Medicina del lavoro
- `medica-diagnostica` - Servizi diagnostica
- `medica-chi-siamo` - Chi siamo
- `medica-contatti` - Contatti
- `medica-prenota` - Prenotazione online

## 🔄 Workflow Backup/Restore

### Backup Pagine CMS

```bash
# Le pagine sono salvate in:
backend/scripts/seeds/cms-pages-data.json

# Per aggiornare il backup dopo modifiche:
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
(async () => {
  const pages = await prisma.cMSPage.findMany();
  fs.writeFileSync(
    'scripts/seeds/cms-pages-data.json',
    JSON.stringify(pages.map(p => ({
      slug: p.slug, title: p.title, tenantId: p.tenantId,
      status: p.status, content: p.content
    })), null, 2)
  );
  console.log('Backup completato:', pages.length, 'pagine');
  await prisma.\$disconnect();
})();
"
```

### Restore Pagine CMS

```bash
# Restore completo (sovrascrive esistenti)
node scripts/seeds/seed-cms-pages.js --force

# Restore solo pagine mancanti
node scripts/seeds/seed-cms-pages.js
```

## ⚠️ Note Importanti

1. **Prima di un reset DB**: Esegui il backup delle pagine CMS
2. **Dopo un reset DB**: Esegui `seed-cms-pages.js --force`
3. **Gli script in `obsolete/`** sono mantenuti solo per riferimento
4. **Gli script in `archived/`** sono migrazioni completate

## 📅 Ultimo Aggiornamento

- **Data**: 2025-11-29
- **Pagine**: 18 totali (11 Formazione + 7 Medica)
- **Version**: 1.0.0
