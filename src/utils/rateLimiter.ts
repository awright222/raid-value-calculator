// Rate limiting utility to prevent abuse
class RateLimiter {
  private static instance: RateLimiter;
  private operations: Map<string, number[]> = new Map();
  
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }
  
  // Check if operation is allowed based on rate limits
  isAllowed(operationType: string, maxOpsPerMinute: number = 10): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minute in milliseconds
    
    // Get or create operation history for this type
    if (!this.operations.has(operationType)) {
      this.operations.set(operationType, []);
    }
    
    const opHistory = this.operations.get(operationType)!;
    
    // Remove operations older than 1 minute
    const recentOps = opHistory.filter(timestamp => timestamp > oneMinuteAgo);
    this.operations.set(operationType, recentOps);
    
    // Check if we're under the limit
    if (recentOps.length >= maxOpsPerMinute) {
      console.warn(`Rate limit exceeded for ${operationType}: ${recentOps.length}/${maxOpsPerMinute} operations per minute`);
      return false;
    }
    
    // Record this operation
    recentOps.push(now);
    this.operations.set(operationType, recentOps);
    
    return true;
  }
  
  // Get current usage stats
  getUsageStats(): Record<string, { current: number; limit: number; resetIn: number }> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const stats: Record<string, { current: number; limit: number; resetIn: number }> = {};
    
    for (const [opType, history] of this.operations.entries()) {
      const recentOps = history.filter(timestamp => timestamp > oneMinuteAgo);
      const oldestOp = Math.min(...recentOps);
      const resetIn = oldestOp > 0 ? Math.max(0, 60000 - (now - oldestOp)) : 0;
      
      stats[opType] = {
        current: recentOps.length,
        limit: 10, // Default limit
        resetIn: Math.ceil(resetIn / 1000) // Convert to seconds
      };
    }
    
    return stats;
  }
}

// Operation type limits (per minute)
export const RATE_LIMITS = {
  PACK_ANALYSIS: 5,      // 5 pack analyses per minute
  PACK_SUBMISSION: 2,    // 2 pack submissions per minute  
  ANALYTICS_EVENT: 20,   // 20 analytics events per minute
  DATA_FETCH: 30,        // 30 data fetches per minute
  ADMIN_OPERATION: 10    // 10 admin operations per minute
} as const;

export type OperationType = keyof typeof RATE_LIMITS;

// Main rate limiting function
export function checkRateLimit(operation: OperationType): boolean {
  const rateLimiter = RateLimiter.getInstance();
  const limit = RATE_LIMITS[operation];
  
  return rateLimiter.isAllowed(operation, limit);
}

// Show rate limit warning to user
export function showRateLimitWarning(operation: OperationType): void {
  const rateLimiter = RateLimiter.getInstance();
  const stats = rateLimiter.getUsageStats();
  const operationStats = stats[operation];
  
  if (operationStats) {
    const message = `Rate limit reached! You can perform ${RATE_LIMITS[operation]} ${operation.toLowerCase()} operations per minute. Current: ${operationStats.current}/${operationStats.limit}. Try again in ${operationStats.resetIn} seconds.`;
    
    // Show user-friendly error
    alert(message);
    console.warn(message);
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();
