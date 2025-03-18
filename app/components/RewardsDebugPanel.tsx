'use client';

import { useEffect, useState } from 'react';
import debugLogger from '../utils/debug-logger';

export default function RewardsDebugPanel() {
    const [isDebugEnabled, setIsDebugEnabled] = useState(false);

    useEffect(() => {
        // Example of different logging types
        debugLogger.group('Debug Panel Mounted', () => {
            debugLogger.info('Debug panel initialized');
            debugLogger.debug('Checking debug mode status...');
            
            const enabled = debugLogger.isEnabled();
            setIsDebugEnabled(enabled);
            
            if (enabled) {
                debugLogger.success('Debug mode is enabled');
            } else {
                debugLogger.warning('Debug mode is disabled');
            }
            
            // Example of performance tracking
            debugLogger.time('Initial Load');
            setTimeout(() => {
                debugLogger.timeEnd('Initial Load');
            }, 100);
        });

        // Example of error logging
        try {
            throw new Error('Test error');
        } catch (err) {
            debugLogger.error('Error in debug panel', err);
        }
    }, []);

    if (!isDebugEnabled) return null;

    return (
        <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-2">Debug Panel</h3>
            <div className="space-y-2">
                <button
                    onClick={() => {
                        debugLogger.info('Test log clicked', {
                            timestamp: new Date().toISOString(),
                            randomValue: Math.random()
                        });
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Test Log
                </button>
                
                <button
                    onClick={() => {
                        debugLogger.group('Performance Test', () => {
                            debugLogger.time('Operation');
                            setTimeout(() => {
                                debugLogger.timeEnd('Operation');
                                debugLogger.success('Performance test completed');
                            }, 500);
                        });
                    }}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
                >
                    Test Performance
                </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
                Debug mode is enabled. Check console for logs.
            </div>
        </div>
    );
} 