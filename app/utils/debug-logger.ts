const isDebugEnabled = () => process.env.NEXT_PUBLIC_REWARDS_DEBUG === 'true';
const isBrowser = typeof window !== 'undefined';

// Helper function to create a logger method
const createLogger = (type: string, method: 'log' | 'error' | 'warn' | 'info' | 'debug') => {
  return (...args: any[]) => {
    if (isDebugEnabled()) {
      console[method](`[${type}]`, ...args);
    }
  };
};

const debugLogger = {
  log: createLogger('DEBUG', 'log'),
  error: createLogger('ERROR', 'error'),
  warn: createLogger('WARN', 'warn'),
  warning: createLogger('WARN', 'warn'), // Alias for warn
  info: createLogger('INFO', 'info'),
  debug: createLogger('DEBUG', 'debug'),
  success: createLogger('SUCCESS', 'log'),
  group: (label: string, callback: () => void) => {
    if (!isDebugEnabled()) return;

    if (isBrowser) {
      // Browser environment - use console.group
      console.group(`[GROUP] ${label}`);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      // Server environment - simulate grouping with indentation
      console.log(`\n[GROUP START] ${label}`);
      try {
        callback();
      } finally {
        console.log(`[GROUP END] ${label}\n`);
      }
    }
  },
  groupCollapsed: (label: string, callback: () => void) => {
    if (!isDebugEnabled()) return;

    if (isBrowser) {
      // Browser environment - use console.groupCollapsed
      console.groupCollapsed(`[GROUP] ${label}`);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      // Server environment - simulate grouping with indentation
      console.log(`\n[GROUP START] ${label}`);
      try {
        callback();
      } finally {
        console.log(`[GROUP END] ${label}\n`);
      }
    }
  },
  time: (label: string) => {
    if (isDebugEnabled()) {
      console.time(`[TIME] ${label}`);
    }
  },
  timeEnd: (label: string) => {
    if (isDebugEnabled()) {
      console.timeEnd(`[TIME] ${label}`);
    }
  }
};

export default debugLogger;