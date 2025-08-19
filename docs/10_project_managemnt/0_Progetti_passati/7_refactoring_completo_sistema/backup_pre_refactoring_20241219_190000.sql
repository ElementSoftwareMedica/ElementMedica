--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

-- Started on 2025-06-29 19:02:19 CEST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.tenant_usage DROP CONSTRAINT tenant_usage_tenant_id_fkey;
ALTER TABLE ONLY public.tenant_configurations DROP CONSTRAINT tenant_configurations_tenant_id_fkey;
ALTER TABLE ONLY public.role_permissions DROP CONSTRAINT "role_permissions_personRoleId_fkey";
ALTER TABLE ONLY public.role_permissions DROP CONSTRAINT "role_permissions_grantedBy_fkey";
ALTER TABLE ONLY public.persons DROP CONSTRAINT "persons_tenantId_fkey";
ALTER TABLE ONLY public.persons DROP CONSTRAINT "persons_companyId_fkey";
ALTER TABLE ONLY public.person_roles DROP CONSTRAINT "person_roles_tenantId_fkey";
ALTER TABLE ONLY public.person_roles DROP CONSTRAINT "person_roles_personId_fkey";
ALTER TABLE ONLY public.person_roles DROP CONSTRAINT "person_roles_companyId_fkey";
ALTER TABLE ONLY public.person_roles DROP CONSTRAINT "person_roles_assignedBy_fkey";
ALTER TABLE ONLY public.enhanced_user_roles DROP CONSTRAINT enhanced_user_roles_user_id_fkey;
ALTER TABLE ONLY public.enhanced_user_roles DROP CONSTRAINT enhanced_user_roles_tenant_id_fkey;
ALTER TABLE ONLY public.enhanced_user_roles DROP CONSTRAINT enhanced_user_roles_company_id_fkey;
ALTER TABLE ONLY public.enhanced_user_roles DROP CONSTRAINT enhanced_user_roles_assigned_by_fkey;
ALTER TABLE ONLY public."_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_B_fkey";
ALTER TABLE ONLY public."_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_A_fkey";
ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_tenantId_fkey";
ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_companyId_fkey";
ALTER TABLE ONLY public."UserSession" DROP CONSTRAINT "UserSession_userId_fkey";
ALTER TABLE ONLY public."UserRole" DROP CONSTRAINT "UserRole_userId_fkey";
ALTER TABLE ONLY public."UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";
ALTER TABLE ONLY public."UserRole" DROP CONSTRAINT "UserRole_assignedBy_fkey";
ALTER TABLE ONLY public."TestPartecipante" DROP CONSTRAINT "TestPartecipante_testId_fkey";
ALTER TABLE ONLY public."TestPartecipante" DROP CONSTRAINT "TestPartecipante_partecipanteId_fkey";
ALTER TABLE ONLY public."TestDocument" DROP CONSTRAINT "TestDocument_trainerId_fkey";
ALTER TABLE ONLY public."TestDocument" DROP CONSTRAINT "TestDocument_scheduledCourseId_fkey";
ALTER TABLE ONLY public."TemplateLink" DROP CONSTRAINT "TemplateLink_companyId_fkey";
ALTER TABLE ONLY public."ScheduleCompany" DROP CONSTRAINT "ScheduleCompany_scheduleId_fkey";
ALTER TABLE ONLY public."ScheduleCompany" DROP CONSTRAINT "ScheduleCompany_companyId_fkey";
ALTER TABLE ONLY public."Role" DROP CONSTRAINT "Role_tenantId_fkey";
ALTER TABLE ONLY public."Role" DROP CONSTRAINT "Role_companyId_fkey";
ALTER TABLE ONLY public."RegistroPresenze" DROP CONSTRAINT "RegistroPresenze_sessionId_fkey";
ALTER TABLE ONLY public."RegistroPresenze" DROP CONSTRAINT "RegistroPresenze_scheduledCourseId_fkey";
ALTER TABLE ONLY public."RegistroPresenze" DROP CONSTRAINT "RegistroPresenze_formatoreId_fkey";
ALTER TABLE ONLY public."RegistroPresenzePartecipante" DROP CONSTRAINT "RegistroPresenzePartecipante_registroId_fkey";
ALTER TABLE ONLY public."RegistroPresenzePartecipante" DROP CONSTRAINT "RegistroPresenzePartecipante_partecipanteId_fkey";
ALTER TABLE ONLY public."RefreshToken" DROP CONSTRAINT "RefreshToken_personId_fkey";
ALTER TABLE ONLY public."Preventivo" DROP CONSTRAINT "Preventivo_scheduledCourseId_fkey";
ALTER TABLE ONLY public."PreventivoPartecipante" DROP CONSTRAINT "PreventivoPartecipante_preventivoId_fkey";
ALTER TABLE ONLY public."PreventivoPartecipante" DROP CONSTRAINT "PreventivoPartecipante_partecipanteId_fkey";
ALTER TABLE ONLY public."PreventivoAzienda" DROP CONSTRAINT "PreventivoAzienda_preventivoId_fkey";
ALTER TABLE ONLY public."PreventivoAzienda" DROP CONSTRAINT "PreventivoAzienda_aziendaId_fkey";
ALTER TABLE ONLY public."LetteraIncarico" DROP CONSTRAINT "LetteraIncarico_trainerId_fkey";
ALTER TABLE ONLY public."LetteraIncarico" DROP CONSTRAINT "LetteraIncarico_scheduledCourseId_fkey";
ALTER TABLE ONLY public."GdprAuditLog" DROP CONSTRAINT "GdprAuditLog_userId_fkey";
ALTER TABLE ONLY public."Fattura" DROP CONSTRAINT "Fattura_scheduledCourseId_fkey";
ALTER TABLE ONLY public."FatturaAzienda" DROP CONSTRAINT "FatturaAzienda_fatturaId_fkey";
ALTER TABLE ONLY public."FatturaAzienda" DROP CONSTRAINT "FatturaAzienda_aziendaId_fkey";
ALTER TABLE ONLY public."Employee" DROP CONSTRAINT "Employee_companyId_fkey";
ALTER TABLE ONLY public."Course" DROP CONSTRAINT "Course_tenantId_fkey";
ALTER TABLE ONLY public."CourseSession" DROP CONSTRAINT "CourseSession_trainerId_fkey";
ALTER TABLE ONLY public."CourseSession" DROP CONSTRAINT "CourseSession_scheduleId_fkey";
ALTER TABLE ONLY public."CourseSession" DROP CONSTRAINT "CourseSession_coTrainerId_fkey";
ALTER TABLE ONLY public."CourseSchedule" DROP CONSTRAINT "CourseSchedule_trainerId_fkey";
ALTER TABLE ONLY public."CourseSchedule" DROP CONSTRAINT "CourseSchedule_courseId_fkey";
ALTER TABLE ONLY public."CourseSchedule" DROP CONSTRAINT "CourseSchedule_companyId_fkey";
ALTER TABLE ONLY public."CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_scheduleId_fkey";
ALTER TABLE ONLY public."CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_employeeId_fkey";
ALTER TABLE ONLY public."ConsentRecord" DROP CONSTRAINT "ConsentRecord_userId_fkey";
ALTER TABLE ONLY public."Company" DROP CONSTRAINT "Company_tenantId_fkey";
ALTER TABLE ONLY public."Attestato" DROP CONSTRAINT "Attestato_scheduledCourseId_fkey";
ALTER TABLE ONLY public."Attestato" DROP CONSTRAINT "Attestato_partecipanteId_fkey";
ALTER TABLE ONLY public."ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";
DROP INDEX public.tenants_slug_key;
DROP INDEX public.tenants_domain_key;
DROP INDEX public.tenant_usage_tenant_id_usage_type_billing_period_key;
DROP INDEX public.tenant_configurations_tenant_id_config_key_key;
DROP INDEX public."role_permissions_personRoleId_permission_key";
DROP INDEX public.persons_username_key;
DROP INDEX public.persons_username_idx;
DROP INDEX public."persons_tenantId_idx";
DROP INDEX public."persons_taxCode_key";
DROP INDEX public."persons_isDeleted_isActive_idx";
DROP INDEX public.persons_email_key;
DROP INDEX public.persons_email_idx;
DROP INDEX public."persons_createdAt_idx";
DROP INDEX public."persons_companyId_idx";
DROP INDEX public."person_roles_tenantId_idx";
DROP INDEX public."person_roles_roleType_idx";
DROP INDEX public."person_roles_personId_roleType_companyId_tenantId_key";
DROP INDEX public."person_roles_personId_isActive_idx";
DROP INDEX public."person_roles_companyId_idx";
DROP INDEX public.enhanced_user_roles_user_id_tenant_id_role_type_company_id_key;
DROP INDEX public."_PermissionToRole_B_index";
DROP INDEX public."_PermissionToRole_AB_unique";
DROP INDEX public."User_username_key";
DROP INDEX public."User_email_key";
DROP INDEX public."UserSession_sessionToken_key";
DROP INDEX public."Role_name_companyId_key";
DROP INDEX public."RefreshToken_token_key";
DROP INDEX public."Permission_name_key";
DROP INDEX public."LetteraIncarico_scheduledCourseId_trainerId_key";
DROP INDEX public."Employee_codice_fiscale_key";
DROP INDEX public."Course_code_key";
DROP INDEX public."CourseEnrollment_scheduleId_employeeId_key";
DROP INDEX public."Company_slug_key";
DROP INDEX public."Company_domain_key";
ALTER TABLE ONLY public.tenants DROP CONSTRAINT tenants_pkey;
ALTER TABLE ONLY public.tenant_usage DROP CONSTRAINT tenant_usage_pkey;
ALTER TABLE ONLY public.tenant_configurations DROP CONSTRAINT tenant_configurations_pkey;
ALTER TABLE ONLY public.role_permissions DROP CONSTRAINT role_permissions_pkey;
ALTER TABLE ONLY public.persons DROP CONSTRAINT persons_pkey;
ALTER TABLE ONLY public.person_roles DROP CONSTRAINT person_roles_pkey;
ALTER TABLE ONLY public.enhanced_user_roles DROP CONSTRAINT enhanced_user_roles_pkey;
ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
ALTER TABLE ONLY public."UserSession" DROP CONSTRAINT "UserSession_pkey";
ALTER TABLE ONLY public."UserRole" DROP CONSTRAINT "UserRole_pkey";
ALTER TABLE ONLY public."TestPartecipante" DROP CONSTRAINT "TestPartecipante_pkey";
ALTER TABLE ONLY public."TestDocument" DROP CONSTRAINT "TestDocument_pkey";
ALTER TABLE ONLY public."TemplateLink" DROP CONSTRAINT "TemplateLink_pkey";
ALTER TABLE ONLY public."ScheduleCompany" DROP CONSTRAINT "ScheduleCompany_pkey";
ALTER TABLE ONLY public."Role" DROP CONSTRAINT "Role_pkey";
ALTER TABLE ONLY public."RegistroPresenze" DROP CONSTRAINT "RegistroPresenze_pkey";
ALTER TABLE ONLY public."RegistroPresenzePartecipante" DROP CONSTRAINT "RegistroPresenzePartecipante_pkey";
ALTER TABLE ONLY public."RefreshToken" DROP CONSTRAINT "RefreshToken_pkey";
ALTER TABLE ONLY public."Preventivo" DROP CONSTRAINT "Preventivo_pkey";
ALTER TABLE ONLY public."PreventivoPartecipante" DROP CONSTRAINT "PreventivoPartecipante_pkey";
ALTER TABLE ONLY public."PreventivoAzienda" DROP CONSTRAINT "PreventivoAzienda_pkey";
ALTER TABLE ONLY public."Permission" DROP CONSTRAINT "Permission_pkey";
ALTER TABLE ONLY public."LetteraIncarico" DROP CONSTRAINT "LetteraIncarico_pkey";
ALTER TABLE ONLY public."GdprAuditLog" DROP CONSTRAINT "GdprAuditLog_pkey";
ALTER TABLE ONLY public."Fattura" DROP CONSTRAINT "Fattura_pkey";
ALTER TABLE ONLY public."FatturaAzienda" DROP CONSTRAINT "FatturaAzienda_pkey";
ALTER TABLE ONLY public."Employee" DROP CONSTRAINT "Employee_pkey";
ALTER TABLE ONLY public."Course" DROP CONSTRAINT "Course_pkey";
ALTER TABLE ONLY public."CourseSession" DROP CONSTRAINT "CourseSession_pkey";
ALTER TABLE ONLY public."CourseSchedule" DROP CONSTRAINT "CourseSchedule_pkey";
ALTER TABLE ONLY public."CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_pkey";
ALTER TABLE ONLY public."ConsentRecord" DROP CONSTRAINT "ConsentRecord_pkey";
ALTER TABLE ONLY public."Company" DROP CONSTRAINT "Company_pkey";
ALTER TABLE ONLY public."Attestato" DROP CONSTRAINT "Attestato_pkey";
ALTER TABLE ONLY public."ActivityLog" DROP CONSTRAINT "ActivityLog_pkey";
DROP TABLE public.tenants;
DROP TABLE public.tenant_usage;
DROP TABLE public.tenant_configurations;
DROP TABLE public.role_permissions;
DROP TABLE public.persons;
DROP TABLE public.person_roles;
DROP TABLE public.enhanced_user_roles;
DROP TABLE public._prisma_migrations;
DROP TABLE public."_PermissionToRole";
DROP TABLE public."UserSession";
DROP TABLE public."UserRole";
DROP TABLE public."User";
DROP TABLE public."TestPartecipante";
DROP TABLE public."TestDocument";
DROP TABLE public."TemplateLink";
DROP TABLE public."ScheduleCompany";
DROP TABLE public."Role";
DROP TABLE public."RegistroPresenzePartecipante";
DROP TABLE public."RegistroPresenze";
DROP TABLE public."RefreshToken";
DROP TABLE public."PreventivoPartecipante";
DROP TABLE public."PreventivoAzienda";
DROP TABLE public."Preventivo";
DROP TABLE public."Permission";
DROP TABLE public."LetteraIncarico";
DROP TABLE public."GdprAuditLog";
DROP TABLE public."FatturaAzienda";
DROP TABLE public."Fattura";
DROP TABLE public."Employee";
DROP TABLE public."CourseSession";
DROP TABLE public."CourseSchedule";
DROP TABLE public."CourseEnrollment";
DROP TABLE public."Course";
DROP TABLE public."ConsentRecord";
DROP TABLE public."Company";
DROP TABLE public."Attestato";
DROP TABLE public."ActivityLog";
DROP TYPE public.role_types;
DROP TYPE public.person_status;
DROP TYPE public.person_permissions;
--
-- TOC entry 966 (class 1247 OID 39900)
-- Name: person_permissions; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.person_permissions AS ENUM (
    'VIEW_EMPLOYEES',
    'CREATE_EMPLOYEES',
    'EDIT_EMPLOYEES',
    'DELETE_EMPLOYEES',
    'VIEW_TRAINERS',
    'CREATE_TRAINERS',
    'EDIT_TRAINERS',
    'DELETE_TRAINERS',
    'VIEW_USERS',
    'CREATE_USERS',
    'EDIT_USERS',
    'DELETE_USERS',
    'VIEW_COURSES',
    'CREATE_COURSES',
    'EDIT_COURSES',
    'DELETE_COURSES',
    'MANAGE_ENROLLMENTS',
    'CREATE_DOCUMENTS',
    'EDIT_DOCUMENTS',
    'DELETE_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',
    'ADMIN_PANEL',
    'SYSTEM_SETTINGS',
    'USER_MANAGEMENT',
    'ROLE_MANAGEMENT',
    'TENANT_MANAGEMENT',
    'VIEW_GDPR_DATA',
    'EXPORT_GDPR_DATA',
    'DELETE_GDPR_DATA',
    'MANAGE_CONSENTS',
    'VIEW_REPORTS',
    'CREATE_REPORTS',
    'EXPORT_REPORTS'
);


