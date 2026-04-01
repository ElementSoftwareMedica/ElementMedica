/**
 * P65 - useSignature Hook Tests
 * 
 * Test suite per l'hook di gestione firme digitali.
 * 
 * @module hooks/signature/__tests__/useSignature.test
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignature } from '../useSignature';
import React from 'react';

// Mock api functions
vi.mock('../../../services/api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
}));

// Mock useToast
vi.mock('../../useToast', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

import { apiGet, apiPost } from '../../../services/api';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

// Create a wrapper with QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useSignature Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('returns initial state correctly', () => {
            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            expect(result.current.createRequest).toBeDefined();
            expect(result.current.applySignature).toBeDefined();
            expect(result.current.verifySignature).toBeDefined();
            expect(result.current.cancelSignature).toBeDefined();
            expect(result.current.isCreating).toBe(false);
            expect(result.current.isSigning).toBe(false);
            expect(result.current.isVerifying).toBe(false);
            expect(result.current.isCancelling).toBe(false);
        });

        it('does not fetch saved signature without firmatarioId', () => {
            renderHook(() => useSignature({ autoFetchSaved: true }), {
                wrapper: createWrapper(),
            });

            expect(mockApiGet).not.toHaveBeenCalled();
        });
    });

    describe('createRequest', () => {
        it('creates signature request successfully', async () => {
            const mockFirma = {
                id: 'firma-123',
                refertoId: 'referto-456',
                documentType: 'REFERTO',
                firmatarioId: 'medico-789',
                firmatarioRole: 'MEDICO',
                stato: 'IN_ATTESA',
                tipoFirma: 'GRAFOMETRICA',
                hashDocumento: 'abc123',
                tenantId: 'tenant-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockApiPost.mockResolvedValueOnce(mockFirma);

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            let firma;
            await act(async () => {
                firma = await result.current.createRequest({
                    documentType: 'REFERTO',
                    refertoId: 'referto-456',
                    firmatarioId: 'medico-789',
                    firmatarioRole: 'MEDICO',
                    tipoFirma: 'GRAFOMETRICA',
                    documentContent: '<html>...</html>',
                });
            });

            expect(mockApiPost).toHaveBeenCalledWith(
                '/api/v1/signatures/request',
                expect.objectContaining({
                    documentType: 'REFERTO',
                    refertoId: 'referto-456',
                })
            );
            expect(firma).toEqual(mockFirma);
        });

        it('sets isCreating to true during request', async () => {
            mockApiPost.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve({ id: 'test' }), 100);
            }));

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.createRequest({
                    documentType: 'REFERTO',
                    firmatarioId: 'medico-1',
                    firmatarioRole: 'MEDICO',
                    tipoFirma: 'GRAFOMETRICA',
                    documentContent: 'test',
                });
            });

            expect(result.current.isCreating).toBe(true);

            await waitFor(() => {
                expect(result.current.isCreating).toBe(false);
            });
        });
    });

    describe('applySignature', () => {
        it('applies graphometric signature successfully', async () => {
            const mockSignedFirma = {
                id: 'firma-123',
                stato: 'FIRMATO',
                hashFirma: 'hash-firma-123',
            };

            mockApiPost.mockResolvedValueOnce(mockSignedFirma);

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            const signatureInput = {
                firmaId: 'firma-123',
                signatureData: {
                    imageBase64: 'data:image/png;base64,test',
                    imageFormat: 'png' as const,
                    width: 600,
                    height: 200,
                    isEmpty: false,
                    timestamp: new Date(),
                },
                consent: {
                    gdprAccepted: true,
                    dataProcessingAccepted: true,
                    timestamp: new Date(),
                },
            };

            let signedFirma;
            await act(async () => {
                signedFirma = await result.current.applySignature(signatureInput);
            });

            expect(mockApiPost).toHaveBeenCalledWith(
                '/api/v1/signatures/firma-123/sign-graphometric',
                expect.objectContaining({
                    firmaImageBase64: 'data:image/png;base64,test',
                })
            );
            expect(signedFirma).toEqual(mockSignedFirma);
        });

        it('sets isSigning to true during signature', async () => {
            mockApiPost.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve({ id: 'test' }), 100);
            }));

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.applySignature({
                    firmaId: 'firma-123',
                    signatureData: {
                        imageBase64: 'test',
                        imageFormat: 'png',
                        width: 600,
                        height: 200,
                        isEmpty: false,
                        timestamp: new Date(),
                    },
                    consent: {
                        gdprAccepted: true,
                        dataProcessingAccepted: true,
                        timestamp: new Date(),
                    },
                });
            });

            expect(result.current.isSigning).toBe(true);

            await waitFor(() => {
                expect(result.current.isSigning).toBe(false);
            });
        });
    });

    describe('verifySignature', () => {
        it('verifies signature successfully', async () => {
            const mockVerification = {
                valid: true,
                firma: { id: 'firma-123', stato: 'VERIFICATO' },
                verification: {
                    documentIntegrity: true,
                    hashMatch: true,
                    isExpired: false,
                    hasVault: true,
                },
            };

            mockApiPost.mockResolvedValueOnce(mockVerification);

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            let verification;
            await act(async () => {
                verification = await result.current.verifySignature(
                    'firma-123',
                    '<html>document content</html>'
                );
            });

            expect(mockApiPost).toHaveBeenCalledWith(
                '/api/v1/signatures/firma-123/verify',
                { documentContent: '<html>document content</html>' }
            );
            expect(verification!.valid).toBe(true);
        });
    });

    describe('cancelSignature', () => {
        it('cancels signature successfully', async () => {
            const mockCancelledFirma = {
                id: 'firma-123',
                stato: 'ANNULLATO',
            };

            mockApiPost.mockResolvedValueOnce(mockCancelledFirma);

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            let cancelledFirma;
            await act(async () => {
                cancelledFirma = await result.current.cancelSignature(
                    'firma-123',
                    'Motivo annullamento test'
                );
            });

            expect(mockApiPost).toHaveBeenCalledWith(
                '/api/v1/signatures/firma-123/cancel',
                { motivoAnnullamento: 'Motivo annullamento test' }
            );
            expect(cancelledFirma!.stato).toBe('ANNULLATO');
        });
    });

    describe('Saved Signature', () => {
        it('fetches saved signature when firmatarioId is provided', async () => {
            const mockSavedSignature = {
                firmaId: 'firma-old',
                imageUrl: 'data:image/png;base64,saved',
                tipo: 'GRAFOMETRICA',
                lastUsed: new Date().toISOString(),
            };

            mockApiGet.mockResolvedValueOnce(mockSavedSignature);

            const { result } = renderHook(
                () => useSignature({
                    autoFetchSaved: true,
                    firmatarioId: 'medico-123',
                }),
                { wrapper: createWrapper() }
            );

            await waitFor(() => {
                expect(mockApiGet).toHaveBeenCalledWith(
                    '/api/v1/signatures/saved/medico-123'
                );
            });

            await waitFor(() => {
                expect(result.current.savedSignature).toEqual(mockSavedSignature);
            });
        });

        it('handles missing saved signature gracefully', async () => {
            mockApiGet.mockRejectedValueOnce(new Error('Not found'));

            const { result } = renderHook(
                () => useSignature({
                    autoFetchSaved: true,
                    firmatarioId: 'medico-123',
                }),
                { wrapper: createWrapper() }
            );

            await waitFor(() => {
                expect(result.current.savedSignature).toBeNull();
            });
        });
    });

    describe('Error Handling', () => {
        it('handles createRequest error', async () => {
            mockApiPost.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            await expect(
                act(async () => {
                    await result.current.createRequest({
                        documentType: 'REFERTO',
                        firmatarioId: 'medico-1',
                        firmatarioRole: 'MEDICO',
                        tipoFirma: 'GRAFOMETRICA',
                        documentContent: 'test',
                    });
                })
            ).rejects.toThrow();
        });

        it('handles applySignature error', async () => {
            mockApiPost.mockRejectedValueOnce(new Error('Signature failed'));

            const { result } = renderHook(() => useSignature(), {
                wrapper: createWrapper(),
            });

            await expect(
                act(async () => {
                    await result.current.applySignature({
                        firmaId: 'firma-123',
                        signatureData: {
                            imageBase64: 'test',
                            imageFormat: 'png',
                            width: 600,
                            height: 200,
                            isEmpty: false,
                            timestamp: new Date(),
                        },
                        consent: {
                            gdprAccepted: true,
                            dataProcessingAccepted: true,
                            timestamp: new Date(),
                        },
                    });
                })
            ).rejects.toThrow();
        });
    });
});
