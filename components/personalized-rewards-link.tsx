'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePersonalize } from '@/components/context/PersonalizeContext';

// Helper function to safely get attributes from the SDK
function getPersonalizeAttribute(sdk: any, attributeName: string, defaultValue: any = null) {
    if (!sdk) {
        console.log(`[getPersonalizeAttribute] SDK is null or undefined, returning default: ${defaultValue}`);
        return defaultValue;
    }

    console.log(`[getPersonalizeAttribute] Attempting to get attribute: ${attributeName}`);

    try {
        // Log available methods on the SDK to help debug
        console.log('[getPersonalizeAttribute] Available SDK methods:',
            Object.keys(sdk)
                .filter(key => typeof sdk[key] === 'function')
                .join(', ')
        );

        // Try getUserAttributes if it exists (common pattern)
        if (typeof sdk.getUserAttributes === 'function') {
            try {
                console.log('[getPersonalizeAttribute] Trying sdk.getUserAttributes()');
                const attrs = sdk.getUserAttributes();
                console.log('[getPersonalizeAttribute] getUserAttributes result:', attrs);
                if (attrs && attrs[attributeName] !== undefined) {
                    console.log(`[getPersonalizeAttribute] Found attribute using getUserAttributes: ${attributeName}=${attrs[attributeName]}`);
                    return attrs[attributeName];
                }
            } catch (e) {
                console.log(`[getPersonalizeAttribute] getUserAttributes failed: ${e.message}`);
            }
        }

        // Try user.attributes if it exists
        if (sdk.user && sdk.user.attributes) {
            console.log('[getPersonalizeAttribute] Trying sdk.user.attributes');
            console.log('[getPersonalizeAttribute] user.attributes:', sdk.user.attributes);
            if (sdk.user.attributes[attributeName] !== undefined) {
                console.log(`[getPersonalizeAttribute] Found attribute in user.attributes: ${attributeName}=${sdk.user.attributes[attributeName]}`);
                return sdk.user.attributes[attributeName];
            }
        }

        // Try getState pattern if it exists
        if (typeof sdk.getState === 'function') {
            try {
                console.log('[getPersonalizeAttribute] Trying sdk.getState()');
                const state = sdk.getState();
                console.log('[getPersonalizeAttribute] getState result:', state);
                if (state && state.user && state.user.attributes) {
                    if (state.user.attributes[attributeName] !== undefined) {
                        console.log(`[getPersonalizeAttribute] Found attribute in state: ${attributeName}=${state.user.attributes[attributeName]}`);
                        return state.user.attributes[attributeName];
                    }
                }
            } catch (e) {
                console.log(`[getPersonalizeAttribute] getState failed: ${e.message}`);
            }
        }

        // If nothing worked, return the default
        console.log(`[getPersonalizeAttribute] Attribute ${attributeName} not found, returning default: ${defaultValue}`);
        return defaultValue;
    } catch (error) {
        console.error(`[getPersonalizeAttribute] Error getting attribute ${attributeName}:`, error);
        return defaultValue;
    }
}

