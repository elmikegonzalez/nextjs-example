// app/good-rewards/page.tsx
import Navbar from '@/components/navbar';
import { extractNavbarProps } from '@/helpers/extractHomepageProps';
import { getEntries } from '@/helpers/getEntries';
import Personalize from '@contentstack/personalize-edge-sdk';
import { getRewardsContent } from './good-rewards-fetcher';
import GoodRewardsContent from './good-rewards-content';

const GoodRewardsPage = async ({
                                   searchParams,
                               }: {
    searchParams: Record<string, string>;
}) => {
    // Extract variant parameter for personalization
    let variantParam = searchParams[Personalize.VARIANT_QUERY_PARAM]
        ? decodeURIComponent(searchParams[Personalize.VARIANT_QUERY_PARAM])
        : '';

    console.log(`[GoodRewardsPage] Retrieved variant param: ${variantParam}`);

    // Get homepage entry to extract navbar props
    let [homepageEntry] = await getEntries(
        process.env.NEXT_PUBLIC_CONTENTSTACK_HOMEPAGE_CONTENTTYPE_UID as string,
        {},
        variantParam,
    ) as any[];

    let navbarProps = extractNavbarProps(homepageEntry);

    // Extract user attributes from cookies or other sources if needed
    // Note: This would normally be done automatically by the middleware
    // but we're showing it explicitly for clarity

    // Example of how you might extract user info if needed
    // const cookies = req.cookies;
    // const isRewardMember = cookies.get('isRewardMember')?.value === 'true';
    // const isPremiumMember = cookies.get('isPremiumMember')?.value === 'true';

    // Fetch personalized rewards content from Contentstack
    // The variantParam will contain the selected variant based on user attributes
    // The middleware has already determined which variant to use based on user attributes
    const rewardsContent = await getRewardsContent(variantParam);

    console.log(`[GoodRewardsPage] Retrieved content with title: ${rewardsContent.title}`);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar navLinks={navbarProps} />
            {/* Pass the fetched content to the client component */}
            <GoodRewardsContent initialContent={rewardsContent} />
        </div>
    );
};

export default GoodRewardsPage;