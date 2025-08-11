import { createDailyMarketSnapshot, getMarketTrackingStats } from '../firebase/priceTracking';

/**
 * Automated Market Tracking Service
 * 
 * This service handles automatic daily price snapshots and market analysis.
 * It's designed to run either:
 * 1. As a scheduled background task (if supported by hosting platform)
 * 2. As a manual trigger from admin panel
 * 3. As part of user actions (when users refresh item values)
 */

export class MarketTrackingService {
  private static instance: MarketTrackingService;
  private isRunning = false;
  private lastSnapshotDate: string | null = null;

  private constructor() {
    this.loadLastSnapshotDate();
  }

  static getInstance(): MarketTrackingService {
    if (!MarketTrackingService.instance) {
      MarketTrackingService.instance = new MarketTrackingService();
    }
    return MarketTrackingService.instance;
  }

  private async loadLastSnapshotDate(): Promise<void> {
    try {
      const stats = await getMarketTrackingStats();
      if (stats) {
        this.lastSnapshotDate = stats.dateRange.end;
      }
    } catch (error) {
      console.warn('Failed to load last snapshot date:', error);
    }
  }

  /**
   * Check if we need to create a daily snapshot
   */
  public async shouldCreateSnapshot(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Always create if we have no previous snapshot
    if (!this.lastSnapshotDate) {
      return true;
    }
    
    // Create if it's a new day
    return this.lastSnapshotDate < today;
  }

  /**
   * Create a daily snapshot if needed
   */
  public async createSnapshotIfNeeded(): Promise<{
    created: boolean;
    message: string;
    snapshot?: any;
  }> {
    if (this.isRunning) {
      return {
        created: false,
        message: 'Snapshot creation already in progress'
      };
    }

    try {
      this.isRunning = true;
      
      const shouldCreate = await this.shouldCreateSnapshot();
      if (!shouldCreate) {
        return {
          created: false,
          message: 'Daily snapshot already exists'
        };
      }

      console.log('📊 Creating daily market snapshot...');
      const snapshot = await createDailyMarketSnapshot();
      
      if (snapshot) {
        this.lastSnapshotDate = snapshot.date;
        return {
          created: true,
          message: `Daily snapshot created for ${snapshot.date}`,
          snapshot
        };
      } else {
        return {
          created: false,
          message: 'Failed to create snapshot - insufficient data'
        };
      }
      
    } catch (error) {
      console.error('Error creating daily snapshot:', error);
      return {
        created: false,
        message: `Error creating snapshot: ${error}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Force create a snapshot regardless of date
   */
  public async forceCreateSnapshot(): Promise<{
    created: boolean;
    message: string;
    snapshot?: any;
  }> {
    if (this.isRunning) {
      return {
        created: false,
        message: 'Snapshot creation already in progress'
      };
    }

    try {
      this.isRunning = true;
      
      console.log('📊 Force creating market snapshot...');
      const snapshot = await createDailyMarketSnapshot();
      
      if (snapshot) {
        this.lastSnapshotDate = snapshot.date;
        return {
          created: true,
          message: `Snapshot created for ${snapshot.date}`,
          snapshot
        };
      } else {
        return {
          created: false,
          message: 'Failed to create snapshot - insufficient data'
        };
      }
      
    } catch (error) {
      console.error('Error force creating snapshot:', error);
      return {
        created: false,
        message: `Error creating snapshot: ${error}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get tracking status
   */
  public getStatus(): {
    isRunning: boolean;
    lastSnapshotDate: string | null;
  } {
    return {
      isRunning: this.isRunning,
      lastSnapshotDate: this.lastSnapshotDate
    };
  }
}

// Global instance
export const marketTrackingService = MarketTrackingService.getInstance();

/**
 * Hook for React components to trigger market tracking
 */
export const useMarketTracking = () => {
  const createSnapshotIfNeeded = async () => {
    return await marketTrackingService.createSnapshotIfNeeded();
  };

  const forceCreateSnapshot = async () => {
    return await marketTrackingService.forceCreateSnapshot();
  };

  const getStatus = () => {
    return marketTrackingService.getStatus();
  };

  const checkShouldCreate = async () => {
    return await marketTrackingService.shouldCreateSnapshot();
  };

  return {
    createSnapshotIfNeeded,
    forceCreateSnapshot,
    getStatus,
    checkShouldCreate
  };
};

/**
 * Utility function to integrate with existing components
 * Call this when users refresh item values to ensure we capture market changes
 */
export const maybeCreateMarketSnapshot = async (reason: string = 'user_action'): Promise<void> => {
  try {
    const result = await marketTrackingService.createSnapshotIfNeeded();
    if (result.created) {
      console.log(`📊 Market snapshot created (${reason}):`, result.message);
    }
  } catch (error) {
    console.warn('Failed to create market snapshot:', error);
  }
};
