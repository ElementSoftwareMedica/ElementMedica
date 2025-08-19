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

        console.log('Login response status:', loginResponse.status);
        console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
        console.log('Login response headers:', loginResponse.headers);

        if (loginResponse.status === 200 && loginResponse.body.tokens) {
            authToken = loginResponse.body.tokens.access_token;
            console.log('Token estratto:', authToken ? authToken.substring(0, 50) + '...' : 'UNDEFINED');
        } else {
            console.error('Login fallito - Status:', loginResponse.status);
            console.error('Login fallito - Body:', loginResponse.body);
            console.error('Login fallito - Text:', loginResponse.text);
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

            console.log('Employees list status:', response.status);
            console.log('Employees list response:', response.body);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/employees/export - Export dipendenti', async () => {
            const response = await request(app)
                .get('/api/v1/employees/export')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('Employees export status:', response.status);
            console.log('Employees export response:', response.body);

            expect(response.status).toBe(200);
        });
    });

    describe('Trainers Routes', () => {
        test('GET /api/v1/trainers - Lista formatori', async () => {
            const response = await request(app)
                .get('/api/v1/trainers')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('Trainers list status:', response.status);
            console.log('Trainers list response:', response.body);

            expect(response.status).toBe(200);
        });

        test('GET /api/v1/trainers/export - Export formatori', async () => {
            const response = await request(app)
                .get('/api/v1/trainers/export')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('Trainers export status:', response.status);
            console.log('Trainers export response:', response.body);

            expect(response.status).toBe(200);
        });
    });

    describe('Virtual Entities Permissions', () => {
        test('GET /api/virtual-entities/employees - Permessi entità virtuali dipendenti', async () => {
            const response = await request(app)
                .get('/api/virtual-entities/employees')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('Virtual employees status:', response.status);
            console.log('Virtual employees response:', response.body);

            expect(response.status).toBe(200);
        });

        test('GET /api/virtual-entities/trainers - Permessi entità virtuali formatori', async () => {
            const response = await request(app)
                .get('/api/virtual-entities/trainers')
                .set('Authorization', `Bearer ${authToken}`);

            console.log('Virtual trainers status:', response.status);
            console.log('Virtual trainers response:', response.body);

            expect(response.status).toBe(200);
        });
    });
});