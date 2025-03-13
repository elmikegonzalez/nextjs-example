import Navbar from '@/components/navbar';
import { extractNavbarProps } from '@/helpers/extractHomepageProps';
import { getEntries } from '@/helpers/getEntries';
import Personalize from '@contentstack/personalize-edge-sdk';

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

    // Get homepage entry to extract navbar props
    let [homepageEntry] = await getEntries(
        process.env.NEXT_PUBLIC_CONTENTSTACK_HOMEPAGE_CONTENTTYPE_UID as string,
        {},
        variantParam,
    ) as any[];

    let navbarProps = extractNavbarProps(homepageEntry);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar navLinks={navbarProps} />
            <GoodRewardsContent />
        </div>
    );
};

export default GoodRewardsPage;