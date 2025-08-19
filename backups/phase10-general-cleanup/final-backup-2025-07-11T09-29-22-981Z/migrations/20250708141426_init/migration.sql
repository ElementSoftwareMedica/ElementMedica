-- CreateEnum
CREATE TYPE "person_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING');

-- CreateEnum
CREATE TYPE "role_types" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER', 'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 'CONSULTANT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "person_permissions" AS ENUM ('VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES', 'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES', 'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS', 'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS', 'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES', 'MANAGE_ENROLLMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS', 'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "codice_ateco" TEXT,
    "iban" TEXT,
    "pec" TEXT,
    "sdi" TEXT,
    "cap" TEXT,
    "citta" TEXT,
    "codice_fiscale" TEXT,
    "mail" TEXT,
    "note" TEXT,
    "persona_riferimento" TEXT,
    "piva" TEXT,
    "provincia" TEXT,
    "ragione_sociale" TEXT NOT NULL,
    "sede_azienda" TEXT,
    "telefono" TEXT,
    "deleted_at" TIMESTAMP(3),
    "tenantId" TEXT,
    "slug" TEXT,
    "domain" TEXT,
    "settings" JSONB DEFAULT '{}',
    "subscription_plan" TEXT NOT NULL DEFAULT 'basic',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "duration" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "certifications" TEXT,
    "code" TEXT,
    "contents" TEXT,
    "maxPeople" INTEGER,
    "pricePerPerson" DOUBLE PRECISION,
    "regulation" TEXT,
    "renewalDuration" TEXT,
    "validityYears" INTEGER,
    "tenantId" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSchedule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "max_participants" INTEGER,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "notes" TEXT,
    "trainerId" TEXT,
    "delivery_mode" TEXT,
    "attendance" JSONB,
    "hasAttestati" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CourseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSession" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "trainerId" TEXT,
    "coTrainerId" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleCompany" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ScheduleCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestati" (
    "id" TEXT NOT NULL,
    "scheduled_course_id" TEXT NOT NULL,
    "partecipante_id" TEXT NOT NULL,
    "nome_file" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "data_generazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numero_progressivo" INTEGER NOT NULL,
    "anno_progressivo" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attestati_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "footer" TEXT,
    "header" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "logoPosition" TEXT,
    "fileFormat" TEXT,
    "googleDocsUrl" TEXT,
    "logoImage" TEXT,
    "companyId" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TemplateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lettere_incarico" (
    "id" TEXT NOT NULL,
    "scheduledCourseId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "nomeFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataGenerazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroProgressivo" INTEGER NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lettere_incarico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registri_presenze" (
    "id" TEXT NOT NULL,
    "scheduledCourseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nomeFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataGenerazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroProgressivo" INTEGER NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "formatoreId" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registri_presenze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_presenze_partecipanti" (
    "id" TEXT NOT NULL,
    "registro_presenze_id" TEXT NOT NULL,
    "partecipante_id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "hours" DOUBLE PRECISION,
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_presenze_partecipanti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivi" (
    "id" TEXT NOT NULL,
    "scheduledCourseId" TEXT NOT NULL,
    "nomeFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataGenerazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroProgressivo" INTEGER NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventivi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivo_partecipanti" (
    "id" TEXT NOT NULL,
    "preventivo_id" TEXT NOT NULL,
    "partecipante_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventivo_partecipanti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventivo_aziende" (
    "id" TEXT NOT NULL,
    "preventivoId" TEXT NOT NULL,
    "aziendaId" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventivo_aziende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatture" (
    "id" TEXT NOT NULL,
    "scheduledCourseId" TEXT NOT NULL,
    "nomeFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataGenerazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroProgressivo" INTEGER NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fatture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fattura_aziende" (
    "id" TEXT NOT NULL,
    "fatturaId" TEXT NOT NULL,
    "aziendaId" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fattura_aziende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_documents" (
    "id" TEXT NOT NULL,
    "scheduledCourseId" TEXT NOT NULL,
    "trainerId" TEXT,
    "nomeFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataGenerazione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroProgressivo" INTEGER NOT NULL,
    "annoProgressivo" INTEGER NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'generato',
    "tipologia" TEXT NOT NULL DEFAULT 'test',
    "punteggio" DOUBLE PRECISION,
    "durata" INTEGER,
    "note" TEXT,
    "dataTest" TIMESTAMP(3),
    "sogliaSuperamento" DOUBLE PRECISION,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_partecipanti" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "partecipante_id" TEXT NOT NULL,
    "punteggio" DOUBLE PRECISION,
    "stato" TEXT NOT NULL DEFAULT 'da completare',
    "note" TEXT,
    "data_consegna" TIMESTAMP(3),
    "tempo_impiegato" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_partecipanti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprAuditLog" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "dataAccessed" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GdprAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "consentVersion" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_sessions" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "person_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "birthDate" DATE,
    "taxCode" VARCHAR(16),
    "vatNumber" VARCHAR(11),
    "residenceAddress" VARCHAR(255),
    "residenceCity" VARCHAR(100),
    "postalCode" VARCHAR(10),
    "province" VARCHAR(2),
    "username" VARCHAR(50),
    "password" VARCHAR(255),
    "status" "person_status" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(100),
    "hiredDate" DATE,
    "hourlyRate" DECIMAL(10,2),
    "iban" VARCHAR(34),
    "registerCode" VARCHAR(50),
    "certifications" TEXT[],
    "specialties" TEXT[],
    "profileImage" VARCHAR(500),
    "notes" TEXT,
    "lastLogin" TIMESTAMP(6),
    "failedAttempts" SMALLINT NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(6),
    "globalRole" VARCHAR(50),
    "tenantId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "gdprConsentDate" TIMESTAMP(6),
    "gdprConsentVersion" VARCHAR(10),
    "dataRetentionUntil" DATE,
    "preferences" JSONB DEFAULT '{}',

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_roles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleType" "role_types" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "validFrom" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATE,
    "companyId" TEXT,
    "tenantId" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "person_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "personRoleId" TEXT NOT NULL,
    "permission" "person_permissions" NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advanced_permissions" (
    "id" TEXT NOT NULL,
    "person_role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "allowed_fields" JSONB,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "advanced_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "billing_plan" TEXT NOT NULL DEFAULT 'basic',
    "max_users" INTEGER NOT NULL DEFAULT 50,
    "max_companies" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_configurations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" JSONB,
    "config_type" TEXT NOT NULL DEFAULT 'general',
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenant_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enhanced_user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role_type" TEXT NOT NULL,
    "role_scope" TEXT NOT NULL DEFAULT 'tenant',
    "permissions" JSONB,
    "company_id" TEXT,
    "department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "enhanced_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_usage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "usage_type" TEXT NOT NULL,
    "usage_value" INTEGER NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "billing_period" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenant_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_scheduleId_employee_id_key" ON "course_enrollments"("scheduleId", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "lettere_incarico_scheduledCourseId_trainerId_key" ON "lettere_incarico"("scheduledCourseId", "trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "registro_presenze_partecipanti_registro_presenze_id_parteci_key" ON "registro_presenze_partecipanti"("registro_presenze_id", "partecipante_id");

-- CreateIndex
CREATE UNIQUE INDEX "preventivo_partecipanti_preventivo_id_partecipante_id_key" ON "preventivo_partecipanti"("preventivo_id", "partecipante_id");

-- CreateIndex
CREATE UNIQUE INDEX "preventivo_aziende_preventivoId_aziendaId_key" ON "preventivo_aziende"("preventivoId", "aziendaId");

-- CreateIndex
CREATE UNIQUE INDEX "fattura_aziende_fatturaId_aziendaId_key" ON "fattura_aziende"("fatturaId", "aziendaId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "test_partecipanti_test_id_partecipante_id_key" ON "test_partecipanti"("test_id", "partecipante_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "person_sessions_sessionToken_key" ON "person_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persons_taxCode_key" ON "persons"("taxCode");

-- CreateIndex
CREATE UNIQUE INDEX "persons_username_key" ON "persons"("username");

-- CreateIndex
CREATE INDEX "persons_email_idx" ON "persons"("email");

-- CreateIndex
CREATE INDEX "persons_username_idx" ON "persons"("username");

-- CreateIndex
CREATE INDEX "persons_companyId_idx" ON "persons"("companyId");

-- CreateIndex
CREATE INDEX "persons_tenantId_idx" ON "persons"("tenantId");

-- CreateIndex
CREATE INDEX "persons_deletedAt_status_idx" ON "persons"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "persons_createdAt_idx" ON "persons"("createdAt");

-- CreateIndex
CREATE INDEX "person_roles_personId_isActive_idx" ON "person_roles"("personId", "isActive");

-- CreateIndex
CREATE INDEX "person_roles_roleType_idx" ON "person_roles"("roleType");

-- CreateIndex
CREATE INDEX "person_roles_companyId_idx" ON "person_roles"("companyId");

-- CreateIndex
CREATE INDEX "person_roles_tenantId_idx" ON "person_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "person_roles_personId_roleType_companyId_tenantId_key" ON "person_roles"("personId", "roleType", "companyId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_personRoleId_permission_key" ON "role_permissions"("personRoleId", "permission");

-- CreateIndex
CREATE INDEX "advanced_permissions_person_role_id_idx" ON "advanced_permissions"("person_role_id");

-- CreateIndex
CREATE INDEX "advanced_permissions_resource_action_idx" ON "advanced_permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_configurations_tenant_id_config_key_key" ON "tenant_configurations"("tenant_id", "config_key");

-- CreateIndex
CREATE UNIQUE INDEX "enhanced_user_roles_user_id_tenant_id_role_type_company_id_key" ON "enhanced_user_roles"("user_id", "tenant_id", "role_type", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usage_tenant_id_usage_type_billing_period_key" ON "tenant_usage"("tenant_id", "usage_type", "billing_period");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSchedule" ADD CONSTRAINT "CourseSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_coTrainerId_fkey" FOREIGN KEY ("coTrainerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCompany" ADD CONSTRAINT "ScheduleCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCompany" ADD CONSTRAINT "ScheduleCompany_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestati" ADD CONSTRAINT "attestati_scheduled_course_id_fkey" FOREIGN KEY ("scheduled_course_id") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLink" ADD CONSTRAINT "TemplateLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettere_incarico" ADD CONSTRAINT "lettere_incarico_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettere_incarico" ADD CONSTRAINT "lettere_incarico_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_formatoreId_fkey" FOREIGN KEY ("formatoreId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registri_presenze" ADD CONSTRAINT "registri_presenze_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_presenze_partecipanti" ADD CONSTRAINT "registro_presenze_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_presenze_partecipanti" ADD CONSTRAINT "registro_presenze_partecipanti_registro_presenze_id_fkey" FOREIGN KEY ("registro_presenze_id") REFERENCES "registri_presenze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivi" ADD CONSTRAINT "preventivi_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_partecipanti" ADD CONSTRAINT "preventivo_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_partecipanti" ADD CONSTRAINT "preventivo_partecipanti_preventivo_id_fkey" FOREIGN KEY ("preventivo_id") REFERENCES "preventivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_aziende" ADD CONSTRAINT "preventivo_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventivo_aziende" ADD CONSTRAINT "preventivo_aziende_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES "preventivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatture" ADD CONSTRAINT "fatture_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fattura_aziende" ADD CONSTRAINT "fattura_aziende_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fattura_aziende" ADD CONSTRAINT "fattura_aziende_fatturaId_fkey" FOREIGN KEY ("fatturaId") REFERENCES "fatture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_documents" ADD CONSTRAINT "test_documents_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES "CourseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_documents" ADD CONSTRAINT "test_documents_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_partecipanti" ADD CONSTRAINT "test_partecipanti_partecipante_id_fkey" FOREIGN KEY ("partecipante_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_partecipanti" ADD CONSTRAINT "test_partecipanti_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprAuditLog" ADD CONSTRAINT "GdprAuditLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_sessions" ADD CONSTRAINT "person_sessions_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_roles" ADD CONSTRAINT "person_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_personRoleId_fkey" FOREIGN KEY ("personRoleId") REFERENCES "person_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_permissions" ADD CONSTRAINT "advanced_permissions_person_role_id_fkey" FOREIGN KEY ("person_role_id") REFERENCES "person_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_configurations" ADD CONSTRAINT "tenant_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_user_roles" ADD CONSTRAINT "enhanced_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_usage" ADD CONSTRAINT "tenant_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
