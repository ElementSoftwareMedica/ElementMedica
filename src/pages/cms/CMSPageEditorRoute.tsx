/**
 * CMSPageEditorRoute
 * Route wrapper for CMSPageEditor that handles URL parameters
 * 
 * @module pages/cms/CMSPageEditorRoute
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CMSPage } from '../../services/cmsPagesService';
import cmsPagesService from '../../services/cmsPagesService';
import CMSPageEditor from './CMSPageEditor';

const CMSPageEditorRoute: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isCreating = !id || id === 'new';

    // Fetch page data if editing
    const { data: page, isLoading, error } = useQuery({
        queryKey: ['cms-page', id],
        queryFn: () => cmsPagesService.getPage(id!),
        enabled: !isCreating && !!id,
    });

    const handleClose = () => {
        navigate('/management/cms/pages');
    };

    const handleSave = () => {
        navigate('/management/cms/pages');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error && !isCreating) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">
                    Errore nel caricamento della pagina
                </div>
            </div>
        );
    }

    return (
        <CMSPageEditor
            page={isCreating ? null : (page || null)}
            isCreating={isCreating}
            onClose={handleClose}
            onSave={handleSave}
        />
    );
};

export default CMSPageEditorRoute;
