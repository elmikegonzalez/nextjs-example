// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Personalize from '@contentstack/personalize-edge-sdk';
import debugLogger from './app/utils/debug-logger';

// Helper function to generate a unique user ID
const generateUserId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper function to create a cookie string
const createCookie = (name: string, value: string, days = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    return `${name}=${value}; expires=${date.toUTCString()}; path=/`;
};

// Helper function to get cookie value
const getCookie = (cookies: Record<string, string>, name: string) => {
    return cookies[name] || '';
};

// Helper function to check if a path should be excluded from middleware
const shouldExcludePath = (pathname: string) => {
  return (
    pathname.startsWith('/_next') || // Next.js internals
    pathname.startsWith('/static') || // Static files
    pathname.includes('.') || // Files with extensions
    pathname === '/favicon.ico' // Favicon
  );
};

// Helper function to clear all cookies
const clearAllCookies = (request: NextRequest) => {
  const response = NextResponse.redirect(new URL('/', request.url));
  const cookiesToClear = [
    'cs-personalize-user-uid',
    'cs-personalize-manifest',
    'personalize_state',
    'user_attributes',
    'isSubscribed',
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    'next-auth.state'
  ];

  cookiesToClear.forEach(name => {
    response.cookies.delete(name);
    // Also set expired cookies for better browser compatibility
    const expiredCookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`;
    response.headers.append('Set-Cookie', expiredCookie);
  });

  // Add cache busting headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set('Clear-Site-Data', '"cache","cookies","storage"');

  return response;
};

export async function middleware(request: NextRequest) {
    debugLogger.group('Middleware Request', () => {
        debugLogger.debug('Processing request:', request.url);
    });

    const response = NextResponse.next();

    try {
        // Skip middleware for specific paths
        const skipPaths = [
            '/_next',
            '/api/auth',
            '/favicon.ico',
            '/manifest.json',
            '/robots.txt',
            '/sitemap.xml'
        ];

        if (skipPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
            debugLogger.debug('Skipping middleware for path:', request.nextUrl.pathname);
            return response;
        }

        // Handle sign-out paths
        if (request.nextUrl.pathname.includes('/signout')) {
            debugLogger.debug('Handling sign-out request');
            const response = NextResponse.redirect(new URL('/', request.url));
            
            // Clear all cookies
            const cookiesToClear = [
                'cs-personalize-user-uid',
                'cs-personalize-manifest',
                'personalize_state',
                'user_attributes',
                'isSubscribed'
            ];

            cookiesToClear.forEach(name => {
                response.cookies.delete(name);
            });

            return response;
        }

        // Get or initialize cookies
        const cookies = request.cookies.getAll().reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
        }, {} as Record<string, string>);

        // Initialize user UID if not present
        let userUid = getCookie(cookies, 'cs-personalize-user-uid');
        if (!userUid) {
            userUid = generateUserId();
            response.headers.append('Set-Cookie', createCookie('cs-personalize-user-uid', userUid));
        }

        // Initialize manifest if not present
        let manifest = getCookie(cookies, 'cs-personalize-manifest');
        if (!manifest) {
            manifest = JSON.stringify({
                activeVariants: {},
                experiences: {}
            });
            response.headers.append('Set-Cookie', createCookie('cs-personalize-manifest', manifest));
        }

        // Initialize Personalize SDK
        const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
        if (!projectUid) {
            debugLogger.error('Missing NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID');
            return response;
        }

        // Set Edge API URL if provided
        const edgeApiUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL || 'https://edge-api.contentstack.com';
        Personalize.setEdgeApiUrl(edgeApiUrl);

        // Initialize SDK with request object
        const sdk = await Personalize.init(projectUid);
        if (!sdk) {
            debugLogger.error('Failed to initialize Personalize SDK');
            return response;
        }

        debugLogger.success('Successfully initialized Personalize SDK');
        return response;

    } catch (error: unknown) {
        const err = error as Error;
        debugLogger.error('Middleware error:', {
            message: err?.message || 'Unknown error',
            name: err?.name,
            stack: err?.stack
        });
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};