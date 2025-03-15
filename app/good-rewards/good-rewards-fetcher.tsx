// app/good-rewards/good-rewards-fetcher.ts
import { cache } from 'react';
import contentstack from '@contentstack/delivery-sdk';
import Personalize from '@contentstack/personalize-edge-sdk';
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

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
    // Debug info
    debugInfo?: {
        variantUsed?: string;
        requestTimestamp?: string;
        serverTime?: string;
        entryId?: string;
        requestPath?: string;
        cookies?: Record<string, string>;
    };
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
        ctaText: "Join Now",
        debugInfo: {
            variantUsed: "default-fallback",
            serverTime: new Date().toISOString(),
        }
    };
}

// Cached function to fetch rewards content from Contentstack
export const getRewardsContent = cache(async (variantParam?: string, cookies?: Record<string, string>): Promise<RewardsProgramContent> => {
    console.log(`[SERVER][getRewardsContent] Starting fetch with variantParam: ${variantParam || 'none'}`);
    console.log(`[SERVER][getRewardsContent] Server time: ${new Date().toISOString()}`);

    if (cookies) {
        console.log('[SERVER][getRewardsContent] Cookies received:', JSON.stringify(cookies, null, 2));
    }

    try {
        // Check for required environment variables
        const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
        const deliveryToken = process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN;
        const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT;

        if (!apiKey || !deliveryToken || !environment) {
            console.error('[SERVER][getRewardsContent] Missing required environment variables');
            throw Error('Required Contentstack environment variables are missing');
        }

        console.log('[SERVER][getRewardsContent] Initializing Contentstack SDK');

        // Initialize the Contentstack SDK
        const stack = contentstack.stack({
            apiKey,
            deliveryToken,
            environment,
            host: process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io',
        });

        // Define content type and entry ID
        const contentTypeUid = 'rewards_program';
        
        console.log(`[SERVER][getRewardsContent] Fetching entries of type ${contentTypeUid}`);

        // Create the base query
        const query = stack.contentType(contentTypeUid).entry();

        // Log the query configuration
        console.log('[SERVER][getRewardsContent] Query configuration:', {
            contentTypeUid,
            apiKey: apiKey.substring(0, 5) + '...',
            environment,
            host: process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io'
        });

        // Fetch the entries with the specific variant if provided
        let response: any;
        let variantAliasUsed = '';

        try {
            if (variantParam) {
                // Convert the variant parameter to variant aliases
                const variantAliases = Personalize.variantParamToVariantAliases(variantParam);
                console.log(`[SERVER][getRewardsContent] Variant param "${variantParam}" converted to aliases:`, variantAliases);
                
                if (variantAliases.length > 0) {
                    variantAliasUsed = variantAliases.join(',');
                    console.log(`[SERVER][getRewardsContent] Using variant aliases: ${variantAliasUsed}`);
                    
                    // Add variant to the query
                    query.addParams({ variants: variantAliasUsed });
                    console.log('[SERVER][getRewardsContent] Added variant parameter to query');
                } else {
                    console.log('[SERVER][getRewardsContent] No valid variant aliases found for param:', variantParam);
                }
            }

            // Log the full query before execution
            console.log('[SERVER][getRewardsContent] Full query details:', {
                contentType: contentTypeUid,
                environment,
                variantParam,
                variantAliasUsed
            });

            // Execute the query with detailed logging
            console.log('[SERVER][getRewardsContent] Executing Contentstack query...');

            // Log the request details
            const requestUrl = `https://${process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io'}/v3/content_types/${contentTypeUid}/entries`;
            const requestHeaders = {
                api_key: apiKey,
                access_token: deliveryToken,
                environment,
                ...(variantAliasUsed ? { 'x-cs-variant-uid': variantAliasUsed } : {})
            };

            console.log('[SERVER][getRewardsContent] Request details:', {
                url: requestUrl,
                headers: {
                    ...requestHeaders,
                    api_key: requestHeaders.api_key.substring(0, 5) + '...',
                    access_token: requestHeaders.access_token.substring(0, 5) + '...'
                }
            });

            // Make the query
            response = await query.find();
            console.log('[SERVER][getRewardsContent] Query executed successfully');
            console.log('[SERVER][getRewardsContent] Response:', {
                status: 'success',
                hasEntries: !!response?.entries,
                entryCount: response?.entries?.length || 0,
                responseType: typeof response,
                keys: response ? Object.keys(response) : []
            });

        } catch (error: any) {
            console.error('[SERVER][getRewardsContent] Error executing query:', {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                contentTypeUid,
                variantParam,
                variantAliasUsed,
                apiKey: apiKey.substring(0, 5) + '...',
                host: process.env.CONTENTSTACK_DELIVERY_API_HOST
            });
            throw error;
        }

        console.log('[SERVER][getRewardsContent] Response received from Contentstack');
        console.log('[SERVER][getRewardsContent] Response type:', typeof response);

        // Check if response exists and has entries
        if (!response || !response.entries || response.entries.length === 0) {
            console.error('[SERVER][getRewardsContent] No entries found in Contentstack');
            console.error('[SERVER][getRewardsContent] Response structure:', JSON.stringify(response, null, 2));
            return getDefaultContent();
        }

        // Use the first entry
        const entry = response.entries[0];

        // Additional logging for debugging
        console.log('[SERVER][getRewardsContent] Response keys:', Object.keys(entry));

        // Extract title and other properties safely with type checking
        const title = entry.title || 'Rewards Program';
        const description = entry.description || 'Join our rewards program today!';
        const benefits = Array.isArray(entry.benefits) 
            ? entry.benefits.map((benefit: any) => {
                // Handle block structure from Contentstack
                if (benefit && typeof benefit === 'object') {
                    if ('text' in benefit) return benefit.text;
                    if ('benefit' in benefit && typeof benefit.benefit === 'object' && 'text' in benefit.benefit) {
                        return benefit.benefit.text;
                    }
                }
                if (typeof benefit === 'string') return benefit;
                return null;
              }).filter((benefit: string | null): benefit is string => typeof benefit === 'string')
            : [];

        // Add debug logging for benefits
        console.log('[SERVER][getRewardsContent] Raw benefits:', entry.benefits);
        console.log('[SERVER][getRewardsContent] Processed benefits:', benefits);

        const cta_text = entry.cta_text || 'Join Now';

        console.log(`[SERVER][getRewardsContent] Extracted title: "${title}"`);
        console.log(`[SERVER][getRewardsContent] Has tier_info:`, !!entry.tier_info);
        console.log(`[SERVER][getRewardsContent] Benefits:`, benefits);

        // Map the Contentstack entry to our application's content model
        const mappedContent: RewardsProgramContent = {
            title,
            description,
            benefits,
            ctaText: cta_text,
            debugInfo: {
                variantUsed: variantAliasUsed || 'default',
                requestTimestamp: new Date().toISOString(),
                serverTime: new Date().toISOString(),
                entryId: entry.uid,
                requestPath: '/good-rewards',
                cookies: cookies,
            }
        };

        // Add optional fields if they exist
        if (entry.tier_info) {
            console.log('[SERVER][getRewardsContent] Adding tier info:', entry.tier_info);
            mappedContent.tierInfo = {
                currentTier: entry.tier_info.current_tier || '',
                pointsBalance: typeof entry.tier_info.points_balance === 'number' ? entry.tier_info.points_balance : 0,
                nextTier: entry.tier_info.next_tier || '',
                pointsToNextTier: typeof entry.tier_info.points_to_next_tier === 'number' ? entry.tier_info.points_to_next_tier : 0
            };
        }

        if (entry.promotional_message) {
            console.log('[SERVER][getRewardsContent] Adding promotional message:', entry.promotional_message);
            mappedContent.promotionalMessage = entry.promotional_message;
        }

        console.log(`[SERVER][getRewardsContent] Successfully mapped content with title: "${mappedContent.title}"`);
        return mappedContent;

    } catch (error) {
        console.error('[SERVER][getRewardsContent] Error fetching rewards content:', error);
        return getDefaultContent();
    }
});