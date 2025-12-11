# 🏗️ Architettura Tecnica - Sistema Visibilità Dati

## 📐 Diagramma Architettura Completa

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Settings Pages                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ │ │
│  │  │  RolesTab    │  │ HierarchyTab │  │  DataVisibilityTab (NEW)       │ │ │
│  │  │              │  │              │  │  - Scope relazionali           │ │ │
│  │  │  Permessi    │  │  Gerarchia   │  │  - Preview dati visibili       │ │ │
│  │  │  CRUD        │  │  Drag/Drop   │  │  - Test configurazione         │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┬─────────────────┘ │ │
│  └─────────┼─────────────────┼─────────────────────────┼───────────────────┘ │
│            │                 │                         │                     │
│  ┌─────────┴─────────────────┴─────────────────────────┴───────────────────┐ │
│  │                    Component Layer                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │              OptimizedPermissionManager                             │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │ │ │
│  │  │  │ EntityList  │  │ Permissions │  │ RelationalScopeEditor     │  │ │ │
│  │  │  │             │  │ Section     │  │ (NEW)                      │  │ │ │
│  │  │  │             │  │             │  │ - Tipo relazione           │  │ │ │
│  │  │  │             │  │ + Scope     │  │ - Catena relazioni         │  │ │ │
│  │  │  │             │  │   Selector  │  │ - Preview entità           │  │ │ │
│  │  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │ │ │
│  │  │                                                                     │ │ │
│  │  │  ┌────────────────────────────────────────────────────────────────┐│ │ │
│  │  │  │         PermissionInheritanceView (NEW)                        ││ │ │
│  │  │  │  - Albero ereditarietà     - Permessi ereditati vs diretti    ││ │ │
│  │  │  │  - Override indicators      - Conflitti evidenziati           ││ │ │
│  │  │  └────────────────────────────────────────────────────────────────┘│ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────────┐ │
│  │                        Services Layer                                    │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │ │
│  │  │ roles.ts         │  │ advancedPerms.ts │  │ relationalScopes.ts    │ │ │
│  │  │                  │  │                  │  │ (NEW)                   │ │ │
│  │  │ - getRoles()     │  │ - getPerms()     │  │ - getRelations()       │ │ │
│  │  │ - getHierarchy() │  │ - updatePerms()  │  │ - previewData()        │ │ │
│  │  │ - assignRole()   │  │ - getEffective() │  │ - testConfig()         │ │ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        API Routes Layer                                  │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    /api/v1/roles/*                                │   │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │   │ │
│  │  │  │ hierarchy.js │  │ permissions  │  │ relation-scopes.js     │  │   │ │
│  │  │  │              │  │ .js          │  │ (NEW)                   │  │   │ │
│  │  │  │ GET /        │  │ GET/PUT      │  │ GET /definitions       │  │   │ │
│  │  │  │ GET /user    │  │ /:roleType/  │  │ POST /preview          │  │   │ │
│  │  │  │ PUT /move    │  │ permissions  │  │ GET /effective/:personId│  │   │ │
│  │  │  └──────────────┘  └──────────────┘  └────────────────────────┘  │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────────┐ │
│  │                        Middleware Stack                                  │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │ │
│  │  │   auth     │→ │ validation │→ │  logging   │→ │ roleDataFilter   │   │ │
│  │  │   .js      │  │    .js     │  │    .js     │  │ (NEW)            │   │ │
│  │  │            │  │            │  │            │  │                  │   │ │
│  │  │ JWT verify │  │ Input      │  │ Audit      │  │ Applica filtri   │   │ │
│  │  │ Tenant ctx │  │ sanitize   │  │ trail      │  │ automatici per   │   │ │
│  │  │            │  │            │  │            │  │ scope permessi   │   │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────┬─────────┘   │ │
│  └───────────────────────────────────────────────────────────┼─────────────┘ │
│                                                               │               │
│  ┌───────────────────────────────────────────────────────────┴─────────────┐ │
│  │                        Services Layer                                    │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                  Permission Resolution Pipeline                     │ │ │
│  │  │                                                                     │ │ │
│  │  │    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐ │ │ │
│  │  │    │ permission-     │     │ relation-       │     │ role-       │ │ │ │
│  │  │    │ inheritance.js  │────▶│ resolver.js     │────▶│ hierarchy   │ │ │ │
│  │  │    │ (NEW)           │     │ (NEW)           │     │ Service.js  │ │ │ │
│  │  │    │                 │     │                 │     │             │ │ │ │
│  │  │    │ • Risolve       │     │ • Traversa      │     │ • Livelli   │ │ │ │
│  │  │    │   ereditarietà  │     │   relazioni     │     │ • Assign    │ │ │ │
│  │  │    │ • Merge perms   │     │ • Costruisce    │     │ • Move      │ │ │ │
│  │  │    │ • Priorità      │     │   filtri Prisma │     │             │ │ │ │
│  │  │    └─────────────────┘     └─────────────────┘     └─────────────┘ │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                      Cache Layer (Redis)                           │ │ │
│  │  │  ┌──────────────────────────────────────────────────────────────┐ │ │ │
│  │  │  │ Key: effective_perms:{personId}:{tenantId}                   │ │ │ │
│  │  │  │ TTL: 300s (5 minuti)                                         │ │ │ │
│  │  │  │ Invalidation: Su modifica permessi/ruoli                     │ │ │ │
│  │  │  └──────────────────────────────────────────────────────────────┘ │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Prisma ORM
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Core Permission Tables                            │ │
│  │                                                                          │ │
│  │  ┌──────────────────┐       ┌──────────────────┐                        │ │
│  │  │   PersonRole     │──────▶│ AdvancedPerm.    │                        │ │
│  │  │                  │ 1:N   │                  │                        │ │
│  │  │ id               │       │ id               │                        │ │
│  │  │ personId    ────────────▶│ personRoleId     │                        │ │
│  │  │ roleType         │       │ resource         │                        │ │
│  │  │ customRoleId     │       │ action           │                        │ │
│  │  │ level            │       │ scope            │◀── "relational" (NEW)  │ │
│  │  │ parentRoleId  ───┐       │ relationType  ◀──┼── (NEW)                │ │
│  │  │ path             │       │ relationConfig◀──┼── (NEW)                │ │
│  │  │ tenantId         │       │ allowedFields    │                        │ │
│  │  │ isActive         │       │ deniedFields  ◀──┼── (NEW)                │ │
│  │  └──────────────────┘       │ priority      ◀──┼── (NEW)                │ │
│  │           │                 │ isInherited   ◀──┼── (NEW)                │ │
│  │           │                 └──────────────────┘                        │ │
│  │           │                                                              │ │
│  │           │ Self-relation                                                │ │
│  │           │ (gerarchia)                                                  │ │
│  │           ▼                                                              │ │
│  │  ┌──────────────────┐       ┌──────────────────┐                        │ │
│  │  │   CustomRole     │──────▶│ CustomRolePerm.  │                        │ │
│  │  │                  │ 1:N   │                  │                        │ │
│  │  │ id               │       │ customRoleId     │                        │ │
│  │  │ name             │       │ permission       │                        │ │
│  │  │ level            │       │ resource         │                        │ │
│  │  │ parentRole       │       │ scope            │                        │ │
│  │  │ tenantId         │       │ conditions       │                        │ │
│  │  └──────────────────┘       │ allowedFields    │                        │ │
│  │                             └──────────────────┘                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        NEW: Relation Definitions                         │ │
│  │                                                                          │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │                     RelationDefinition (NEW)                      │   │ │
│  │  │                                                                   │   │ │
│  │  │  id               String    @id                                   │   │ │
│  │  │  name             String    @unique    // "trainer_courses"       │   │ │
│  │  │  displayName      String               // "Formatore - Corsi"     │   │ │
│  │  │  description      String?                                         │   │ │
│  │  │  baseEntity       String               // "Person"                │   │ │
│  │  │  targetEntities   Json                 // ["Company", "Person"]   │   │ │
│  │  │  relationChain    Json                 // Array di link           │   │ │
│  │  │  isSystem         Boolean              // true se di sistema      │   │ │
│  │  │  tenantId         String?              // null = globale          │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │ │
│  │  Esempio relationChain:                                                  │ │
│  │  [                                                                       │ │
│  │    { from: "Person", to: "CourseSchedule", via: "trainerId" },          │ │
│  │    { from: "CourseSchedule", to: "Company", via: "companyId" },         │ │
│  │    { from: "CourseSchedule", to: "CourseEnrollment", via: "id" },       │ │
│  │    { from: "CourseEnrollment", to: "Person", via: "personId" }          │ │
│  │  ]                                                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Relational Data Tables                            │ │
│  │  (Usate per traversare le relazioni)                                     │ │
│  │                                                                          │ │
│  │  Person ──────▶ CourseSchedule ──────▶ Company                          │ │
│  │    │ trainerId      │ companyId                                         │ │
│  │    │                │                                                    │ │
│  │    │                ▼                                                    │ │
│  │    │         CourseEnrollment                                            │ │
│  │    │              │ personId                                             │ │
│  │    │              ▼                                                      │ │
│  │    └─────────▶ Person (partecipanti)                                    │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flusso di Risoluzione Permessi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION RESOLUTION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

     REQUEST                                                    RESPONSE
        │                                                          ▲
        ▼                                                          │
┌───────────────┐                                          ┌───────────────┐
│  API Request  │                                          │   Filtered    │
│  GET /persons │                                          │   Data        │
└───────┬───────┘                                          └───────▲───────┘
        │                                                          │
        ▼                                                          │
┌───────────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE STACK                                 │
│                                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│  │   Auth      │───▶│  Tenant     │───▶│  Rate       │───▶│  Role      │  │
│  │   Check     │    │  Context    │    │  Limit      │    │  Data      │  │
│  │             │    │             │    │             │    │  Filter    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────┬──────┘  │
│                                                                  │         │
└──────────────────────────────────────────────────────────────────┼─────────┘
                                                                   │
                            ┌──────────────────────────────────────┴───────┐
                            ▼                                              │
              ┌──────────────────────────────┐                             │
              │   1. Check Cache             │                             │
              │   Key: effective_perms:      │                             │
              │        {personId}:{tenantId} │                             │
              └──────────────┬───────────────┘                             │
                             │                                             │
                    ┌────────┴────────┐                                    │
                    │  Cache Hit?     │                                    │
                    └────────┬────────┘                                    │
                             │                                             │
              ┌──────────────┴──────────────┐                              │
              │             NO              │         YES                  │
              ▼                             ▼                              │
┌───────────────────────────┐  ┌───────────────────────────┐               │
│ 2. Load PersonRoles       │  │ Use cached permissions    │───────────────┤
│    from Database          │  └───────────────────────────┘               │
└─────────────┬─────────────┘                                              │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 3. Permission Inheritance Service                              │          │
│                                                                │          │
│    ┌─────────────────────────────────────────────────────┐    │          │
│    │ For each PersonRole:                                 │    │          │
│    │   a) Load direct AdvancedPermissions                 │    │          │
│    │   b) Check if roleType in ROLE_HIERARCHY             │    │          │
│    │   c) Recursively load inherited permissions          │    │          │
│    │   d) Merge with priority (higher level = higher pri) │    │          │
│    └─────────────────────────────────────────────────────┘    │          │
│                                                                │          │
└───────────────────────────────────────────────────────────────┘          │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 4. Find Permission for Resource + Action                       │          │
│                                                                │          │
│    Resource: "persons"  Action: "read"                        │          │
│    Permission found: {                                         │          │
│      scope: "relational",                                      │          │
│      relationType: "trainer_courses",                          │          │
│      allowedFields: ["id", "firstName", "lastName", "email"]   │          │
│    }                                                           │          │
└───────────────────────────────────────────────────────────────┘          │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 5. Relation Resolver (if scope == "relational")               │          │
│                                                                │          │
│    ┌─────────────────────────────────────────────────────┐    │          │
│    │ a) Load RelationDefinition "trainer_courses"         │    │          │
│    │ b) Start from Person (trainer) ID                    │    │          │
│    │ c) Traverse chain:                                   │    │          │
│    │    Person → CourseSchedule (via trainerId)           │    │          │
│    │    CourseSchedule → CourseEnrollment                 │    │          │
│    │    CourseEnrollment → Person (via personId)          │    │          │
│    │ d) Collect all reachable Person IDs                  │    │          │
│    └─────────────────────────────────────────────────────┘    │          │
│                                                                │          │
│    Result: [person-id-1, person-id-2, person-id-3, ...]       │          │
└───────────────────────────────────────────────────────────────┘          │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 6. Build Data Filter                                           │          │
│                                                                │          │
│    req.dataFilter = {                                          │          │
│      allowed: true,                                            │          │
│      where: {                                                  │          │
│        id: { in: [reachable IDs] },                           │          │
│        tenantId: "tenant-xxx",                                 │          │
│        deletedAt: null                                         │          │
│      },                                                        │          │
│      select: { id, firstName, lastName, email }                │          │
│    }                                                           │          │
└───────────────────────────────────────────────────────────────┘          │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 7. Cache Effective Permissions (TTL: 5 min)                   │          │
└───────────────────────────────────────────────────────────────┘          │
              │                                                            │
              ▼                                                            │
┌───────────────────────────────────────────────────────────────┐          │
│ 8. Route Handler applies filter                                │──────────┘
│                                                                │
│    const persons = await prisma.person.findMany({              │
│      where: req.dataFilter.where,                              │
│      select: req.dataFilter.select                             │
│    });                                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗃️ Struttura Dati JSON

### RelationDefinition.relationChain

```json
{
  "name": "trainer_courses",
  "relationChain": [
    {
      "from": "Person",
      "to": "CourseSchedule",
      "via": "trainerId",
      "type": "oneToMany",
      "description": "Corsi dove la persona è trainer"
    },
    {
      "from": "CourseSchedule",
      "to": "Company",
      "via": "companyId",
      "type": "manyToOne",
      "description": "Azienda del corso"
    },
    {
      "from": "CourseSchedule",
      "to": "CourseEnrollment",
      "via": "scheduledCourseId",
      "type": "oneToMany",
      "description": "Iscrizioni al corso"
    },
    {
      "from": "CourseEnrollment",
      "to": "Person",
      "via": "personId",
      "type": "manyToOne",
      "description": "Partecipante iscritto"
    }
  ]
}
```

### AdvancedPermission.relationConfig

```json
{
  "relationType": "trainer_courses",
  "allowedFields": ["id", "firstName", "lastName", "email"],
  "deniedFields": ["fiscalCode", "salary", "birthDate"],
  "additionalConditions": {
    "isActive": true
  },
  "maxDepth": 3
}
```

---

## 📊 Performance Considerations

### Indexes Richiesti

```sql
-- Per RelationDefinition
CREATE INDEX idx_relation_def_name ON relation_definitions(name);
CREATE INDEX idx_relation_def_tenant ON relation_definitions(tenant_id);

-- Per AdvancedPermission
CREATE INDEX idx_adv_perm_relation ON advanced_permissions(relation_type);
CREATE INDEX idx_adv_perm_resource_action ON advanced_permissions(resource, action);

-- Per traversamento relazioni
CREATE INDEX idx_course_schedule_trainer ON course_schedules(trainer_id, tenant_id);
CREATE INDEX idx_course_enrollment_person ON course_enrollments(person_id, scheduled_course_id);
```

### Cache Strategy

| Cache Key Pattern | TTL | Invalidation |
|-------------------|-----|--------------|
| `effective_perms:{personId}:{tenantId}` | 5 min | Modifica permessi/ruoli |
| `relation_def:{name}` | 30 min | Modifica definizione |
| `related_ids:{personId}:{relationType}:{targetEntity}` | 2 min | Modifica dati |

---

*Documento creato il 30 Novembre 2025*
