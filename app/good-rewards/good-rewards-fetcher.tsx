// app/good-rewards/good-rewards-fetcher.ts
import { cache } from 'react';
import contentstack from '@contentstack/delivery-sdk';
import Personalize from '@contentstack/personalize-edge-sdk';

// Define types for the Contentstack response
interface ContentstackEntry {
    title: string;
    description: string;
    benefits_list: string[];
    cta_text: string;
    tier_info?: {
        current_tier?: string;
        points_balance?: number;
        next_tier?: string;
        points_to_next_tier?: number;
    };
    promotional_message?: string;
    [key: string]: any; // For any other fields that might exist
}

export interface RewardsProgramContent {
    title: string;
    description: string;
    benefits: string[];
    ctaText: string;
    tierInfo?: {
        currentTier?: string;
        pointsBalance?: number;
        nextTier?: string;
        pointsToNextTier?: number;
    };
    promotionalMessage?: string;
}

// Default content as fallback
function getDefaultContent(): RewardsProgramContent {
    return {
        title: "Join Good Rewards Today",
        description: "Our members-only program gives you access to exclusive benefits, points on every purchase, and special offers.",
        benefits: [
            "Earn 1 point for every $1 spent",
            "Free standard shipping on all orders",
            "Early access to new collections",
            "Birthday gift each year"
        ],
        ctaText: "Join Now"
    };
}

// Cached function to fetch rewards content from Contentstack
export const getRewardsContent = cache(async (variantParam?: string): Promise<RewardsProgramContent> => {
    console.log(`[getRewardsContent] Starting fetch with variantParam: ${variantParam || 'none'}`);

    try {
        // Check for required environment variables
        const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
        const deliveryToken = process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN;
        const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT;

        if (!apiKey || !deliveryToken || !environment) {
            throw Error('Required Contentstack environment variables are missing');
        }

        // Initialize the Contentstack SDK
        const stack = contentstack.stack({
            apiKey,
            deliveryToken,
            environment,
            host: process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io',
        });

        // Define content type and entry ID
        const contentTypeUid = 'rewards_program';

        // Assuming you have a specific entry for the rewards program
        // If you don't have a specific entry UID, you can use .query() instead of .entry()
        const entryCall = stack
            .contentType(contentTypeUid)
            .entry('your_entry_uid'); // Replace with your actual entry UID

        // Fetch the entry with the specific variant if provided
        let response;
        if (variantParam) {
            const variantAlias = Personalize.variantParamToVariantAliases(variantParam).join(',');
            console.log(`[getRewardsContent] Using variant aliases: ${variantAlias}`);
            response = await entryCall.variants(variantAlias).fetch();
        } else {
            response = await entryCall.fetch();
        }

        // Type check and process the response
        if (!response || typeof response !== 'object') {
            console.error('[getRewardsContent] Invalid response from Contentstack');
            return getDefaultContent();
        }

        // Cast the response to our expected type
        const entry = response as ContentstackEntry;

        // Map the Contentstack entry to our application's content model
        const mappedContent: RewardsProgramContent = {
            title: entry.title || 'Rewards Program',
            description: entry.description || 'Join our rewards program today!',
            benefits: Array.isArray(entry.benefits_list) ? entry.benefits_list : [],
            ctaText: entry.cta_text || 'Join Now',
        };

        // Add optional fields if they exist
        if (entry.tier_info) {
            mappedContent.tierInfo = {
                currentTier: entry.tier_info.current_tier,
                pointsBalance: entry.tier_info.points_balance,
                nextTier: entry.tier_info.next_tier,
                pointsToNextTier: entry.tier_info.points_to_next_tier
            };
        }

        if (entry.promotional_message) {
            mappedContent.promotionalMessage = entry.promotional_message;
        }

        console.log(`[getRewardsContent] Successfully fetched content with title: ${mappedContent.title}`);
        return mappedContent;

    } catch (error) {
        console.error('[getRewardsContent] Error fetching rewards content:', error);
        return getDefaultContent();
    }
});