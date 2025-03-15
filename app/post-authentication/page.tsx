'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePersonalize } from '@/components/context/PersonalizeContext';

function PostAuthentication() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { sdk, isInitialized } = usePersonalize();
  const [message, setMessage] = useState('Redirecting back to home page...');

  useEffect(() => {
    async function runEffect() {
      // Check if user is authenticated
      if (status === 'authenticated') {
        setMessage('Authentication successful, updating personalization...');

        // Wait for SDK to be initialized
        if (isInitialized && sdk) {
          try {
            // Check if user ID doesn't match current SDK user
            const sdkUserId = sdk.getUserId?.();

            if (session.user?.email && session.user.email !== sdkUserId) {
              // Update the user ID in the SDK
              await sdk.setUserId(session.user.email as string, {
                preserveUserAttributes: true,
              });
              console.log(`[PostAuthentication] Updated user ID to: ${session.user.email}`);
              setMessage('Personalization updated, redirecting...');
            } else {
              console.log('[PostAuthentication] User ID already set correctly');
            }
          } catch (error) {
            console.error('[PostAuthentication] Error updating user ID:', error);
          }
        } else {
          console.log('[PostAuthentication] Waiting for SDK initialization...');
        }
      } else if (status === 'unauthenticated') {
        // User is not authenticated, clear subscription
        localStorage.removeItem('isSubscribed');
        setMessage('Signed out, redirecting...');
      }
    }

    runEffect();

    // Redirect to home page after a delay
    const redirectTimeout = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(redirectTimeout);
  }, [status, session, sdk, isInitialized, router]);

  return (
      <div className="container mx-auto p-8 text-center">
        <div className="animate-pulse">
          <p className="text-xl">{message}</p>
        </div>
      </div>
  );
}

export default PostAuthentication;