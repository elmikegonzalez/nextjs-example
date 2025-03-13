'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import { syncMembershipStatus } from '@/helpers/localStorage-sync';

// Types for our rewards program content
interface RewardsProgramContent {
    title: string;
    description: string;
    benefits: string[];
    ctaText: string;
    tierInfo?: {
        currentTier?: string;
        pointsBalance?: number;
        nextTier?: string;
        pointsToNextTier?: number;
    };
    promotionalMessage?: string;
}

// Different variants of content
const contentVariants: Record<string, RewardsProgramContent> = {
    // Non-member variant
    default: {
        title: "Join Good Rewards Today",
        description: "Our members-only program gives you access to exclusive benefits, points on every purchase, and special offers.",
        benefits: [
            "Earn 1 point for every $1 spent",
            "Free standard shipping on all orders",
            "Early access to new collections",
            "Birthday gift each year"
        ],
        ctaText: "Join Now"
    },

    // Basic member variant
    member: {
        title: "Good Rewards",
        description: "Thanks for being a Good Rewards member! Keep shopping to earn more points and unlock premium benefits.",
        benefits: [
            "Earn 1 point for every $1 spent",
            "Free standard shipping on all orders",
            "Early access to new collections",
            "Birthday gift each year"
        ],
        ctaText: "View Account",
        tierInfo: {
            currentTier: "Basic",
            pointsBalance: 250,
            nextTier: "Silver",
            pointsToNextTier: 750
        }
    },

    // Premium member variant
    premium: {
        title: "Good Rewards Premium",
        description: "You've unlocked our premium tier! Enjoy enhanced benefits and our highest point earning rate.",
        benefits: [
            "Earn 1.5 points for every $1 spent",
            "Free expedited shipping on all orders",
            "Exclusive access to limited editions",
            "Double points on your birthday month",
            "Dedicated customer service line"
        ],
        ctaText: "View Premium Benefits",
        tierInfo: {
            currentTier: "Premium",
            pointsBalance: 2450,
            nextTier: "Diamond",
            pointsToNextTier: 2550
        }
    },

    // Promotional variant (can be shown to any segment during promotions)
    promotion: {
        title: "Double Points Weekend!",
        description: "For this weekend only, earn DOUBLE POINTS on all purchases! The perfect time to stock up and earn rewards faster.",
        benefits: [
            "2X points on all purchases this weekend",
            "Bonus 100 points when you spend $100+",
            "All regular member benefits included"
        ],
        ctaText: "Shop Now",
        promotionalMessage: "Hurry! Offer ends Sunday at midnight."
    }
};

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