const PersonalizedRewardsLink = () => {
    // State to store the personalized link text
    const [linkText, setLinkText] = useState("Rewards");
    const [linkPath, setLinkPath] = useState("/good-rewards");

    // Get the Personalize SDK from context
    const personalizeSdk = usePersonalize();

    // Get the authentication session
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';

    // Effect to update link text based on user attributes
    useEffect(() => {
        console.log('[PersonalizedRewardsLink] Component mounted');
        console.log('[PersonalizedRewardsLink] Personalize SDK object:', personalizeSdk);
        console.log('[PersonalizedRewardsLink] Session status:', status);

        const getPersonalizedLink = async () => {
            // Skip if SDK isn't available yet
            if (!personalizeSdk) {
                console.log('[PersonalizedRewardsLink] Personalize SDK not yet available');
                return;
            }

            console.log('[PersonalizedRewardsLink] SDK available, getting user attributes');

            try {
                // Get individual attributes using our helper function
                console.log('[PersonalizedRewardsLink] Getting isRewardMember attribute');
                const isRewardMember = getPersonalizeAttribute(personalizeSdk, 'isRewardMember', false);

                console.log('[PersonalizedRewardsLink] Getting isPremiumMember attribute');
                const isPremiumMember = getPersonalizeAttribute(personalizeSdk, 'isPremiumMember', false);

                console.log('[PersonalizedRewardsLink] User attributes retrieved:', {
                    isRewardMember,
                    isPremiumMember,
                    isAuthenticated
                });

                // Determine link text based on membership status and authentication
                let newLinkText: string;
                let newLinkPath: string = "/good-rewards";

                if (isRewardMember) {
                    if (isPremiumMember) {
                        newLinkText = "Premium Rewards";
                    } else {
                        newLinkText = "Your Rewards";
                    }
                } else {
                    // Not a member
                    if (isAuthenticated) {
                        newLinkText = "Join Rewards";
                    } else {
                        newLinkText = "Rewards";
                        // If not authenticated, clicking should prompt to login first
                        newLinkPath = "/api/auth/signin"; // NextAuth signin route
                    }
                }

                console.log(`[PersonalizedRewardsLink] Setting link text to: "${newLinkText}"`);
                setLinkText(newLinkText);
                setLinkPath(newLinkPath);

                // Optional: Track navigation impression
                console.log('[PersonalizedRewardsLink] Triggering impression for rewards-nav-link');
                try {
                    if (typeof personalizeSdk.triggerImpression === 'function') {
                        await personalizeSdk.triggerImpression('rewards-nav-link');
                        console.log('[PersonalizedRewardsLink] Impression tracked successfully');
                    } else {
                        console.warn('[PersonalizedRewardsLink] triggerImpression method not available on SDK');
                    }
                } catch (error) {
                    console.error('[PersonalizedRewardsLink] Error tracking impression:', error);
                }

            } catch (error) {
                console.error('[PersonalizedRewardsLink] Error personalizing rewards link:', error);
                // Fallback to default text
                console.log('[PersonalizedRewardsLink] Using fallback link text "Rewards"');
                setLinkText("Rewards");
            }
        };

        // Call the function when SDK is available
        getPersonalizedLink();

        // Set up event listener for personalization changes
        const handlePersonalizeUpdate = () => {
            console.log('[PersonalizedRewardsLink] Personalization update event received, refreshing link');
            getPersonalizedLink();
        };

        window.addEventListener('personalize-update', handlePersonalizeUpdate);
        console.log('[PersonalizedRewardsLink] Added event listener for personalize-update');

        // Clean up event listener
        return () => {
            console.log('[PersonalizedRewardsLink] Component unmounting, removing event listener');
            window.removeEventListener('personalize-update', handlePersonalizeUpdate);
        };
    }, [personalizeSdk, status, isAuthenticated]);

    const handleLinkClick = async () => {
        console.log('[PersonalizedRewardsLink] Link clicked');

        if (personalizeSdk) {
            console.log('[PersonalizedRewardsLink] SDK available, tracking rewards-link-click event');
            try {
                if (typeof personalizeSdk.triggerEvent === 'function') {
                    await personalizeSdk.triggerEvent('rewards-link-click');
                    console.log('[PersonalizedRewardsLink] Click event tracked successfully');
                } else {
                    console.warn('[PersonalizedRewardsLink] triggerEvent method not available on SDK');
                }
            } catch (error) {
                console.error('[PersonalizedRewardsLink] Error tracking click event:', error);
            }
        } else {
            console.warn('[PersonalizedRewardsLink] Cannot track click - SDK not available');
        }
    };

    console.log(`[PersonalizedRewardsLink] Rendering with link text: "${linkText}" and path: "${linkPath}"`);

    return (
        <Link
            href={linkPath}
            className="hover:text-foreground transition-all"
            onClick={handleLinkClick}
        >
            {linkText}
        </Link>
    );
};

export default PersonalizedRewardsLink;