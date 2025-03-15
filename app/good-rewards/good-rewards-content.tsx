'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import { syncMembershipStatus } from '@/helpers/localStorage-sync';
import { RewardsProgramContent } from './good-rewards-fetcher';

// Define the props interface explicitly
interface GoodRewardsContentProps {
    initialContent: RewardsProgramContent;
}

// Use React.FC to type the component properly
const GoodRewardsContent: React.FC<GoodRewardsContentProps> = ({ initialContent }) => {
    console.log('[GoodRewardsContent] Component rendering with initial content:', initialContent);

    // Local state for subscription status
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [content, setContent] = useState<RewardsProgramContent>(initialContent);

    // Get personalize SDK instance
    const personalizeSdk = usePersonalize();

    // Initialize on client side
    useEffect(() => {
        console.log('[GoodRewardsContent] Component mounted');
        setIsClient(true);

        // Check localStorage for subscription status
        try {
            const value = window.localStorage.getItem('isSubscribed');
            console.log('[GoodRewardsContent] Retrieved subscription status from localStorage:', value);
            setIsSubscribed(value === 'true');
        } catch (error) {
            console.error('[GoodRewardsContent] Error accessing localStorage:', error);
        }

        // Track impression
        const trackImpression = async () => {
            if (!personalizeSdk) {
                console.log('[GoodRewardsContent] Personalize SDK not yet available');
                return;
            }

            try {
                // Replace 'rewards-program-exp' with your actual experience short UID
                await personalizeSdk.triggerImpression('rewards-program-exp');
                console.log('[GoodRewardsContent] Impression tracked successfully');
            } catch (error) {
                console.error('[GoodRewardsContent] Error tracking impression:', error);
            }
        };

        trackImpression();
    }, [personalizeSdk, initialContent]);

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
            await personalizeSdk.set({
                isRewardMember: shouldSubscribe,
                memberSince: shouldSubscribe ? new Date().toISOString() : null,
            });

            console.log('[GoodRewardsContent] Personalization attributes updated successfully');

            // Track event
            await personalizeSdk.triggerEvent(shouldSubscribe ? 'rewards-program-join' : 'rewards-program-leave');
            console.log(`[GoodRewardsContent] Event tracked successfully`);

            // Force a personalize update event to refresh other components
            const event = new Event('personalize-update');
            window.dispatchEvent(event);
        } catch (error) {
            console.error('[GoodRewardsContent] Error updating personalization:', error);
        }
    };

    // Show loading state during SSR
    if (!isClient) {
        return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading your rewards information...</div>;
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