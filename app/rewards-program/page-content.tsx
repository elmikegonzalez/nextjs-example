'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import { syncMembershipStatus } from '@/helpers/localStorage-sync';
import debugLogger from '../../utils/debug-logger';

export const PageContent = () => {
  // Initialize with a default value
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get SDK and initialization state from context
  const { sdk, isInitialized } = usePersonalize();

  // Use useEffect to detect client-side rendering and access localStorage
  useEffect(() => {
    setIsClient(true);
    try {
      const value = window.localStorage.getItem('isSubscribed');
      setIsSubscribed(value === 'true');
    } catch (e) {
      console.error('Failed to access localStorage:', e);
    }
  }, []);

  useEffect(() => {
    debugLogger.group('PageContent Initialization', () => {
      const storedValue = localStorage.getItem('isSubscribed');
      debugLogger.info('Retrieved subscription status:', storedValue);
      setIsSubscribed(storedValue === 'true');
    });
  }, []);

  const subscribe = async (shouldSubscribe: boolean) => {
    debugLogger.time('Subscription Update');
    debugLogger.info(`${shouldSubscribe ? 'Subscribing' : 'Unsubscribing'} user`);
    
    setIsLoading(true);
    setIsSubscribed(shouldSubscribe);

    try {
      // Update localStorage
      window.localStorage.setItem('isSubscribed', `${shouldSubscribe}`);
      console.log(`[RewardsProgram] Updated isSubscribed in localStorage: ${shouldSubscribe}`);

      // Sync membership status with other components
      syncMembershipStatus(shouldSubscribe);

      // Update personalization SDK attributes
      if (isInitialized && sdk) {
        await sdk.set({
          isRewardMember: shouldSubscribe,
          memberSince: shouldSubscribe ? new Date().toISOString() : null,
        });
        console.log(`[RewardsProgram] Updated personalization attributes: isRewardMember=${shouldSubscribe}`);

        // Trigger relevant event
        await sdk.triggerEvent(shouldSubscribe ? 'rewards-program-join' : 'rewards-program-leave');
        console.log(`[RewardsProgram] Triggered event: ${shouldSubscribe ? 'rewards-program-join' : 'rewards-program-leave'}`);
      } else {
        console.log('[RewardsProgram] SDK not initialized, personalization not updated');
      }

      // Force a refresh event
      const event = new Event('personalize-update');
      window.dispatchEvent(event);

      // Hard refresh the page to get new content
      setTimeout(() => {
        window.location.href = `/rewards-program?t=${Date.now()}`;
      }, 1000);

      debugLogger.success('Subscription status updated successfully');
    } catch (e) {
      console.error('[RewardsProgram] Error updating membership status:', e);
      setIsLoading(false);
      debugLogger.error('Failed to update subscription status:', e);
    } finally {
      debugLogger.timeEnd('Subscription Update');
    }
  };

  // If not on client yet, return a loading state or minimal UI
  if (!isClient) {
    return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading...</div>;
  }

  // Show loading state while updating subscription
  if (isLoading) {
    return (
        <div className="container flex-grow max-w-[800px] mx-auto py-10">
          <div className="text-center p-8">
            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium">Updating subscription status...</p>
          </div>
        </div>
    );
  }

  debugLogger.debug('Rendering page content', {
    isSubscribed,
    isLoading
  });

  return (
      <div className="container flex-grow max-w-[800px] mx-auto py-10">
        {isSubscribed && (
            <>
              <h2 className="text-2xl font-bold mb-8">Subscribed successfully!</h2>
              <div className="space-y-4">
                <h3>You have unlocked a variety of benefits designed to enhance your shopping experience.</h3>
                <p>
                  Firstly, You gain access to exclusive discounts and promotions, allowing you to save money on purchases both online
                  and in-store. Secondly, you may receive special offers such as free gifts, birthday rewards, or bonus
                  points for certain actions like referrals or social media engagement. Thirdly, as a member, you often
                  enjoy early access to sales and new product launches, ensuring you have the first opportunity to snag your
                  favorite items.
                </p>
                <p>
                  Additionally, many rewards programs offer loyalty points or cashback rewards, allowing you
                  to accumulate points with each purchase that can be redeemed for discounts or free merchandise in the
                  future.
                </p>
              </div>
              <div className="mt-8 flex items-center justify-end">
                <button
                    id="unsubscribe"
                    className="px-4 py-2 bg-blue-600 rounded-lg text-blue-50 text-sm font-semibold"
                    onClick={() => subscribe(false)}
                    disabled={isLoading}
                >
                  Unsubscribe
                </button>
              </div>
            </>
        )}
        {!isSubscribed && (
            <>
              <h2 className="text-2xl font-bold mb-8">Good Rewards</h2>
              <div className="space-y-4">
                <p>
                  Joining a rewards program can unlock a world of benefits and perks. By enrolling, customers gain access to
                  exclusive discounts, special offers, and loyalty rewards tailored to their preferences. These programs
                  often incentivize continued engagement with a brand, fostering a sense of loyalty and satisfaction among
                  participants.
                </p>
                <p>
                  Additionally, members may receive early access to sales, complimentary upgrades, or even personalized
                  recommendations based on their purchase history. The process of signing up is typically straightforward,
                  requiring only basic information such as name, email, and sometimes a phone number. Many rewards programs
                  also offer points-based systems, allowing members to accumulate points with each purchase that can later
                  be redeemed for discounts or free products.
                </p>
                <p>
                  Ultimately, joining a rewards program is a simple yet effective way for customers to maximize their
                  shopping experience while enjoying additional benefits from their favorite brands.
                </p>
              </div>
              <div className="mt-8 flex items-center justify-end">
                <button
                    id="subscribe"
                    className="px-4 py-2 bg-blue-600 rounded-lg text-blue-50 text-sm font-semibold"
                    onClick={() => subscribe(true)}
                    disabled={isLoading}
                >
                  Join Now
                </button>
              </div>
            </>
        )}
      </div>
  );
};