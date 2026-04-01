/**
 * SidebarContext - Context for controlling sidebar state from child components
 * 
 * Allows pages like VisitaPage to control the sidebar collapse state
 * without prop drilling through the layout hierarchy.
 * 
 * @module contexts/SidebarContext
 * @project P52 - Clinical Visit Template System
 * @session #16 - Sidebar auto-collapse for visits
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface SidebarContextType {
    /** Whether sidebar is collapsed */
    isCollapsed: boolean;
    /** Set sidebar collapsed state */
    setCollapsed: (collapsed: boolean) => void;
    /** Toggle sidebar state */
    toggleCollapsed: () => void;
    /** Collapse sidebar (convenience method) */
    collapse: () => void;
    /** Expand sidebar (convenience method) */
    expand: () => void;
    /** Routes that should auto-collapse sidebar */
    autoCollapseRoutes: string[];
    /** Register a route for auto-collapse */
    registerAutoCollapseRoute: (route: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
    children: React.ReactNode;
    /** Initial collapsed state */
    initialCollapsed?: boolean;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
    children,
    initialCollapsed = false
}) => {
    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
    const [autoCollapseRoutes, setAutoCollapseRoutes] = useState<string[]>([
        '/poliambulatorio/visite/'  // Auto-collapse for visit detail pages
    ]);
    const location = useLocation();

    // Track if user manually toggled the sidebar (to respect their choice)
    const userOverrideRef = useRef(false);
    const prevPathnameRef = useRef(location.pathname);

    // Auto-collapse on route change ONLY if user hasn't manually overridden
    useEffect(() => {
        // Reset override when navigating to a different page
        if (prevPathnameRef.current !== location.pathname) {
            userOverrideRef.current = false;
            prevPathnameRef.current = location.pathname;
        }

        // Don't auto-collapse if user manually toggled
        if (userOverrideRef.current) return;

        const shouldCollapse = autoCollapseRoutes.some(route =>
            location.pathname.includes(route) &&
            // Ensure it's a detail page (has ID after route)
            location.pathname.split(route)[1]?.length > 0
        );

        if (shouldCollapse && !isCollapsed) {
            setIsCollapsed(true);
        }
    }, [location.pathname, autoCollapseRoutes, isCollapsed]);

    const setCollapsed = useCallback((collapsed: boolean) => {
        userOverrideRef.current = true; // User explicitly changed state
        setIsCollapsed(collapsed);
    }, []);

    const toggleCollapsed = useCallback(() => {
        userOverrideRef.current = true; // User explicitly changed state
        setIsCollapsed(prev => !prev);
    }, []);

    const collapse = useCallback(() => {
        setIsCollapsed(true);
    }, []);

    const expand = useCallback(() => {
        setIsCollapsed(false);
    }, []);

    const registerAutoCollapseRoute = useCallback((route: string) => {
        setAutoCollapseRoutes(prev => {
            if (prev.includes(route)) return prev;
            return [...prev, route];
        });
    }, []);

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                setCollapsed,
                toggleCollapsed,
                collapse,
                expand,
                autoCollapseRoutes,
                registerAutoCollapseRoute
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
};

/**
 * Hook to access sidebar context
 */
export const useSidebar = (): SidebarContextType => {
    const context = useContext(SidebarContext);
    if (!context) {
        // Return a default no-op context if not wrapped in provider
        return {
            isCollapsed: false,
            setCollapsed: () => { },
            toggleCollapsed: () => { },
            collapse: () => { },
            expand: () => { },
            autoCollapseRoutes: [],
            registerAutoCollapseRoute: () => { }
        };
    }
    return context;
};

/**
 * Hook to auto-collapse sidebar on mount and restore on unmount
 * Use this in pages that need more horizontal space
 */
export const useAutoCollapseSidebar = (): void => {
    const { collapse, expand, isCollapsed } = useSidebar();

    useEffect(() => {
        // Store previous state
        const wasCollapsed = isCollapsed;

        // Collapse on mount
        collapse();

        // Restore on unmount
        return () => {
            if (!wasCollapsed) {
                expand();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount/unmount
};

export default SidebarContext;
