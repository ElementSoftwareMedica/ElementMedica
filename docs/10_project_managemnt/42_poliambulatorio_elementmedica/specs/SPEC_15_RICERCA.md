# 🔍 SPEC_15: Ricerca Full-Text

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_09_VISITE.md](./SPEC_09_VISITE.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)

---

## 1. OVERVIEW

Sistema di ricerca full-text per:
- Referti medici
- Note visite
- Pazienti (anagrafica)
- Documenti clinici

### 1.1 Opzioni Implementazione

| Soluzione | Pro | Contro |
|-----------|-----|--------|
| PostgreSQL FTS | Nativo, no infra extra | Performance limitate |
| Elasticsearch | Performante, feature-rich | Infra aggiuntiva |
| MeiliSearch | Leggero, typo-tolerant | Meno maturo |

**Scelta**: PostgreSQL FTS per MVP, Elasticsearch per scale

---

## 2. POSTGRESQL FULL-TEXT SEARCH

### 2.1 Configurazione Indici

```sql
-- Migration: add_fulltext_indexes

-- Indice su referti
ALTER TABLE referti ADD COLUMN search_vector tsvector;

CREATE INDEX idx_referti_search ON referti USING GIN(search_vector);

-- Trigger per aggiornamento automatico
CREATE OR REPLACE FUNCTION update_referto_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('italian', COALESCE(NEW.contenuto, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referti_search
BEFORE INSERT OR UPDATE ON referti
FOR EACH ROW EXECUTE FUNCTION update_referto_search_vector();

-- Indice su pazienti
ALTER TABLE persons ADD COLUMN search_vector tsvector;

CREATE INDEX idx_persons_search ON persons USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_person_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('italian', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('italian', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('italian', COALESCE(NEW.tax_code, '')), 'B') ||
    setweight(to_tsvector('italian', COALESCE(NEW.email, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persons_search
BEFORE INSERT OR UPDATE ON persons
FOR EACH ROW EXECUTE FUNCTION update_person_search_vector();
```

### 2.2 Query di Ricerca

```javascript
// backend/services/searchService.js

export const searchService = {
  /**
   * Ricerca referti
   */
  async searchReferti(query, tenantId, options = {}) {
    const { limit = 20, offset = 0, medicoId, stato } = options;
    
    // Normalizza query per FTS
    const tsQuery = this.normalizeQuery(query);
    
    const results = await prisma.$queryRaw`
      SELECT 
        r.id,
        r.stato,
        r.created_at,
        ts_headline('italian', r.contenuto, to_tsquery('italian', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
        ) as snippet,
        ts_rank(r.search_vector, to_tsquery('italian', ${tsQuery})) as rank,
        v.id as visita_id,
        p.first_name as paziente_nome,
        p.last_name as paziente_cognome
      FROM referti r
      JOIN visite v ON r.visita_id = v.id
      JOIN appuntamenti a ON v.appuntamento_id = a.id
      JOIN persons p ON a.paziente_id = p.id
      WHERE r.tenant_id = ${tenantId}
        AND r.deleted_at IS NULL
        AND r.search_vector @@ to_tsquery('italian', ${tsQuery})
        ${medicoId ? Prisma.sql`AND v.medico_esecutore_id = ${medicoId}` : Prisma.empty}
        ${stato ? Prisma.sql`AND r.stato = ${stato}` : Prisma.empty}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    return results;
  },
  
  /**
   * Ricerca pazienti
   */
  async searchPazienti(query, tenantId, options = {}) {
    const { limit = 20 } = options;
    const tsQuery = this.normalizeQuery(query);
    
    // Ricerca combinata: FTS + LIKE per CF/email
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        tax_code,
        ts_rank(search_vector, to_tsquery('italian', ${tsQuery})) as rank
      FROM persons
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND (
          search_vector @@ to_tsquery('italian', ${tsQuery})
          OR tax_code ILIKE ${`%${query}%`}
          OR email ILIKE ${`%${query}%`}
          OR phone ILIKE ${`%${query}%`}
        )
      ORDER BY rank DESC NULLS LAST, last_name ASC
      LIMIT ${limit}
    `;
    
    return results;
  },
  
  /**
   * Ricerca globale
   */
  async searchGlobal(query, tenantId, types = ['pazienti', 'referti']) {
    const results = {};
    
    if (types.includes('pazienti')) {
      results.pazienti = await this.searchPazienti(query, tenantId, { limit: 5 });
    }
    
    if (types.includes('referti')) {
      results.referti = await this.searchReferti(query, tenantId, { limit: 5 });
    }
    
    return results;
  },
  
  /**
   * Normalizza query per tsquery
   */
  normalizeQuery(query) {
    // Rimuovi caratteri speciali
    let normalized = query.replace(/[^\w\s]/g, ' ');
    
    // Converti in formato tsquery (AND tra termini)
    const terms = normalized.split(/\s+/).filter(t => t.length > 2);
    
    return terms.map(t => `${t}:*`).join(' & ');
  }
};
```

---

## 3. API ENDPOINTS

```
# Ricerca globale
GET    /api/v1/clinica/search                          # Ricerca multi-entità
       ?q=termine&types=pazienti,referti

# Ricerca specifica
GET    /api/v1/clinica/search/pazienti                 # Solo pazienti
GET    /api/v1/clinica/search/referti                  # Solo referti
GET    /api/v1/clinica/search/visite                   # Solo visite

# Suggerimenti (autocomplete)
GET    /api/v1/clinica/search/suggest                  # Suggerimenti rapidi
       ?q=ros&type=pazienti
```

---

## 4. UI COMPONENTS

### 4.1 Barra Ricerca Globale

```tsx
// src/components/GlobalSearch.tsx

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      searchGlobal(debouncedQuery).then(setResults);
      setIsOpen(true);
    } else {
      setResults(null);
      setIsOpen(false);
    }
  }, [debouncedQuery]);
  
  return (
    <div className="relative">
      <Input
        placeholder="Cerca pazienti, referti..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={<SearchIcon />}
      />
      
      {isOpen && results && (
        <SearchResults 
          results={results} 
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

### 4.2 Componenti
- `GlobalSearch.tsx` - Barra ricerca header
- `SearchResults.tsx` - Dropdown risultati
- `SearchResultItem.tsx` - Singolo risultato
- `HighlightedText.tsx` - Testo con highlight match

---

## 5. ELASTICSEARCH (Futuro)

### 5.1 Mapping Referti

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "tenantId": { "type": "keyword" },
      "contenuto": { 
        "type": "text",
        "analyzer": "italian"
      },
      "stato": { "type": "keyword" },
      "medicoId": { "type": "keyword" },
      "pazienteNome": { "type": "text" },
      "createdAt": { "type": "date" }
    }
  }
}
```

### 5.2 Sincronizzazione

```javascript
// Sync su create/update referto
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  if (params.model === 'Referto' && ['create', 'update'].includes(params.action)) {
    await elasticClient.index({
      index: 'referti',
      id: result.id,
      body: mapRefertoToElastic(result)
    });
  }
  
  return result;
});
```

---

## 6. COLLEGAMENTI

- **Precedente**: [SPEC_14_SICUREZZA.md](./SPEC_14_SICUREZZA.md)
- **Prossimo**: [SPEC_16_ASYNC_JOBS.md](./SPEC_16_ASYNC_JOBS.md)
