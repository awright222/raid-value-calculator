import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  Timestamp,
  limit,
  doc,
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';
import { getAllPacks, type FirebasePack } from './database';
import { calculateItemPrices } from '../services/pricingService';

export interface DailyMarketSnapshot {
  id?: string;
  date: string; // YYYY-MM-DD format for easy querying
  timestamp: Timestamp;
  marketMetrics: {
    totalPacksAnalyzed: number;
    averageCostPerEnergy: number;
    averageGrade: string;
    gradeDistribution: Record<string, number>; // Grade -> count
    priceRanges: {
      cheapest: number;
      mostExpensive: number;
      median: number;
    };
  };
  itemPrices: Array<{
    itemTypeId: string;
    itemName: string;
    price: number;
    confidence: number;
    packCount: number;
    totalQuantity: number;
    priceChange24h?: number; // Percentage change from previous day
    trend: 'up' | 'down' | 'stable';
  }>;
  packAnalytics: {
    newPacksToday: number;
    packVariations: number;
    topPerformingPacks: Array<{
      packName: string;
      grade: string;
      costPerEnergy: number;
      popularity: number; // Submission count
    }>;
  };
  created_at: Timestamp;
}

export interface WeeklyMarketReport {
  id?: string;
  weekStart: string; // YYYY-MM-DD format (Monday)
  weekEnd: string;
  weekNumber: number; // Week of year
  year: number;
  timestamp: Timestamp;
  summary: {
    totalPacksTracked: number;
    newPacksIntroduced: number;
    packVariationsTracked: number;
    marketVolatility: number; // 0-100 score based on price changes
    averageCostPerEnergy: number;
    weeklyChange: {
      costPerEnergy: number; // Percentage change
      direction: 'improving' | 'declining' | 'stable';
    };
  };
  itemTrends: Array<{
    itemTypeId: string;
    itemName: string;
    weeklyAverage: number;
    weeklyChange: number; // Percentage
    volatility: number; // Standard deviation
    highestPrice: number;
    lowestPrice: number;
    trend: 'bullish' | 'bearish' | 'sideways';
  }>;
  created_at: Timestamp;
}

export interface MonthlyMarketAnalysis {
  id?: string;
  month: number; // 1-12
  year: number;
  monthKey: string; // YYYY-MM format
  timestamp: Timestamp;
  marketHealth: {
    overallGrade: string; // A-F grade for the month
    valueScore: number; // 0-100
    competitiveIndex: number; // How competitive the market is
    consumerFriendliness: number; // Lower prices = higher score
  };
  longTermTrends: {
    priceDirection: 'inflation' | 'deflation' | 'stable';
    seasonalPatterns: Array<{
      pattern: string;
      strength: number; // 0-100
      description: string;
    }>;
    yearOverYearComparison?: {
      costPerEnergyChange: number;
      gradeChange: string;
      marketMaturity: 'growing' | 'mature' | 'declining';
    };
  };
  created_at: Timestamp;
}