const GoodRewardsContent = () => {
    console.log('[GoodRewardsContent] Component rendering');

    // Local state for subscription status
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [content, setContent] = useState<RewardsProgramContent>(contentVariants.default);

    // Get personalize SDK instance
    const personalizeSdk = usePersonalize();

    // Initialize on client side
    useEffect(() => {
        console.log('[GoodRewardsContent] Component mounted');
        console.log('[GoodRewardsContent] Personalize SDK object:', personalizeSdk);
        setIsClient(true);

        // Check localStorage for subscription status
        try {
            const value = window.localStorage.getItem('isSubscribed');
            console.log('[GoodRewardsContent] Retrieved subscription status from localStorage:', value);
            setIsSubscribed(value === 'true');
        } catch (error) {
            console.error('[GoodRewardsContent] Error accessing localStorage:', error);
        }

        // Fetch personalized content from Contentstack
        const fetchPersonalizedContent = async () => {
            if (!personalizeSdk) {
                console.log('[GoodRewardsContent] Personalize SDK not yet available');
                return;
            }

            try {
                console.log('[GoodRewardsContent] SDK available, fetching personalization attributes');

                // Log the SDK object to see what's available
                console.log('[GoodRewardsContent] Personalize SDK methods:',
                    Object.keys(personalizeSdk)
                        .filter(key => typeof personalizeSdk[key] === 'function')
                        .join(', ')
                );

                // Get individual attributes using our helper function
                console.log('[GoodRewardsContent] Getting isRewardMember attribute');
                const isRewardMember = getPersonalizeAttribute(personalizeSdk, 'isRewardMember', false);

                console.log('[GoodRewardsContent] Getting isPremiumMember attribute');
                const isPremiumMember = getPersonalizeAttribute(personalizeSdk, 'isPremiumMember', false);

                console.log('[GoodRewardsContent] Getting eligibleForPromotion attribute');
                const eligibleForPromotion = getPersonalizeAttribute(personalizeSdk, 'eligibleForPromotion', false);

                console.log('[GoodRewardsContent] Personalize attributes retrieved:', {
                    isRewardMember,
                    isPremiumMember,
                    eligibleForPromotion
                });

                // This would normally come from Contentstack, but for demo purposes
                // we're using local variants based on membership status
                let selectedVariant = 'default';

                if (isRewardMember) {
                    console.log('[GoodRewardsContent] User is a rewards member');
                    // Check for premium status (this would be an attribute from your backend)
                    if (isPremiumMember) {
                        console.log('[GoodRewardsContent] User is a premium member');
                        selectedVariant = 'premium';
                    } else {
                        console.log('[GoodRewardsContent] User is a basic member');
                        selectedVariant = 'member';
                    }
                } else {
                    console.log('[GoodRewardsContent] User is not a rewards member');
                    selectedVariant = 'default';
                }

                // Check for promotional override (could come from Contentstack)
                // This is a simplified example of how you might handle a time-based promotion
                const isPromoWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
                console.log('[GoodRewardsContent] Is weekend?', isPromoWeekend);
                console.log('[GoodRewardsContent] Is eligible for promotion?', eligibleForPromotion);
                const showPromo = isPromoWeekend && eligibleForPromotion;

                if (showPromo) {
                    console.log('[GoodRewardsContent] Showing promotional content');
                    selectedVariant = 'promotion';
                }

                console.log(`[GoodRewardsContent] Selected variant: ${selectedVariant}`);
                setContent(contentVariants[selectedVariant]);

                // Track impression
                console.log('[GoodRewardsContent] Tracking content impression');
                try {
                    if (typeof personalizeSdk.triggerImpression === 'function') {
                        await personalizeSdk.triggerImpression('good-rewards-content');
                        console.log('[GoodRewardsContent] Impression tracked successfully');
                    } else {
                        console.warn('[GoodRewardsContent] triggerImpression method not available on SDK');
                    }
                } catch (error) {
                    console.error('[GoodRewardsContent] Error tracking impression:', error);
                }

            } catch (error) {
                console.error('[GoodRewardsContent] Error fetching personalized content:', error);
                console.error('[GoodRewardsContent] Error stack:', error.stack);
            }
        };

        fetchPersonalizedContent();
    }, [personalizeSdk]);

    // Handle subscription changes
    const subscribe = async (shouldSubscribe: boolean) => {
        console.log(`[GoodRewardsContent] User ${shouldSubscribe ? 'subscribing' : 'unsubscribing'} to rewards program`);

        setIsSubscribed(shouldSubscribe);
        try {
            window.localStorage.setItem('isSubscribed', `${shouldSubscribe}`);
            console.log('[GoodRewardsContent] Updated localStorage with subscription status');

            // Call the sync function to notify other components
            syncMembershipStatus(shouldSubscribe);
        } catch (error) {
            console.error('[GoodRewardsContent] Error updating localStorage:', error);
        }

        if (!personalizeSdk) {
            console.warn('[GoodRewardsContent] Cannot update personalization - SDK not available');
            return;
        }

        // Update personalization attributes
        try {
            console.log('[GoodRewardsContent] Updating personalization attributes');
            console.log('[GoodRewardsContent] Setting attributes:', {
                isRewardMember: shouldSubscribe,
                memberSince: shouldSubscribe ? new Date().toISOString() : null,
            });

            if (typeof personalizeSdk.set === 'function') {
                await personalizeSdk.set({
                    isRewardMember: shouldSubscribe,
                    memberSince: shouldSubscribe ? new Date().toISOString() : null,
                });

                console.log('[GoodRewardsContent] Personalization attributes updated successfully');
            } else {
                console.warn('[GoodRewardsContent] set method not available on SDK');
            }

            // Track event
            console.log(`[GoodRewardsContent] Tracking ${shouldSubscribe ? 'join' : 'leave'} event`);
            if (typeof personalizeSdk.triggerEvent === 'function') {
                await personalizeSdk.triggerEvent(shouldSubscribe ? 'rewards-program-join' : 'rewards-program-leave');
                console.log(`[GoodRewardsContent] Event tracked successfully`);
            } else {
                console.warn('[GoodRewardsContent] triggerEvent method not available on SDK');
            }

            // Reload content after subscription change
            if (shouldSubscribe) {
                console.log('[GoodRewardsContent] Updating to member content');
                setContent(contentVariants.member);
            } else {
                console.log('[GoodRewardsContent] Updating to non-member content');
                setContent(contentVariants.default);
            }

            // Force a personalize update event to refresh other components
            const event = new Event('personalize-update');
            window.dispatchEvent(event);
        } catch (error) {
            console.error('[GoodRewardsContent] Error updating personalization:', error);
            console.error('[GoodRewardsContent] Error stack:', error.stack);
        }
    };

    // Show loading state during SSR
    if (!isClient) {
        console.log('[GoodRewardsContent] Rendering loading state (not client-side yet)');
        return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading your rewards information...</div>;
    }

    console.log('[GoodRewardsContent] Rendering content:', content.title);

    return (
        <div className="container flex-grow max-w-[800px] mx-auto py-10">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                {/* Header with title */}
                <div className="bg-blue-600 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">{content.title}</h2>
                </div>

                {/* Main content */}
                <div className="p-6">
                    <p className="text-gray-700 mb-6">{content.description}</p>

                    {/* Benefits list */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Program Benefits</h3>
                        <ul className="space-y-2">
                            {content.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start">
                                    <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Tier information for members */}
                    {content.tierInfo && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold mb-2">Your Membership Status</h3>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Current Tier:</span>
                                <span className="font-medium">{content.tierInfo.currentTier}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Points Balance:</span>
                                <span className="font-medium">{content.tierInfo.pointsBalance}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Next Tier:</span>
                                <span className="font-medium">{content.tierInfo.nextTier}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Points to Next Tier:</span>
                                <span className="font-medium">{content.tierInfo.pointsToNextTier}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{
                                            width: `${Math.min(100, (content.tierInfo.pointsBalance / (content.tierInfo.pointsBalance + content.tierInfo.pointsToNextTier)) * 100)}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Promotional message */}
                    {content.promotionalMessage && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">{content.promotionalMessage}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CTA button */}
                    <div className="mt-6">
                        {isSubscribed ? (
                            <div className="flex space-x-4">
                                <button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                                >
                                    {content.ctaText}
                                </button>
                                <button
                                    id="unsubscribe"
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
                                    onClick={() => subscribe(false)}
                                >
                                    Leave Program
                                </button>
                            </div>
                        ) : (
                            <button
                                id="subscribe"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                                onClick={() => subscribe(true)}
                            >
                                {content.ctaText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoodRewardsContent;