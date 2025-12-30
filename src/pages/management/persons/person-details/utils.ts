/**
 * PersonDetails Utilities - Formatting and helper functions
 * @module pages/management/persons/person-details/utils
 */

import React from 'react';
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, ACCESS_LEVEL_COLORS, ACCESS_LEVEL_LABELS } from './types';

/**
 * Format date for display (Italian format)
 */
export const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('it-IT');
};

/**
 * Format datetime for display (Italian format)
 */
export const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('it-IT');
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
};

/**
 * Get role badge color class
 */
export const getRoleBadgeColor = (roleType: string): string => {
    return ROLE_COLORS[roleType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

/**
 * Get role label
 */
export const getRoleLabel = (roleType: string): string => {
    return ROLE_LABELS[roleType] || roleType;
};

/**
 * Get status badge color class
 */
export const getStatusBadgeColor = (status: string): string => {
    return STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
};

/**
 * Get access level badge color class
 */
export const getAccessLevelColor = (accessLevel: string): string => {
    return ACCESS_LEVEL_COLORS[accessLevel] || ACCESS_LEVEL_COLORS.READ;
};

/**
 * Get access level label
 */
export const getAccessLevelLabel = (accessLevel: string): string => {
    return ACCESS_LEVEL_LABELS[accessLevel] || accessLevel;
};

/**
 * Get status badge component
 */
export const getStatusBadge = (status: string): React.ReactElement => {
    return React.createElement(
        'span',
        {
            className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(status)}`
        },
        status
    );
};

/**
 * Get initials from name
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Format currency
 */
export const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return `€${Number(amount).toFixed(2)}/ora`;
};

/**
 * Parse comma-separated string to array
 */
export const parseArrayField = (value: string): string[] => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
};

/**
 * Join array to comma-separated string
 */
export const joinArrayField = (items?: string[]): string => {
    return (items || []).join(', ');
};