export interface MarketTrackingStatus {
  id: string;
  lastDailySnapshot: string; // YYYY-MM-DD
  lastWeeklyReport: string; // YYYY-MM-DD (Monday)
  lastMonthlyAnalysis: string; // YYYY-MM
  totalSnapshotCount: number;
  trackingStartDate: string; // YYYY-MM-DD
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Core tracking functions
export const createDailyMarketSnapshot = async (): Promise<DailyMarketSnapshot | null> => {
  try {
    console.log('📊 Creating daily market snapshot...');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Timestamp.now();
    
    // Check if we already have a snapshot for today
    const existingQuery = query(
      collection(db, 'daily_market_snapshots'),
      where('date', '==', today),
      limit(1)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (existingSnapshot.docs.length > 0) {
      console.log('📅 Daily snapshot already exists for', today);
      return {
        id: existingSnapshot.docs[0].id,
        ...existingSnapshot.docs[0].data()
      } as DailyMarketSnapshot;
    }
    
    // Get all current packs
    const packs = await getAllPacks();
    if (packs.length === 0) {
      console.warn('⚠️ No packs available for daily snapshot');
      return null;
    }
    
    // Calculate current item prices
    const pricingResult = await calculateItemPrices();
    const itemStats = pricingResult.itemStats;
    
    // Get yesterday's snapshot for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayQuery = query(
      collection(db, 'daily_market_snapshots'),
      where('date', '==', yesterdayStr),
      limit(1)
    );
    const yesterdaySnapshot = await getDocs(yesterdayQuery);
    const yesterdayPrices = new Map<string, number>();
    
    if (yesterdaySnapshot.docs.length > 0) {
      const yesterdayData = yesterdaySnapshot.docs[0].data() as DailyMarketSnapshot;
      yesterdayData.itemPrices.forEach(item => {
        yesterdayPrices.set(item.itemTypeId, item.price);
      });
    }
    
    // Calculate market metrics
    let totalCostPerEnergy = 0;
    let validPacks = 0;
    const gradeDistribution: Record<string, number> = {};
    const prices: number[] = [];
    
    packs.forEach((pack: FirebasePack) => {
      if (pack.total_energy && pack.total_energy > 0) {
        const costPerEnergy = pack.price / pack.total_energy;
        totalCostPerEnergy += costPerEnergy;
        validPacks++;
        prices.push(costPerEnergy);
        
        // Note: FirebasePack doesn't have grade, we'd need to calculate it
        // For now, we'll estimate based on cost_per_energy if available
        const grade = pack.cost_per_energy ? 
          (pack.cost_per_energy < 0.01 ? 'A' : 
           pack.cost_per_energy < 0.02 ? 'B' : 
           pack.cost_per_energy < 0.03 ? 'C' : 'D') : 'F';
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      }
    });
    
    // Sort prices for median calculation
    prices.sort((a, b) => a - b);
    const median = prices.length > 0 ? 
      (prices.length % 2 === 0 ? 
        (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 :
        prices[Math.floor(prices.length / 2)]) : 0;
    
    // Build item price array with trends
    const itemPriceArray = Object.entries(itemStats).map(([itemTypeId, stats]) => {
      const yesterdayPrice = yesterdayPrices.get(itemTypeId);
      const currentPrice = stats.totalQuantity > 0 ? stats.totalCost / stats.totalQuantity : 0;
      let priceChange24h: number | undefined;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (yesterdayPrice && yesterdayPrice > 0) {
        priceChange24h = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
        if (priceChange24h > 2) trend = 'up';
        else if (priceChange24h < -2) trend = 'down';
      }
      
      return {
        itemTypeId,
        itemName: 'Unknown Item', // We'd need to resolve this from itemTypeId
        price: currentPrice,
        confidence: Math.min(100, Math.max(0, 
          (stats.packCount * 10) + 
          (Math.min(stats.totalQuantity, 100) * 0.5)
        )),
        packCount: stats.packCount,
        totalQuantity: stats.totalQuantity,
        priceChange24h,
        trend
      };
    });
    
    // Find top performing packs
    const topPacks = packs
      .filter((pack: FirebasePack) => pack.total_energy && pack.total_energy > 0)
      .sort((a: FirebasePack, b: FirebasePack) => (a.price / a.total_energy!) - (b.price / b.total_energy!))
      .slice(0, 5)
      .map((pack: FirebasePack) => ({
        packName: pack.name,
        grade: pack.cost_per_energy ? 
          (pack.cost_per_energy < 0.01 ? 'A' : 
           pack.cost_per_energy < 0.02 ? 'B' : 
           pack.cost_per_energy < 0.03 ? 'C' : 'D') : 'F',
        costPerEnergy: pack.total_energy ? pack.price / pack.total_energy : 0,
        popularity: 1 // TODO: Track actual submission counts
      }));
    
    const snapshot: DailyMarketSnapshot = {
      date: today,
      timestamp,
      marketMetrics: {
        totalPacksAnalyzed: validPacks,
        averageCostPerEnergy: validPacks > 0 ? totalCostPerEnergy / validPacks : 0,
        averageGrade: 'C', // TODO: Calculate weighted average grade
        gradeDistribution,
        priceRanges: {
          cheapest: prices.length > 0 ? Math.min(...prices) : 0,
          mostExpensive: prices.length > 0 ? Math.max(...prices) : 0,
          median
        }
      },
      itemPrices: itemPriceArray,
      packAnalytics: {
        newPacksToday: 0, // TODO: Track new packs
        packVariations: packs.length,
        topPerformingPacks: topPacks
      },
      created_at: timestamp
    };
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, 'daily_market_snapshots'), snapshot);
    console.log('✅ Daily market snapshot created with ID:', docRef.id);
    
    // Update tracking status
    await updateMarketTrackingStatus();
    
    return {
      id: docRef.id,
      ...snapshot
    };
    
  } catch (error) {
    console.error('❌ Error creating daily market snapshot:', error);
    return null;
  }
};

