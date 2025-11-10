/**
 * Test per le entità virtuali (dipendenti e formatori)
 */

import request from 'supertest';
import express from 'express';
import { createTestApp, cleanupTestDatabase } from './helpers/test-app.js';
import { createTestCompany, createTestUser, cleanupTestDataSafe } from './setup.js';

describe('Virtual Entities Tests', () => {
    let authToken;
    let app;
    let testCompany;
    let testUser;

    beforeAll(async () => {
        // Crea un'app Express semplificata per i test
        app = await createTestApp();
        
        // Crea i dati di test necessari
        testCompany = await createTestCompany();
        testUser = await createTestUser(testCompany.id);
        
        // Login per ottenere il token
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                identifier: 'admin@example.com',
                password: 'Admin123!'
            });

        if (loginResponse.status === 200 && loginResponse.body.tokens) {
            authToken = loginResponse.body.tokens.access_token;
        } else {
            throw new Error(`Login fallito durante setup test - Status: ${loginResponse.status}`);
        }
    });

    afterAll(async () => {
        // Cleanup dei dati di test specifici
        if (testUser && testCompany) {
            await cleanupTestDataSafe(testCompany.id, [testUser.id]);
        }
        
        // Cleanup del database
        await cleanupTestDatabase();
    });

    describe('Employees Routes', () => {
        test('GET /api/v1/employees - Lista dipendenti', async () => {
            const response = await request(app)
                .get('/api/v1/employees')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/employees?companyId&tenantId - Lista con filtri company/tenant', async () => {
            const response = await request(app)
                .get(`/api/v1/employees?companyId=${encodeURIComponent(testCompany.id)}&tenantId=${encodeURIComponent(testCompany.tenantId)}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/employees/export - Export dipendenti', async () => {
            const response = await request(app)
                .get('/api/v1/employees/export')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('Trainers Routes', () => {
        test('GET /api/v1/trainers - Lista formatori', async () => {
            const response = await request(app)
                .get('/api/v1/trainers')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/trainers?companyId&tenantId - Lista con filtri company/tenant', async () => {
            const response = await request(app)
                .get(`/api/v1/trainers?companyId=${encodeURIComponent(testCompany.id)}&tenantId=${encodeURIComponent(testCompany.tenantId)}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/trainers/export - Export formatori', async () => {
            const response = await request(app)
                .get('/api/v1/trainers/export')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('Persons unified routes', () => {
        test('GET /api/v1/persons/export?format=json&view=employee - Export JSON employees', async () => {
            const response = await request(app)
                .get('/api/v1/persons/export?format=json&view=employee')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            // Deve essere JSON
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(Array.isArray(response.body) || typeof response.body === 'object').toBeTruthy();
        });

        test('GET /api/v1/persons/export?view=trainer - Export CSV trainers', async () => {
            const response = await request(app)
                .get('/api/v1/persons/export?view=trainer')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/text\/csv/);
            expect(response.headers['content-disposition']).toMatch(/attachment; filename="persons_export_trainer.csv"/);
            expect(typeof response.text).toBe('string');
            expect(response.text.length).toBeGreaterThan(0);
        });

        test('GET /api/v1/persons/:id/fields-visibility - Visibilità campi persona', async () => {
            const response = await request(app)
                .get(`/api/v1/persons/${encodeURIComponent(testUser.id)}/fields-visibility?view=person&fields=firstName,lastName,email`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('personId', testUser.id);
            expect(response.body).toHaveProperty('allowed', true);
            expect(response.body).toHaveProperty('visibleFields');
            expect(Array.isArray(response.body.visibleFields)).toBe(true);
            // Nuove verifiche su editabilità e mappa campi
            expect(response.body).toHaveProperty('editableFields');
            expect(Array.isArray(response.body.editableFields)).toBe(true);
            expect(response.body).toHaveProperty('fields');
            expect(typeof response.body.fields).toBe('object');
            // Verifica struttura per ciascun campo richiesto
            ['firstName','lastName','email'].forEach(key => {
                expect(response.body.fields).toHaveProperty(key);
                expect(typeof response.body.fields[key].visible).toBe('boolean');
                expect(typeof response.body.fields[key].editable).toBe('boolean');
            });
        });

        test('GET /api/v1/persons/:id - Dettaglio persona', async () => {
            const response = await request(app)
                .get(`/api/v1/persons/${encodeURIComponent(testUser.id)}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', testUser.id);
            // Verifica presenza meta visibilità se presente
            if (response.body._visibility) {
                expect(response.body._visibility).toHaveProperty('allowed', true);
                // Nuove verifiche su editableFields nel meta
                expect(response.body._visibility).toHaveProperty('editableFields');
                expect(Array.isArray(response.body._visibility.editableFields)).toBe(true);
            }
        });
    });

    describe('Virtual Entities Permissions', () => {
        test('GET /api/virtual-entities/employees - Permessi entità virtuali dipendenti', async () => {
            const response = await request(app)
                .get('/api/virtual-entities/employees')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });

        test('GET /api/virtual-entities/trainers - Permessi entità virtuali formatori', async () => {
            const response = await request(app)
                .get('/api/virtual-entities/trainers')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });
});