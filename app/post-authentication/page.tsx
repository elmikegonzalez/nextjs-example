'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePersonalize } from '@/components/context/PersonalizeContext';
import debugLogger from '../utils/debug-logger';

function PostAuthentication() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { sdk, isInitialized, resetState } = usePersonalize();
  const [message, setMessage] = useState('Redirecting back to home page...');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 500;

  useEffect(() => {
    async function runEffect() {
      debugLogger.group('Post Authentication', () => {
        debugLogger.info('Status:', status);
        debugLogger.debug('Session:', session);
        debugLogger.debug('SDK initialized:', isInitialized);
        debugLogger.debug('Retry count:', retryCount);
      });

      // Check if user is authenticated
      if (status === 'authenticated') {
        setMessage('Authentication successful, updating personalization...');

        // Wait for SDK to be initialized
        if (isInitialized && sdk) {
          try {
            // Check if user ID doesn't match current SDK user
            const sdkUserId = sdk.getUserId?.();
            debugLogger.debug('Current SDK user:', sdkUserId);
            debugLogger.debug('New user:', session.user?.email);

            if (session.user?.email && session.user.email !== sdkUserId) {
              // Update the user ID in the SDK
              await sdk.setUserId(session.user.email as string, {
                preserveUserAttributes: true,
              });
              debugLogger.success('Updated user ID to:', session.user.email);

              // Set initial user attributes
              try {
                // @ts-ignore - SDK type definitions are incomplete
                await sdk.setUserAttributes({
                  isRewardMember: false,
                  isPremiumMember: false,
                  email: session.user.email,
                  name: session.user.name
                });
                debugLogger.success('Set initial user attributes');
              } catch (attrError) {
                debugLogger.error('Error setting user attributes:', attrError);
              }

              // Trigger a login event
              try {
                await sdk.triggerEvent('user_login');
                debugLogger.success('Triggered login event');
              } catch (eventError) {
                debugLogger.error('Error triggering login event:', eventError);
              }

              setMessage('Personalization updated, redirecting...');
            } else {
              debugLogger.info('User ID already set correctly');
            }

            // Force a refresh to ensure new state is picked up
            window.location.href = '/';
          } catch (error) {
            debugLogger.error('Error updating user ID:', error);
            throw error;
          }
        } else if (retryCount < MAX_RETRIES) {
          // If SDK not ready, retry after delay
          debugLogger.warning('SDK not ready, retrying...');
          setMessage(`Waiting for personalization (attempt ${retryCount + 1})...`);
          setTimeout(() => setRetryCount(count => count + 1), RETRY_DELAY);
          return;
        } else {
          debugLogger.error('Max retries exceeded waiting for SDK');
          // Proceed with navigation even if SDK failed
          window.location.href = '/';
        }
      } else if (status === 'unauthenticated') {
        debugLogger.info('User is not authenticated, resetting state');
        // Reset SDK state and clear all personalization
        await resetState();
        setMessage('Signed out, redirecting...');
        window.location.href = '/';
      }
    }

    runEffect();
  }, [status, sdk, isInitialized, session, router, resetState, retryCount]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Status</h1>
        <p className="text-gray-600">{message}</p>
        {retryCount > 0 && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostAuthentication;