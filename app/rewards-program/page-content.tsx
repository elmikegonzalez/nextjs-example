'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalize } from '@/components/context/PersonalizeContext';

export const PageContent = () => {
  // Initialize with a default value
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const personalizeSdk = usePersonalize();

  // Use useEffect to detect client-side rendering and access localStorage
  useEffect(() => {
    setIsClient(true);
    const value = window.localStorage.getItem('isSubscribed');
    setIsSubscribed(value === 'true');
  }, []);

  const subscribe = async (shouldSubscribe: boolean) => {
    setIsSubscribed(shouldSubscribe);
    window.localStorage.setItem('isSubscribed', `${shouldSubscribe}`);
    await personalizeSdk?.set({
      isRewardMember: shouldSubscribe,
    });
  };

  // If not on client yet, return a loading state or minimal UI
  if (!isClient) {
    return <div className="container flex-grow max-w-[800px] mx-auto py-10">Loading...</div>;
  }

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
                >
                  Unsubscribe
                </button>
              </div>
            </>
        )}
        {!isSubscribed && (
            <>
              <h2 className="text-2xl font-bold mb-8">Join Rewards Program</h2>
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
                >
                  Join Now
                </button>
              </div>
            </>
        )}
      </div>
  );
};