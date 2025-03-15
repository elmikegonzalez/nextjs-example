'use client';

import { useEffect } from 'react';
import { usePersonalize } from './context/PersonalizeContext';

export const Impressions = ({ experienceShortUids }: { experienceShortUids: string[] }) => {
  // Get SDK and initialization state from context
  const { sdk, isInitialized } = usePersonalize();

  useEffect(() => {
    async function trackImpressions() {
      // Skip if SDK is not initialized
      if (!isInitialized || !sdk) {
        console.log('Personalize SDK not initialized yet, impressions not tracked');
        return;
      }

      console.log('Tracking impressions for experiences:', experienceShortUids);

      // Track impressions for each experience
      try {
        for (const experienceShortUid of experienceShortUids) {
          await sdk.triggerImpression(experienceShortUid);
          console.log(`Impression tracked successfully for ${experienceShortUid}`);
        }
      } catch (error) {
        console.error('Error tracking impressions:', error);
      }
    }

    trackImpressions();
  }, [sdk, isInitialized, experienceShortUids]);

  return <></>;
}