--
-- TOC entry 960 (class 1247 OID 39849)
-- Name: person_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.person_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'PENDING'
);


--
-- TOC entry 963 (class 1247 OID 39860)
-- Name: role_types; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_types AS ENUM (
    'EMPLOYEE',
    'MANAGER',
    'HR_MANAGER',
    'DEPARTMENT_HEAD',
    'TRAINER',
    'SENIOR_TRAINER',
    'TRAINER_COORDINATOR',
    'EXTERNAL_TRAINER',
    'SUPER_ADMIN',
    'ADMIN',
    'COMPANY_ADMIN',
    'TENANT_ADMIN',
    'VIEWER',
    'OPERATOR',
    'COORDINATOR',
    'SUPERVISOR',
    'GUEST',
    'CONSULTANT',
    'AUDITOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 39415)
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    "resourceId" text,
    details text,
    "ipAddress" text,
    "userAgent" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 217 (class 1259 OID 39298)
-- Name: Attestato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attestato" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 210 (class 1259 OID 39224)
-- Name: Company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    codice_ateco text,
    iban text,
    pec text,
    sdi text,
    cap text,
    citta text,
    codice_fiscale text,
    mail text,
    note text,
    persona_riferimento text,
    piva text,
    provincia text,
    ragione_sociale text NOT NULL,
    sede_azienda text,
    telefono text,
    eliminato boolean DEFAULT false NOT NULL,
    "tenantId" text,
    slug text,
    domain text,
    settings jsonb DEFAULT '{}'::jsonb,
    subscription_plan text DEFAULT 'basic'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 39472)
-- Name: ConsentRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsentRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "consentType" text NOT NULL,
    "consentGiven" boolean NOT NULL,
    "consentVersion" text,
    "givenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "withdrawnAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 212 (class 1259 OID 39245)
