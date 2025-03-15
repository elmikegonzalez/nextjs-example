"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';

import Personalize from '@contentstack/personalize-edge-sdk';
import { Sdk } from '@contentstack/personalize-edge-sdk/dist/sdk';

let sdkInstance: Sdk | null = null;

export async function getPersonalizeInstance() {
  if (!Personalize.getInitializationStatus()) {
    try {
      const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
      if (!projectUid) {
        console.error("Missing NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID environment variable");
        return null;
      }

      sdkInstance = await Personalize.init(projectUid);
      console.log("[getPersonalizeInstance] Successfully initialized Personalize SDK");
    } catch (error) {
      console.error("[getPersonalizeInstance] Error initializing Personalize SDK:", error);
      return null;
    }
  }
  return sdkInstance;
}

// Create context with proper typing
const PersonalizeContext = createContext<Sdk | null>(null);

// Add proper typing for the provider props
interface PersonalizeProviderProps {
  children: ReactNode;
}

export function PersonalizeProvider({ children }: PersonalizeProviderProps) {
  const [sdk, setSdk] = useState<Sdk | null>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const instance = await getPersonalizeInstance();
        setSdk(instance);
      } catch (error) {
        console.error("Failed to initialize Personalize SDK:", error);
        setSdk(null);
      }
    };

    initializeSDK();
  }, []);

  return (
      <PersonalizeContext.Provider value={sdk}>
        {children}
      </PersonalizeContext.Provider>
  );
}

export function usePersonalize() {
  return useContext(PersonalizeContext);
}