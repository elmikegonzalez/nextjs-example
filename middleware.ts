// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import Personalize from '@contentstack/personalize-edge-sdk';

export default async function middleware(req: NextRequest) {
  console.log('[Middleware] Processing request:', req.url);

  try {
    // Get the Personalize project UID from environment variables
    const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID as string;
    if (!projectUid) {
      console.error('[Middleware] Missing projectUid');
      return NextResponse.next();
    }

    // Set Edge API URL if needed for different regions
    if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
      Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
    }

    console.log('[Middleware] Initializing Personalize SDK with projectUid:', projectUid);

    // Initialize the SDK with the project UID and the request object
    const personalizeSdk = await Personalize.init(projectUid, {
      request: req,
    });

    // Get the variant parameter from the SDK
    const variantParam = personalizeSdk.getVariantParam();
    console.log('[Middleware] Got variant param:', variantParam);

    // Modify the URL to include the variant parameter
    const parsedUrl = new URL(req.url);
    parsedUrl.searchParams.set(personalizeSdk.VARIANT_QUERY_PARAM, variantParam);
    console.log('[Middleware] Rewriting URL to:', parsedUrl.toString());

    // Get any timestamp parameter if it exists (used for cache busting)
    const timestamp = parsedUrl.searchParams.get('t');
    if (timestamp) {
      console.log('[Middleware] Detected timestamp for cache busting:', timestamp);
    }

    // Rewrite the request with the modified URL
    const response = NextResponse.rewrite(parsedUrl);

    // Add cookies to the response for state persistence
    personalizeSdk.addStateToResponse(response);

    console.log('[Middleware] Request processing complete');
    return response;
  } catch (error) {
    console.error('[Middleware] Error in middleware:', error);
    return NextResponse.next();
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};