'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import debugLogger from '@/app/utils/debug-logger';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      debugLogger.error('Authentication error:', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error === 'Configuration' && 'There is a problem with the server configuration.'}
                {error === 'AccessDenied' && 'Access was denied to this resource.'}
                {error === 'Verification' && 'The verification token has expired or has already been used.'}
                {!error && 'An unknown error occurred.'}
              </p>
            </div>
          </div>
        </div>
        <a
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
} 