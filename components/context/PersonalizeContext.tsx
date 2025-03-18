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
import debugLogger from '../../app/utils/debug-logger';
import { useSession } from 'next-auth/react';

let sdkInstance: Sdk | null = null;

// Create a more comprehensive context that includes initialization state
interface PersonalizeContextType {
    sdk: Sdk | null;
    isInitialized: boolean;
    isInitializing: boolean;
    error: Error | null;
    resetState: () => Promise<void>;
}

// Default context value
const defaultContextValue: PersonalizeContextType = {
    sdk: null,
    isInitialized: false,
    isInitializing: false,
    error: null,
    resetState: async () => {}
};

// Create context with proper typing
const PersonalizeContext = createContext<PersonalizeContextType>(defaultContextValue);

// Add proper typing for the provider props
interface PersonalizeProviderProps {
    children: ReactNode;
}

// Helper function to generate a unique user ID
const generateUserId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper function to set a cookie
const setCookie = (name: string, value: string, days = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
};

export async function getPersonalizeInstance() {
    try {
        // If we already have a valid instance, return it
        if (sdkInstance && Personalize.getInitializationStatus()) {
            debugLogger.debug('Returning existing SDK instance');
            return sdkInstance;
        }

        const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
        if (!projectUid) {
            debugLogger.error('Missing NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID environment variable');
            return null;
        }

        // Set Edge API URL if provided
        const edgeApiUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL || 'https://edge-api.contentstack.com';
        debugLogger.debug('Setting Edge API URL:', edgeApiUrl);
        Personalize.setEdgeApiUrl(edgeApiUrl);

        // Initialize required cookies if they don't exist
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        // Initialize user UID if not present
        if (!cookies['cs-personalize-user-uid']) {
            const userId = generateUserId();
            setCookie('cs-personalize-user-uid', userId);
            cookies['cs-personalize-user-uid'] = userId;
        }

        // Initialize manifest if not present
        if (!cookies['cs-personalize-manifest']) {
            const defaultManifest = JSON.stringify({
                activeVariants: {},
                experiences: {}
            });
            setCookie('cs-personalize-manifest', defaultManifest);
            cookies['cs-personalize-manifest'] = defaultManifest;
        }

        // Log configuration before initialization
        debugLogger.debug('SDK Configuration:', {
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
            debugLogger.debug('Clearing invalid SDK instance');
            sdkInstance = null;
        }

        // Initialize only if we don't have a valid instance
        if (!sdkInstance) {
            debugLogger.debug('Initializing SDK with project UID:', projectUid);
            try {
                sdkInstance = await Personalize.init(projectUid);
                debugLogger.success('Successfully initialized Personalize SDK');
            } catch (initError: unknown) {
                const error = initError as Error;
                debugLogger.error('Detailed init error:', {
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
        debugLogger.error('Error initializing Personalize SDK:', {
            message: err?.message || 'Unknown error',
            name: err?.name,
            stack: err?.stack
        });
        return null;
    }
}

export function PersonalizeProvider({ children }: PersonalizeProviderProps) {
    const { data: session, status } = useSession();
    const [context, setContext] = useState<PersonalizeContextType>(defaultContextValue);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;
    const initializationInProgress = useRef(false);

    // Function to reset SDK state
    const resetState = async () => {
        debugLogger.group('SDK State Reset', () => {
            debugLogger.info('Resetting SDK state');
        });

        try {
            // Clear cookies first
            const cookiesToClear = [
                'cs-personalize-user-uid',
                'cs-personalize-manifest',
                'personalize_state',
                'user_attributes',
                'isSubscribed'
            ];

            cookiesToClear.forEach(name => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            });

            // Reset context state
            setContext(defaultContextValue);
            sdkInstance = null;
            setRetryCount(0);

            debugLogger.success('Successfully reset SDK state');
        } catch (error) {
            debugLogger.error('Error resetting SDK state:', error);
        }
    };

    useEffect(() => {
        const initializeSDK = async () => {
            // Skip initialization if we're on the signout page
            if (window.location.pathname === '/api/auth/signout') {
                return;
            }

            // Only skip initialization if we're actively resetting
            if (initializationInProgress.current || 
                (context.isInitialized && context.sdk)) {
                return;
            }

            // Set initializing state
            initializationInProgress.current = true;
            setContext(prev => ({ ...prev, isInitializing: true }));

            try {
                debugLogger.group('SDK Initialization', () => {
                    debugLogger.info('Starting SDK initialization (attempt ' + (retryCount + 1) + ')');
                    
                    // Get cookies for debugging
                    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                        const [key, value] = cookie.trim().split('=');
                        acc[key] = value;
                        return acc;
                    }, {} as Record<string, string>);
                    
                    debugLogger.debug('Current cookies:', cookies);
                });

                const instance = await getPersonalizeInstance();

                if (instance) {
                    debugLogger.success('SDK initialized successfully');
                    
                    setContext({
                        sdk: instance,
                        isInitialized: true,
                        isInitializing: false,
                        error: null,
                        resetState
                    });
                    setRetryCount(0);

                    // Force a refresh if we're on post-authentication page
                    if (window.location.pathname === '/post-authentication') {
                        debugLogger.info('Post-authentication detected, forcing refresh');
                        window.location.href = '/';
                    }
                } else {
                    throw new Error("Failed to initialize Personalize SDK");
                }
            } catch (error) {
                debugLogger.error('Initialization error:', error);
                
                // If we haven't exceeded max retries and we're not on an auth page, retry
                if (retryCount < MAX_RETRIES && 
                    !window.location.pathname.includes('/api/auth/') && 
                    !window.location.pathname.includes('/post-authentication')) {
                    debugLogger.info('Scheduling retry in 1 second...');
                    setRetryCount(prev => prev + 1);
                    setContext(prev => ({ ...prev, isInitializing: false }));
                    setTimeout(() => {
                        initializationInProgress.current = false;
                        setContext(prev => ({ ...prev, isInitialized: false }));
                    }, 1000);
                } else {
                    debugLogger.error('Max retries exceeded or on auth page');
                    setContext({
                        sdk: null,
                        isInitialized: false,
                        isInitializing: false,
                        error: error instanceof Error ? error : new Error(String(error)),
                        resetState
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