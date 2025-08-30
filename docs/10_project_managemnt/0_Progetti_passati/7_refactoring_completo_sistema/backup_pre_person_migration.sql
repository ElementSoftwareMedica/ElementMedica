--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."ActivityLog" OWNER TO postgres;

--
-- Name: Attestato; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Attestato" OWNER TO postgres;

--
-- Name: Company; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Company" OWNER TO postgres;

--
-- Name: ConsentRecord; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."ConsentRecord" OWNER TO postgres;

--
-- Name: Course; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Course" OWNER TO postgres;

--
-- Name: CourseEnrollment; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."CourseEnrollment" OWNER TO postgres;

--
-- Name: CourseSchedule; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."CourseSchedule" OWNER TO postgres;

--
-- Name: CourseSession; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."CourseSession" OWNER TO postgres;

--
-- Name: Employee; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Employee" OWNER TO postgres;

--
-- Name: Fattura; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Fattura" OWNER TO postgres;

--
-- Name: FatturaAzienda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FatturaAzienda" (
    id text NOT NULL,
    "fatturaId" text NOT NULL,
    "aziendaId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."FatturaAzienda" OWNER TO postgres;

--
-- Name: GdprAuditLog; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."GdprAuditLog" OWNER TO postgres;

--
-- Name: LetteraIncarico; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."LetteraIncarico" OWNER TO postgres;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Permission" OWNER TO postgres;

--
-- Name: Preventivo; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Preventivo" OWNER TO postgres;

--
-- Name: PreventivoAzienda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PreventivoAzienda" (
    id text NOT NULL,
    "preventivoId" text NOT NULL,
    "aziendaId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PreventivoAzienda" OWNER TO postgres;

--
-- Name: PreventivoPartecipante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PreventivoPartecipante" (
    id text NOT NULL,
    "preventivoId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PreventivoPartecipante" OWNER TO postgres;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "deviceInfo" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO postgres;

--
-- Name: RegistroPresenze; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."RegistroPresenze" OWNER TO postgres;

