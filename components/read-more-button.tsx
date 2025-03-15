'use client';

import { usePersonalize } from './context/PersonalizeContext';
import { InfoCardButton } from './info-card';

export const ReadMoreButton = ({ title }: { title: string }) => {
  // Get SDK and initialization state from context
  const { sdk, isInitialized } = usePersonalize();

  const handleOnClick = async () => {
    // Check if SDK is initialized before using it
    if (!isInitialized || !sdk) {
      console.log('SDK not initialized, read more button click not tracked');
      return;
    }

    try {
      await sdk.triggerEvent('readMoreButtonClick');
      console.log('Read more button click tracked successfully');
    } catch (error) {
      console.error('Error tracking read more button click:', error);
    }
  };

  return (
      <InfoCardButton id="read-more" onClick={handleOnClick}>
        {title}
      </InfoCardButton>
  );
}