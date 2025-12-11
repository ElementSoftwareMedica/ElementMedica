/**
 * HexColorInput - Input per colori con formato HEX come default
 * 
 * Features:
 * - Mostra codice HEX invece di RGB
 * - Color picker nativo
 * - Input testuale per codice HEX
 * - Validazione formato
 */

import React, { useState, useEffect, useCallback } from 'react';

interface HexColorInputProps {
    value: string;
    onChange: (hex: string) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    showTransparent?: boolean;
    onTransparentChange?: (isTransparent: boolean) => void;
    isTransparent?: boolean;
}

// Converti RGB a HEX
const rgbToHex = (rgb: string): string => {
    // Se è già hex, restituiscilo
    if (rgb.startsWith('#')) return rgb.toUpperCase();

    // Se è transparent, restituisci un valore di default
    if (rgb === 'transparent') return '#FFFFFF';

    // Parse rgb(r, g, b) o rgba(r, g, b, a)
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
    }

    return rgb.toUpperCase();
};

// Valida formato HEX
const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

// Normalizza input HEX
const normalizeHex = (input: string): string => {
    let hex = input.trim().toUpperCase();

    // Aggiungi # se mancante
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }

    // Espandi formato corto (#FFF -> #FFFFFF)
    if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }

    return hex;
};

const HexColorInput: React.FC<HexColorInputProps> = ({
    value,
    onChange,
    label,
    disabled = false,
    className = '',
    showTransparent = false,
    onTransparentChange,
    isTransparent = false,
}) => {
    const [hexValue, setHexValue] = useState(() => rgbToHex(value));
    const [inputValue, setInputValue] = useState(() => rgbToHex(value));
    const [isEditing, setIsEditing] = useState(false);

    // Sync external value changes
    useEffect(() => {
        if (!isEditing) {
            const hex = rgbToHex(value);
            setHexValue(hex);
            setInputValue(hex);
        }
    }, [value, isEditing]);

    // Handle color picker change
    const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value.toUpperCase();
        setHexValue(hex);
        setInputValue(hex);
        onChange(hex);
    }, [onChange]);

    // Handle text input change
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setInputValue(input.toUpperCase());
    }, []);

    // Validate and apply on blur
    const handleBlur = useCallback(() => {
        setIsEditing(false);
        const normalized = normalizeHex(inputValue);

        if (isValidHex(normalized)) {
            setHexValue(normalized);
            setInputValue(normalized);
            onChange(normalized);
        } else {
            // Revert to previous valid value
            setInputValue(hexValue);
        }
    }, [inputValue, hexValue, onChange]);

    // Apply on Enter
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    }, [handleBlur]);

    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label className="block text-slate-500 mb-1 text-sm">{label}</label>
            )}
            <div className="flex items-center gap-2">
                {/* Color picker */}
                <input
                    type="color"
                    value={hexValue.toLowerCase()}
                    onChange={handleColorChange}
                    disabled={disabled || isTransparent}
                    className="w-10 h-8 p-0.5 border border-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* HEX input */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsEditing(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isTransparent}
                    placeholder="#000000"
                    maxLength={7}
                    className="w-24 px-2 py-1.5 text-sm font-mono border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />

                {/* Transparent checkbox */}
                {showTransparent && (
                    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isTransparent}
                            onChange={(e) => onTransparentChange?.(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Trasparente
                    </label>
                )}
            </div>
        </div>
    );
};

export default HexColorInput;