-- Name: Course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Course" (
    id text NOT NULL,
    title text NOT NULL,
    category text,
    description text,
    duration text,
    status text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    certifications text,
    code text,
    contents text,
    "maxPeople" integer,
    "pricePerPerson" double precision,
    regulation text,
    "renewalDuration" text,
    "validityYears" integer,
    "tenantId" text,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 214 (class 1259 OID 39264)
-- Name: CourseEnrollment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseEnrollment" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    "employeeId" text NOT NULL,
    status text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 213 (class 1259 OID 39254)
-- Name: CourseSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseSchedule" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    location text,
    max_participants integer,
    status text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    "companyId" text,
    notes text,
    "trainerId" text,
    delivery_mode text,
    attendance jsonb,
    "hasAttestati" boolean DEFAULT false NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 215 (class 1259 OID 39282)
-- Name: CourseSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseSession" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    start text NOT NULL,
    "end" text NOT NULL,
    "trainerId" text,
    "coTrainerId" text,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 211 (class 1259 OID 39236)
-- Name: Employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    title text,
    status text,
    hired_date timestamp(3) without time zone,
    "companyId" text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    birth_date timestamp(3) without time zone,
    codice_fiscale text NOT NULL,
    notes text,
    postal_code text,
    province text,
    residence_address text,
    residence_city text,
    photo_url text,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 39368)
-- Name: Fattura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Fattura" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 39377)
-- Name: FatturaAzienda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FatturaAzienda" (
    id text NOT NULL,
    "fatturaId" text NOT NULL,
    "aziendaId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 39463)
-- Name: GdprAuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GdprAuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "resourceType" text,
    "resourceId" text,
    "dataAccessed" jsonb,
    "ipAddress" text,
    "userAgent" text,
    "companyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 39317)
-- Name: LetteraIncarico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LetteraIncarico" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "trainerId" text NOT NULL,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 39406)
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    resource text NOT NULL,
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 39343)
-- Name: Preventivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Preventivo" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 39360)
-- Name: PreventivoAzienda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PreventivoAzienda" (
    id text NOT NULL,
    "preventivoId" text NOT NULL,
    "aziendaId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 223 (class 1259 OID 39352)
-- Name: PreventivoPartecipante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PreventivoPartecipante" (
    id text NOT NULL,
    "preventivoId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 233 (class 1259 OID 39444)
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "deviceInfo" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    eliminato boolean DEFAULT false NOT NULL,
    "personId" text NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 39326)
-- Name: RegistroPresenze; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegistroPresenze" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "sessionId" text NOT NULL,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    "formatoreId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 39335)
-- Name: RegistroPresenzePartecipante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegistroPresenzePartecipante" (
    id text NOT NULL,
    "registroId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 39396)
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL,
    "displayName" text,
    description text,
    permissions jsonb,
    "isSystemRole" boolean DEFAULT false NOT NULL,
    "companyId" text,
    "tenantId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 216 (class 1259 OID 39290)
-- Name: ScheduleCompany; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ScheduleCompany" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    "companyId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 218 (class 1259 OID 39307)
-- Name: TemplateLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TemplateLink" (
    id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    content text,
    footer text,
    header text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "logoPosition" text,
    "fileFormat" text,
    "googleDocsUrl" text,
    "logoImage" text,
    "companyId" text,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 39424)
-- Name: TestDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestDocument" (
    id text NOT NULL,
    "scheduledCourseId" text NOT NULL,
    "trainerId" text,
    "nomeFile" text NOT NULL,
    url text NOT NULL,
    "dataGenerazione" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroProgressivo" integer NOT NULL,
    "annoProgressivo" integer NOT NULL,
    stato text DEFAULT 'generato'::text NOT NULL,
    tipologia text DEFAULT 'test'::text NOT NULL,
    punteggio double precision,
    durata integer,
    note text,
    "dataTest" timestamp(3) without time zone,
    "sogliaSuperamento" double precision,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 232 (class 1259 OID 39435)
-- Name: TestPartecipante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestPartecipante" (
    id text NOT NULL,
    "testId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    punteggio double precision,
    stato text DEFAULT 'da completare'::text NOT NULL,
    note text,
    "dataConsegna" timestamp(3) without time zone,
    "tempoImpiegato" integer,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 39385)
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "firstName" text,
    "lastName" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    "profileImage" text,
    "failedAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "companyId" text,
    "tenantId" text,
    "globalRole" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 39453)
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 237 (class 1259 OID 39481)
-- Name: UserSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "sessionToken" text NOT NULL,
    "deviceInfo" jsonb,
    "ipAddress" text,
    "userAgent" text,
    "lastActivity" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 39541)
-- Name: _PermissionToRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PermissionToRole" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- TOC entry 209 (class 1259 OID 39215)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 240 (class 1259 OID 39517)
-- Name: enhanced_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enhanced_user_roles (
    id text NOT NULL,
    user_id text NOT NULL,
    tenant_id text NOT NULL,
    role_type text NOT NULL,
    role_scope text DEFAULT 'tenant'::text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    company_id text,
    department_id text,
    is_active boolean DEFAULT true NOT NULL,
    assigned_by text,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 244 (class 1259 OID 39979)
-- Name: person_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_roles (
    id text NOT NULL,
    "personId" text NOT NULL,
    "roleType" public.role_types NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "assignedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text,
    "validFrom" date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" date,
    "companyId" text,
    "tenantId" text,
    "departmentId" text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL
);


--
-- TOC entry 243 (class 1259 OID 39967)
-- Name: persons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persons (
    id text NOT NULL,
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    "birthDate" date,
    "taxCode" character varying(16),
    "vatNumber" character varying(11),
    "residenceAddress" character varying(255),
    "residenceCity" character varying(100),
    "postalCode" character varying(10),
    province character varying(2),
    username character varying(50),
    password character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    status public.person_status DEFAULT 'ACTIVE'::public.person_status NOT NULL,
    title character varying(100),
    "hiredDate" date,
    "hourlyRate" numeric(10,2),
    iban character varying(34),
    "registerCode" character varying(50),
    certifications text[],
    specialties text[],
    "profileImage" character varying(500),
    notes text,
    "lastLogin" timestamp without time zone,
    "failedAttempts" smallint DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp without time zone,
    "globalRole" character varying(50),
    "tenantId" text,
    "companyId" text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    "deletedAt" timestamp without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "gdprConsentDate" timestamp without time zone,
    "gdprConsentVersion" character varying(10),
    "dataRetentionUntil" date
);


--
-- TOC entry 245 (class 1259 OID 39991)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    "personRoleId" text NOT NULL,
    permission public.person_permissions NOT NULL,
    "isGranted" boolean DEFAULT true NOT NULL,
    "grantedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "grantedBy" text
);