// Get market snapshots for a date range
export const getMarketSnapshots = async (startDate: string, endDate?: string): Promise<DailyMarketSnapshot[]> => {
  try {
    const start = Timestamp.fromDate(new Date(startDate));
    const end = endDate ? Timestamp.fromDate(new Date(endDate)) : Timestamp.now();
    
    const q = query(
      collection(db, 'daily_market_snapshots'),
      where('timestamp', '>=', start),
      where('timestamp', '<=', end),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DailyMarketSnapshot[];
    
  } catch (error) {
    console.error('Error getting market snapshots:', error);
    return [];
  }
};

// Get item price history with enhanced data
export const getItemPriceHistory = async (itemTypeId: string, days: number = 30): Promise<Array<{
  date: string;
  price: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  marketRank?: number; // Rank among all items that day
}>> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'daily_market_snapshots'),
      where('date', '>=', cutoffStr),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const history: Array<{
      date: string;
      price: number;
      confidence: number;
      trend: 'up' | 'down' | 'stable';
      marketRank?: number;
    }> = [];
    
    querySnapshot.docs.forEach(doc => {
      const snapshot = doc.data() as DailyMarketSnapshot;
      const itemData = snapshot.itemPrices.find(item => item.itemTypeId === itemTypeId);
      
      if (itemData) {
        // Calculate market rank
        const sortedPrices = [...snapshot.itemPrices]
          .sort((a, b) => a.price - b.price);
        const rank = sortedPrices.findIndex(item => item.itemTypeId === itemTypeId) + 1;
        
        history.push({
          date: snapshot.date,
          price: itemData.price,
          confidence: itemData.confidence,
          trend: itemData.trend,
          marketRank: rank
        });
      }
    });
    
    return history;
    
  } catch (error) {
    console.error('Error getting item price history:', error);
    return [];
  }
};

// Update market tracking status
const updateMarketTrackingStatus = async (): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const statusRef = doc(db, 'market_tracking_status', 'main');
    
    const statusDoc = await getDoc(statusRef);
    const timestamp = Timestamp.now();
    
    if (statusDoc.exists()) {
      await updateDoc(statusRef, {
        lastDailySnapshot: today,
        totalSnapshotCount: (statusDoc.data().totalSnapshotCount || 0) + 1,
        updated_at: timestamp
      });
    } else {
      await setDoc(statusRef, {
        id: 'main',
        lastDailySnapshot: today,
        lastWeeklyReport: '',
        lastMonthlyAnalysis: '',
        totalSnapshotCount: 1,
        trackingStartDate: today,
        created_at: timestamp,
        updated_at: timestamp
      });
    }
  } catch (error) {
    console.error('Error updating market tracking status:', error);
  }
};

// Manual trigger function for immediate snapshot
export const triggerMarketSnapshot = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const snapshot = await createDailyMarketSnapshot();
    
    if (snapshot) {
      return {
        success: true,
        message: `Market snapshot created successfully for ${snapshot.date}`
      };
    } else {
      return {
        success: false,
        message: 'Failed to create market snapshot - no data available'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating market snapshot: ${error}`
    };
  }
};

// Get market tracking statistics
export const getMarketTrackingStats = async (): Promise<{
  totalSnapshots: number;
  dateRange: { start: string; end: string };
  trackingDays: number;
  averagePacksPerDay: number;
} | null> => {
  try {
    const statusRef = doc(db, 'market_tracking_status', 'main');
    const statusDoc = await getDoc(statusRef);
    
    if (!statusDoc.exists()) {
      return null;
    }
    
    const status = statusDoc.data() as MarketTrackingStatus;
    const startDate = new Date(status.trackingStartDate);
    const endDate = new Date(status.lastDailySnapshot);
    const trackingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get recent snapshots to calculate average packs per day
    const recentQuery = query(
      collection(db, 'daily_market_snapshots'),
      orderBy('date', 'desc'),
      limit(30)
    );
    
    const recentSnapshots = await getDocs(recentQuery);
    const totalPacks = recentSnapshots.docs.reduce((sum, doc) => {
      const snapshot = doc.data() as DailyMarketSnapshot;
      return sum + snapshot.marketMetrics.totalPacksAnalyzed;
    }, 0);
    
    const averagePacksPerDay = recentSnapshots.docs.length > 0 ? 
      totalPacks / recentSnapshots.docs.length : 0;
    
    return {
      totalSnapshots: status.totalSnapshotCount,
      dateRange: {
        start: status.trackingStartDate,
        end: status.lastDailySnapshot
      },
      trackingDays,
      averagePacksPerDay
    };
    
  } catch (error) {
    console.error('Error getting market tracking stats:', error);
    return null;
  }
};
