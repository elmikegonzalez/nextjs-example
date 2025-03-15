// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import Personalize from '@contentstack/personalize-edge-sdk';

export default async function middleware(req: NextRequest) {
  // Get the Personalize project UID from environment variables
  const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID as string;

  // Set Edge API URL if needed for different regions
  if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
    Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
  }

  // Initialize the SDK with the project UID and the request object
  const personalizeSdk = await Personalize.init(projectUid, {
    request: req,
  });

  // Get the variant parameter from the SDK
  const variantParam = personalizeSdk.getVariantParam();

  // Modify the URL to include the variant parameter
  const parsedUrl = new URL(req.url);
  parsedUrl.searchParams.set(personalizeSdk.VARIANT_QUERY_PARAM, variantParam);

  // Rewrite the request with the modified URL
  const response = NextResponse.rewrite(parsedUrl);

  // Add cookies to the response for state persistence
  personalizeSdk.addStateToResponse(response);

  return response;
}