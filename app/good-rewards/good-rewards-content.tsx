'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import { syncMembershipStatus } from '@/helpers/localStorage-sync';
import { RewardsProgramContent } from './good-rewards-fetcher';
import debugLogger from '../utils/debug-logger';

interface GoodRewardsContentProps {
    initialContent: RewardsProgramContent;
}

const GoodRewardsContent: React.FC<GoodRewardsContentProps> = ({ initialContent }) => {
    debugLogger.group('GoodRewardsContent Render', () => {
        debugLogger.info('Component rendering with initial content:', initialContent);
    });

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
        debugLogger.group('Client Initialization', () => {
            debugLogger.debug('Setting isClient to true');
            setIsClient(true);

            // Check local storage for subscription status
            const storedStatus = localStorage.getItem('isSubscribed');
            debugLogger.info('Stored subscription status:', storedStatus);
            
            if (storedStatus === 'true') {
                debugLogger.debug('User is subscribed, setting state');
                setIsSubscribed(true);
            }
        });
    }, []);

    // Add effect to handle SDK initialization and content updates
    useEffect(() => {
        if (!isInitialized || !sdk) {
            debugLogger.debug('SDK not ready yet');
            return;
        }

        const updateContent = async () => {
            try {
                setIsRefreshing(true);
                debugLogger.group('Content Update', () => {
                    debugLogger.info('Updating content based on SDK state');
                });

                // Get user attributes from SDK
                const userAttributes = await sdk.getUserAttributes();
                debugLogger.debug('User attributes:', userAttributes);

                // Update local state based on SDK attributes
                const isRewardMember = userAttributes?.isRewardMember || false;
                setIsSubscribed(isRewardMember);

                // Trigger content refresh if needed
                if (isRewardMember && content.title === "Join Good Rewards Today") {
                    debugLogger.info('Member detected but showing non-member content, refreshing...');
                    await sdk.triggerEvent('force_content_refresh');
                    window.location.reload();
                }
            } catch (error) {
                debugLogger.error('Error updating content:', error);
            } finally {
                setIsRefreshing(false);
            }
        };

        updateContent();
    }, [isInitialized, sdk]);

    // Subscribe/unsubscribe handler
    const subscribe = async (shouldSubscribe: boolean) => {
        debugLogger.time('Subscription Process');
        debugLogger.group('Subscription Update', () => {
            debugLogger.info(`${shouldSubscribe ? 'Subscribing' : 'Unsubscribing'} user`);
            debugLogger.debug('Current SDK state:', {
                isInitialized,
                isInitializing,
                hasSDK: !!sdk
            });
        });

        setIsRefreshing(true);

        try {
            // Update local storage
            localStorage.setItem('isSubscribed', shouldSubscribe.toString());
            setIsSubscribed(shouldSubscribe);

            // Sync membership status
            debugLogger.debug('Syncing membership status');
            await syncMembershipStatus(shouldSubscribe);

            if (sdk && isInitialized) {
                debugLogger.debug('Updating SDK attributes');
                try {
                    await sdk.updateAttributes({
                        user_attributes: {
                            is_rewards_member: shouldSubscribe
                        }
                    });
                    debugLogger.success('SDK attributes updated successfully');
                } catch (err) {
                    debugLogger.error('Failed to update SDK attributes:', err);
                    throw err;
                }
            } else {
                debugLogger.warning('SDK not available for attribute update', {
                    sdk: !!sdk,
                    isInitialized
                });
            }

            setIsRefreshing(false);
            debugLogger.success('Subscription process completed successfully');

        } catch (error) {
            debugLogger.error('Critical error in subscription process:', error);
            setIsRefreshing(false);
            setShowDetailedDebug(true);
        } finally {
            debugLogger.timeEnd('Subscription Process');
        }
    };

    // Show loading state during SSR
    if (!isClient) {
        debugLogger.debug('Rendering SSR loading state');
        return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading your rewards information...</div>;
    }

    // Show SDK initializing state
    if (isInitializing) {
        debugLogger.debug('Rendering SDK initialization state');
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
        debugLogger.error('SDK initialization error:', error);
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
        debugLogger.debug('Rendering refresh state');
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

    debugLogger.debug('Rendering main content', {
        isSubscribed,
        hasTierInfo: !!content.tierInfo,
        title: content.title,
        benefitsCount: content.benefits.length
    });

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
                                        debugLogger.info('Unsubscribe button clicked');
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
                                    debugLogger.info('Join Now button clicked');
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