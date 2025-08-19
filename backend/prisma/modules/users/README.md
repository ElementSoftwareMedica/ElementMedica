# Modulo USERS

## Descrizione
Gestione utenti e ruoli

## Modelli Inclusi
- **Person**: Utenti del sistema
- **PersonRole**: Modello del sistema
- **PersonSession**: Modello del sistema
- **EnhancedUserRole**: Modello del sistema
- **CustomRole**: Modello del sistema

## Enum Utilizzati
- **PersonStatus**: Stati utente
- **RoleType**: Enumerazione del sistema

## Relazioni
- **PersonRole** → **Person**: person
- **PersonSession** → **Person**: person
- **EnhancedUserRole** → **Tenant**: tenant
- **EnhancedUserRole** → **Person**: person
- **CustomRole** → **Tenant**: tenant

---
*Documentazione generata automaticamente*
