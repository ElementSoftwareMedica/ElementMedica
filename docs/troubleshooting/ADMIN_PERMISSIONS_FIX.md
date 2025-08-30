# Risoluzione Problema Permessi Admin - Accesso Impiegati

## 🔍 Problema Identificato

L'utente admin non riesce ad accedere alla sezione impiegati perché mancano i permessi necessari nel database.

### Analisi Tecnica

1. **Route Impiegati**: Il route `/api/employees` richiede il permesso `read:employees`
2. **Mapping Permessi**: Il sistema RBAC mappa `VIEW_EMPLOYEES` → `read:employees`
3. **Problema**: L'utente admin non ha il permesso `VIEW_EMPLOYEES` assegnato nel database

## 🛠️ Soluzioni Disponibili

### Soluzione 1: Script Node.js (Raccomandato)
```bash
cd backend
node quick-fix-admin.js
```

### Soluzione 2: Script SQL Diretto
Eseguire il file `fix-admin-permissions.sql` nel database PostgreSQL:
```bash
psql -d your_database -f fix-admin-permissions.sql
```

### Soluzione 3: Manuale via Database
1. Trovare l'ID dell'admin nella tabella `Person`
2. Verificare/creare un ruolo `SUPER_ADMIN` nella tabella `PersonRole`
3. Aggiungere i permessi necessari nella tabella `RolePermission`

## 📋 Permessi Essenziali per Admin

- `VIEW_EMPLOYEES` - Visualizzare impiegati
- `CREATE_EMPLOYEES` - Creare impiegati
- `EDIT_EMPLOYEES` - Modificare impiegati
- `DELETE_EMPLOYEES` - Eliminare impiegati
- `VIEW_COMPANIES` - Visualizzare aziende
- `ADMIN_PANEL` - Accesso pannello admin

## 🔧 Come Funziona il Sistema RBAC

### Struttura Database
```
Person → PersonRole → RolePermission
                  ↓
              CustomRole → CustomRolePermission
```

### Mapping Permessi (rbac.js)
```javascript
'VIEW_EMPLOYEES' → {
  'employees:read': true,
  'read:employees': true,
  'companies:read': true
}
```

### Middleware di Controllo
```javascript
router.get('/', authenticate, requirePermissions('read:employees'), ...)
```

## ✅ Verifica Post-Fix

Dopo aver applicato la soluzione, verificare:

1. **Login Admin**: `admin@example.com` / `admin123`
2. **Accesso Impiegati**: Navigare a `/employees`
3. **Permessi**: Controllare che non ci siano errori 403

## 🚨 Note Importanti

- Il sistema usa **soft delete** (`deletedAt`)
- I ruoli devono avere `isActive: true`
- I permessi devono avere `isGranted: true`
- L'admin deve avere ruolo `SUPER_ADMIN` o `ADMIN`

## 📁 File Coinvolti

- <mcfile name="rbac.js" path="/Users/matteo.michielon/project 2.0/backend/middleware/rbac.js"></mcfile> - Logica RBAC
- <mcfile name="employees-routes.js" path="/Users/matteo.michielon/project 2.0/backend/routes/employees-routes.js"></mcfile> - Route impiegati
- <mcfile name="schema.prisma" path="/Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma"></mcfile> - Schema database
- <mcfile name="quick-fix-admin.js" path="/Users/matteo.michielon/project 2.0/backend/quick-fix-admin.js"></mcfile> - Script di fix rapido