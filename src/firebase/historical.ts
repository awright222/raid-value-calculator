import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  where,
  limit
} from 'firebase/firestore';
import { db } from './config';

export interface PriceSnapshot {
  id?: string;
  itemTypeId: string;
  itemName: string;
  price: number;
  confidence: number; // 0-100 based on pack count and quantity
  packCount: number;
  totalQuantity: number;
  timestamp: Timestamp;
  created_at: Timestamp;
}

export interface PackAnalysisHistory {
  id?: string;
  packName: string;
  packPrice: number;
  totalEnergy: number;
  costPerEnergy: number;
  grade: string;
  betterThanPercent: number;
  totalPacksCompared: number;
  itemBreakdown: Array<{
    itemTypeId: string;
    itemName: string;
    quantity: number;
    estimatedValue: number;
  }>;
  analysisDate: Timestamp;
  created_at: Timestamp;
}

export interface MarketTrend {
  id?: string;
  period: 'daily' | 'weekly' | 'monthly';
  averageGrade: string;
  averageCostPerEnergy: number;
  totalPacksAnalyzed: number;
  bestDeal: {
    packName: string;
    grade: string;
    costPerEnergy: number;
  };
  worstDeal: {
    packName: string;
    grade: string;
    costPerEnergy: number;
  };
  trendDirection: 'improving' | 'declining' | 'stable';
  periodStart: Timestamp;
  periodEnd: Timestamp;
  created_at: Timestamp;
}

// Save item price snapshots for historical tracking
export const savePriceSnapshot = async (itemPrices: Record<string, { price: number; packCount: number; totalQuantity: number; itemName: string }>): Promise<void> => {
  try {
    const batch = [];
    const timestamp = Timestamp.now();
    
    for (const [itemTypeId, data] of Object.entries(itemPrices)) {
      // Calculate confidence score (0-100)
      const confidence = Math.min(100, Math.max(0, 
        (data.packCount * 10) + // 10 points per pack
        (Math.min(data.totalQuantity, 100) * 0.5) // 0.5 points per quantity, capped at 50
      ));
      
      const snapshot: PriceSnapshot = {
        itemTypeId,
        itemName: data.itemName,
        price: data.price,
        confidence,
        packCount: data.packCount,
        totalQuantity: data.totalQuantity,
        timestamp,
        created_at: timestamp
      };
      
      batch.push(addDoc(collection(db, 'price_history'), snapshot));
    }
    
    await Promise.all(batch);
    console.log(`Saved price snapshot for ${Object.keys(itemPrices).length} items`);
  } catch (error) {
    console.error('Error saving price snapshot:', error);
    throw error;
  }
};

// Save pack analysis results for historical comparison
export const savePackAnalysis = async (analysis: Omit<PackAnalysisHistory, 'id' | 'created_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'analysis_history'), {
      ...analysis,
      created_at: Timestamp.now()
    });
    console.log('Saved pack analysis to history:', analysis.packName);
    return docRef.id;
  } catch (error) {
    console.error('Error saving pack analysis:', error);
    throw error;
  }
};

// Get price history for a specific item
export const getItemPriceHistory = async (itemTypeId: string, days: number = 30): Promise<PriceSnapshot[]> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const q = query(
      collection(db, 'price_history'),
      where('itemTypeId', '==', itemTypeId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PriceSnapshot[];
  } catch (error) {
    console.error('Error getting item price history:', error);
    return [];
  }
};

// Get all recent price history across all items
export const getAllPriceHistory = async (days: number = 30): Promise<PriceSnapshot[]> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const q = query(
      collection(db, 'price_history'),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc'),
      limit(100) // Limit to prevent too much data
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PriceSnapshot[];
  } catch (error) {
    console.error('Error getting all price history:', error);
    return [];
  }
};

// Get recent pack analysis history
export const getPackAnalysisHistory = async (days: number = 30): Promise<PackAnalysisHistory[]> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const q = query(
      collection(db, 'analysis_history'),
      where('analysisDate', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('analysisDate', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PackAnalysisHistory[];
  } catch (error) {
    console.error('Error getting pack analysis history:', error);
    return [];
  }
};

// Calculate and save market trends
export const calculateMarketTrends = async (): Promise<void> => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get recent analyses
    const recentAnalyses = await getPackAnalysisHistory(7);
    
    if (recentAnalyses.length === 0) return;
    
    // Calculate trend metrics
    const gradeValues = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
    const avgGradeValue = recentAnalyses.reduce((sum, analysis) => 
      sum + (gradeValues[analysis.grade as keyof typeof gradeValues] || 1), 0) / recentAnalyses.length;
    
    const avgCostPerEnergy = recentAnalyses.reduce((sum, analysis) => 
      sum + analysis.costPerEnergy, 0) / recentAnalyses.length;
    
    // Find best and worst deals
    const sortedByGrade = [...recentAnalyses].sort((a, b) => 
      (gradeValues[b.grade as keyof typeof gradeValues] || 1) - (gradeValues[a.grade as keyof typeof gradeValues] || 1));
    
    const bestDeal = sortedByGrade[0];
    const worstDeal = sortedByGrade[sortedByGrade.length - 1];
    
    // Determine trend direction (compare with previous week)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekAnalyses = await getPackAnalysisHistory(14);
    const previousWeekOnly = previousWeekAnalyses.filter(analysis => 
      analysis.analysisDate.toDate() < weekAgo && analysis.analysisDate.toDate() >= twoWeeksAgo);
    
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (previousWeekOnly.length > 0) {
      const prevAvgGrade = previousWeekOnly.reduce((sum, analysis) => 
        sum + (gradeValues[analysis.grade as keyof typeof gradeValues] || 1), 0) / previousWeekOnly.length;
      
      if (avgGradeValue > prevAvgGrade + 0.2) trendDirection = 'improving';
      else if (avgGradeValue < prevAvgGrade - 0.2) trendDirection = 'declining';
    }
    
    const trend: MarketTrend = {
      period: 'weekly',
      averageGrade: Object.keys(gradeValues)[Math.round(avgGradeValue) - 1] || 'C',
      averageCostPerEnergy: avgCostPerEnergy,
      totalPacksAnalyzed: recentAnalyses.length,
      bestDeal: {
        packName: bestDeal.packName,
        grade: bestDeal.grade,
        costPerEnergy: bestDeal.costPerEnergy
      },
      worstDeal: {
        packName: worstDeal.packName,
        grade: worstDeal.grade,
        costPerEnergy: worstDeal.costPerEnergy
      },
      trendDirection,
      periodStart: Timestamp.fromDate(weekAgo),
      periodEnd: Timestamp.fromDate(now),
      created_at: Timestamp.now()
    };
    
    await addDoc(collection(db, 'market_trends'), trend);
    console.log('Market trend calculated and saved:', trend);
  } catch (error) {
    console.error('Error calculating market trends:', error);
    throw error;
  }
};

// Get latest market trends
export const getLatestMarketTrends = async (limitCount: number = 10): Promise<MarketTrend[]> => {
  try {
    const q = query(
      collection(db, 'market_trends'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MarketTrend[];
  } catch (error) {
    console.error('Error getting market trends:', error);
    return [];
  }
};
