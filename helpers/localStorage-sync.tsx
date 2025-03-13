'use client';

/**
 * Helper function to synchronize membership status across components
 * This should be placed in a file at: helpers/localStorage-sync.ts
 */
export function syncMembershipStatus(isSubscribed: boolean) {
    try {
        // Set the isSubscribed value in localStorage
        window.localStorage.setItem('isSubscribed', `${isSubscribed}`);

        // Create and dispatch a custom event so other components know to refresh
        const storageEvent = new Event('storage-updated');
        window.dispatchEvent(storageEvent);

        // Also dispatch a custom event for the personalization SDK
        const personalizeEvent = new Event('personalize-update');
        window.dispatchEvent(personalizeEvent);

        console.log(`[syncMembershipStatus] Updated membership status: ${isSubscribed}`);

        // Create a timestamp to help with cache busting
        const timestamp = new Date().getTime();
        localStorage.setItem('last-update', timestamp.toString());
    } catch (e) {
        console.error('[syncMembershipStatus] Failed to sync membership status:', e);
    }
}