--
-- TOC entry 239 (class 1259 OID 39506)
-- Name: tenant_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_configurations (
    id text NOT NULL,
    tenant_id text NOT NULL,
    config_key text NOT NULL,
    config_value jsonb,
    config_type text DEFAULT 'general'::text NOT NULL,
    is_encrypted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 241 (class 1259 OID 39530)
-- Name: tenant_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_usage (
    id text NOT NULL,
    tenant_id text NOT NULL,
    usage_type text NOT NULL,
    usage_value integer DEFAULT 0 NOT NULL,
    usage_limit integer,
    billing_period timestamp(3) without time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 238 (class 1259 OID 39492)
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    domain text,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    billing_plan text DEFAULT 'basic'::text NOT NULL,
    max_users integer DEFAULT 50 NOT NULL,
    max_companies integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


--
-- TOC entry 4214 (class 0 OID 39415)
-- Dependencies: 230
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLog" (id, "userId", action, resource, "resourceId", details, "ipAddress", "userAgent", "timestamp", eliminato) FROM stdin;
\.


--
-- TOC entry 4201 (class 0 OID 39298)
-- Dependencies: 217
-- Data for Name: Attestato; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attestato" (id, "scheduledCourseId", "partecipanteId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- TOC entry 4194 (class 0 OID 39224)
-- Dependencies: 210
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Company" (id, created_at, updated_at, codice_ateco, iban, pec, sdi, cap, citta, codice_fiscale, mail, note, persona_riferimento, piva, provincia, ragione_sociale, sede_azienda, telefono, eliminato, "tenantId", slug, domain, settings, subscription_plan, is_active) FROM stdin;
company-demo-001	2025-06-22 06:46:07.583	2025-06-22 06:46:07.583	\N	\N	\N	\N	20100	Milano	12345678901	info@acme-corp.com	\N	\N	12345678901	MI	ACME Corporation S.r.l.	Via Roma 123, 20100 Milano	+39 02 1234567	f	tenant-demo-001	acme-corp	\N	{}	basic	t
\.


--
-- TOC entry 4220 (class 0 OID 39472)
-- Dependencies: 236
-- Data for Name: ConsentRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConsentRecord" (id, "userId", "consentType", "consentGiven", "consentVersion", "givenAt", "withdrawnAt", "ipAddress", "userAgent", eliminato) FROM stdin;
\.


--
-- TOC entry 4196 (class 0 OID 39245)
-- Dependencies: 212
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Course" (id, title, category, description, duration, status, created_at, updated_at, certifications, code, contents, "maxPeople", "pricePerPerson", regulation, "renewalDuration", "validityYears", "tenantId", eliminato) FROM stdin;
course-safety-001	Corso di Sicurezza sul Lavoro - Base	Sicurezza	Corso base sulla sicurezza nei luoghi di lavoro secondo D.Lgs. 81/08	8 ore	ACTIVE	2025-06-22 06:46:07.664	2025-06-22 06:46:07.664	\N	SAFE-001	Normativa, rischi, prevenzione, DPI, emergenze	15	150	\N	\N	5	tenant-demo-001	f
\.


--
-- TOC entry 4198 (class 0 OID 39264)
-- Dependencies: 214
-- Data for Name: CourseEnrollment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CourseEnrollment" (id, "scheduleId", "employeeId", status, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- TOC entry 4197 (class 0 OID 39254)
-- Dependencies: 213
-- Data for Name: CourseSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CourseSchedule" (id, "courseId", start_date, end_date, location, max_participants, status, created_at, updated_at, "companyId", notes, "trainerId", delivery_mode, attendance, "hasAttestati", eliminato) FROM stdin;
schedule-001	course-safety-001	2024-02-15 09:00:00	2024-02-15 17:00:00	Aula Formazione - Sede Milano	15	SCHEDULED	2025-06-22 06:46:07.665	2025-06-22 06:46:07.665	company-demo-001	Corso obbligatorio per tutti i nuovi assunti	person-trainer-001	IN_PERSON	\N	f	f
\.


--
-- TOC entry 4199 (class 0 OID 39282)
-- Dependencies: 215
-- Data for Name: CourseSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CourseSession" (id, "scheduleId", date, start, "end", "trainerId", "coTrainerId", eliminato) FROM stdin;
\.


--
-- TOC entry 4195 (class 0 OID 39236)
-- Dependencies: 211
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Employee" (id, first_name, last_name, email, phone, title, status, hired_date, "companyId", created_at, updated_at, birth_date, codice_fiscale, notes, postal_code, province, residence_address, residence_city, photo_url, eliminato) FROM stdin;
\.


--
-- TOC entry 4209 (class 0 OID 39368)
-- Dependencies: 225
-- Data for Name: Fattura; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Fattura" (id, "scheduledCourseId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- TOC entry 4210 (class 0 OID 39377)
-- Dependencies: 226
-- Data for Name: FatturaAzienda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FatturaAzienda" (id, "fatturaId", "aziendaId", eliminato) FROM stdin;
\.


--
-- TOC entry 4219 (class 0 OID 39463)
-- Dependencies: 235
-- Data for Name: GdprAuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GdprAuditLog" (id, "userId", action, "resourceType", "resourceId", "dataAccessed", "ipAddress", "userAgent", "companyId", "createdAt", eliminato) FROM stdin;
\.


--
-- TOC entry 4203 (class 0 OID 39317)
-- Dependencies: 219
-- Data for Name: LetteraIncarico; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LetteraIncarico" (id, "scheduledCourseId", "trainerId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- TOC entry 4213 (class 0 OID 39406)
-- Dependencies: 229
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Permission" (id, name, description, resource, action, "createdAt", "updatedAt", eliminato) FROM stdin;
\.


--
-- TOC entry 4206 (class 0 OID 39343)
-- Dependencies: 222
-- Data for Name: Preventivo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Preventivo" (id, "scheduledCourseId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- TOC entry 4208 (class 0 OID 39360)
-- Dependencies: 224
-- Data for Name: PreventivoAzienda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PreventivoAzienda" (id, "preventivoId", "aziendaId", eliminato) FROM stdin;
\.


--
-- TOC entry 4207 (class 0 OID 39352)
-- Dependencies: 223
-- Data for Name: PreventivoPartecipante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PreventivoPartecipante" (id, "preventivoId", "partecipanteId", eliminato) FROM stdin;
\.


--
-- TOC entry 4217 (class 0 OID 39444)
-- Dependencies: 233
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, token, "expiresAt", "deviceInfo", "createdAt", "revokedAt", eliminato, "personId") FROM stdin;
6f01ddec-2c4f-406a-abe4-0b5acd4e3747	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJzb25JZCI6InBlcnNvbi1hZG1pbi0wMDEiLCJpYXQiOjE3NTEyMTQ2NDksImV4cCI6MTc1MTgxOTQ0OSwiYXVkIjoidHJhaW5pbmctcGxhdGZvcm0tdXNlcnMiLCJpc3MiOiJ0cmFpbmluZy1wbGF0Zm9ybSJ9.Rb3LNhXQp0xktb2Qu9jv6-OjKf4QuCrm-v5veZwoFwQ	2025-07-06 16:30:49.363	{"ipAddress": "127.0.0.1", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	2025-06-29 16:30:49.368	\N	f	person-admin-001
\.


--
-- TOC entry 4204 (class 0 OID 39326)
-- Dependencies: 220
-- Data for Name: RegistroPresenze; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistroPresenze" (id, "scheduledCourseId", "sessionId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", "formatoreId", eliminato) FROM stdin;
\.


--
-- TOC entry 4205 (class 0 OID 39335)
-- Dependencies: 221
-- Data for Name: RegistroPresenzePartecipante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RegistroPresenzePartecipante" (id, "registroId", "partecipanteId", eliminato) FROM stdin;
\.


--
-- TOC entry 4212 (class 0 OID 39396)
-- Dependencies: 228
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, name, "displayName", description, permissions, "isSystemRole", "companyId", "tenantId", "createdAt", "updatedAt", eliminato) FROM stdin;
a8c576bf-30ab-4e22-9244-c2ec6e63103f	global_admin	Amministratore Globale	Accesso completo a tutto il sistema	"[\\"users.create\\",\\"users.read\\",\\"users.update\\",\\"users.delete\\",\\"companies.create\\",\\"companies.read\\",\\"companies.update\\",\\"companies.delete\\",\\"employees.create\\",\\"employees.read\\",\\"employees.update\\",\\"employees.delete\\",\\"courses.create\\",\\"courses.read\\",\\"courses.update\\",\\"courses.delete\\",\\"documents.create\\",\\"documents.read\\",\\"documents.update\\",\\"documents.delete\\",\\"system.admin\\"]"	t	\N	\N	2025-06-22 07:12:11.686	2025-06-22 07:12:11.686	f
ff1a608e-6f3c-46d7-b9f3-6a8440d9a192	company_admin	Amministratore Azienda	Amministratore di una specifica azienda	"[\\"employees.create\\",\\"employees.read\\",\\"employees.update\\",\\"employees.delete\\",\\"courses.read\\",\\"courses.update\\",\\"documents.create\\",\\"documents.read\\",\\"documents.update\\"]"	t	\N	\N	2025-06-22 07:12:11.691	2025-06-22 07:12:11.691	f
cb3a9dee-c934-4b2a-bf39-9ae14c86010c	user	Utente Standard	Utente con accesso limitato	"[\\"employees.read\\",\\"courses.read\\",\\"documents.read\\"]"	t	\N	\N	2025-06-22 07:12:11.692	2025-06-22 07:12:11.692	f
\.


--
-- TOC entry 4200 (class 0 OID 39290)
-- Dependencies: 216
-- Data for Name: ScheduleCompany; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ScheduleCompany" (id, "scheduleId", "companyId", eliminato) FROM stdin;
\.


--
-- TOC entry 4202 (class 0 OID 39307)
-- Dependencies: 218
-- Data for Name: TemplateLink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TemplateLink" (id, name, url, type, "createdAt", "updatedAt", content, footer, header, "isDefault", "logoPosition", "fileFormat", "googleDocsUrl", "logoImage", "companyId", eliminato) FROM stdin;
\.


--
-- TOC entry 4215 (class 0 OID 39424)
-- Dependencies: 231
-- Data for Name: TestDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestDocument" (id, "scheduledCourseId", "trainerId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", stato, tipologia, punteggio, durata, note, "dataTest", "sogliaSuperamento", eliminato) FROM stdin;
\.


--
-- TOC entry 4216 (class 0 OID 39435)
-- Dependencies: 232
-- Data for Name: TestPartecipante; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestPartecipante" (id, "testId", "partecipanteId", punteggio, stato, note, "dataConsegna", "tempoImpiegato", eliminato) FROM stdin;
\.


--
-- TOC entry 4211 (class 0 OID 39385)
-- Dependencies: 227
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, username, email, password, "firstName", "lastName", "isActive", "lastLogin", "profileImage", "failedAttempts", "lockedUntil", "companyId", "tenantId", "globalRole", "createdAt", "updatedAt", eliminato) FROM stdin;
58662450-6a57-42fe-8713-1b4d06fc0ce5	admin	admin@example.com	$2a$12$Sw3C1ldg3JBDo8Re02IZhej8S6JuDuaAlj4B6bn4GwcRFatumuU..	System	Administrator	t	2025-06-24 21:28:24.259	\N	0	\N	\N	\N	SUPER_ADMIN	2025-06-22 07:11:43.929	2025-06-24 21:28:24.26	f
\.


