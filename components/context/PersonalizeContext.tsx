"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useRef
} from 'react';

import Personalize from '@contentstack/personalize-edge-sdk';
import { Sdk } from '@contentstack/personalize-edge-sdk/dist/sdk';

let sdkInstance: Sdk | null = null;

// Create a more comprehensive context that includes initialization state
interface PersonalizeContextType {
    sdk: Sdk | null;
    isInitialized: boolean;
    isInitializing: boolean;
    error: Error | null;
}

// Default context value
const defaultContextValue: PersonalizeContextType = {
    sdk: null,
    isInitialized: false,
    isInitializing: false,
    error: null
};

// Create context with proper typing
const PersonalizeContext = createContext<PersonalizeContextType>(defaultContextValue);

// Add proper typing for the provider props
interface PersonalizeProviderProps {
    children: ReactNode;
}

export async function getPersonalizeInstance() {
    try {
        // If we already have a valid instance, return it
        if (sdkInstance && Personalize.getInitializationStatus()) {
            console.log("[getPersonalizeInstance] Returning existing SDK instance");
            return sdkInstance;
        }

        // Check for required cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        const requiredCookies = [
            'cs-personalize-user-uid',
            'cs-personalize-manifest'
        ];

        const missingCookies = requiredCookies.filter(cookie => !cookies[cookie]);
        if (missingCookies.length > 0) {
            console.error("[getPersonalizeInstance] Missing required cookies:", missingCookies);
            return null;
        }

        const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
        if (!projectUid) {
            console.error("[getPersonalizeInstance] Missing NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID environment variable");
            return null;
        }

        // Set Edge API URL if provided
        const edgeApiUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL || 'https://edge-api.contentstack.com';
        console.log("[getPersonalizeInstance] Setting Edge API URL:", edgeApiUrl);
        Personalize.setEdgeApiUrl(edgeApiUrl);

        // Log configuration before initialization
        console.log("[getPersonalizeInstance] SDK Configuration:", {
            projectUid,
            edgeApiUrl,
            environment: process.env.NODE_ENV,
            cookies: {
                userUid: cookies['cs-personalize-user-uid'],
                manifest: cookies['cs-personalize-manifest']
            }
        });

        // Only clear existing instance if it's in an invalid state
        if (sdkInstance && !Personalize.getInitializationStatus()) {
            console.log("[getPersonalizeInstance] Clearing invalid SDK instance");
            sdkInstance = null;
        }

        // Initialize only if we don't have a valid instance
        if (!sdkInstance) {
            console.log("[getPersonalizeInstance] Initializing SDK with project UID:", projectUid);
            try {
                sdkInstance = await Personalize.init(projectUid);
                console.log("[getPersonalizeInstance] Successfully initialized Personalize SDK");
            } catch (initError: unknown) {
                const error = initError as Error;
                console.error("[getPersonalizeInstance] Detailed init error:", {
                    message: error?.message || 'Unknown error',
                    name: error?.name,
                    stack: error?.stack,
                    cause: error instanceof Error ? error.cause : undefined
                });
                throw error;
            }
        }

        return sdkInstance;
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[getPersonalizeInstance] Error initializing Personalize SDK:", {
            message: err?.message || 'Unknown error',
            name: err?.name,
            stack: err?.stack
        });
        return null;
    }
}

export function PersonalizeProvider({ children }: PersonalizeProviderProps) {
    const [context, setContext] = useState<PersonalizeContextType>(defaultContextValue);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;
    const initializationInProgress = useRef(false);

    useEffect(() => {
        const initializeSDK = async () => {
            // Skip if already initializing or initialized
            if (initializationInProgress.current || (context.isInitialized && context.sdk)) {
                return;
            }

            // Set initializing state
            initializationInProgress.current = true;
            setContext(prev => ({ ...prev, isInitializing: true }));

            try {
                console.log("[PersonalizeProvider] Starting SDK initialization (attempt " + (retryCount + 1) + ")");
                
                // Get cookies for debugging
                const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {} as Record<string, string>);
                
                console.log("[PersonalizeProvider] Current cookies:", cookies);

                const instance = await getPersonalizeInstance();

                if (instance) {
                    console.log("[PersonalizeProvider] SDK initialized successfully");
                    
                    // Verify the instance is working
                    const testResult = await instance.triggerEvent('sdk-init-test').catch(e => {
                        console.error("[PersonalizeProvider] Test event failed:", e);
                        return null;
                    });

                    if (testResult !== null) {
                        setContext({
                            sdk: instance,
                            isInitialized: true,
                            isInitializing: false,
                            error: null
                        });
                        setRetryCount(0); // Reset retry count on success
                    } else {
                        throw new Error("SDK test event failed");
                    }
                } else {
                    throw new Error("Failed to initialize Personalize SDK");
                }
            } catch (error) {
                console.error("[PersonalizeProvider] Initialization error:", error);
                
                // If we haven't exceeded max retries, schedule another attempt
                if (retryCount < MAX_RETRIES) {
                    console.log("[PersonalizeProvider] Scheduling retry in 1 second...");
                    setRetryCount(prev => prev + 1);
                    setContext(prev => ({ ...prev, isInitializing: false }));
                    setTimeout(() => {
                        initializationInProgress.current = false;
                        setContext(prev => ({ ...prev, isInitialized: false }));
                    }, 1000);
                } else {
                    console.error("[PersonalizeProvider] Max retries exceeded");
                    setContext({
                        sdk: null,
                        isInitialized: false,
                        isInitializing: false,
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                }
            } finally {
                initializationInProgress.current = false;
            }
        };

        initializeSDK();
    }, [context.isInitialized, retryCount]);

    // Add a retry button if initialization failed
    if (context.error) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="text-red-500 mb-4">
                    <h2 className="text-xl font-bold mb-2">Error initializing personalization</h2>
                    <p className="text-gray-600 mb-4">Failed to initialize Personalize SDK</p>
                </div>
                <button
                    onClick={() => {
                        setRetryCount(0);
                        setContext(prev => ({ ...prev, error: null, isInitialized: false }));
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <PersonalizeContext.Provider value={context}>
            {children}
        </PersonalizeContext.Provider>
    );
}

export function usePersonalize() {
    return useContext(PersonalizeContext);
}