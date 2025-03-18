// app/good-rewards/page.tsx
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import Navbar from '@/components/navbar';
import { extractNavbarProps } from '@/helpers/extractHomepageProps';
import { getEntries } from '@/helpers/getEntries';
import Personalize from '@contentstack/personalize-edge-sdk';
import { getRewardsContent } from './good-rewards-fetcher';
import GoodRewardsContent from './good-rewards-content';
import debugLogger from '../utils/debug-logger';

interface GoodRewardsPageProps {
    searchParams: Record<string, string>;
}

const GoodRewardsPage = async ({ searchParams }: GoodRewardsPageProps) => {
    debugLogger.group('GoodRewardsPage Render', () => {
        debugLogger.info('Rendering with search params:', searchParams);
    });

    try {
        // Get all cookies
        const cookieStore = cookies();
        const allCookies = cookieStore.getAll().reduce((acc, cookie) => {
            acc[cookie.name] = cookie.value;
            return acc;
        }, {} as Record<string, string>);

        debugLogger.debug('Retrieved cookies:', {
            count: Object.keys(allCookies).length,
            names: Object.keys(allCookies)
        });

        // Get personalize_state cookie
        const personalizeStateCookie = cookieStore.get('personalize_state');
        
        // Get variant parameter from query string
        const variantParam = searchParams.variant || '';
        debugLogger.debug('Variant parameter:', variantParam);

        // Get homepage entry for navbar
        debugLogger.time('Homepage Entry Fetch');
        const [homepageEntry] = await getEntries(
            process.env.NEXT_PUBLIC_CONTENTSTACK_HOMEPAGE_CONTENTTYPE_UID as string,
            {},
        ) as any[];
        debugLogger.timeEnd('Homepage Entry Fetch');

        const navbarProps = extractNavbarProps(homepageEntry);
        debugLogger.debug('Extracted navbar props:', navbarProps);

        // Get rewards content
        debugLogger.time('Rewards Content Fetch');
        const rewardsContent = await getRewardsContent(variantParam, allCookies);
        debugLogger.timeEnd('Rewards Content Fetch');

        debugLogger.debug('Retrieved rewards content:', {
            title: rewardsContent.title,
            hasTierInfo: !!rewardsContent.tierInfo,
            hasPromotionalMessage: !!rewardsContent.promotionalMessage
        });

        if (personalizeStateCookie) {
            try {
                const stateValue = personalizeStateCookie.value;
                debugLogger.debug('Personalize state cookie:', {
                    length: stateValue.length,
                    snippet: stateValue.substring(0, 50) + '...'
                });
            } catch (e) {
                debugLogger.error('Error parsing personalize_state:', e);
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
        debugLogger.error('Error in GoodRewardsPage:', error);
        throw error;
    }
};

export default GoodRewardsPage;