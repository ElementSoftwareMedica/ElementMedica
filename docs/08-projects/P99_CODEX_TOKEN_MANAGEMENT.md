# P99 - Gestione token Codex per sviluppo, deployment e modifiche

**Data**: 21 Maggio 2026  
**Scopo**: ridurre lo spreco di token di contesto durante il lavoro Codex su ElementMedica, mantenendo alta affidabilita, sicurezza e tracciabilita delle modifiche.

---

## 1. Principio guida

In questo documento "token" significa budget di contesto dell'agente di coding: istruzioni, file letti, output terminale, diff, errori, riepiloghi e messaggi.  
Il progetto e grande e production-sensitive, quindi la strategia corretta non e "leggere tutto sempre", ma leggere sempre le regole obbligatorie e poi caricare progressivamente solo le aree realmente coinvolte.

Regola base:

1. Leggere `AGENTS.md`, `.github/copilot-instructions.md` e `.github/copilot-instructions-full.md`.
2. Creare una mappa minima del task: area, file probabili, script di verifica, rischi.
3. Usare ricerche mirate invece di aprire intere cartelle o documenti lunghi.
4. Mantenere un riepilogo operativo breve dentro il turno.
5. Verificare per slice, poi allargare solo se il rischio lo richiede.

---

## 2. Ottimizzazione in sviluppo

### 2.1 Contesto minimo iniziale

Per ogni intervento di sviluppo, caricare nell'ordine:

| Livello | Cosa leggere | Quando fermarsi |
|---|---|---|
| Regole | `AGENTS.md`, quick checklist e full instructions | Sempre, prima di modificare |
| Mappa | `rg --files`, `package.json`, file indice dell'area | Quando sono chiari entrypoint e script |
| Pattern locale | 2-5 file simili al target | Quando il pattern e ripetibile |
| File target | File completo prima della modifica | Sempre, se verra modificato |
| Dipendenze | Service, hook, route, test collegati | Solo se il target li invoca direttamente |

Evitare di caricare `docs/CHANGELOG.md`, audit molto lunghi o output completi di `git status` se non servono al task. Per una working tree grande, preferire viste mirate:

```bash
git status --short -- <area>
git diff -- <file>
rg -n "pattern" <area>
```

### 2.2 Ledger sintetico del turno

Durante il lavoro mantenere mentalmente, o nel documento del task se serve, un ledger di massimo 10 righe:

```text
Obiettivo:
Area:
File letti:
File modificati:
Pattern usato:
Rischi:
Verifica minima:
Verifica allargata:
Decisioni:
Residui:
```

Questo sostituisce la necessita di rileggere continuamente gli stessi file e riduce la dispersione nei turni lunghi.

### 2.3 Letture progressive

Usare questa soglia pratica:

- Aprire prime 80-160 righe per capire import e struttura.
- Aprire il file completo solo se va modificato o se il comportamento dipende da sezioni lontane.
- Per file oltre 500 righe, usare prima `rg` su funzioni, export, componenti e route.
- Per errori TypeScript/build, leggere sempre l'errore completo ma riportare solo la causa utile.

### 2.4 Output terminale

Ridurre output non informativo:

- Usare `rg` invece di grep ricorsivi generici.
- Limitare scope di test e build nella prima verifica.
- Evitare comandi che stampano migliaia di righe se basta `--short`, `--name-only` o un path specifico.
- Non incollare segreti, token applicativi, env completi o log con PII nel contesto.

---

## 3. Ottimizzazione in deployment

### 3.1 Preflight a basso consumo

Prima di qualsiasi deployment o preparazione deploy, leggere solo:

1. Regole progetto obbligatorie.
2. Script direttamente coinvolto, ad esempio `scripts/build-production.sh`, `scripts/deploy-frontend.sh`, `scripts/deploy-production.sh`.
3. Se necessario, la sezione pertinente di `docs/05-deployment/DEPLOYMENT_GUIDE.md`, non tutto il file.

Per frontend production rispettare sempre la mappatura:

| Build locale | Dominio |
|---|---|
| `dist/` | `elementsicurezza.com` |
| `dist-public/` | `elementmedica.com` |

Per ridurre token e rischio, il report deploy deve contenere:

- commit/branch o stato sorgente usato;
- comando di build usato;
- directory prodotte;
- health check essenziali;
- eventuali warning;
- nessun segreto e nessun dump di `.env`.

### 3.2 Deploy journal compatto

Per ogni deploy, registrare un riepilogo in 8-12 righe:

```text
Data:
Ambiente:
Scope:
Build script:
Output:
Upload:
Backend touched:
Restart:
Health:
Rollback point:
Note:
```

Questo permette a Codex di riprendere il contesto senza rileggere log, script e guide intere.

### 3.3 Regole di sicurezza token-efficient

- Non leggere o stampare env completi.
- Non ripetere credenziali o segreti in chat.
- Non eseguire modifiche cloud/Hetzner senza autorizzazione scritta specifica.
- Per capire "cosa cambierebbe", preferire dry-run o diff mirati.
- Per problemi post-deploy, leggere prima health check e ultime righe log mirate, poi allargare.

---

## 4. Ottimizzazione della gestione modifiche introdotte

### 4.1 Isolamento in working tree sporca

Quando la working tree ha molte modifiche preesistenti:

1. Non fare reset o checkout distruttivi.
2. Annotare i file che Codex modifica nel turno.
3. Usare `git diff -- <file>` solo sui file toccati.
4. Non riformattare file non collegati al task.
5. Se un file e gia modificato, leggere il contesto e integrare senza sovrascrivere lavoro altrui.

### 4.2 Change packet

Ogni intervento dovrebbe produrre un change packet compatto:

```text
Intento:
File modificati:
Comportamento prima:
Comportamento dopo:
Verifiche:
Rischi residui:
Rollback:
```

Questo e piu efficiente di un riepilogo narrativo lungo e aiuta i turni successivi a ripartire in pochi token.

### 4.3 Verifiche per anelli

Usare verifiche progressive:

| Anello | Verifica | Quando |
|---|---|---|
| 1 | lint/typecheck/test file singolo | Modifica piccola |
| 2 | test area o build mirata | Modifica condivisa |
| 3 | build production script | Frontend/shared o deploy |
| 4 | health/login smoke | Auth, API, deploy |

Non passare subito all'anello 4 se l'anello 1 fallisce. Leggere l'errore completo, correggere, poi salire.

### 4.4 Documentazione delle decisioni

Quando una scelta evita lavoro futuro, documentarla in modo breve:

- perche e stata scelta;
- alternativa scartata;
- file o script interessati;
- verifica usata.

Non documentare ogni dettaglio di implementazione ovvio. Documentare solo cio che riduce ambiguita nei turni futuri.

---

## 5. Prompt operativi consigliati

### Sviluppo mirato

```text
Lavora solo su <area>. Prima leggi AGENTS e copilot full. Usa ricerche mirate, non leggere changelog interi. Modifica solo i file necessari. Alla fine dammi change packet e verifiche.
```

### Debug

```text
Parti dall'errore completo, identifica il file responsabile, leggi il contesto locale e correggi. Non fare refactor non richiesti. Rerun della verifica minima.
```

### Deployment

```text
Prepara/verifica deploy per <ambiente>. Leggi lo script coinvolto e solo la sezione pertinente della guida. Non stampare env o segreti. Riporta deploy journal compatto.
```

### Ripresa dopo interruzione

```text
Riprendi dal ledger: obiettivo, file letti, file modificati, verifiche eseguite, prossimo passo. Non rileggere tutto se il contesto e gia chiaro.
```

---

## 6. Checklist finale Codex

Prima di dichiarare completato:

- Regole progetto lette e applicate.
- Scope mantenuto stretto.
- File modificati elencati.
- Nessun segreto o PII riportato.
- Working tree preesistente preservata.
- Verifica minima eseguita o blocker dichiarato.
- Riepilogo finale breve, con percorso del documento o dei file principali.

---

## 7. Sintesi

La gestione ottimale dei token Codex in ElementMedica si basa su tre abitudini:

1. **Sviluppo**: contesto progressivo, pattern locali, ledger breve.
2. **Deployment**: script e guide mirate, journal compatto, zero segreti.
3. **Modifiche**: isolamento dei file toccati, change packet, verifiche per anelli.

Questo approccio mantiene Codex efficace anche su turni lunghi, riduce riletture inutili e rende piu sicura la collaborazione su un progetto grande e gia ricco di modifiche parallele.