--
-- TOC entry 4218 (class 0 OID 39453)
-- Dependencies: 234
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRole" (id, "userId", "roleId", "assignedAt", "assignedBy", "isActive", "expiresAt", eliminato) FROM stdin;
\.


--
-- TOC entry 4221 (class 0 OID 39481)
-- Dependencies: 237
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserSession" (id, "userId", "sessionToken", "deviceInfo", "ipAddress", "userAgent", "lastActivity", "expiresAt", "isActive", "createdAt", eliminato) FROM stdin;
cb26f6ab-1172-4158-809a-f2343b6215bd	58662450-6a57-42fe-8713-1b4d06fc0ce5	d78774d8fc0fb8cc90e6d1ede485649af8750e8e8debf85cacdb7caefea08ed8	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 11:51:25.026	2025-06-30 11:51:25.025	t	2025-06-23 11:51:25.026	f
e9b9f405-3a4b-43ab-8e96-13651f9b9bfb	58662450-6a57-42fe-8713-1b4d06fc0ce5	4c269cb432f6a8636d9a080e7621a5a714986bae307079065a9d3b43c3a7d324	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 11:51:42.806	2025-06-30 11:51:42.806	t	2025-06-23 11:51:42.806	f
9c128216-ad1c-4c73-82a8-e3891dd64cdf	58662450-6a57-42fe-8713-1b4d06fc0ce5	e91ce765f9f6e0abdddfbe0825fc688bf6288549faa9483a5748ed15ecd2faf3	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 11:57:26.17	2025-06-30 11:57:26.169	t	2025-06-23 11:57:26.17	f
7a9b8dcc-afdc-4fc9-9f9a-ca790a06c11c	58662450-6a57-42fe-8713-1b4d06fc0ce5	1e0e93ffe09676d38f79c1315e07d910ed1bc975801e47aabd40f246fd4c2d29	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 12:04:59.933	2025-06-30 12:04:59.932	t	2025-06-23 12:04:59.933	f
13c642d1-e50f-4734-a735-4cf03fce4fe5	58662450-6a57-42fe-8713-1b4d06fc0ce5	baf8e75953334326516dbbd41ae3fcaefbdd6c27d1186c8f460791be68461f57	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 12:52:38.557	2025-06-30 12:52:38.556	t	2025-06-23 12:52:38.557	f
27e0b268-d0b6-4cc8-9da3-72e856114b6f	58662450-6a57-42fe-8713-1b4d06fc0ce5	5ff3614d6da11bb2e15d6738c391bca8601066d92789eef51764fa05b0def5fc	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 15:40:16.195	2025-06-30 15:40:16.194	t	2025-06-23 15:40:16.195	f
de93042d-fe96-4a85-afb2-9410ab99c4c7	58662450-6a57-42fe-8713-1b4d06fc0ce5	85d285e079542491e447ab6336024845fb5cf74ab17f90bb8696465d6ea4ed5d	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 16:36:41.109	2025-06-30 16:36:41.108	t	2025-06-23 16:36:41.109	f
632ec439-47cb-4c66-81e4-819ee7f6c551	58662450-6a57-42fe-8713-1b4d06fc0ce5	fb46bf71a13d16eac9f8197837bf9a40bff84cb243fd5e47436210eb4b8f56b7	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "axios/1.10.0"}	127.0.0.1	axios/1.10.0	2025-06-23 16:37:56.762	2025-06-30 16:37:56.762	t	2025-06-23 16:37:56.762	f
c4b3a593-80ca-4324-a14d-ddd39d3efa03	58662450-6a57-42fe-8713-1b4d06fc0ce5	4743624c15cb6148c78df87ab63814b5acc3b3c8739956c25dec29b9ef4ab0ca	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "axios/1.10.0"}	127.0.0.1	axios/1.10.0	2025-06-23 16:39:17.244	2025-06-30 16:39:17.243	t	2025-06-23 16:39:17.244	f
35b89380-1092-42e9-80c6-20effbbff664	58662450-6a57-42fe-8713-1b4d06fc0ce5	cfffcc43d6c85e2c8b35fb5ea907381a36f18b39d72382408c49fadaf719c688	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "axios/1.10.0"}	127.0.0.1	axios/1.10.0	2025-06-23 16:42:37.915	2025-06-30 16:42:37.912	t	2025-06-23 16:42:37.915	f
86a8d9bd-71e5-4903-ae8f-1802fe0a2d3b	58662450-6a57-42fe-8713-1b4d06fc0ce5	9f6fc692d8d6ec75a94ef479ec512327352d90d030bacba60f42ff4acd257f14	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "axios/1.10.0"}	127.0.0.1	axios/1.10.0	2025-06-23 16:46:48.845	2025-06-30 16:46:48.844	t	2025-06-23 16:46:48.845	f
daebc6e2-de33-441e-935d-d9d5f20187b5	58662450-6a57-42fe-8713-1b4d06fc0ce5	38b72eccd0fb4540248523f950014aefbb113f7cee77cfbe6a0a362337c3e721	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 21:46:25.541	2025-06-30 21:46:25.54	t	2025-06-23 21:46:25.541	f
dd6ecb4b-8c33-4d57-9d5d-3568283d2814	58662450-6a57-42fe-8713-1b4d06fc0ce5	f780c0bf69962db7835ce401eacc214a5cf92580fcc7ec0379faefe609805300	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-23 21:56:26.069	2025-06-30 21:56:26.068	t	2025-06-23 21:56:26.069	f
5449fc12-a29d-4f6a-a0e7-46719d478256	58662450-6a57-42fe-8713-1b4d06fc0ce5	1eeed6f50c9be605f4fcf8349bed259c93b5014c06d8f6d9c18d53e3118cbd9c	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 14:42:33.364	2025-07-01 14:42:33.363	t	2025-06-24 14:42:33.364	f
1cf3dea8-1593-40ab-b69d-fc2aad1b1638	58662450-6a57-42fe-8713-1b4d06fc0ce5	2c144a8d02e07d1f6e632588cc0bfc7871e86bddb8e1203f31eec56ef0922a6d	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 14:45:24.772	2025-07-01 14:45:24.772	t	2025-06-24 14:45:24.772	f
4e0eb980-4d73-4e12-aa99-36530d2e021b	58662450-6a57-42fe-8713-1b4d06fc0ce5	e5a14816ac561d5ac77d485f18f35e7cbe7c9870cc50f83f3e66b05d0ce352c8	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 16:53:25.154	2025-07-01 16:53:25.153	t	2025-06-24 16:53:25.154	f
885f051e-4ff6-4507-9931-be659d135ed2	58662450-6a57-42fe-8713-1b4d06fc0ce5	40812826a7fde820aaccad0dc306b0c32bbd37e4a2bd2c9b99b493df34827f4c	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 17:13:56.815	2025-07-01 17:13:56.814	t	2025-06-24 17:13:56.815	f
de68fb32-5fe1-4026-b21f-83f4c411d05d	58662450-6a57-42fe-8713-1b4d06fc0ce5	90ea8baff940cf815a4cab2aa103d596133890436468ddf8295bf003323f812c	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 17:23:35.103	2025-07-01 17:23:35.103	t	2025-06-24 17:23:35.103	f
89a952b1-9802-40fa-83a1-41b000ac377d	58662450-6a57-42fe-8713-1b4d06fc0ce5	cb2fdf840733534ceae729c09ced9211e807bb3b2bbe79da496ff47a3379d73a	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 17:24:39.461	2025-07-01 17:24:39.461	t	2025-06-24 17:24:39.461	f
c8011ae7-b42a-417b-864a-d909972883bf	58662450-6a57-42fe-8713-1b4d06fc0ce5	d0c2be73d4aa430330bf5d72ad14ea08146726aa3f6263fd661d900ca4e6b451	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "curl/8.7.1"}	127.0.0.1	curl/8.7.1	2025-06-24 17:27:58.482	2025-07-01 17:27:58.481	t	2025-06-24 17:27:58.482	f
040e1068-651f-4d65-a4e3-2a0dfe8886d8	58662450-6a57-42fe-8713-1b4d06fc0ce5	879a368a8230fd30feaecd47f38f2cb6970f896d066eec6af96a2553003124a7	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	2025-06-24 17:32:27.999	2025-07-01 17:32:27.999	t	2025-06-24 17:32:27.999	f
8fe31019-42fe-4789-a13a-40c4062a1ecd	58662450-6a57-42fe-8713-1b4d06fc0ce5	edce3d0c34e7eed0c2606b09cce799183cb68e28b70bd646a96f1a50f2e0db43	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	2025-06-24 17:32:40.888	2025-07-01 17:32:40.887	t	2025-06-24 17:32:40.888	f
6c58ceec-b8e0-4e52-a947-eaf9e9bcb24d	58662450-6a57-42fe-8713-1b4d06fc0ce5	e90745f1de28dc8a4ea84561e8fc70e7a015ac3c1cf88b6b1ddd13ca98213f0c	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	2025-06-24 17:44:20.777	2025-07-01 17:44:20.776	t	2025-06-24 17:44:20.777	f
637df01c-1b8d-4d99-bdf3-62cb47b44b2c	58662450-6a57-42fe-8713-1b4d06fc0ce5	609c7d83be4b29b85a066da9a98eae025131319704736909a2cd59ceac5b3e68	{"ip": "127.0.0.1", "deviceId": null, "platform": "web", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	2025-06-24 21:28:24.264	2025-07-01 21:28:24.263	t	2025-06-24 21:28:24.264	f
\.


--
-- TOC entry 4226 (class 0 OID 39541)
-- Dependencies: 242
-- Data for Name: _PermissionToRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_PermissionToRole" ("A", "B") FROM stdin;
\.


--
-- TOC entry 4193 (class 0 OID 39215)
-- Dependencies: 209
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fd8ba6ae-903b-4bf0-a6cc-51f51902d0e2	4338edb5dc5e328ec30262cb4849af6976dcfc82daf15a598d521f81c594ab15	2025-06-22 08:45:59.081018+02	20250620142706_init_with_fixed_schema	\N	\N	2025-06-22 08:45:59.028942+02	1
569088d5-7ed4-4bed-b580-9fe3737f8fca	e70a2a223ca929dcac3d05e6722997b026c2279cdd205acc527dd131246b5aa6	2025-06-22 08:45:59.0828+02	20250621204433_add_unique_user_role	\N	\N	2025-06-22 08:45:59.081616+02	1
09b349a7-4a06-401b-b9c1-2f515632f888	e877f29968475c6e3ccd01cc2af8dc5c196d32e51b1d8ce3213ee2f612b56735	2025-06-22 08:45:59.084281+02	20250621204653_add_unique_role_name_company	\N	\N	2025-06-22 08:45:59.08351+02	1
78d0e313-046c-4205-b559-4fed8443bbd1	498070fbcb1351a55b1144493c18f0779091980824a7de253d7ea8bf413973ac	2025-06-22 08:45:59.085566+02	20250621204724_update_role_unique_constraint	\N	\N	2025-06-22 08:45:59.084663+02	1
813572e7-d289-48c1-83e4-c77e158f4347	8956a924e0cd0545ea1d7d34d18a068217af2b9196e8226ac38fe45053d65cbc	2025-06-22 08:45:59.096671+02	20250622053010_add_person_unified_model	\N	\N	2025-06-22 08:45:59.086142+02	1
b54df762-49e0-4c1c-9eee-b0d4669a21b4	978d8c734e1799920f55643ddf92ec78aea4be69c81e8651a20e6c791f2d01ca	2025-06-22 08:45:59.763148+02	20250622064559_remove_trainer_model_unified_to_person	\N	\N	2025-06-22 08:45:59.756097+02	1
691e87b7-0bb9-4da3-905e-28363646331e	948dedb07083c7c3457758a993f62192de81a32390d437f8b036892aaa30ad79	2025-06-28 14:20:52.234549+02	20250628122052_fix_refresh_token_person_relation	\N	\N	2025-06-28 14:20:52.22966+02	1
\.


--
-- TOC entry 4224 (class 0 OID 39517)
-- Dependencies: 240
-- Data for Name: enhanced_user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enhanced_user_roles (id, user_id, tenant_id, role_type, role_scope, permissions, company_id, department_id, is_active, assigned_by, assigned_at, expires_at, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- TOC entry 4228 (class 0 OID 39979)
-- Dependencies: 244
-- Data for Name: person_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.person_roles (id, "personId", "roleType", "isActive", "isPrimary", "assignedAt", "assignedBy", "validFrom", "validUntil", "companyId", "tenantId", "departmentId", "createdAt", "updatedAt") FROM stdin;
2313e709-2795-4fec-8f1e-98cad6af194c	person-admin-001	SUPER_ADMIN	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.651	2025-06-22 06:46:07.651
ce0fd4fe-1f25-4137-8b41-d75ce1bc695d	person-admin-001	COMPANY_ADMIN	t	f	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.654	2025-06-22 06:46:07.654
619b734d-55df-4d40-baf6-6ce2ead2bb65	person-hr-001	HR_MANAGER	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.656	2025-06-22 06:46:07.656
2889f494-76a6-4d46-8d0c-865379f8c3a5	person-hr-001	EMPLOYEE	t	f	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.657	2025-06-22 06:46:07.657
23ea1abf-c63a-4b82-821d-0b31d29dde65	person-emp-001	EMPLOYEE	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.658	2025-06-22 06:46:07.658
9696efec-10b8-4e2f-9ecc-24edf318062a	person-trainer-001	TRAINER	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.66	2025-06-22 06:46:07.66
b5e251c2-b5bf-49e4-95b2-9959bb437fd0	person-trainer-001	EMPLOYEE	t	f	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.66	2025-06-22 06:46:07.66
36138ad5-be51-4490-ae2c-07a46fc25d7b	person-trainer-002	EXTERNAL_TRAINER	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	\N	tenant-demo-001	\N	2025-06-22 06:46:07.662	2025-06-22 06:46:07.662
87ea9a6a-cb16-44e8-a6a0-118bd148350c	person-manager-001	MANAGER	t	t	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.663	2025-06-22 06:46:07.663
f0dc6102-1b97-42e0-989a-701a52a55c1f	person-manager-001	EMPLOYEE	t	f	2025-06-22 06:46:07.645	\N	2025-06-22	\N	company-demo-001	tenant-demo-001	\N	2025-06-22 06:46:07.663	2025-06-22 06:46:07.663
\.


--
-- TOC entry 4227 (class 0 OID 39967)
-- Dependencies: 243
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.persons (id, "firstName", "lastName", email, phone, "birthDate", "taxCode", "vatNumber", "residenceAddress", "residenceCity", "postalCode", province, username, password, "isActive", status, title, "hiredDate", "hourlyRate", iban, "registerCode", certifications, specialties, "profileImage", notes, "lastLogin", "failedAttempts", "lockedUntil", "globalRole", "tenantId", "companyId", "createdAt", "updatedAt", "deletedAt", "isDeleted", "gdprConsentDate", "gdprConsentVersion", "dataRetentionUntil") FROM stdin;
person-hr-001	Laura	Bianchi	laura.bianchi@acme-corp.com	+39 333 2345678	\N	\N	\N	\N	\N	\N	\N	laura.bianchi	$2a$10$N5W2o2lckS7lp8s/wXPjnezEBuWWIBJLLIOpwO/3zP5dxH9HBp0rG	t	ACTIVE	HR Manager	2023-01-15	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	tenant-demo-001	company-demo-001	2025-06-22 06:46:07.655	2025-06-22 06:46:07.655	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
person-emp-001	Giuseppe	Verdi	giuseppe.verdi@acme-corp.com	+39 333 3456789	1985-05-15	VRDGPP85E15F205X	\N	Via Garibaldi 45	Milano	20121	MI	\N	\N	t	ACTIVE	Operaio Specializzato	2023-03-01	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	tenant-demo-001	company-demo-001	2025-06-22 06:46:07.657	2025-06-22 06:46:07.657	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
person-trainer-001	Anna	Ferrari	anna.ferrari@acme-corp.com	+39 333 4567890	\N	\N	\N	\N	\N	\N	\N	anna.ferrari	$2a$10$N5W2o2lckS7lp8s/wXPjnezEBuWWIBJLLIOpwO/3zP5dxH9HBp0rG	t	ACTIVE	Senior Trainer	2022-09-01	45.00	\N	\N	{"ISO 45001","Formatore Sicurezza","First Aid"}	{"Sicurezza sul Lavoro","Primo Soccorso",Antincendio}	\N	\N	\N	0	\N	\N	tenant-demo-001	company-demo-001	2025-06-22 06:46:07.659	2025-06-22 06:46:07.659	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
person-trainer-002	Marco	Colombo	marco.colombo@freelance.com	+39 333 5678901	\N	\N	12345678901	\N	\N	\N	\N	marco.colombo	$2a$10$N5W2o2lckS7lp8s/wXPjnezEBuWWIBJLLIOpwO/3zP5dxH9HBp0rG	t	ACTIVE	\N	\N	60.00	IT60 X054 2811 1010 0000 0123 456	\N	{"Formatore Qualificato","Esperto Sicurezza"}	{"Formazione Manageriale",Leadership,"Team Building"}	\N	\N	\N	0	\N	\N	tenant-demo-001	\N	2025-06-22 06:46:07.661	2025-06-22 06:46:07.661	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
person-manager-001	Francesca	Romano	francesca.romano@acme-corp.com	+39 333 6789012	\N	\N	\N	\N	\N	\N	\N	francesca.romano	$2a$10$N5W2o2lckS7lp8s/wXPjnezEBuWWIBJLLIOpwO/3zP5dxH9HBp0rG	t	ACTIVE	Production Manager	2021-06-01	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	tenant-demo-001	company-demo-001	2025-06-22 06:46:07.662	2025-06-22 06:46:07.662	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
person-admin-001	Mario	Rossi	mario.rossi@acme-corp.com	+39 333 1234567	\N	\N	\N	\N	\N	\N	\N	mario.rossi	$2a$10$N5W2o2lckS7lp8s/wXPjnezEBuWWIBJLLIOpwO/3zP5dxH9HBp0rG	t	ACTIVE	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-29 16:30:49.369	0	\N	\N	tenant-demo-001	company-demo-001	2025-06-22 06:46:07.647	2025-06-29 16:30:49.37	\N	f	2025-06-22 06:46:07.645	1.0	2032-06-22
\.


--
-- TOC entry 4229 (class 0 OID 39991)
-- Dependencies: 245
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, "personRoleId", permission, "isGranted", "grantedAt", "grantedBy") FROM stdin;
\.


--
-- TOC entry 4223 (class 0 OID 39506)
-- Dependencies: 239
-- Data for Name: tenant_configurations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_configurations (id, tenant_id, config_key, config_value, config_type, is_encrypted, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- TOC entry 4225 (class 0 OID 39530)
-- Dependencies: 241
-- Data for Name: tenant_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_usage (id, tenant_id, usage_type, usage_value, usage_limit, billing_period, metadata, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- TOC entry 4222 (class 0 OID 39492)
-- Dependencies: 238
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, slug, domain, settings, billing_plan, max_users, max_companies, is_active, created_at, updated_at, eliminato) FROM stdin;
tenant-demo-001	Demo Company	demo-company	demo.training-platform.com	{"gdpr": {"enabled": true, "consentRequired": true, "dataRetentionYears": 7}, "features": {"multiRole": true, "advancedPermissions": true}}	premium	100	5	t	2025-06-22 06:46:07.578	2025-06-22 06:46:07.578	f
\.


--
-- TOC entry 3938 (class 2606 OID 39423)
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 3907 (class 2606 OID 39306)
-- Name: Attestato Attestato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_pkey" PRIMARY KEY (id);


--
-- TOC entry 3889 (class 2606 OID 39235)
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- TOC entry 3951 (class 2606 OID 39480)
-- Name: ConsentRecord ConsentRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY (id);


--
-- TOC entry 3900 (class 2606 OID 39272)
-- Name: CourseEnrollment CourseEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY (id);


--
-- TOC entry 3898 (class 2606 OID 39263)
-- Name: CourseSchedule CourseSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_pkey" PRIMARY KEY (id);


--
-- TOC entry 3903 (class 2606 OID 39289)
-- Name: CourseSession CourseSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 3896 (class 2606 OID 39253)
-- Name: Course Course_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY (id);


--
-- TOC entry 3893 (class 2606 OID 39244)
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- TOC entry 3926 (class 2606 OID 39384)
-- Name: FatturaAzienda FatturaAzienda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_pkey" PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 39376)
-- Name: Fattura Fattura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Fattura"
    ADD CONSTRAINT "Fattura_pkey" PRIMARY KEY (id);


--
-- TOC entry 3949 (class 2606 OID 39471)
-- Name: GdprAuditLog GdprAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GdprAuditLog"
    ADD CONSTRAINT "GdprAuditLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 3911 (class 2606 OID 39325)
-- Name: LetteraIncarico LetteraIncarico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_pkey" PRIMARY KEY (id);


--
-- TOC entry 3936 (class 2606 OID 39414)
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- TOC entry 3922 (class 2606 OID 39367)
-- Name: PreventivoAzienda PreventivoAzienda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_pkey" PRIMARY KEY (id);


--
-- TOC entry 3920 (class 2606 OID 39359)
-- Name: PreventivoPartecipante PreventivoPartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_pkey" PRIMARY KEY (id);


--
-- TOC entry 3918 (class 2606 OID 39351)
-- Name: Preventivo Preventivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Preventivo"
    ADD CONSTRAINT "Preventivo_pkey" PRIMARY KEY (id);


--
-- TOC entry 3944 (class 2606 OID 39452)
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- TOC entry 3916 (class 2606 OID 39342)
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_pkey" PRIMARY KEY (id);


--
-- TOC entry 3914 (class 2606 OID 39334)
-- Name: RegistroPresenze RegistroPresenze_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_pkey" PRIMARY KEY (id);


--
-- TOC entry 3933 (class 2606 OID 39405)
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- TOC entry 3905 (class 2606 OID 39297)
-- Name: ScheduleCompany ScheduleCompany_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_pkey" PRIMARY KEY (id);


--
-- TOC entry 3909 (class 2606 OID 39316)
-- Name: TemplateLink TemplateLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLink"
    ADD CONSTRAINT "TemplateLink_pkey" PRIMARY KEY (id);


--
-- TOC entry 3940 (class 2606 OID 39434)
-- Name: TestDocument TestDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_pkey" PRIMARY KEY (id);


--
-- TOC entry 3942 (class 2606 OID 39443)
-- Name: TestPartecipante TestPartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_pkey" PRIMARY KEY (id);


--
-- TOC entry 3947 (class 2606 OID 39462)
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- TOC entry 3953 (class 2606 OID 39491)
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 3929 (class 2606 OID 39395)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 3886 (class 2606 OID 39223)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3963 (class 2606 OID 39529)
-- Name: enhanced_user_roles enhanced_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3985 (class 2606 OID 39990)
-- Name: person_roles person_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_roles
    ADD CONSTRAINT person_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3976 (class 2606 OID 39978)
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- TOC entry 3990 (class 2606 OID 39999)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3960 (class 2606 OID 39516)
-- Name: tenant_configurations tenant_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_configurations
    ADD CONSTRAINT tenant_configurations_pkey PRIMARY KEY (id);


--
-- TOC entry 3966 (class 2606 OID 39540)
-- Name: tenant_usage tenant_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 3957 (class 2606 OID 39505)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 3887 (class 1259 OID 39547)
-- Name: Company_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Company_domain_key" ON public."Company" USING btree (domain);


--
-- TOC entry 3890 (class 1259 OID 39546)
-- Name: Company_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Company_slug_key" ON public."Company" USING btree (slug);


--
-- TOC entry 3901 (class 1259 OID 39550)
-- Name: CourseEnrollment_scheduleId_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CourseEnrollment_scheduleId_employeeId_key" ON public."CourseEnrollment" USING btree ("scheduleId", "employeeId");


--
-- TOC entry 3894 (class 1259 OID 39549)
-- Name: Course_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Course_code_key" ON public."Course" USING btree (code);


--
-- TOC entry 3891 (class 1259 OID 39548)
-- Name: Employee_codice_fiscale_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Employee_codice_fiscale_key" ON public."Employee" USING btree (codice_fiscale);


--
-- TOC entry 3912 (class 1259 OID 39551)
-- Name: LetteraIncarico_scheduledCourseId_trainerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LetteraIncarico_scheduledCourseId_trainerId_key" ON public."LetteraIncarico" USING btree ("scheduledCourseId", "trainerId");


--
-- TOC entry 3934 (class 1259 OID 39555)
-- Name: Permission_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_name_key" ON public."Permission" USING btree (name);


--
-- TOC entry 3945 (class 1259 OID 39556)
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- TOC entry 3931 (class 1259 OID 40015)
-- Name: Role_name_companyId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_companyId_key" ON public."Role" USING btree (name, "companyId");


--
-- TOC entry 3954 (class 1259 OID 39557)
-- Name: UserSession_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON public."UserSession" USING btree ("sessionToken");


--
-- TOC entry 3927 (class 1259 OID 39553)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 3930 (class 1259 OID 39552)
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- TOC entry 3968 (class 1259 OID 39563)
-- Name: _PermissionToRole_AB_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON public."_PermissionToRole" USING btree ("A", "B");


--
-- TOC entry 3969 (class 1259 OID 39564)
-- Name: _PermissionToRole_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PermissionToRole_B_index" ON public."_PermissionToRole" USING btree ("B");


--
-- TOC entry 3964 (class 1259 OID 39561)
-- Name: enhanced_user_roles_user_id_tenant_id_role_type_company_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX enhanced_user_roles_user_id_tenant_id_role_type_company_id_key ON public.enhanced_user_roles USING btree (user_id, tenant_id, role_type, company_id);


--
-- TOC entry 3981 (class 1259 OID 40011)
-- Name: person_roles_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_roles_companyId_idx" ON public.person_roles USING btree ("companyId");


--
-- TOC entry 3982 (class 1259 OID 40009)
-- Name: person_roles_personId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_roles_personId_isActive_idx" ON public.person_roles USING btree ("personId", "isActive");


--
-- TOC entry 3983 (class 1259 OID 40013)
-- Name: person_roles_personId_roleType_companyId_tenantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "person_roles_personId_roleType_companyId_tenantId_key" ON public.person_roles USING btree ("personId", "roleType", "companyId", "tenantId");


--
-- TOC entry 3986 (class 1259 OID 40010)
-- Name: person_roles_roleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_roles_roleType_idx" ON public.person_roles USING btree ("roleType");


--
-- TOC entry 3987 (class 1259 OID 40012)
-- Name: person_roles_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_roles_tenantId_idx" ON public.person_roles USING btree ("tenantId");


--
-- TOC entry 3970 (class 1259 OID 40005)
-- Name: persons_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "persons_companyId_idx" ON public.persons USING btree ("companyId");


--
-- TOC entry 3971 (class 1259 OID 40008)
-- Name: persons_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "persons_createdAt_idx" ON public.persons USING btree ("createdAt");


--
-- TOC entry 3972 (class 1259 OID 40003)
-- Name: persons_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_email_idx ON public.persons USING btree (email);


--
-- TOC entry 3973 (class 1259 OID 40000)
-- Name: persons_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX persons_email_key ON public.persons USING btree (email);


--
-- TOC entry 3974 (class 1259 OID 40007)
-- Name: persons_isDeleted_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "persons_isDeleted_isActive_idx" ON public.persons USING btree ("isDeleted", "isActive");


--
-- TOC entry 3977 (class 1259 OID 40001)
-- Name: persons_taxCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "persons_taxCode_key" ON public.persons USING btree ("taxCode");


--
-- TOC entry 3978 (class 1259 OID 40006)
-- Name: persons_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "persons_tenantId_idx" ON public.persons USING btree ("tenantId");


--
-- TOC entry 3979 (class 1259 OID 40004)
-- Name: persons_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX persons_username_idx ON public.persons USING btree (username);


--
-- TOC entry 3980 (class 1259 OID 40002)
-- Name: persons_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX persons_username_key ON public.persons USING btree (username);


--
-- TOC entry 3988 (class 1259 OID 40014)
-- Name: role_permissions_personRoleId_permission_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "role_permissions_personRoleId_permission_key" ON public.role_permissions USING btree ("personRoleId", permission);


--
-- TOC entry 3961 (class 1259 OID 39560)
-- Name: tenant_configurations_tenant_id_config_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_configurations_tenant_id_config_key_key ON public.tenant_configurations USING btree (tenant_id, config_key);


--
-- TOC entry 3967 (class 1259 OID 39562)
-- Name: tenant_usage_tenant_id_usage_type_billing_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_usage_tenant_id_usage_type_billing_period_key ON public.tenant_usage USING btree (tenant_id, usage_type, billing_period);


--
-- TOC entry 3955 (class 1259 OID 39559)
-- Name: tenants_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_domain_key ON public.tenants USING btree (domain);


--
-- TOC entry 3958 (class 1259 OID 39558)
-- Name: tenants_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);


--
-- TOC entry 4026 (class 2606 OID 39745)
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4004 (class 2606 OID 39635)
-- Name: Attestato Attestato_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4005 (class 2606 OID 39640)
-- Name: Attestato Attestato_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3991 (class 2606 OID 39565)
-- Name: Company Company_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4036 (class 2606 OID 39795)
-- Name: ConsentRecord ConsentRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3997 (class 2606 OID 39595)
-- Name: CourseEnrollment CourseEnrollment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3998 (class 2606 OID 39600)
-- Name: CourseEnrollment CourseEnrollment_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3994 (class 2606 OID 39580)
-- Name: CourseSchedule CourseSchedule_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3995 (class 2606 OID 39585)
-- Name: CourseSchedule CourseSchedule_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3996 (class 2606 OID 41724)
-- Name: CourseSchedule CourseSchedule_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4000 (class 2606 OID 41729)
-- Name: CourseSession CourseSession_coTrainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_coTrainerId_fkey" FOREIGN KEY ("coTrainerId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3999 (class 2606 OID 39615)
-- Name: CourseSession CourseSession_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4001 (class 2606 OID 41734)
-- Name: CourseSession CourseSession_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3993 (class 2606 OID 39575)
-- Name: Course Course_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3992 (class 2606 OID 39570)
-- Name: Employee Employee_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4020 (class 2606 OID 39715)
-- Name: FatturaAzienda FatturaAzienda_aziendaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4021 (class 2606 OID 39720)
-- Name: FatturaAzienda FatturaAzienda_fatturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_fatturaId_fkey" FOREIGN KEY ("fatturaId") REFERENCES public."Fattura"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4019 (class 2606 OID 39710)
-- Name: Fattura Fattura_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Fattura"
    ADD CONSTRAINT "Fattura_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4035 (class 2606 OID 39790)
-- Name: GdprAuditLog GdprAuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GdprAuditLog"
    ADD CONSTRAINT "GdprAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4007 (class 2606 OID 39650)
-- Name: LetteraIncarico LetteraIncarico_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4008 (class 2606 OID 41739)
-- Name: LetteraIncarico LetteraIncarico_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4017 (class 2606 OID 39700)
-- Name: PreventivoAzienda PreventivoAzienda_aziendaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4018 (class 2606 OID 39705)
-- Name: PreventivoAzienda PreventivoAzienda_preventivoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES public."Preventivo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4015 (class 2606 OID 39690)
-- Name: PreventivoPartecipante PreventivoPartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4016 (class 2606 OID 39695)
-- Name: PreventivoPartecipante PreventivoPartecipante_preventivoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES public."Preventivo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4014 (class 2606 OID 39685)
-- Name: Preventivo Preventivo_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Preventivo"
    ADD CONSTRAINT "Preventivo_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4031 (class 2606 OID 45210)
-- Name: RefreshToken RefreshToken_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_personId_fkey" FOREIGN KEY ("personId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4012 (class 2606 OID 39675)
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4013 (class 2606 OID 39680)
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_registroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES public."RegistroPresenze"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4011 (class 2606 OID 41744)
-- Name: RegistroPresenze RegistroPresenze_formatoreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_formatoreId_fkey" FOREIGN KEY ("formatoreId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4009 (class 2606 OID 39665)
-- Name: RegistroPresenze RegistroPresenze_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4010 (class 2606 OID 39670)
-- Name: RegistroPresenze RegistroPresenze_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CourseSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4024 (class 2606 OID 39735)
-- Name: Role Role_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4025 (class 2606 OID 39740)
-- Name: Role Role_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4002 (class 2606 OID 39625)
-- Name: ScheduleCompany ScheduleCompany_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4003 (class 2606 OID 39630)
-- Name: ScheduleCompany ScheduleCompany_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4006 (class 2606 OID 39645)
-- Name: TemplateLink TemplateLink_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateLink"
    ADD CONSTRAINT "TemplateLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4027 (class 2606 OID 39750)
-- Name: TestDocument TestDocument_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4028 (class 2606 OID 41749)
-- Name: TestDocument TestDocument_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4029 (class 2606 OID 39760)
-- Name: TestPartecipante TestPartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4030 (class 2606 OID 39765)
-- Name: TestPartecipante TestPartecipante_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_testId_fkey" FOREIGN KEY ("testId") REFERENCES public."TestDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4034 (class 2606 OID 39785)
-- Name: UserRole UserRole_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4033 (class 2606 OID 39780)
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4032 (class 2606 OID 39775)
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4037 (class 2606 OID 39800)
-- Name: UserSession UserSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4022 (class 2606 OID 39725)
-- Name: User User_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4023 (class 2606 OID 39730)
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4044 (class 2606 OID 39835)
-- Name: _PermissionToRole _PermissionToRole_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4045 (class 2606 OID 39840)
-- Name: _PermissionToRole _PermissionToRole_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4042 (class 2606 OID 39825)
-- Name: enhanced_user_roles enhanced_user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4041 (class 2606 OID 39820)
-- Name: enhanced_user_roles enhanced_user_roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4040 (class 2606 OID 39815)
-- Name: enhanced_user_roles enhanced_user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4039 (class 2606 OID 39810)
-- Name: enhanced_user_roles enhanced_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4049 (class 2606 OID 40031)
-- Name: person_roles person_roles_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_roles
    ADD CONSTRAINT "person_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4050 (class 2606 OID 40036)
-- Name: person_roles person_roles_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_roles
    ADD CONSTRAINT "person_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4048 (class 2606 OID 40026)
-- Name: person_roles person_roles_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_roles
    ADD CONSTRAINT "person_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4051 (class 2606 OID 40041)
-- Name: person_roles person_roles_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_roles
    ADD CONSTRAINT "person_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4046 (class 2606 OID 40016)
-- Name: persons persons_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT "persons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4047 (class 2606 OID 40021)
-- Name: persons persons_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT "persons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4053 (class 2606 OID 40051)
-- Name: role_permissions role_permissions_grantedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4052 (class 2606 OID 40046)
-- Name: role_permissions role_permissions_personRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_personRoleId_fkey" FOREIGN KEY ("personRoleId") REFERENCES public.person_roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4038 (class 2606 OID 39805)
-- Name: tenant_configurations tenant_configurations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_configurations
    ADD CONSTRAINT tenant_configurations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4043 (class 2606 OID 39830)
-- Name: tenant_usage tenant_usage_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2025-06-29 19:02:19 CEST

--
-- PostgreSQL database dump complete
--

