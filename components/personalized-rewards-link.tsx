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
            } catch (e:any) {
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
            } catch (e:any) {
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
    const [linkText, setLinkText] = useState("Good Rewards");
    const [linkPath, setLinkPath] = useState("/good-rewards");
    const [isUpdating, setIsUpdating] = useState(false);
    const hasInitialized = React.useRef(false);
    const skipNextUpdate = React.useRef(false);

    // Get the Personalize SDK from context
    const { sdk, isInitialized } = usePersonalize();

    // Get the authentication session
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';
    const previousStatus = React.useRef(status);

    // Handle initialization and session changes
    useEffect(() => {
        // Skip if we're in the middle of an update or if we should skip this update
        if (isUpdating || skipNextUpdate.current) {
            skipNextUpdate.current = false;
            return;
        }

        const handleStateChange = async () => {
            try {
                setIsUpdating(true);

                // Handle sign out
                if (previousStatus.current === 'authenticated' && status === 'unauthenticated') {
                    // Clear local state
                    localStorage.removeItem('isSubscribed');
                    document.cookie = 'isSubscribed=false; path=/';

                    // Clear SDK attributes if available
                    if (isInitialized && sdk) {
                        try {
                            // @ts-ignore - SDK type definitions are incomplete
                            await sdk.setUserAttributes({
                                isRewardMember: false,
                                isPremiumMember: false
                            });
                        } catch (sdkError) {
                            console.warn('[PersonalizedRewardsLink] Could not clear SDK attributes:', sdkError);
                        }
                    }

                    // Update UI directly
                    setLinkText("Good Rewards");
                    setLinkPath("/good-rewards");
                    hasInitialized.current = false;
                    skipNextUpdate.current = true;
                }
                // Handle initialization only if SDK is ready and we haven't initialized yet
                else if (isInitialized && sdk && !hasInitialized.current && status !== 'loading') {
                    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
                    const isRewardMember = getPersonalizeAttribute(sdk, 'isRewardMember', isSubscribed);
                    const isPremiumMember = getPersonalizeAttribute(sdk, 'isPremiumMember', false);

                    let newLinkText: string;
                    let newLinkPath: string = "/good-rewards";

                    if (isRewardMember || isSubscribed) {
                        newLinkText = isPremiumMember ? "Icon Rewards" : "Core Rewards";
                    } else {
                        if (isAuthenticated) {
                            newLinkText = "Join Rewards";
                        } else {
                            newLinkText = "Good Rewards";
                            newLinkPath = `/api/auth/signin?callbackUrl=${encodeURIComponent('/good-rewards?post_sub=1')}`;
                        }
                    }

                    setLinkText(newLinkText);
                    setLinkPath(newLinkPath);
                    hasInitialized.current = true;
                    skipNextUpdate.current = true;
                }
            } finally {
                setIsUpdating(false);
                previousStatus.current = status;
            }
        };

        handleStateChange();
    }, [status, sdk, isInitialized, isUpdating, isAuthenticated]);

    const handleLinkClick = async (e: React.MouseEvent) => {
        const currentUrl = new URL(window.location.href);
        const isPostAuth = currentUrl.searchParams.has('post_sub');
        const isGoodRewardsPage = currentUrl.pathname === '/good-rewards';
        const isSigningOut = status === 'loading' || (previousStatus.current === 'authenticated' && status === 'unauthenticated');
        
        if (isPostAuth || isUpdating || isSigningOut) {
            return;
        }

        if (!isAuthenticated) {
            return;
        }

        if (isGoodRewardsPage) {
            e.preventDefault();
        }

        if (isInitialized && sdk) {
            try {
                setIsUpdating(true);

                // Update state
                localStorage.setItem('isSubscribed', 'true');
                document.cookie = 'isSubscribed=true; path=/';

                // Update SDK attributes
                if (typeof sdk.setUserAttributes === 'function') {
                    // @ts-ignore - SDK type definitions are incomplete
                    await sdk.setUserAttributes({
                        isRewardMember: true,
                        isPremiumMember: false
                    });
                }

                // Track the event if needed
                if (typeof sdk.triggerEvent === 'function') {
                    await sdk.triggerEvent('rewards-link-click');
                }

                // Update UI state
                setLinkText("Core Rewards");

                // Only redirect if necessary
                if (!isGoodRewardsPage) {
                    const targetUrl = new URL('/good-rewards', window.location.origin);
                    targetUrl.searchParams.set('post_sub', '1');
                    window.location.href = targetUrl.toString();
                }
            } catch (error) {
                console.error('[PersonalizedRewardsLink] Error:', error);
            } finally {
                setIsUpdating(false);
            }
        }
    };

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