--
-- Name: RegistroPresenzePartecipante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RegistroPresenzePartecipante" (
    id text NOT NULL,
    "registroId" text NOT NULL,
    "partecipanteId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."RegistroPresenzePartecipante" OWNER TO postgres;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: ScheduleCompany; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ScheduleCompany" (
    id text NOT NULL,
    "scheduleId" text NOT NULL,
    "companyId" text NOT NULL,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."ScheduleCompany" OWNER TO postgres;

--
-- Name: TemplateLink; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."TemplateLink" OWNER TO postgres;

--
-- Name: TestDocument; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."TestDocument" OWNER TO postgres;

--
-- Name: TestPartecipante; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."TestPartecipante" OWNER TO postgres;

--
-- Name: Trainer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Trainer" (
    id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    status text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    birth_date timestamp(3) without time zone,
    certifications text[],
    iban text,
    notes text,
    postal_code text,
    province text,
    register_code text,
    residence_address text,
    residence_city text,
    tax_code text,
    vat_number text,
    specialties text[],
    tariffa_oraria double precision,
    "tenantId" text,
    eliminato boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Trainer" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."UserRole" OWNER TO postgres;

--
-- Name: UserSession; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public."UserSession" OWNER TO postgres;

--
-- Name: _PermissionToRole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_PermissionToRole" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_PermissionToRole" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: enhanced_user_roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.enhanced_user_roles OWNER TO postgres;

--
-- Name: tenant_configurations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenant_configurations OWNER TO postgres;

--
-- Name: tenant_usage; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenant_usage OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivityLog" (id, "userId", action, resource, "resourceId", details, "ipAddress", "userAgent", "timestamp", eliminato) FROM stdin;
\.


--
-- Data for Name: Attestato; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Attestato" (id, "scheduledCourseId", "partecipanteId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Company" (id, created_at, updated_at, codice_ateco, iban, pec, sdi, cap, citta, codice_fiscale, mail, note, persona_riferimento, piva, provincia, ragione_sociale, sede_azienda, telefono, eliminato, "tenantId", slug, domain, settings, subscription_plan, is_active) FROM stdin;
188c4b6f-8079-4ddf-8d44-a3fd00684504	2025-06-21 20:48:17.825	2025-06-21 20:48:17.825	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	00000000000	\N	Default Company	\N	\N	f	\N	default-company	\N	{}	basic	t
\.


--
-- Data for Name: ConsentRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConsentRecord" (id, "userId", "consentType", "consentGiven", "consentVersion", "givenAt", "withdrawnAt", "ipAddress", "userAgent", eliminato) FROM stdin;
\.


--
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Course" (id, title, category, description, duration, status, created_at, updated_at, certifications, code, contents, "maxPeople", "pricePerPerson", regulation, "renewalDuration", "validityYears", "tenantId", eliminato) FROM stdin;
\.


--
-- Data for Name: CourseEnrollment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CourseEnrollment" (id, "scheduleId", "employeeId", status, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- Data for Name: CourseSchedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CourseSchedule" (id, "courseId", start_date, end_date, location, max_participants, status, created_at, updated_at, "companyId", notes, "trainerId", delivery_mode, attendance, "hasAttestati", eliminato) FROM stdin;
\.


--
-- Data for Name: CourseSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CourseSession" (id, "scheduleId", date, start, "end", "trainerId", "coTrainerId", eliminato) FROM stdin;
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Employee" (id, first_name, last_name, email, phone, title, status, hired_date, "companyId", created_at, updated_at, birth_date, codice_fiscale, notes, postal_code, province, residence_address, residence_city, photo_url, eliminato) FROM stdin;
\.


--
-- Data for Name: Fattura; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Fattura" (id, "scheduledCourseId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- Data for Name: FatturaAzienda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FatturaAzienda" (id, "fatturaId", "aziendaId", eliminato) FROM stdin;
\.


--
-- Data for Name: GdprAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GdprAuditLog" (id, "userId", action, "resourceType", "resourceId", "dataAccessed", "ipAddress", "userAgent", "companyId", "createdAt", eliminato) FROM stdin;
\.


--
-- Data for Name: LetteraIncarico; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LetteraIncarico" (id, "scheduledCourseId", "trainerId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Permission" (id, name, description, resource, action, "createdAt", "updatedAt", eliminato) FROM stdin;
\.


--
-- Data for Name: Preventivo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Preventivo" (id, "scheduledCourseId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", eliminato) FROM stdin;
\.


--
-- Data for Name: PreventivoAzienda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PreventivoAzienda" (id, "preventivoId", "aziendaId", eliminato) FROM stdin;
\.


--
-- Data for Name: PreventivoPartecipante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PreventivoPartecipante" (id, "preventivoId", "partecipanteId", eliminato) FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshToken" (id, "userId", token, "expiresAt", "deviceInfo", "createdAt", "revokedAt", eliminato) FROM stdin;
\.


--
-- Data for Name: RegistroPresenze; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RegistroPresenze" (id, "scheduledCourseId", "sessionId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", "formatoreId", eliminato) FROM stdin;
\.


--
-- Data for Name: RegistroPresenzePartecipante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RegistroPresenzePartecipante" (id, "registroId", "partecipanteId", eliminato) FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name, "displayName", description, permissions, "isSystemRole", "companyId", "tenantId", "createdAt", "updatedAt", eliminato) FROM stdin;
8e0719d4-6f6e-4195-9956-01aceb68cb55	SUPER_ADMIN	Super Administrator	Global administrator with all permissions.	{"all": true}	t	\N	\N	2025-06-21 20:48:17.842	2025-06-21 20:48:17.842	f
\.


--
-- Data for Name: ScheduleCompany; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ScheduleCompany" (id, "scheduleId", "companyId", eliminato) FROM stdin;
\.


--
-- Data for Name: TemplateLink; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TemplateLink" (id, name, url, type, "createdAt", "updatedAt", content, footer, header, "isDefault", "logoPosition", "fileFormat", "googleDocsUrl", "logoImage", "companyId", eliminato) FROM stdin;
\.


--
-- Data for Name: TestDocument; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TestDocument" (id, "scheduledCourseId", "trainerId", "nomeFile", url, "dataGenerazione", "numeroProgressivo", "annoProgressivo", stato, tipologia, punteggio, durata, note, "dataTest", "sogliaSuperamento", eliminato) FROM stdin;
\.


--
-- Data for Name: TestPartecipante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TestPartecipante" (id, "testId", "partecipanteId", punteggio, stato, note, "dataConsegna", "tempoImpiegato", eliminato) FROM stdin;
\.


--
-- Data for Name: Trainer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Trainer" (id, first_name, last_name, email, phone, status, created_at, updated_at, birth_date, certifications, iban, notes, postal_code, province, register_code, residence_address, residence_city, tax_code, vat_number, specialties, tariffa_oraria, "tenantId", eliminato) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, username, email, password, "firstName", "lastName", "isActive", "lastLogin", "profileImage", "failedAttempts", "lockedUntil", "companyId", "tenantId", "globalRole", "createdAt", "updatedAt", eliminato) FROM stdin;
8a831650-2e85-4f9a-ae5f-41b15160ebf6	admin	admin@example.com	$2a$10$k7FHGc0jF9npzI0DyL/09OBIk1JEo4BGrOn277vMBIoGgHQJnKP7m	Admin	User	t	\N	\N	0	\N	188c4b6f-8079-4ddf-8d44-a3fd00684504	\N	SUPER_ADMIN	2025-06-21 20:48:17.846	2025-06-21 20:48:17.846	f
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserRole" (id, "userId", "roleId", "assignedAt", "assignedBy", "isActive", "expiresAt", eliminato) FROM stdin;
c6678827-5d80-4274-bdcf-48f13a0cfd3d	8a831650-2e85-4f9a-ae5f-41b15160ebf6	8e0719d4-6f6e-4195-9956-01aceb68cb55	2025-06-21 20:48:17.85	8a831650-2e85-4f9a-ae5f-41b15160ebf6	t	\N	f
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserSession" (id, "userId", "sessionToken", "deviceInfo", "ipAddress", "userAgent", "lastActivity", "expiresAt", "isActive", "createdAt", eliminato) FROM stdin;
\.


--
-- Data for Name: _PermissionToRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_PermissionToRole" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9140014f-e92e-427b-b7a2-7faefa77662f	4338edb5dc5e328ec30262cb4849af6976dcfc82daf15a598d521f81c594ab15	2025-06-21 22:40:49.454341+02	20250620142706_init_with_fixed_schema	\N	\N	2025-06-21 22:40:49.404905+02	1
ab36e15a-0f6f-459e-a554-045d2c3a847e	e70a2a223ca929dcac3d05e6722997b026c2279cdd205acc527dd131246b5aa6	2025-06-21 22:44:33.291484+02	20250621204433_add_unique_user_role	\N	\N	2025-06-21 22:44:33.288909+02	1
7c225156-bb96-43a2-9f37-ea50c1145739	e877f29968475c6e3ccd01cc2af8dc5c196d32e51b1d8ce3213ee2f612b56735	2025-06-21 22:46:53.183097+02	20250621204653_add_unique_role_name_company	\N	\N	2025-06-21 22:46:53.180921+02	1
85aa5165-644b-420f-a594-45a5eba249d1	498070fbcb1351a55b1144493c18f0779091980824a7de253d7ea8bf413973ac	2025-06-21 22:47:24.466021+02	20250621204724_update_role_unique_constraint	\N	\N	2025-06-21 22:47:24.46215+02	1
\.


--
-- Data for Name: enhanced_user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enhanced_user_roles (id, user_id, tenant_id, role_type, role_scope, permissions, company_id, department_id, is_active, assigned_by, assigned_at, expires_at, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- Data for Name: tenant_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_configurations (id, tenant_id, config_key, config_value, config_type, is_encrypted, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- Data for Name: tenant_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_usage (id, tenant_id, usage_type, usage_value, usage_limit, billing_period, metadata, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, slug, domain, settings, billing_plan, max_users, max_companies, is_active, created_at, updated_at, eliminato) FROM stdin;
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: Attestato Attestato_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: ConsentRecord ConsentRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY (id);


--
-- Name: CourseEnrollment CourseEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY (id);


--
-- Name: CourseSchedule CourseSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_pkey" PRIMARY KEY (id);


--
-- Name: CourseSession CourseSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_pkey" PRIMARY KEY (id);


--
-- Name: Course Course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY (id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- Name: FatturaAzienda FatturaAzienda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_pkey" PRIMARY KEY (id);


--
-- Name: Fattura Fattura_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fattura"
    ADD CONSTRAINT "Fattura_pkey" PRIMARY KEY (id);


--
-- Name: GdprAuditLog GdprAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GdprAuditLog"
    ADD CONSTRAINT "GdprAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: LetteraIncarico LetteraIncarico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PreventivoAzienda PreventivoAzienda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_pkey" PRIMARY KEY (id);


--
-- Name: PreventivoPartecipante PreventivoPartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_pkey" PRIMARY KEY (id);


--
-- Name: Preventivo Preventivo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Preventivo"
    ADD CONSTRAINT "Preventivo_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_pkey" PRIMARY KEY (id);


--
-- Name: RegistroPresenze RegistroPresenze_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: ScheduleCompany ScheduleCompany_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_pkey" PRIMARY KEY (id);


--
-- Name: TemplateLink TemplateLink_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TemplateLink"
    ADD CONSTRAINT "TemplateLink_pkey" PRIMARY KEY (id);


--
-- Name: TestDocument TestDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_pkey" PRIMARY KEY (id);


--
-- Name: TestPartecipante TestPartecipante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_pkey" PRIMARY KEY (id);


--
-- Name: Trainer Trainer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Trainer"
    ADD CONSTRAINT "Trainer_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: enhanced_user_roles enhanced_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_pkey PRIMARY KEY (id);


--
-- Name: tenant_configurations tenant_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_configurations
    ADD CONSTRAINT tenant_configurations_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage tenant_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: Company_domain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Company_domain_key" ON public."Company" USING btree (domain);


--
-- Name: Company_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Company_slug_key" ON public."Company" USING btree (slug);


--
-- Name: CourseEnrollment_scheduleId_employeeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CourseEnrollment_scheduleId_employeeId_key" ON public."CourseEnrollment" USING btree ("scheduleId", "employeeId");


--
-- Name: Course_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Course_code_key" ON public."Course" USING btree (code);


--
-- Name: Employee_codice_fiscale_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Employee_codice_fiscale_key" ON public."Employee" USING btree (codice_fiscale);


--
-- Name: LetteraIncarico_scheduledCourseId_trainerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "LetteraIncarico_scheduledCourseId_trainerId_key" ON public."LetteraIncarico" USING btree ("scheduledCourseId", "trainerId");


--
-- Name: Permission_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Permission_name_key" ON public."Permission" USING btree (name);


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: Role_companyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Role_companyId_idx" ON public."Role" USING btree ("companyId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: UserRole_userId_roleId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON public."UserRole" USING btree ("userId", "roleId");


--
-- Name: UserSession_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON public."UserSession" USING btree ("sessionToken");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: _PermissionToRole_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON public."_PermissionToRole" USING btree ("A", "B");


--
-- Name: _PermissionToRole_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_PermissionToRole_B_index" ON public."_PermissionToRole" USING btree ("B");


--
-- Name: enhanced_user_roles_user_id_tenant_id_role_type_company_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX enhanced_user_roles_user_id_tenant_id_role_type_company_id_key ON public.enhanced_user_roles USING btree (user_id, tenant_id, role_type, company_id);


--
-- Name: tenant_configurations_tenant_id_config_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenant_configurations_tenant_id_config_key_key ON public.tenant_configurations USING btree (tenant_id, config_key);


--
-- Name: tenant_usage_tenant_id_usage_type_billing_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenant_usage_tenant_id_usage_type_billing_period_key ON public.tenant_usage USING btree (tenant_id, usage_type, billing_period);


--
-- Name: tenants_domain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenants_domain_key ON public.tenants USING btree (domain);


--
-- Name: tenants_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attestato Attestato_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attestato Attestato_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attestato"
    ADD CONSTRAINT "Attestato_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Company Company_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConsentRecord ConsentRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseEnrollment CourseEnrollment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CourseEnrollment CourseEnrollment_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseSchedule CourseSchedule_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CourseSchedule CourseSchedule_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CourseSchedule CourseSchedule_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSchedule"
    ADD CONSTRAINT "CourseSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CourseSession CourseSession_coTrainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_coTrainerId_fkey" FOREIGN KEY ("coTrainerId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CourseSession CourseSession_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseSession CourseSession_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseSession"
    ADD CONSTRAINT "CourseSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Course Course_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FatturaAzienda FatturaAzienda_aziendaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FatturaAzienda FatturaAzienda_fatturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FatturaAzienda"
    ADD CONSTRAINT "FatturaAzienda_fatturaId_fkey" FOREIGN KEY ("fatturaId") REFERENCES public."Fattura"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Fattura Fattura_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fattura"
    ADD CONSTRAINT "Fattura_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GdprAuditLog GdprAuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GdprAuditLog"
    ADD CONSTRAINT "GdprAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LetteraIncarico LetteraIncarico_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LetteraIncarico LetteraIncarico_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LetteraIncarico"
    ADD CONSTRAINT "LetteraIncarico_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PreventivoAzienda PreventivoAzienda_aziendaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PreventivoAzienda PreventivoAzienda_preventivoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoAzienda"
    ADD CONSTRAINT "PreventivoAzienda_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES public."Preventivo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PreventivoPartecipante PreventivoPartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PreventivoPartecipante PreventivoPartecipante_preventivoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreventivoPartecipante"
    ADD CONSTRAINT "PreventivoPartecipante_preventivoId_fkey" FOREIGN KEY ("preventivoId") REFERENCES public."Preventivo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Preventivo Preventivo_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Preventivo"
    ADD CONSTRAINT "Preventivo_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RegistroPresenzePartecipante RegistroPresenzePartecipante_registroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenzePartecipante"
    ADD CONSTRAINT "RegistroPresenzePartecipante_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES public."RegistroPresenze"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RegistroPresenze RegistroPresenze_formatoreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_formatoreId_fkey" FOREIGN KEY ("formatoreId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RegistroPresenze RegistroPresenze_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RegistroPresenze RegistroPresenze_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegistroPresenze"
    ADD CONSTRAINT "RegistroPresenze_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CourseSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Role Role_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Role Role_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ScheduleCompany ScheduleCompany_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ScheduleCompany ScheduleCompany_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ScheduleCompany"
    ADD CONSTRAINT "ScheduleCompany_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TemplateLink TemplateLink_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TemplateLink"
    ADD CONSTRAINT "TemplateLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TestDocument TestDocument_scheduledCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_scheduledCourseId_fkey" FOREIGN KEY ("scheduledCourseId") REFERENCES public."CourseSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestDocument TestDocument_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestDocument"
    ADD CONSTRAINT "TestDocument_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."Trainer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TestPartecipante TestPartecipante_partecipanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TestPartecipante TestPartecipante_testId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestPartecipante"
    ADD CONSTRAINT "TestPartecipante_testId_fkey" FOREIGN KEY ("testId") REFERENCES public."TestDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Trainer Trainer_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Trainer"
    ADD CONSTRAINT "Trainer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRole UserRole_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSession UserSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _PermissionToRole _PermissionToRole_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PermissionToRole _PermissionToRole_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enhanced_user_roles enhanced_user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enhanced_user_roles enhanced_user_roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enhanced_user_roles enhanced_user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enhanced_user_roles enhanced_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_user_roles
    ADD CONSTRAINT enhanced_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_configurations tenant_configurations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_configurations
    ADD CONSTRAINT tenant_configurations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_usage tenant_usage_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_usage
    ADD CONSTRAINT tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--