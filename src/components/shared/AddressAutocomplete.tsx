/**
 * AddressAutocomplete - Componente per ricerca indirizzi con Google Places API
 * 
 * Fornisce autocomplete per indirizzi italiani con estrazione automatica di:
 * - Via/Piazza e numero civico
 * - Comune
 * - CAP
 * - Provincia
 * 
 * @module components/shared/AddressAutocomplete
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';

// Google Maps API Key - MUST be set via environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Global auth failure tracking - Google fires window.gm_authFailure when API key is invalid
let googleMapsAuthFailed = false;
const authFailureCallbacks: Array<() => void> = [];

if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).gm_authFailure = () => {
        googleMapsAuthFailed = true;
        authFailureCallbacks.forEach(cb => cb());
        authFailureCallbacks.length = 0;
    };
}

// ============================================
// TYPE DEFINITIONS FOR GOOGLE MAPS API
// ============================================

interface GoogleAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface GooglePlaceResult {
    address_components?: GoogleAddressComponent[];
    formatted_address?: string;
}

interface GoogleAutocomplete {
    addListener: (event: string, callback: () => void) => void;
    getPlace: () => GooglePlaceResult;
}

interface GoogleMapsEvent {
    clearInstanceListeners: (instance: object) => void;
}

interface GoogleMapsPlaces {
    Autocomplete: new (
        input: HTMLInputElement,
        options?: {
            componentRestrictions?: { country: string };
            types?: string[];
            fields?: string[];
        }
    ) => GoogleAutocomplete;
}

interface GoogleMaps {
    places?: GoogleMapsPlaces;
    event: GoogleMapsEvent;
}

interface GoogleAPI {
    maps?: GoogleMaps;
}

declare global {
    interface Window {
        google?: GoogleAPI;
    }
}

// ============================================
// INTERFACES
// ============================================

interface AddressComponents {
    indirizzo: string;
    comune: string;
    cap: string;
    provincia: string;
}

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onAddressSelect?: (components: AddressComponents) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

// Script loading state
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

/**
 * Load Google Maps Places API script dynamically
 */
const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (googleMapsLoaded && window.google?.maps?.places) {
            resolve();
            return;
        }

        loadCallbacks.push(resolve);

        if (googleMapsLoading) {
            return;
        }

        googleMapsLoading = true;

        // Check if script already exists
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            // Wait for it to load
            const checkLoaded = setInterval(() => {
                if (window.google?.maps?.places) {
                    clearInterval(checkLoaded);
                    googleMapsLoaded = true;
                    loadCallbacks.forEach(cb => cb());
                    loadCallbacks.length = 0;
                }
            }, 100);

            // Timeout if script never loads
            setTimeout(() => {
                clearInterval(checkLoaded);
                if (!googleMapsLoaded) {
                    googleMapsLoading = false;
                    const callbacks = [...loadCallbacks];
                    loadCallbacks.length = 0;
                    callbacks.forEach(() => reject(new Error('Google Maps script load timeout')));
                }
            }, 10000);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=it&region=IT&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            googleMapsLoaded = true;
            loadCallbacks.forEach(cb => cb());
            loadCallbacks.length = 0;
        };

        script.onerror = () => {
            googleMapsLoading = false;
            const callbacks = [...loadCallbacks];
            loadCallbacks.length = 0;
            callbacks.forEach(() => reject(new Error('Google Maps API non disponibile')));
        };

        document.head.appendChild(script);
    });
};

/**
 * Extract address components from Google Place result
 */
const extractAddressComponents = (place: GooglePlaceResult): AddressComponents => {
    const components: AddressComponents = {
        indirizzo: '',
        comune: '',
        cap: '',
        provincia: ''
    };

    if (!place.address_components) {
        return components;
    }

    let streetNumber = '';
    let route = '';

    for (const component of place.address_components) {
        const types = component.types;

        if (types.includes('street_number')) {
            streetNumber = component.long_name;
        } else if (types.includes('route')) {
            route = component.long_name;
        } else if (types.includes('locality')) {
            components.comune = component.long_name;
        } else if (types.includes('administrative_area_level_3') && !components.comune) {
            // Fallback for comune if locality not available
            components.comune = component.long_name;
        } else if (types.includes('postal_code')) {
            components.cap = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
            // Province in Italy: extract short_name (e.g., "MI", "RM")
            components.provincia = component.short_name;
        }
    }

    // Compose address: "Via/Piazza Nome, Numero"
    if (route) {
        components.indirizzo = streetNumber ? `${route}, ${streetNumber}` : route;
    }

    return components;
};

/**
 * AddressAutocomplete Component
 */
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    onAddressSelect,
    placeholder = 'Cerca indirizzo...',
    className = '',
    disabled = false
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
    const [isLoading, setIsLoading] = useState(!!GOOGLE_MAPS_API_KEY && !googleMapsAuthFailed);
    const [isFocused, setIsFocused] = useState(false);
    const [apiError, setApiError] = useState(googleMapsAuthFailed || !GOOGLE_MAPS_API_KEY);

    // Use refs for callbacks to avoid re-initializing autocomplete on every render
    const onChangeRef = useRef(onChange);
    const onAddressSelectRef = useRef(onAddressSelect);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onAddressSelectRef.current = onAddressSelect; }, [onAddressSelect]);

    // Initialize autocomplete - runs only once on mount
    useEffect(() => {
        let mounted = true;

        // If no API key configured, skip initialization entirely - manual input only
        if (!GOOGLE_MAPS_API_KEY) {
            setApiError(false); // Not an error - just no autocomplete configured
            setIsLoading(false);
            return;
        }

        // If auth already failed, skip initialization entirely - allow manual input
        if (googleMapsAuthFailed) {
            setApiError(true);
            setIsLoading(false);
            return;
        }

        // Register auth failure callback to handle async failures
        const cleanupGoogleOverlays = () => {
            // Remove Google's PAC container error overlay
            document.querySelectorAll('.pac-container').forEach(el => el.remove());
            // Remove Google's error containers
            document.querySelectorAll('.gm-err-container, .gm-style-pbc, .gm-err-message').forEach(el => el.remove());
        };

        const onAuthFailure = () => {
            if (mounted) {
                setApiError(true);
                setIsLoading(false);
                // Destroy autocomplete to prevent Google's error UI
                if (autocompleteRef.current && window.google?.maps?.event) {
                    window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                    autocompleteRef.current = null;
                }
                cleanupGoogleOverlays();
            }
        };
        authFailureCallbacks.push(onAuthFailure);

        // MutationObserver to detect Google's error elements injected into DOM
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        if (node.classList?.contains('gm-err-container') ||
                            node.querySelector?.('.gm-err-container')) {
                            onAuthFailure();
                            observer.disconnect();
                            return;
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Polling: check every 500ms for Google API errors (catches ApiNotActivatedMapError,
        // PAC container error messages like "non disponibile", input being disabled by Google)
        let errorCheckInterval: ReturnType<typeof setInterval> | null = null;
        let errorCheckTimeout: ReturnType<typeof setTimeout> | null = null;

        const startErrorPolling = () => {
            errorCheckInterval = setInterval(() => {
                // Check 1: PAC container with error text 
                const pacContainers = document.querySelectorAll('.pac-container');
                for (const pac of pacContainers) {
                    const text = (pac.textContent || '').toLowerCase();
                    if (text.includes('non disponibile') || text.includes('not available') || text.includes('error')) {
                        if (errorCheckInterval) clearInterval(errorCheckInterval);
                        onAuthFailure();
                        return;
                    }
                }

                // Check 2: Google Maps error containers
                if (document.querySelector('.gm-err-container')) {
                    if (errorCheckInterval) clearInterval(errorCheckInterval);
                    onAuthFailure();
                    return;
                }

                // Check 3: Input was disabled/blocked by Google
                if (inputRef.current && inputRef.current.disabled && !disabled) {
                    inputRef.current.disabled = false; // Immediately re-enable
                    if (errorCheckInterval) clearInterval(errorCheckInterval);
                    onAuthFailure();
                    return;
                }

                // Check 4: Google set aria-disabled or readonly
                if (inputRef.current?.getAttribute('aria-disabled') === 'true' ||
                    (inputRef.current?.readOnly && !disabled)) {
                    inputRef.current.removeAttribute('aria-disabled');
                    inputRef.current.readOnly = false;
                    if (errorCheckInterval) clearInterval(errorCheckInterval);
                    onAuthFailure();
                    return;
                }
            }, 500);

            // Stop polling after 15 seconds
            errorCheckTimeout = setTimeout(() => {
                if (errorCheckInterval) clearInterval(errorCheckInterval);
            }, 15000);
        };

        // Timeout: if loading takes >8s, fall back to manual input
        const loadTimeout = setTimeout(() => {
            if (mounted && isLoading) {
                setApiError(true);
                setIsLoading(false);
                cleanupGoogleOverlays();
            }
        }, 8000);

        const initAutocomplete = async () => {
            try {
                await loadGoogleMapsScript();

                if (!mounted || !inputRef.current || !window.google?.maps?.places) {
                    if (mounted) {
                        setApiError(true);
                        setIsLoading(false);
                    }
                    return;
                }

                // Create autocomplete instance
                autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                    componentRestrictions: { country: 'it' },
                    types: ['address'],
                    fields: ['address_components', 'formatted_address']
                });

                // Handle place selection
                autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current?.getPlace();

                    if (place && place.address_components) {
                        const components = extractAddressComponents(place);

                        // Update address field with formatted address
                        if (components.indirizzo) {
                            onChangeRef.current(components.indirizzo);
                        } else if (place.formatted_address) {
                            onChangeRef.current(place.formatted_address.split(',')[0] || '');
                        }

                        // Notify parent of all extracted components
                        if (onAddressSelectRef.current) {
                            onAddressSelectRef.current(components);
                        }
                    }
                });

                if (mounted) {
                    setIsLoading(false);
                    // Start polling for API errors AFTER autocomplete is created
                    startErrorPolling();
                }
            } catch (error) {
                if (mounted) {
                    setApiError(true);
                    setIsLoading(false);
                }
            }
        };

        initAutocomplete();

        return () => {
            mounted = false;
            clearTimeout(loadTimeout);
            if (errorCheckInterval) clearInterval(errorCheckInterval);
            if (errorCheckTimeout) clearTimeout(errorCheckTimeout);
            observer.disconnect();
            // Remove auth failure callback
            const idx = authFailureCallbacks.indexOf(onAuthFailure);
            if (idx >= 0) authFailureCallbacks.splice(idx, 1);
            // Clean up autocomplete listeners
            if (autocompleteRef.current && window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
            // Re-enable input in case Google disabled it
            if (inputRef.current) {
                inputRef.current.disabled = false;
                inputRef.current.readOnly = false;
                inputRef.current.removeAttribute('aria-disabled');
            }
            cleanupGoogleOverlays();
        };
    }, []); // Empty deps - initialize only once

    // Handle manual input changes
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    // Whether Google autocomplete is available (key configured + no errors)
    const hasAutocomplete = !!GOOGLE_MAPS_API_KEY && !apiError && !isLoading;
    // Show degraded state message: API key is set but failed
    const showDegradedWarning = !!GOOGLE_MAPS_API_KEY && apiError && !isLoading;

    return (
        <div className="relative">
            {/* Override Google's error overlays to prevent blocking input */}
            <style>{`
                .pac-container { z-index: 9999 !important; }
                .pac-container .pac-item-error,
                .pac-container .pac-icon-error { display: none !important; }
                .gm-err-container, .gm-style-pbc, .gm-err-message,
                .gm-err-autocomplete { display: none !important; pointer-events: none !important; }
                div[style*="background-color: rgb(229, 227, 223)"] > div > div[style*="z-index: 1"] { display: none !important; }
            `}</style>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : hasAutocomplete ? (
                        <Search className="h-4 w-4 text-teal-500" />
                    ) : (
                        <MapPin className="h-4 w-4 text-gray-400" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={isLoading ? 'Caricamento ricerca...' : hasAutocomplete ? placeholder : 'Inserisci indirizzo manualmente'}
                    disabled={disabled}
                    className={`w-full pl-10 pr-3 py-2 border ${showDegradedWarning ? 'border-amber-300' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''
                        } ${className}`}
                />
                {isFocused && hasAutocomplete && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search className="h-4 w-4 text-teal-500" />
                    </div>
                )}
            </div>
            {!isLoading && hasAutocomplete && isFocused && (
                <p className="text-xs text-teal-600 mt-1">
                    Inizia a digitare per cercare indirizzi in Italia
                </p>
            )}
            {showDegradedWarning && isFocused && (
                <p className="text-xs text-amber-600 mt-1">
                    Ricerca Google Maps non disponibile. Compila i campi manualmente.
                </p>
            )}
        </div>
    );
};

export default AddressAutocomplete;
