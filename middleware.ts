// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import Personalize from '@contentstack/personalize-edge-sdk';

export default async function middleware(req: NextRequest) {
  console.log('\n=== PERSONALIZE MIDDLEWARE START ===');
  console.log('🔄 Processing request:', req.url);

  try {
    // Get the Personalize project UID from environment variables
    const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID as string;
    if (!projectUid) {
      console.error('❌ Missing projectUid');
      return NextResponse.next();
    }

    // Set Edge API URL if needed for different regions
    if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
      Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
    }

    console.log('🚀 Initializing Personalize SDK with projectUid:', projectUid);

    // Initialize the SDK with the project UID and the request object
    const personalizeSdk = await Personalize.init(projectUid, {
      request: req,
    });

    // Log SDK initialization status
    console.log('✨ SDK initialization status:', Personalize.getInitializationStatus());

    // Get active experiences and variants
    const experiences = personalizeSdk.getExperiences();
    console.log('🎯 Active experiences:', JSON.stringify(experiences, null, 2));

    // Get variant aliases for content delivery
    const variantAliases = personalizeSdk.getVariantAliases();
    console.log('🏷️  Variant aliases:', JSON.stringify(variantAliases, null, 2));

    // Get the variant parameter from the SDK
    const variantParam = personalizeSdk.getVariantParam();
    console.log('📝 Variant param:', variantParam);

    // Get current user attributes if available
    try {
        const userAttributes = await personalizeSdk.get();
        console.log('[Middleware] Current user attributes:', userAttributes);
    } catch (err) {
        console.warn('[Middleware] Could not get user attributes:', err);
    }

    // Modify the URL to include the variant parameter
    const parsedUrl = new URL(req.url);
    parsedUrl.searchParams.set(personalizeSdk.VARIANT_QUERY_PARAM, variantParam);
    console.log('🔀 Rewriting URL to:', parsedUrl.toString());

    // Get any timestamp parameter if it exists (used for cache busting)
    const timestamp = parsedUrl.searchParams.get('t');
    if (timestamp) {
      console.log('⏰ Cache busting timestamp:', timestamp);
    }

    // Get member status from URL if present
    const memberStatus = parsedUrl.searchParams.get('member');
    if (memberStatus) {
      console.log('👤 Member status:', memberStatus);
    }

    // Rewrite the request with the modified URL
    const response = NextResponse.rewrite(parsedUrl);

    // Add cookies to the response for state persistence
    await personalizeSdk.addStateToResponse(response);
    console.log('🍪 Added state cookies to response');

    // Log response headers for debugging
    console.log('📨 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    console.log('✅ Request processing complete');
    console.log('=== PERSONALIZE MIDDLEWARE END ===\n');
    return response;
  } catch (error) {
    console.error('❌ Error in middleware:', error);
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