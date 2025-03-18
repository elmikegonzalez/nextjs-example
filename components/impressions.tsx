'use client';

import { useEffect } from 'react';
import { usePersonalize } from './context/PersonalizeContext';
import debugLogger from '../app/utils/debug-logger';
import { Sdk } from '@contentstack/personalize-edge-sdk/dist/sdk';

interface ImpressionData {
    experienceId: string;
    variantId: string;
    timestamp: number;
}

interface Experience {
    id?: string;
    variant?: {
        id?: string;
    };
}

const trackImpressions = async (sdk: Sdk | null) => {
    try {
        if (!sdk || typeof sdk.get !== 'function') {
            debugLogger.debug('SDK not ready for impression tracking');
            return;
        }

        const data = await sdk.get();
        if (!data || !data.experiences || typeof data.experiences !== 'object') {
            debugLogger.debug('No valid experiences data for tracking');
            return;
        }

        const experiences = Array.isArray(data.experiences) ? data.experiences : Object.values(data.experiences);
        
        const impressions: ImpressionData[] = experiences
            .map((exp: Experience) => ({
                experienceId: exp.id || '',
                variantId: exp.variant?.id || '',
                timestamp: Date.now()
            }))
            .filter((imp: ImpressionData) => imp.experienceId && imp.variantId);

        if (impressions.length === 0) {
            debugLogger.debug('No valid impressions to track');
            return;
        }

        // Track impressions using available SDK methods
        try {
            if (typeof sdk.track === 'function') {
                await sdk.track('impressions', { impressions });
            } else if (typeof sdk.triggerEvent === 'function') {
                await sdk.triggerEvent('impressions', { impressions });
            } else {
                debugLogger.warn('No method available to track impressions');
            }
            debugLogger.debug('Successfully tracked impressions:', impressions);
        } catch (error) {
            debugLogger.error('Error tracking impressions:', error);
        }
    } catch (error) {
        debugLogger.error('Error in impression tracking:', error);
    }
};

export default function ImpressionTracker() {
    const { sdk, isInitialized } = usePersonalize();

    useEffect(() => {
        if (sdk && isInitialized) {
            trackImpressions(sdk);
        }
    }, [sdk, isInitialized]);

    return null;
}