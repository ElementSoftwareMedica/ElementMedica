import { test, expect } from '@playwright/test';

// Smoke test: apertura ScheduleEventModal e presenza controlli di navigazione
// Nota: mockiamo endpoints minimi per caricare la pagina Schedules

test.describe('Schedules - ScheduleEventModal', () => {
  test.beforeEach(async ({ page }) => {
    // Preimposto la sessione: token e tenant
    await page.addInitScript(() => {
      try {
        localStorage.setItem('authToken', 'e2e-fake-token');
        localStorage.setItem('refreshToken', 'e2e-fake-refresh');
        localStorage.setItem('tenantId', 'tenant-e2e');
      } catch {}
    });

    // Mock auth verify nel caso venga chiamato
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          user: {
            id: 'person-e2e',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'E2E',
            role: 'Admin',
            roles: ['ADMIN'],
            tenantId: 'tenant-e2e',
            isVerified: true
          },
          permissions: {
            'schedules:all': true,
            'companies:read': true,
            'persons:read': true,
            'courses:read': true,
            'trainers:read': true
          },
          timestamp: new Date().toISOString()
        }),
      });
    });

    // Mock lista schedules
    await page.route('**/api/v1/schedules*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Mock companies/persons minimi
    await page.route('**/api/v1/companies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'comp1', name: 'Azienda E2E' }]),
      });
    });

    await page.route('**/api/v1/persons*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'p1', firstName: 'Giulia', lastName: 'Verdi', companyId: 'comp1', isActive: true },
          { id: 'p2', firstName: 'Luca', lastName: 'Neri', companyId: 'comp1', isActive: true },
          { id: 't1', firstName: 'Mario', lastName: 'Rossi', companyId: 'comp1', isActive: true, specialties: ['Sicurezza'], certifications: ['DVR'], roleType: 'TRAINER' }
        ]),
      });
    });

    // Mock trainers (endpoint alternativo)
    await page.route('**/api/v1/trainers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 't1', firstName: 'Mario', lastName: 'Rossi', companyId: 'comp1', isActive: true, specialties: ['Sicurezza'], certifications: ['DVR'] }
        ]),
      });
    });

    // Mock corsi con varianti per popolamento dinamico rischio/tipo
    await page.route('**/api/v1/courses*', async (route) => {
      // Gestiamo sia lista base che ricerca (?search=)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'c1a', title: 'Corso Sicurezza Base', duration: 8, riskLevel: 'BASSO', courseType: 'PRIMO_CORSO' },
          { id: 'c1b', title: 'Corso Sicurezza Base', duration: 8, riskLevel: 'BASSO', courseType: 'AGGIORNAMENTO' },
          { id: 'c2', title: 'Primo Soccorso', duration: 12 },
        ]),
      });
    });

    // Mock tenants
    await page.route('**/api/tenants/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tenant: { id: 'tenant-e2e', name: 'Tenant E2E' }
          }
        })
      });
    });

  });

  test('smoke: apre il modal e mostra i controlli base', async ({ page }) => {
    // Vai alla pagina delle programmazioni tramite Dev Auto Login (apre automaticamente il modal)
    await page.goto('/dev-login');
    await expect(page.getByRole('heading', { name: 'Pianificazioni' })).toBeVisible({ timeout: 20000 });

    // Verifica che il modal sia visibile
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Controlli: Avanti e Annulla visibili, Indietro non presente allo step iniziale
    await expect(page.getByRole('button', { name: /Avanti/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Indietro/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Annulla/i })).toBeVisible();

    // Chiudi il modal con "Annulla"
    await page.getByRole('button', { name: /Annulla/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('compila Step 1 (Dettagli) e verifica riepilogo ore', async ({ page }) => {
    await page.goto('/dev-login');
    await expect(page.getByRole('heading', { name: 'Pianificazioni' })).toBeVisible({ timeout: 20000 });

    // (modal già aperto da dev-login)
    // Seleziona il macro-corso tramite react-select Async
    // Clic sul primo controllo react-select (corso)
    await page.locator('.react-select__control').first().click();
    // Digita parte del nome e seleziona l'opzione
    await page.locator('.react-select__input input').first().fill('Sicurezza');
    await page.getByRole('option', { name: 'Corso Sicurezza Base' }).click();

    // Sezione "Tipo Corso *": seleziona pillola "Aggiornamento" (non più react-select)
    const tipoSection = page.getByText('Tipo Corso *').locator('..');
    await expect(tipoSection).toBeVisible();
    await tipoSection.getByRole('button', { name: 'Aggiornamento' }).click();

    // Compila Luogo
    await page.getByPlaceholder('Inserisci il luogo del corso').fill('Aula 101');

    // Seleziona Formatore Principale
    const trainerLabel = page.getByText('Formatore Principale');
    const trainerSelect = trainerLabel.locator('..').locator('.react-select__control');
    await trainerSelect.click();
    await page.getByRole('option', { name: 'Mario Rossi' }).click();

    // Modifica Ora Fine per ottenere 8h totali (09:00 - 17:00)
    const oraFineInput = page.getByText('Ora Fine').locator('..').locator('input[type="time"]');
    await oraFineInput.fill('17:00');

    // Verifica riepilogo ore
    await expect(page.getByText(/Ore selezionate:\s*8h/)).toBeVisible();
    await expect(page.getByText(/Durata corso:\s*8h/)).toBeVisible();
    await expect(page.getByText(/Ore rimanenti:\s*0h/)).toBeVisible();

    // Avanti deve essere abilitato
    await expect(page.getByRole('button', { name: /Avanti/i })).toBeEnabled();
  });

  test('macro-corso con varianti: mostra pillole rischio/tipo, auto-selezione rischio unico e required', async ({ page }) => {
    await page.goto('/dev-login');
    await expect(page.getByRole('heading', { name: 'Pianificazioni' })).toBeVisible({ timeout: 20000 });

    // Seleziona "Corso Sicurezza Base" (solo rischio BASSO, tipo con 2 opzioni)
    await page.locator('.react-select__control').first().click();
    await page.locator('.react-select__input input').first().fill('Sicurezza');
    await page.getByRole('option', { name: 'Corso Sicurezza Base' }).click();

    // Rischio: sezione required e pillole presenti, auto-selezione "Basso"
    const rischioSection = page.getByText('Livello di Rischio *').locator('..');
    await expect(rischioSection).toBeVisible();
    const bassoBtn = rischioSection.getByRole('button', { name: 'Basso' });
    await expect(bassoBtn).toBeVisible();
    // Non devono apparire opzioni non pertinenti
    await expect(rischioSection.getByRole('button', { name: 'Medio' })).toHaveCount(0);
    await expect(rischioSection.getByRole('button', { name: 'Alto' })).toHaveCount(0);
    // Auto-selected style (primary)
    await expect(bassoBtn).toHaveClass(/bg-primary-100/);

    // Tipo: sezione required e pillole presenti, seleziona "Aggiornamento"
    const tipoSection2 = page.getByText('Tipo Corso *').locator('..');
    await expect(tipoSection2).toBeVisible();
    const aggiornamentoBtn = tipoSection2.getByRole('button', { name: 'Aggiornamento' });
    const primoCorsoBtn = tipoSection2.getByRole('button', { name: 'Primo corso' });
    await expect(aggiornamentoBtn).toBeVisible();
    await expect(primoCorsoBtn).toBeVisible();
    await aggiornamentoBtn.click();
    await expect(aggiornamentoBtn).toHaveClass(/bg-primary-100/);
  });

  test('macro-corso senza varianti: sezione disabilitata e reset quando si cambia corso', async ({ page }) => {
    await page.goto('/dev-login');
    await expect(page.getByRole('heading', { name: 'Pianificazioni' })).toBeVisible({ timeout: 20000 });

    // 1) Seleziona macro-corso con varianti -> rischio auto-selezionato Basso
    await page.locator('.react-select__control').first().click();
    await page.locator('.react-select__input input').first().fill('Sicurezza');
    await page.getByRole('option', { name: 'Corso Sicurezza Base' }).click();
    const rischioSection = page.getByText('Livello di Rischio *').locator('..');
    await expect(rischioSection.getByRole('button', { name: 'Basso' })).toHaveClass(/bg-primary-100/);

    // 2) Cambia a macro-corso senza varianti -> sezioni disabilitate e selezione resettata
    await page.locator('.react-select__control').first().click();
    await page.locator('.react-select__input input').first().fill('Primo');
    await page.getByRole('option', { name: 'Primo Soccorso' }).click();

    // Le etichette non sono required (niente asterisco) e compare messaggio "Non applicabile"
    await expect(page.getByText('Livello di Rischio *')).toHaveCount(0);
    await expect(page.getByText('Tipo Corso *')).toHaveCount(0);
    await expect(page.getByText('Livello di Rischio').locator('..').getByText('Non applicabile per questo corso')).toBeVisible();
    await expect(page.getByText('Tipo Corso').locator('..').getByText('Non applicabile per questo corso')).toBeVisible();

    // Non deve esserci più la pillola "Basso"
    await expect(page.getByRole('button', { name: 'Basso' })).toHaveCount(0);

    // 3) Tornando a macro-corso con varianti, la selezione rischio torna auto-impostata
    await page.locator('.react-select__control').first().click();
    await page.locator('.react-select__input input').first().fill('Sicurezza');
    await page.getByRole('option', { name: 'Corso Sicurezza Base' }).click();
    const rischioSection2 = page.getByText('Livello di Rischio *').locator('..');
    await expect(rischioSection2.getByRole('button', { name: 'Basso' })).toHaveClass(/bg-primary-100/);
  });
});


  test('Primo Soccorso con più varianti: mostra pillole rischio e tipo', async ({ page }) => {
    // Preimposta sessione come nel beforeEach del describe principale
    await page.addInitScript(() => {
      try {
        localStorage.setItem('authToken', 'e2e-fake-token');
        localStorage.setItem('refreshToken', 'e2e-fake-refresh');
        localStorage.setItem('tenantId', 'tenant-e2e');
      } catch {}
    });

    // Mock necessari (auth, schedules, companies/persons/trainers, tenants)
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          user: {
            id: 'person-e2e',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'E2E',
            role: 'Admin',
            roles: ['ADMIN'],
            tenantId: 'tenant-e2e',
            isVerified: true
          },
          permissions: {
            'schedules:all': true,
            'companies:read': true,
            'persons:read': true,
            'courses:read': true,
            'trainers:read': true
          },
          timestamp: new Date().toISOString()
        }),
      });
    });

    await page.route('**/api/v1/schedules*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/v1/companies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'comp1', name: 'Azienda E2E' }]),
      });
    });

    await page.route('**/api/v1/persons*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'p1', firstName: 'Giulia', lastName: 'Verdi', companyId: 'comp1', isActive: true },
          { id: 'p2', firstName: 'Luca', lastName: 'Neri', companyId: 'comp1', isActive: true },
          { id: 't1', firstName: 'Mario', lastName: 'Rossi', companyId: 'comp1', isActive: true, specialties: ['Sicurezza'], certifications: ['DVR'], roleType: 'TRAINER' }
        ]),
      });
    });

    await page.route('**/api/v1/trainers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 't1', firstName: 'Mario', lastName: 'Rossi', companyId: 'comp1', isActive: true, specialties: ['Sicurezza'], certifications: ['DVR'] }
        ]),
      });
    });

    await page.route('**/api/tenants/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { tenant: { id: 'tenant-e2e', name: 'Tenant E2E' } }
        })
      });
    });

    // Mock corsi con varianti multiple per "Primo Soccorso" e fallback
    await page.route('**/api/v1/courses*', async (route) => {
      const url = new URL(route.request().url());
      const searchQ = (url.searchParams.get('search') || '').toLowerCase();
      if (searchQ.includes('primo') || searchQ.includes('soccorso')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'ps1', title: 'Primo Soccorso', duration: 16, riskLevel: 'ALTO', courseType: 'PRIMO_CORSO' },
            { id: 'ps2', title: 'Primo Soccorso', duration: 12, riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' },
            { id: 'ps3', title: 'Primo Soccorso', duration: 8,  riskLevel: 'BASSO', courseType: 'AGGIORNAMENTO' },
          ]),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'c1a', title: 'Corso Sicurezza Base', duration: 8, riskLevel: 'BASSO', courseType: 'PRIMO_CORSO' },
          { id: 'c1b', title: 'Corso Sicurezza Base', duration: 8, riskLevel: 'BASSO', courseType: 'AGGIORNAMENTO' },
          { id: 'c2', title: 'Primo Soccorso', duration: 12 },
        ]),
      });
    });

    // Mock endpoint variants usato dalla ricerca dell'AsyncSelect
    await page.route('**/api/v1/courses/variants*', async (route) => {
      const url = new URL(route.request().url());
      const q = (
        url.searchParams.get('search') ||
        url.searchParams.get('title') ||
        url.searchParams.get('name') ||
        ''
      ).toLowerCase();
      if (q.includes('primo') || q.includes('soccorso')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'ps1', title: 'Primo Soccorso', duration: 16, riskLevel: 'ALTO', courseType: 'PRIMO_CORSO' },
            { id: 'ps2', title: 'Primo Soccorso', duration: 12, riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' },
            { id: 'ps3', title: 'Primo Soccorso', duration: 8,  riskLevel: 'BASSO', courseType: 'AGGIORNAMENTO' },
          ]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Mock fallback pubblico usato in caso di errore/nessun risultato
    await page.route('**/api/public/courses*', async (route) => {
      const url = new URL(route.request().url());
      const searchQ = (url.searchParams.get('search') || '').toLowerCase();
      if (searchQ.includes('primo') || searchQ.includes('soccorso')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'ps1', title: 'Primo Soccorso', duration: 16, riskLevel: 'ALTO', courseType: 'PRIMO_CORSO' },
            { id: 'ps2', title: 'Primo Soccorso', duration: 12, riskLevel: 'MEDIO', courseType: 'AGGIORNAMENTO' },
            { id: 'ps3', title: 'Primo Soccorso', duration: 8,  riskLevel: 'BASSO', courseType: 'AGGIORNAMENTO' },
          ]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Ora naviga alla pagina e attendi apertura modal
    await page.goto('/dev-login');
    await expect(page.getByRole('heading', { name: 'Pianificazioni' })).toBeVisible({ timeout: 20000 });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Seleziona il macro-corso "Primo Soccorso"
    const courseSelect = page.locator('.react-select__control').first();
    await expect(courseSelect).toBeVisible();
    await courseSelect.click();
    // Digita direttamente tramite input dell'AsyncSelect per garantire l'apertura del menu
    await page.locator('.react-select__input input').first().fill('Primo');
    await expect(page.getByRole('option', { name: 'Primo Soccorso' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('option', { name: 'Primo Soccorso' }).click();

    // Verifica: sezione rischio e tipo presenti con pillole
    const rischioSection = page.getByText('Livello di Rischio *').locator('..');
    await expect(rischioSection).toBeVisible();
    await expect(rischioSection.getByRole('button', { name: 'Basso' })).toBeVisible();
    await expect(rischioSection.getByRole('button', { name: 'Medio' })).toBeVisible();
    await expect(rischioSection.getByRole('button', { name: 'Alto' })).toBeVisible();

    const tipoSection = page.getByText('Tipo Corso *').locator('..');
    await expect(tipoSection).toBeVisible();
    await expect(tipoSection.getByRole('button', { name: 'Primo corso' })).toBeVisible();
    await expect(tipoSection.getByRole('button', { name: 'Aggiornamento' })).toBeVisible();

    // Seleziona un rischio e un tipo per verificare selezione
    await rischioSection.getByRole('button', { name: 'Medio' }).click();
    await expect(rischioSection.getByRole('button', { name: 'Medio' })).toHaveClass(/bg-primary-100/);
    await tipoSection.getByRole('button', { name: 'Aggiornamento' }).click();
    await expect(tipoSection.getByRole('button', { name: 'Aggiornamento' })).toHaveClass(/bg-primary-100/);
  });