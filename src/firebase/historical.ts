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

export interface PackDataHistory {
  id?: string;
  packName: string;              // Original display name (e.g., "Weekly Special")
  storageName: string;           // Internal versioned name (e.g., "Weekly Special v2")
  price: number;
  contentHash: string;           // Unique identifier for this specific content combination
  items: Array<{
    itemTypeId: string;
    itemName: string;
    quantity: number;
    estimatedValue: number;
  }>;
  packMetrics: {
    totalValue: number;
    dollarsPerDollar: number;    // Value efficiency ratio
    energyEquivalent: number;    // If applicable
    grade: string;
  };
  versionInfo: {
    versionNumber: number;
    isContentVariant: boolean;
    firstSeenDate: Timestamp;    // When this pack name was first recorded
    lastSeenDate: Timestamp;     // Most recent occurrence
  };
  submissionInfo: {
    submittedBy: string;         // User who submitted (if available)
    submissionMethod: 'admin' | 'community' | 'bulk';
    verificationStatus: 'pending' | 'verified' | 'auto-approved';
  };
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
  period: 'weekly' | 'monthly';
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

export interface PackNameEvolution {
  packName: string;                // Display name (e.g., "Weekly Special")
  totalVersions: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  versions: Array<{
    versionNumber: number;
    storageName: string;           // Internal versioned name
    contentHash: string;
    price: number;
    totalValue: number;
    dollarsPerDollar: number;
    grade: string;
    dateRange: {
      firstSeen: Timestamp;
      lastSeen: Timestamp;
    };
    contentSummary: {
      itemCount: number;
      hasEnergyPots: boolean;
      hasRawEnergy: boolean;
      energyEquivalent: number;
    };
  }>;
  analytics: {
    averageValue: number;
    valueVariance: number;         // How much value fluctuates
    priceStability: number;        // How stable prices are
    contentStability: number;     // How often content changes
    popularityScore: number;      // Based on submission frequency
  };
}

export interface PackMarketIntelligence {
  id?: string;
  packName: string;
  marketCategory: 'energy' | 'mixed' | 'resources' | 'premium';
  competitiveAnalysis: {
    rankInCategory: number;
    totalInCategory: number;
    percentileBetter: number;
    closestCompetitors: Array<{
      packName: string;
      valueDifference: number;
      priceComparison: number;
    }>;
  };
  seasonalTrends: {
    peakSeasons: string[];         // When this pack appears most
    averageFrequency: number;      // Days between appearances
    predictedNextAppearance?: Timestamp;
  };
  recommendationEngine: {
    buyRecommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
    reasoningFactors: string[];
    riskAssessment: 'low' | 'medium' | 'high';
    expectedValueTrend: 'improving' | 'stable' | 'declining';
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Save item price snapshots for historical tracking
export const savePriceSnapshot = async (itemPrices: Record<string, { price: number; packCount: number; totalQuantity: number; itemName: string }>): Promise<void> => {
  try {
    const timestamp = Timestamp.now();
    
    // Limit batch size to prevent overwhelming Firebase
    const maxBatchSize = 10;
    const items = Object.entries(itemPrices);
    
    for (let i = 0; i < items.length; i += maxBatchSize) {
      const batchItems = items.slice(i, i + maxBatchSize);
      const batchPromises = [];
      
      for (const [itemTypeId, data] of batchItems) {
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
        
        batchPromises.push(addDoc(collection(db, 'price_history'), snapshot));
      }
      
      // Execute batch with delay between batches
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid overwhelming Firebase
      if (i + maxBatchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
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
      ...doc.data()
    })) as MarketTrend[];
  } catch (error) {
    console.error('Error getting market trends:', error);
    return [];
  }
};

// Add pack data to historical tracking
export const addPackDataHistory = async (packData: Omit<PackDataHistory, 'id' | 'created_at'>): Promise<void> => {
  try {
    const packWithTimestamp = {
      ...packData,
      created_at: Timestamp.now()
    };
    
    await addDoc(collection(db, 'pack_data_history'), packWithTimestamp);
    console.log('Pack data history added:', packData.packName);
  } catch (error) {
    console.error('Error adding pack data history:', error);
    throw error;
  }
};

// Get pack evolution data for a specific pack name
export const getPackEvolution = async (packName: string): Promise<PackNameEvolution | null> => {
  try {
    const q = query(
      collection(db, 'pack_data_history'),
      where('packName', '==', packName),
      orderBy('created_at', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const packVersions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PackDataHistory[];
    
    // Group and analyze versions
    const versionMap = new Map<number, PackDataHistory[]>();
    packVersions.forEach(pack => {
      const version = pack.versionInfo.versionNumber;
      if (!versionMap.has(version)) {
        versionMap.set(version, []);
      }
      versionMap.get(version)!.push(pack);
    });
    
    const versions = Array.from(versionMap.entries()).map(([versionNumber, packs]) => {
      const firstPack = packs[0];
      const lastPack = packs[packs.length - 1];
      
      return {
        versionNumber,
        storageName: firstPack.storageName,
        contentHash: firstPack.contentHash,
        price: firstPack.price,
        totalValue: firstPack.packMetrics.totalValue,
        dollarsPerDollar: firstPack.packMetrics.dollarsPerDollar,
        grade: firstPack.packMetrics.grade,
        dateRange: {
          firstSeen: firstPack.versionInfo.firstSeenDate,
          lastSeen: lastPack.versionInfo.lastSeenDate
        },
        contentSummary: {
          itemCount: firstPack.items.length,
          hasEnergyPots: firstPack.items.some(item => item.itemName.toLowerCase().includes('energy pot')),
          hasRawEnergy: firstPack.items.some(item => item.itemName.toLowerCase().includes('energy')),
          energyEquivalent: firstPack.packMetrics.energyEquivalent
        }
      };
    });
    
    // Calculate analytics
    const allValues = versions.map(v => v.totalValue);
    const allPrices = versions.map(v => v.price);
    const averageValue = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
    const valueVariance = allValues.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / allValues.length;
    const priceStability = 100 - (Math.max(...allPrices) - Math.min(...allPrices)) / Math.max(...allPrices) * 100;
    
    return {
      packName,
      totalVersions: versions.length,
      firstSeen: packVersions[0].versionInfo.firstSeenDate,
      lastSeen: packVersions[packVersions.length - 1].versionInfo.lastSeenDate,
      versions,
      analytics: {
        averageValue,
        valueVariance,
        priceStability,
        contentStability: (1 - (versions.length - 1) / Math.max(1, packVersions.length)) * 100,
        popularityScore: packVersions.length
      }
    };
  } catch (error) {
    console.error('Error getting pack evolution:', error);
    return null;
  }
};

// Get market intelligence for a pack
export const getPackMarketIntelligence = async (packName: string): Promise<PackMarketIntelligence | null> => {
  try {
    const q = query(
      collection(db, 'pack_market_intelligence'),
      where('packName', '==', packName),
      orderBy('updated_at', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as PackMarketIntelligence;
  } catch (error) {
    console.error('Error getting pack market intelligence:', error);
    return null;
  }
};

// Generate market intelligence for a pack
export const generatePackMarketIntelligence = async (packName: string): Promise<void> => {
  try {
    // Get pack evolution data
    const evolution = await getPackEvolution(packName);
    if (!evolution) return;
    
    // Get recent pack analysis data for comparison
    const recentAnalysisQuery = query(
      collection(db, 'pack_analysis_history'),
      orderBy('analysisDate', 'desc'),
      limit(100)
    );
    
    const analysisSnapshot = await getDocs(recentAnalysisQuery);
    const allPacks = analysisSnapshot.docs.map(doc => doc.data()) as PackAnalysisHistory[];
    
    // Determine category based on content
    const hasEnergyPots = evolution.versions.some(v => v.contentSummary.hasEnergyPots);
    const hasRawEnergy = evolution.versions.some(v => v.contentSummary.hasRawEnergy);
    let marketCategory: 'energy' | 'mixed' | 'resources' | 'premium' = 'mixed';
    
    if (hasEnergyPots || hasRawEnergy) {
      marketCategory = 'energy';
    }
    
    // Get latest version for current analysis
    const latestVersion = evolution.versions[evolution.versions.length - 1];
    
    // Find similar packs for competitive analysis
    const currentEfficiencyRatio = latestVersion.price / latestVersion.contentSummary.energyEquivalent;
    const similarPacks = allPacks
      .filter(pack => pack.packName !== packName)
      .filter(pack => Math.abs(pack.packPrice - latestVersion.price) <= latestVersion.price * 0.5)
      .sort((a, b) => {
        const aEfficiency = a.packPrice / a.totalEnergy;
        const bEfficiency = b.packPrice / b.totalEnergy;
        return Math.abs(aEfficiency - currentEfficiencyRatio) - Math.abs(bEfficiency - currentEfficiencyRatio);
      })
      .slice(0, 3);
    
    const closestCompetitors = similarPacks.map(pack => ({
      packName: pack.packName,
      valueDifference: ((pack.totalEnergy / pack.packPrice) - (latestVersion.contentSummary.energyEquivalent / latestVersion.price)) / (latestVersion.contentSummary.energyEquivalent / latestVersion.price) * 100,
      priceComparison: (pack.packPrice - latestVersion.price) / latestVersion.price * 100
    }));
    
    // Calculate rank in category
    const categoryPacks = allPacks.filter(pack => {
      // Simple category matching - could be enhanced
      return pack.totalEnergy > 0; // Energy category for now
    });
    
    const currentEfficiency = latestVersion.contentSummary.energyEquivalent / latestVersion.price;
    const betterPacks = categoryPacks.filter(pack => (pack.totalEnergy / pack.packPrice) > currentEfficiency);
    const rankInCategory = betterPacks.length + 1;
    const percentileBetter = ((categoryPacks.length - rankInCategory + 1) / categoryPacks.length) * 100;
    
    // Generate recommendation
    let buyRecommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid' = 'hold';
    const reasoningFactors: string[] = [];
    let riskAssessment: 'low' | 'medium' | 'high' = 'medium';
    
    if (percentileBetter >= 80) {
      buyRecommendation = 'strong_buy';
      reasoningFactors.push('Top 20% value in category');
      riskAssessment = 'low';
    } else if (percentileBetter >= 60) {
      buyRecommendation = 'buy';
      reasoningFactors.push('Above average value');
    } else if (percentileBetter >= 40) {
      buyRecommendation = 'hold';
      reasoningFactors.push('Average market value');
    } else {
      buyRecommendation = 'avoid';
      reasoningFactors.push('Below average value');
      riskAssessment = 'high';
    }
    
    if (evolution.analytics.contentStability < 70) {
      reasoningFactors.push('Content changes frequently');
      riskAssessment = 'high';
    }
    
    if (evolution.analytics.priceStability > 90) {
      reasoningFactors.push('Stable pricing history');
      if (riskAssessment === 'high') riskAssessment = 'medium';
    }
    
    const intelligence: Omit<PackMarketIntelligence, 'id'> = {
      packName,
      marketCategory,
      competitiveAnalysis: {
        rankInCategory,
        totalInCategory: categoryPacks.length,
        percentileBetter: Math.round(percentileBetter),
        closestCompetitors
      },
      seasonalTrends: {
        peakSeasons: [], // Could be enhanced with date analysis
        averageFrequency: 30 // Placeholder
      },
      recommendationEngine: {
        buyRecommendation,
        reasoningFactors,
        riskAssessment,
        expectedValueTrend: evolution.analytics.valueVariance < 100 ? 'stable' : 'declining'
      },
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    
    await addDoc(collection(db, 'pack_market_intelligence'), intelligence);
    console.log('Market intelligence generated for:', packName);
  } catch (error) {
    console.error('Error generating pack market intelligence:', error);
    throw error;
  }
};

// Get all pack names with their evolution summaries
export const getAllPackEvolutions = async (): Promise<Array<{
  packName: string;
  totalVersions: number;
  latestGrade: string;
  averageValue: number;
  popularityScore: number;
}>> => {
  try {
    // Get all unique pack names
    const q = query(collection(db, 'pack_data_history'));
    const querySnapshot = await getDocs(q);
    
    const packMap = new Map<string, PackDataHistory[]>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as PackDataHistory;
      if (!packMap.has(data.packName)) {
        packMap.set(data.packName, []);
      }
      packMap.get(data.packName)!.push(data);
    });
    
    return Array.from(packMap.entries()).map(([packName, packs]) => {
      const latestPack = packs.sort((a, b) => b.created_at.seconds - a.created_at.seconds)[0];
      const averageValue = packs.reduce((sum, pack) => sum + pack.packMetrics.totalValue, 0) / packs.length;
      
      return {
        packName,
        totalVersions: new Set(packs.map(p => p.versionInfo.versionNumber)).size,
        latestGrade: latestPack.packMetrics.grade,
        averageValue,
        popularityScore: packs.length
      };
    }).sort((a, b) => b.popularityScore - a.popularityScore);
  } catch (error) {
    console.error('Error getting all pack evolutions:', error);
    return [];
  }
};
