import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const getSameOriginReferrerPath = () => {
    if (typeof document === 'undefined' || !document.referrer) return null;
    try {
        const referrer = new URL(document.referrer);
        if (referrer.origin !== window.location.origin) return null;
        return `${referrer.pathname}${referrer.search}${referrer.hash}`;
    } catch {
        return null;
    }
};

const getStoredPreviousPath = () => {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem('element:smart-back:last-non-visit-path');
    } catch {
        return null;
    }
};

const isVisitPath = (path: string) => /\/poliambulatorio\/visite(?:-embedded)?\/[^/?#]+/.test(path);

export const useSmartBack = (fallbackPath: string) => {
    const navigate = useNavigate();
    const location = useLocation();

    return useCallback(() => {
        const state = (location.state || {}) as {
            from?: string | { pathname?: string; search?: string; hash?: string };
            returnTo?: string;
            backgroundLocation?: { pathname?: string; search?: string; hash?: string };
        };

        const statePath = typeof state.returnTo === 'string'
            ? state.returnTo
            : typeof state.from === 'string'
                ? state.from
                : state.from?.pathname
                    ? `${state.from.pathname}${state.from.search || ''}${state.from.hash || ''}`
                    : state.backgroundLocation?.pathname
                        ? `${state.backgroundLocation.pathname}${state.backgroundLocation.search || ''}${state.backgroundLocation.hash || ''}`
                        : null;

        const currentFullPath = `${location.pathname}${location.search}${location.hash}`;

        if (statePath && statePath !== currentFullPath && !(isVisitPath(currentFullPath) && isVisitPath(statePath))) {
            navigate(statePath);
            return;
        }

        const referrerPath = getSameOriginReferrerPath();
        const storedPath = getStoredPreviousPath();
        if (isVisitPath(currentFullPath) && storedPath && storedPath !== currentFullPath && !isVisitPath(storedPath)) {
            navigate(storedPath);
            return;
        }

        const historyIndex = typeof window !== 'undefined'
            ? Number((window.history.state as { idx?: number } | null)?.idx || 0)
            : 0;
        if (historyIndex > 0) {
            navigate(-1);
            return;
        }

        navigate((storedPath && storedPath !== currentFullPath) ? storedPath : (referrerPath || fallbackPath));
    }, [fallbackPath, location.hash, location.pathname, location.search, location.state, navigate]);
};
