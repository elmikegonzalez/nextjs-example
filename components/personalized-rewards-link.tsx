'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePersonalize } from './context/PersonalizeContext';
import debugLogger from '../app/utils/debug-logger';

interface UserAttributes {
    isAuthenticated: boolean;
    isRewardMember: boolean;
    email: string;
}

interface ExtendedSdk {
    get?: () => Promise<any>;
    set?: (attributes: UserAttributes) => Promise<void>;
    [key: string]: any;
}

// Helper function to safely get attributes from SDK
const getSdkAttributes = async (sdk: ExtendedSdk | null) => {
    try {
        if (!sdk || typeof sdk.get !== 'function') {
            return null;
        }
        return await sdk.get();
    } catch (error) {
        debugLogger.error('Error getting SDK attributes:', error);
        return null;
    }
};

export default function PersonalizedRewardsLink() {
    const { data: session } = useSession();
    const { sdk, isInitialized } = usePersonalize();
    const [variant, setVariant] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        const handleStateChange = async () => {
            if (!sdk || !isInitialized) {
                return;
            }

            try {
                // Get current attributes
                const attributes = await getSdkAttributes(sdk as ExtendedSdk);
                
                // Update user attributes based on session state
                const userAttributes: UserAttributes = {
                    isAuthenticated: !!session,
                    isRewardMember: !!session?.user?.email,
                    email: session?.user?.email || '',
                };

                // Store user attributes in cookie for server-side access
                document.cookie = `user_attributes=${encodeURIComponent(JSON.stringify(userAttributes))}; path=/`;

                // Try to set user attributes using available SDK methods
                try {
                    if (typeof sdk.set === 'function') {
                        await (sdk as ExtendedSdk).set(userAttributes);
                    } else {
                        debugLogger.warn('No method available to set user attributes');
                    }
                } catch (error) {
                    debugLogger.error('Error setting user attributes:', error);
                }

                // Get current variant from URL
                const url = new URL(window.location.href);
                const currentVariant = url.searchParams.get('variant') || '';
                let variantParam = currentVariant;

                // Override variant for members
                if (userAttributes.isRewardMember && (!variantParam || variantParam === 'default')) {
                    variantParam = 'member';
                }

                // Update URL with variant
                if (variantParam) {
                    url.searchParams.set('variant', variantParam);
                } else {
                    url.searchParams.delete('variant');
                }

                // Update state
                setVariant(variantParam);
                setIsSubscribed(userAttributes.isRewardMember);

                // Update URL without triggering navigation
                window.history.replaceState({}, '', url.toString());

                debugLogger.debug('State updated:', {
                    variant: variantParam,
                    isSubscribed: userAttributes.isRewardMember,
                    userAttributes
                });
            } catch (error) {
                debugLogger.error('Error handling state change:', error);
            }
        };

        handleStateChange();
    }, [sdk, isInitialized, session]);

    // Determine link text and URL based on variant
    const getLinkConfig = () => {
        switch (variant) {
            case 'member':
                return {
                    text: 'Member Rewards',
                    href: '/rewards-program'
                };
            case 'subscriber':
                return {
                    text: 'Subscriber Benefits',
                    href: '/subscriber-benefits'
                };
            default:
                return {
                    text: 'Join Rewards',
                    href: '/join-rewards'
                };
        }
    };

    const { text, href } = getLinkConfig();

    return (
        <Link
            href={href}
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
        >
            {text}
        </Link>
    );
}