import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { LoadingFallback } from '../../../components/ui/LoadingFallback';

const FatturazioneElettronicaPage = React.lazy(() => import('./FatturazioneElettronicaPage'));
const EntiEmittentiPage = React.lazy(() => import('./EntiEmittentiPage'));
const SistemaTSPage = React.lazy(() => import('./SistemaTSPage'));
const BillingIntegrationStatusPage = React.lazy(() => import('./BillingIntegrationStatusPage'));
const SpeseRicevutePage = React.lazy(() => import('./SpeseRicevutePage'));

export const FatturazioneElettronicaPageLazy: React.FC = () => (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Caricamento Fatturazione..." />}>
            <FatturazioneElettronicaPage />
        </Suspense>
    </ErrorBoundary>
);

export const EntiEmittentiPageLazy: React.FC = () => (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Caricamento Enti Emittenti..." />}>
            <EntiEmittentiPage />
        </Suspense>
    </ErrorBoundary>
);

export const SistemaTSPageLazy: React.FC = () => (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Caricamento Sistema TS..." />}>
            <SistemaTSPage />
        </Suspense>
    </ErrorBoundary>
);

export const BillingIntegrationStatusPageLazy: React.FC = () => (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Caricamento Stato Integrazioni..." />}>
            <BillingIntegrationStatusPage />
        </Suspense>
    </ErrorBoundary>
);

export const SpeseRicevutePageLazy: React.FC = () => (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Caricamento Spese & Fatture..." />}>
            <SpeseRicevutePage />
        </Suspense>
    </ErrorBoundary>
);

