// Debug utility for conditional logging
// Set to false for production builds

const DEBUG_MODE = false; // Set to false to disable all debug logs

export const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.warn(...args);
  }
};

export const debugError = (...args: any[]) => {
  // Keep error logs even in production for important issues
  console.error(...args);
};