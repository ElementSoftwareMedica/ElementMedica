
# 📋 REPORT FASE 2: NAMING CONVENTIONS

**Data**: 2025-07-10T17:02:19.434Z
**Schema**: /Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma
**Backup**: /Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma.backup-phase2

## ✅ CONVERSIONI APPLICATE

### Campi Convertiti (49)
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `codice_ateco` → `codiceAteco`
- `persona_riferimento` → `personaRiferimento`
- `sede_azienda` → `sedeAzienda`
- `subscription_plan` → `subscriptionPlan`
- `is_active` → `isActive`
- `start_date` → `startDate`
- `end_date` → `endDate`
- `max_participants` → `maxParticipants`
- `delivery_mode` → `deliveryMode`
- `deleted_at` → `deletedAt`
- `employee_id` → `employeeId`
- `scheduled_course_id` → `scheduledCourseId`
- `partecipante_id` → `partecipanteId`
- `nome_file` → `nomeFile`
- `data_generazione` → `dataGenerazione`
- `numero_progressivo` → `numeroProgressivo`
- `anno_progressivo` → `annoProgressivo`
- `registro_presenze_id` → `registroPresenzeId`
- `preventivo_id` → `preventivoId`
- `test_id` → `testId`
- `data_consegna` → `dataConsegna`
- `tempo_impiegato` → `tempoImpiegato`
- `user_id` → `userId`
- `tenant_id` → `tenantId`
- `role_type` → `roleType`
- `role_scope` → `roleScope`
- `company_id` → `companyId`
- `department_id` → `departmentId`
- `assigned_by` → `assignedBy`
- `assigned_at` → `assignedAt`
- `expires_at` → `expiresAt`
- `usage_type` → `usageType`
- `usage_value` → `usageValue`
- `usage_limit` → `usageLimit`
- `billing_period` → `billingPeriod`
- `custom_role_id` → `customRoleId`
- `person_role_id` → `personRoleId`
- `allowed_fields` → `allowedFields`
- `billing_plan` → `billingPlan`
- `max_users` → `maxUsers`
- `max_companies` → `maxCompanies`
- `config_key` → `configKey`
- `config_value` → `configValue`
- `config_type` → `configType`
- `is_encrypted` → `isEncrypted`
- `tenant_access` → `tenantAccess`
- `created_by` → `createdBy`

### @map Rimossi (106)
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- scheduledCourseId (era @map("scheduled_course_id"))
- numeroProgressivo (era @map("numero_progressivo"))
- annoProgressivo (era @map("anno_progressivo"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- registroPresenzeId (era @map("registro_presenze_id"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- preventivoId (era @map("preventivo_id"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- testId (era @map("test_id"))
- dataConsegna (era @map("data_consegna"))
- tempoImpiegato (era @map("tempo_impiegato"))
- deletedAt (era @map("deleted_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- updatedAt (era @map("updated_at"))
- customRoleId (era @map("custom_role_id"))
- personRoleId (era @map("person_role_id"))
- allowedFields (era @map("allowed_fields"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- billingPlan (era @map("billing_plan"))
- maxUsers (era @map("max_users"))
- maxCompanies (era @map("max_companies"))
- isActive (era @map("is_active"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- tenantId (era @map("tenant_id"))
- configKey (era @map("config_key"))
- configValue (era @map("config_value"))
- configType (era @map("config_type"))
- isEncrypted (era @map("is_encrypted"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- tenantId (era @map("tenant_id"))
- roleType (era @map("role_type"))
- roleScope (era @map("role_scope"))
- companyId (era @map("company_id"))
- departmentId (era @map("department_id"))
- isActive (era @map("is_active"))
- assignedBy (era @map("assigned_by"))
- assignedAt (era @map("assigned_at"))
- expiresAt (era @map("expires_at"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- tenantId (era @map("tenant_id"))
- usageType (era @map("usage_type"))
- usageValue (era @map("usage_value"))
- usageLimit (era @map("usage_limit"))
- billingPeriod (era @map("billing_period"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- tenantId (era @map("tenant_id"))
- isActive (era @map("is_active"))
- tenantAccess (era @map("tenant_access"))
- createdBy (era @map("created_by"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))
- customRoleId (era @map("custom_role_id"))
- allowedFields (era @map("allowed_fields"))
- createdAt (era @map("created_at"))
- updatedAt (era @map("updated_at"))
- deletedAt (era @map("deleted_at"))

## 🎯 RISULTATI

- **Campi convertiti**: 49
- **@map rimossi**: 106
- **Problemi risolti**: 155

## 📋 PROSSIMI PASSI

1. ✅ **Fase 2 completata**: Naming conventions standardizzate
2. 🔄 **Prossima fase**: Fase 3 - Indici & Vincoli
3. 🧪 **Testing**: Verificare che tutte le query funzionino
4. 🗄️ **Migrazione**: Aggiornare database se necessario

---
*Report generato automaticamente - Fase 2 Optimizer*
