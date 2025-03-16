'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import { syncMembershipStatus } from '@/helpers/localStorage-sync';
import { RewardsProgramContent } from './good-rewards-fetcher';

interface GoodRewardsContentProps {
    initialContent: RewardsProgramContent;
}

const GoodRewardsContent: React.FC<GoodRewardsContentProps> = ({ initialContent }) => {
    console.log('[CLIENT][GoodRewardsContent] Component rendering with initial content:', initialContent);

    // Local state for subscription status
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [content, setContent] = useState<RewardsProgramContent>(initialContent);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showDetailedDebug, setShowDetailedDebug] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Get personalize context with initialization status
    const { sdk, isInitialized, isInitializing, error } = usePersonalize();

    // Initialize on client side
    useEffect(() => {
        if (hasInitialized) {
            return;
        }

        console.log('[CLIENT][GoodRewardsContent] Component mounted');
        setIsClient(true);

        const initializeState = async () => {
            try {
                // Check SDK state first if available
                if (isInitialized && sdk) {
                    try {
                        // Log SDK state for debugging
                        console.log('[CLIENT][GoodRewardsContent] SDK object:', {
                            methods: Object.keys(sdk).filter(key => typeof sdk[key] === 'function')
                        });
                        
                        // Get user attributes using the correct SDK method
                        try {
                            const sdkState = await sdk.get();
                            console.log('[CLIENT][GoodRewardsContent] SDK state:', sdkState);
                            const isMember = sdkState?.isRewardMember === true;
                            
                            // Update localStorage to match SDK state
                            window.localStorage.setItem('isSubscribed', `${isMember}`);
                            setIsSubscribed(isMember);
                            console.log('[CLIENT][GoodRewardsContent] Updated subscription status from SDK:', isMember);

                            // Update content based on membership status
                            if (isMember && initialContent.title === "Join Good Rewards Today") {
                                // If member but showing join page, redirect to member page
                                window.location.href = '/good-rewards?member=1';
                                return;
                            }
                            
                            // Track impression after state is confirmed
                            await trackImpression();
                            setHasInitialized(true);
                            return;
                        } catch (err) {
                            console.warn('[CLIENT][GoodRewardsContent] Could not get SDK state:', err);
                        }
                    } catch (err) {
                        console.warn('[CLIENT][GoodRewardsContent] Error accessing SDK:', err);
                    }
                }

                // Fallback to localStorage if SDK state is not available
                const value = window.localStorage.getItem('isSubscribed');
                console.log('[CLIENT][GoodRewardsContent] Retrieved subscription status from localStorage:', value);
                const isMember = value === 'true';
                setIsSubscribed(isMember);

                // Update content based on membership status
                if (isMember && initialContent.title === "Join Good Rewards Today") {
                    // If member but showing join page, redirect to member page
                    window.location.href = '/good-rewards?member=1';
                    return;
                }

                setHasInitialized(true);
            } catch (error) {
                console.error('[CLIENT][GoodRewardsContent] Error during initialization:', error);
                setHasInitialized(true);
            }
        };

        initializeState();
    }, [isInitialized, sdk, hasInitialized, initialContent]);

    // Function to track impression
    const trackImpression = async () => {
        if (!isInitialized || !sdk) {
            console.log('[CLIENT][GoodRewardsContent] Cannot track impression - SDK not initialized');
            return;
        }

        try {
            await sdk.triggerImpression('rewards-program-exp');
            console.log('[CLIENT][GoodRewardsContent] Impression tracked successfully');
        } catch (error) {
            console.error('[CLIENT][GoodRewardsContent] Error tracking impression:', error);
        }
    };

    // Handle subscription changes
    const subscribe = async (shouldSubscribe: boolean) => {
        console.log(`[CLIENT][GoodRewardsContent] User ${shouldSubscribe ? 'subscribing' : 'unsubscribing'} to rewards program`);
        console.log('[CLIENT][GoodRewardsContent] SDK state:', { isInitialized, sdk });
        
        // Double check subscription status before proceeding
        const currentStatus = window.localStorage.getItem('isSubscribed') === 'true';
        if (shouldSubscribe && currentStatus) {
            console.log('[CLIENT][GoodRewardsContent] User is already subscribed, ignoring join request');
            window.location.href = '/good-rewards?member=1';
            return;
        }
        if (!shouldSubscribe && !currentStatus) {
            console.log('[CLIENT][GoodRewardsContent] User is not subscribed, ignoring leave request');
            window.location.href = '/good-rewards';
            return;
        }

        setIsRefreshing(true);

        try {
            // Check if SDK is initialized first
            if (!isInitialized || !sdk) {
                console.warn('[CLIENT][GoodRewardsContent] Cannot update personalization - SDK not initialized');
                setIsRefreshing(false);
                return;
            }

            // Log current state before update
            try {
                const currentState = await sdk.get();
                console.log('[CLIENT][GoodRewardsContent] Current user state:', currentState);
            } catch (err) {
                console.warn('[CLIENT][GoodRewardsContent] Could not get current state:', err);
            }

            // Update personalization attributes first
            const newAttributes = {
                isRewardMember: shouldSubscribe,
                isPremiumMember: false,
                memberSince: shouldSubscribe ? new Date().toISOString() : null,
                lastUpdated: new Date().toISOString()
            };

            console.log('[CLIENT][GoodRewardsContent] Attempting to update attributes:', newAttributes);

            try {
                await sdk.set(newAttributes);
                console.log('[CLIENT][GoodRewardsContent] Successfully updated SDK attributes');

                // Track join/leave event
                const eventName = shouldSubscribe ? 'rewards-program-join' : 'rewards-program-leave';
                await sdk.triggerEvent(eventName);
                console.log(`[CLIENT][GoodRewardsContent] Successfully tracked event: ${eventName}`);

                // Update localStorage and cookie synchronously
                try {
                    window.localStorage.setItem('isSubscribed', `${shouldSubscribe}`);
                    document.cookie = `isSubscribed=${shouldSubscribe}; path=/; max-age=86400`;
                    console.log('[CLIENT][GoodRewardsContent] Successfully updated localStorage and cookies');
                } catch (err) {
                    console.error('[CLIENT][GoodRewardsContent] Failed to update localStorage/cookies:', err);
                }

                // Call the sync function to notify other components
                try {
                    syncMembershipStatus(shouldSubscribe);
                    console.log('[CLIENT][GoodRewardsContent] Successfully synced membership status');
                } catch (err) {
                    console.error('[CLIENT][GoodRewardsContent] Failed to sync membership status:', err);
                }

                // Let the server handle variants by redirecting with member status
                const url = new URL('/good-rewards', window.location.origin);
                url.searchParams.set('member', shouldSubscribe ? '1' : '0');
                url.searchParams.set('t', Date.now().toString()); // Cache busting
                
                console.log('[CLIENT][GoodRewardsContent] Redirecting to:', url.toString());
                window.location.href = url.toString();

            } catch (err) {
                console.error('[CLIENT][GoodRewardsContent] Failed to update SDK attributes:', err);
                throw err;
            }

        } catch (error) {
            console.error('[CLIENT][GoodRewardsContent] Critical error in subscription process:', error);
            setIsRefreshing(false);
            // Show error state in debug section
            setShowDetailedDebug(true);
        }
    };

    // Show loading state during SSR
    if (!isClient) {
        return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading your rewards information...</div>;
    }

    // Show SDK initializing state
    if (isInitializing) {
        return (
            <div className="container flex-grow max-w-[800px] mx-auto py-10">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden p-6 text-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-medium">Initializing personalization...</p>
                </div>
            </div>
        );
    }

    // Show SDK error state
    if (error) {
        return (
            <div className="container flex-grow max-w-[800px] mx-auto py-10">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden p-6 text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium">Error initializing personalization</p>
                    <p className="text-sm text-gray-600 mt-2">{error.message}</p>
                    <button
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Show refreshing state
    if (isRefreshing) {
        return (
            <div className="container flex-grow max-w-[800px] mx-auto py-10">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden p-6 text-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-medium">Updating your membership status...</p>
                </div>
            </div>
        );
    }

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
                            {content.benefits.map((benefit, index) => {
                                // Determine which icon to show based on the benefit text
                                let icon;
                                const lowerBenefit = benefit.toLowerCase();
                                if (lowerBenefit.includes('point') || lowerBenefit.includes('earn')) {
                                    icon = (
                                        <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    );
                                } else if (lowerBenefit.includes('shipping')) {
                                    icon = (
                                        <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                    );
                                } else if (lowerBenefit.includes('early access') || lowerBenefit.includes('exclusive')) {
                                    icon = (
                                        <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    );
                                } else if (lowerBenefit.includes('birthday') || lowerBenefit.includes('gift')) {
                                    icon = (
                                        <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                        </svg>
                                    );
                                } else {
                                    // Default checkmark icon for other benefits
                                    icon = (
                                        <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    );
                                }

                                return (
                                    <li key={index} className="flex items-start">
                                        {icon}
                                        <span>{benefit}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Tier information for members */}
                    {isSubscribed && content.tierInfo && content.title !== "Join Good Rewards Today" && (
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
                                            width: `${Math.min(100, ((content.tierInfo?.pointsBalance ?? 0) /
                                                ((content.tierInfo?.pointsBalance ?? 0) + (content.tierInfo?.pointsToNextTier ?? 1))) * 100)}%`
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

                    {/* Enhanced Debug section */}
                    <div className="mb-6 p-3 border border-gray-300 rounded bg-gray-50 text-xs">
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-sm">Debug Info:</p>
                            <button
                                className="text-blue-600 hover:underline text-xs"
                                onClick={() => setShowDetailedDebug(!showDetailedDebug)}
                            >
                                {showDetailedDebug ? 'Hide Details' : 'Show Details'}
                            </button>
                        </div>
                        <p>Content Title: {content.title}</p>
                        <p>IsSubscribed state: {isSubscribed ? 'true' : 'false'}</p>
                        <p>LocalStorage isSubscribed: {typeof window !== 'undefined' ? window.localStorage.getItem('isSubscribed') : 'N/A'}</p>
                        <p>SDK Initialized: {isInitialized ? 'Yes' : 'No'}</p>
                        <p>Has SDK: {sdk ? 'Yes' : 'No'}</p>
                        {content.debugInfo && showDetailedDebug && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="font-bold">Server-side Debug:</p>
                                <p>Variant Used: {content.debugInfo.variantUsed}</p>
                                <p>Request Time: {content.debugInfo.requestTimestamp}</p>
                                <p>Entry ID: {content.debugInfo.entryId}</p>
                                <p>Request Path: {content.debugInfo.requestPath}</p>
                                {content.debugInfo.cookies && (
                                    <div className="mt-1">
                                        <p className="font-bold">Cookies:</p>
                                        <div className="mt-1 bg-white p-1 rounded text-xs overflow-x-auto max-h-32">
                                            <pre>{JSON.stringify(content.debugInfo.cookies, null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                                    onClick={() => {
                                        console.log('[CLIENT][GoodRewardsContent] Unsubscribe button clicked');
                                        subscribe(false);
                                    }}
                                    disabled={isRefreshing}
                                >
                                    Leave Program
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                id="subscribe"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                                onClick={() => {
                                    console.log('[CLIENT][GoodRewardsContent] Join Now button clicked');
                                    subscribe(true);
                                }}
                                disabled={isRefreshing}
                            >
                                {content.ctaText || 'Join Now'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoodRewardsContent;