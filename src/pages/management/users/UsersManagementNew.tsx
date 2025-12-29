/**
 * Users Management Page (via PersonsPage)
 * 
 * Wrapper that uses the unified PersonsPage with GDPR template
 * for user management in the management dashboard.
 * 
 * @module pages/management/users/UsersManagementNew
 * @project 43 - Tenant Roles Management System
 */

import React from 'react';
import { PersonsPage } from '../../persons/PersonsPage';

/**
 * UsersManagementNew - Uses PersonsPage with 'all' filter for unified user management
 */
const UsersManagementNew: React.FC = () => {
    return (
        <PersonsPage
            filterType="all"
            title="Gestione Utenti"
            subtitle="Gestione utenti del sistema con conformità GDPR"
        />
    );
};

export default UsersManagementNew;
