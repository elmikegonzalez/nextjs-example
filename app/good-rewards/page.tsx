// app/good-rewards/page.tsx
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import Navbar from '@/components/navbar';
import { extractNavbarProps } from '@/helpers/extractHomepageProps';
import { getEntries } from '@/helpers/getEntries';
import Personalize from '@contentstack/personalize-edge-sdk';
import { getRewardsContent } from './good-rewards-fetcher';
import GoodRewardsContent from './good-rewards-content';

interface GoodRewardsPageProps {
    searchParams: Record<string, string>;
}

const GoodRewardsPage = async ({ searchParams }: GoodRewardsPageProps) => {
    // Extract variant parameter for personalization
    const variantParam = searchParams[Personalize.VARIANT_QUERY_PARAM]
        ? decodeURIComponent(searchParams[Personalize.VARIANT_QUERY_PARAM])
        : '';

    console.log(`[SERVER][GoodRewardsPage] Retrieved variant param: ${variantParam}`);
    console.log(`[SERVER][GoodRewardsPage] All search params:`, JSON.stringify(searchParams, null, 2));

    // Get any timestamp from URL (for cache busting)
    const timestamp = searchParams['t'] || null;
    if (timestamp) {
        console.log(`[SERVER][GoodRewardsPage] Cache busting timestamp: ${timestamp}`);
    }

    // Read cookies for debugging
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const cookieObj: Record<string, string> = {};

    allCookies.forEach(cookie => {
        cookieObj[cookie.name] = cookie.value;
    });

    console.log(`[SERVER][GoodRewardsPage] Cookies: ${JSON.stringify(cookieObj, null, 2)}`);

    // Get HTTP headers for debugging
    const headersList = headers();
    const userAgent = headersList.get('user-agent');
    const referer = headersList.get('referer');

    console.log(`[SERVER][GoodRewardsPage] User-Agent: ${userAgent}`);
    console.log(`[SERVER][GoodRewardsPage] Referer: ${referer}`);

    try {
        // Get homepage entry to extract navbar props
        console.log(`[SERVER][GoodRewardsPage] Fetching homepage entry with variant: ${variantParam}`);

        const homepageEntries = await getEntries(
            process.env.NEXT_PUBLIC_CONTENTSTACK_HOMEPAGE_CONTENTTYPE_UID as string,
            {},
            variantParam,
        ) as any[];

        if (!homepageEntries || homepageEntries.length === 0) {
            console.error('[SERVER][GoodRewardsPage] Failed to fetch homepage entry');
            throw new Error('Failed to fetch homepage entry');
        }

        console.log(`[SERVER][GoodRewardsPage] Homepage entry fetched successfully`);
        const navbarProps = extractNavbarProps(homepageEntries[0]);

        // Fetch personalized rewards content from Contentstack
        console.log(`[SERVER][GoodRewardsPage] Fetching rewards content with variant: ${variantParam}`);
        const rewardsContent = await getRewardsContent(variantParam, cookieObj);

        console.log(`[SERVER][GoodRewardsPage] Retrieved content with title: "${rewardsContent.title}"`);
        console.log(`[SERVER][GoodRewardsPage] Has tier info: ${!!rewardsContent.tierInfo}`);
        console.log(`[SERVER][GoodRewardsPage] Has promotional message: ${!!rewardsContent.promotionalMessage}`);

        // Check for isSubscribed cookie specifically
        const isSubscribedCookie = cookieStore.get('isSubscribed');
        console.log(`[SERVER][GoodRewardsPage] isSubscribed cookie: ${isSubscribedCookie?.value}`);

        // Check for Personalize cookies
        const personalizeStateCookie = cookieStore.get('personalize_state');
        console.log(`[SERVER][GoodRewardsPage] personalize_state cookie exists: ${!!personalizeStateCookie}`);

        if (personalizeStateCookie) {
            try {
                const stateValue = personalizeStateCookie.value;
                console.log(`[SERVER][GoodRewardsPage] personalize_state length: ${stateValue.length} chars`);
                console.log(`[SERVER][GoodRewardsPage] personalize_state snippet: ${stateValue.substring(0, 50)}...`);
            } catch (e) {
                console.log(`[SERVER][GoodRewardsPage] Error parsing personalize_state: ${e}`);
            }
        }

        return (
            <div className="flex flex-col min-h-screen">
                <Navbar navLinks={navbarProps} />
                {/* Pass the fetched content to the client component */}
                <GoodRewardsContent initialContent={rewardsContent} />
            </div>
        );
    } catch (error) {
        console.error('[SERVER][GoodRewardsPage] Error rendering page:', error);

        // Fallback UI in case of errors
        return (
            <div className="flex flex-col min-h-screen">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-2xl font-bold text-red-600">
                        Unable to load the rewards page
                    </h1>
                    <p className="mt-4">
                        We're having trouble loading the rewards information. Please try again later.
                    </p>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <h2 className="font-semibold">Debug Information:</h2>
                        <p>Variant Parameter: {variantParam || 'none'}</p>
                        <p>Error: {(error as Error).message}</p>
                        <p>Timestamp: {new Date().toISOString()}</p>
                    </div>
                    <a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }
};

export default GoodRewardsPage;