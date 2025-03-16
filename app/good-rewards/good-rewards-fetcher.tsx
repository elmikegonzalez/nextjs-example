// app/good-rewards/good-rewards-fetcher.ts
import { cache } from 'react';
import contentstack from '@contentstack/delivery-sdk';
import Personalize from '@contentstack/personalize-edge-sdk';
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Define types for the Contentstack response
interface ContentstackEntry {
    title: string;
    description: string;
    benefits: any[];
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
    // Enhanced debug info
    debugInfo?: {
        variantUsed?: string;
        requestTimestamp?: string;
        serverTime?: string;
        entryId?: string;
        requestPath?: string;
        cookies?: Record<string, string>;
        sdkState?: {
            initStatus?: string;
            variantParam?: string;
            variantAliases?: string[];
            requestHeaders?: Record<string, string>;
            queryParams?: Record<string, any>;
        };
        contentInfo?: {
            contentTypeUid?: string;
            environment?: string;
            hasVariants?: boolean;
            availableFields?: string[];
            rawResponse?: any;
        };
        timing?: {
            fetchStart?: string;
            fetchEnd?: string;
            totalDuration?: number;
        };
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
    const fetchStartTime = Date.now();
    console.log('\n=== REWARDS CONTENT FETCH START ===');
    console.log(`🕒 [${new Date().toISOString()}] Starting fetch with variantParam: ${variantParam || 'none'}`);

    // Enhanced SDK status logging
    const sdkStatus = {
        isPersonalizeAvailable: !!Personalize,
        hasVariantParamMethod: !!Personalize.variantParamToVariantAliases,
        hasGetInitializationStatus: !!Personalize.getInitializationStatus,
        initStatus: Personalize.getInitializationStatus?.(),
        sdkVersion: Personalize.version || 'unknown'
    };
    console.log('🔍 SDK Status:', sdkStatus);

    // Enhanced cookie analysis
    if (cookies) {
        const cookieAnalysis = {
            count: Object.keys(cookies).length,
            names: Object.keys(cookies),
            hasPersonalizeState: 'personalize_state' in cookies,
            hasUserAttributes: 'user_attributes' in cookies,
            personalizeState: cookies['personalize_state'] ? {
                length: cookies['personalize_state'].length,
                snippet: cookies['personalize_state'].substring(0, 50) + '...'
            } : 'not found',
            userAttributes: cookies['user_attributes'] ? {
                length: cookies['user_attributes'].length,
                snippet: cookies['user_attributes'].substring(0, 50) + '...'
            } : 'not found'
        };
        console.log('🍪 Enhanced Cookie Analysis:', cookieAnalysis);
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

        console.log('🎯 Content Target:', {
            contentTypeUid: 'rewards_program',
            entryUid: 'blt5cd290c6b1bf0fc9',
            environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT,
            host: process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io'
        });

        // Initialize SDK with detailed logging
        console.log('🚀 Initializing Contentstack SDK...');
        const stack = contentstack.stack({
            apiKey,
            deliveryToken,
            environment,
            host: process.env.CONTENTSTACK_DELIVERY_API_HOST || 'cdn.contentstack.io',
        });

        // Create entry call with detailed logging
        console.log('📝 Creating entry call...');
        const entryCall = stack
            .contentType('rewards_program')
            .entry('blt5cd290c6b1bf0fc9');

        // Enhanced variant processing
        let variantAliasUsed = '';
        let variantAliases: string[] = [];
        let variantDetails = {
            original: variantParam,
            decoded: variantParam ? decodeURIComponent(variantParam) : '',
            processed: false,
            error: null as Error | null,
            aliases: [] as string[],
            finalAlias: ''
        };

        if (variantParam) {
            console.log('🔄 Processing variant:', {
                original: variantParam,
                decoded: decodeURIComponent(variantParam),
                timestamp: new Date().toISOString()
            });

            try {
                variantAliases = Personalize.variantParamToVariantAliases(variantParam);
                variantDetails.processed = true;
                variantDetails.aliases = variantAliases;
                
                if (variantAliases.length > 0) {
                    variantAliasUsed = variantAliases.join(',');
                    variantDetails.finalAlias = variantAliasUsed;
                    
                    // Add variant to query with detailed logging
                    console.log('✨ Adding variant to entry call:', {
                        variantAliasUsed,
                        aliasCount: variantAliases.length,
                        timestamp: new Date().toISOString()
                    });
                    
                    entryCall.variants(variantAliasUsed);
                } else {
                    console.log('⚠️ No valid variant aliases generated for:', variantParam);
                }
            } catch (error) {
                variantDetails.error = error as Error;
                console.error('❌ Variant processing error:', {
                    error,
                    variantParam,
                    stack: (error as Error).stack
                });
            }
        }

        // Log final query configuration
        console.log('📤 Final query configuration:', {
            contentTypeUid: 'rewards_program',
            entryUid: 'blt5cd290c6b1bf0fc9',
            variantDetails,
            timestamp: new Date().toISOString()
        });

        // Execute query with enhanced timing
        const queryStartTime = Date.now();
        console.log('🔄 Executing entry fetch...');
        const response = await entryCall.fetch();
        const queryEndTime = Date.now();

        // Enhanced response analysis
        const responseAnalysis = {
            duration: `${queryEndTime - queryStartTime}ms`,
            hasResponse: !!response,
            responseType: typeof response,
            isObject: response && typeof response === 'object',
            keys: response ? Object.keys(response) : [],
            variantUsed: variantAliasUsed || 'default',
            timestamp: new Date().toISOString()
        };
        console.log('📥 Response Analysis:', responseAnalysis);

        if (!response) {
            console.error('❌ No entry found in response');
            return getDefaultContent();
        }

        // Extract entry data
        const entry = response as ContentstackEntry;
        
        // Log complete entry for variant
        console.log('🔍 Complete entry for variant:', {
            variant: variantAliasUsed || 'default',
            entry: JSON.stringify(entry, null, 2)
        });

        const entryAnalysis = {
            title: entry.title,
            hasDescription: !!entry.description,
            hasTierInfo: !!entry.tier_info,
            hasPromotionalMessage: !!entry.promotional_message,
            allFields: Object.keys(entry)
        };
        console.log('📋 Entry Analysis:', entryAnalysis);

        // Extract title and other properties safely with type checking
        const title = entry.title || 'Rewards Program';
        const description = entry.description || 'Join our rewards program today!';

        // Enhanced tier info processing with raw data logging
        console.log('👑 Raw tier info data:', {
            tier_info: entry.tier_info,
            type: typeof entry.tier_info,
            structure: entry.tier_info ? JSON.stringify(entry.tier_info, null, 2) : 'undefined',
            allTierFields: entry.tier_info ? Object.keys(entry.tier_info) : []
        });

        // Enhanced benefits processing with raw data logging
        console.log('🎁 Raw benefits data:', {
            benefits: entry.benefits,
            type: typeof entry.benefits,
            isArray: Array.isArray(entry.benefits),
            structure: entry.benefits ? JSON.stringify(entry.benefits, null, 2) : 'undefined'
        });

        // Simple benefits processing with additional checks
        const benefits = Array.isArray(entry.benefits) 
            ? entry.benefits.map((benefit: any, index: number) => {
                console.log(`Processing benefit ${index}:`, benefit);
                
                if (benefit && typeof benefit === 'object') {
                    // Check for modular blocks structure
                    if (benefit.benefit_text) {
                        console.log(`Found benefit_text in benefit ${index}:`, benefit.benefit_text);
                        return benefit.benefit_text;
                    }
                    if ('text' in benefit) {
                        console.log(`Found text in benefit ${index}:`, benefit.text);
                        return benefit.text;
                    }
                    if ('benefit' in benefit && typeof benefit.benefit === 'object' && 'text' in benefit.benefit) {
                        console.log(`Found nested text in benefit ${index}:`, benefit.benefit.text);
                        return benefit.benefit.text;
                    }
                    // Log unknown object structure
                    console.log(`Unknown benefit object structure ${index}:`, benefit);
                }
                if (typeof benefit === 'string') {
                    console.log(`Found string benefit ${index}:`, benefit);
                    return benefit;
                }
                console.log(`Could not process benefit ${index}:`, benefit);
                return null;
            }).filter((benefit: string | null): benefit is string => typeof benefit === 'string')
            : [];

        // Log final benefits result
        console.log('Final benefits result:', {
            count: benefits.length,
            benefits: benefits,
            variant: variantAliasUsed || 'default'
        });

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
            console.log('[SERVER][getRewardsContent] Processing tier info:', entry.tier_info);
            mappedContent.tierInfo = {
                currentTier: entry.tier_info.current_tier || '',
                pointsBalance: typeof entry.tier_info.points_balance === 'number' ? entry.tier_info.points_balance : 0,
                nextTier: entry.tier_info.next_tier || '',
                pointsToNextTier: typeof entry.tier_info.points_to_next_tier === 'number' ? entry.tier_info.points_to_next_tier : 0
            };
            console.log('[SERVER][getRewardsContent] Mapped tier info:', mappedContent.tierInfo);
        }

        if (entry.promotional_message) {
            console.log('[SERVER][getRewardsContent] Adding promotional message:', entry.promotional_message);
            mappedContent.promotionalMessage = entry.promotional_message;
        }

        console.log(`[SERVER][getRewardsContent] Successfully mapped content with title: "${mappedContent.title}"`);

        // Enhanced debug info in mapped content
        mappedContent.debugInfo = {
            ...mappedContent.debugInfo,
            sdkState: {
                initStatus: Personalize.getInitializationStatus?.(),
                variantParam,
                variantAliases,
                requestHeaders: {
                    'x-cs-variant-uid': variantAliasUsed,
                    environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || ''
                },
                queryParams: {}
            },
            contentInfo: {
                contentTypeUid: 'rewards_program',
                environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT,
                hasVariants: variantAliases.length > 0,
                availableFields: response ? Object.keys(response) : [],
                rawResponse: response
            },
            timing: {
                fetchStart: new Date(fetchStartTime).toISOString(),
                fetchEnd: new Date().toISOString(),
                totalDuration: Date.now() - fetchStartTime
            }
        };

        // Enhanced completion logging
        console.log('✅ Content mapping completed:', {
            title: mappedContent.title,
            benefitsCount: mappedContent.benefits.length,
            hasTierInfo: !!mappedContent.tierInfo,
            hasPromotionalMessage: !!mappedContent.promotionalMessage,
            duration: `${Date.now() - fetchStartTime}ms`,
            variantUsed: variantAliasUsed || 'default'
        });

        console.log('=== REWARDS CONTENT FETCH END ===\n');
        return mappedContent;

    } catch (error) {
        // Enhanced error logging
        const errorAnalysis = {
            error,
            type: error instanceof Error ? 'Error' : typeof error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            variantParam,
            timestamp: new Date().toISOString(),
            duration: `${Date.now() - fetchStartTime}ms`
        };
        console.error('❌ Enhanced Error Analysis:', errorAnalysis);
        
        const fallbackContent = getDefaultContent();
        fallbackContent.debugInfo = {
            ...fallbackContent.debugInfo,
            sdkState: {
                initStatus: Personalize.getInitializationStatus?.(),
                variantParam,
                variantAliases: [],
                requestHeaders: {},
                queryParams: {}
            },
            timing: {
                fetchStart: new Date(fetchStartTime).toISOString(),
                fetchEnd: new Date().toISOString(),
                totalDuration: Date.now() - fetchStartTime
            }
        };
        
        return fallbackContent;
    }
});