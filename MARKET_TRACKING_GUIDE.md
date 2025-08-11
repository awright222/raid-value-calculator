# 📊 Market Price Tracking System

## Overview

This comprehensive system tracks Raid Shadow Legends pack prices and market trends over time, enabling powerful year-end analysis and multi-year market evolution studies.

## 🎯 Core Features

### Daily Market Snapshots
- **Automated daily captures** of complete market state
- **Item price tracking** with confidence scores and trend analysis
- **Market metrics** including average grades, price ranges, and pack performance
- **Historical comparisons** showing 24-hour price changes

### Long-term Analysis
- **Year-end reporting** capabilities for seasonal trend analysis
- **Multi-year comparisons** to identify market evolution patterns
- **Volatility tracking** to understand price stability
- **Market health scoring** for ecosystem assessment

### Intelligent Triggers
- **Automatic snapshots** when users refresh item values
- **Manual snapshots** via admin panel for immediate data capture
- **Date-aware system** prevents duplicate snapshots on same day
- **Background service** ready for scheduled automation

## 🏗️ Architecture

### Data Structures

#### Daily Market Snapshot
```typescript
interface DailyMarketSnapshot {
  date: string; // YYYY-MM-DD format
  marketMetrics: {
    totalPacksAnalyzed: number;
    averageCostPerEnergy: number;
    gradeDistribution: Record<string, number>;
    priceRanges: { cheapest, mostExpensive, median };
  };
  itemPrices: Array<{
    itemTypeId: string;
    price: number;
    confidence: number;
    priceChange24h?: number; // Percentage change
    trend: 'up' | 'down' | 'stable';
  }>;
  packAnalytics: {
    topPerformingPacks: Array<{
      packName: string;
      grade: string;
      costPerEnergy: number;
    }>;
  };
}
```

#### Future: Weekly & Monthly Reports
- **Weekly summaries** with volatility analysis
- **Monthly reports** with market health scoring
- **Seasonal pattern detection** for recurring trends

### Components

#### MarketTrackingPanel
- **Admin interface** for managing price tracking
- **Statistics dashboard** showing tracking metrics
- **Recent snapshots view** with key market indicators
- **Manual snapshot triggers** for immediate data capture

#### MarketTrackingService
- **Singleton service** managing automated tracking
- **Smart scheduling** to prevent duplicate snapshots
- **Error handling** with fallback mechanisms
- **Status monitoring** for tracking health

## 🚀 Usage Guide

### For Admins

1. **Access the Admin Panel** and navigate to "Price Tracking" tab
2. **Monitor tracking stats** including total snapshots and date range
3. **Create manual snapshots** when needed for special events
4. **Review recent market data** to understand current trends

### For Users

- **Price tracking happens automatically** when you refresh item values
- **No additional action needed** - the system captures market changes
- **Historical data enriches** the Market Trends display

### API Functions

#### Core Functions
```typescript
// Create daily snapshot
const snapshot = await createDailyMarketSnapshot();

// Get historical data
const snapshots = await getMarketSnapshots(startDate, endDate);

// Get item price history
const history = await getItemPriceHistory(itemTypeId, days);

// Get tracking statistics
const stats = await getMarketTrackingStats();
```

#### Service Functions
```typescript
// Check if snapshot needed
const needed = await marketTrackingService.shouldCreateSnapshot();

// Create if needed
const result = await marketTrackingService.createSnapshotIfNeeded();

// Force create snapshot
const result = await marketTrackingService.forceCreateSnapshot();
```

## 📈 Analysis Capabilities

### Current Features
- **Daily price tracking** with trend indicators
- **Market performance metrics** per snapshot
- **Top pack identification** for each day
- **Price change calculations** (24-hour comparisons)

### Planned Enhancements
- **Seasonal pattern recognition** for recurring market cycles
- **Market volatility scoring** to measure price stability
- **Competitive analysis** comparing similar pack types
- **Predictive modeling** for price forecasting

## 🎯 Year-End Analysis Goals

### Data Collection
By running this system throughout the year, you'll accumulate:
- **365 daily snapshots** capturing every market change
- **13,000+ item price points** across all tracked items
- **Complete pack performance history** showing evolution over time
- **Market health metrics** indicating ecosystem trends

### Analysis Opportunities
- **Inflation/deflation trends** in pack pricing
- **Seasonal patterns** (holiday events, game updates)
- **Market maturity indicators** (price stability, grade distribution)
- **Value proposition changes** over time

### Reporting Features (Future)
- **Year-end summary reports** with key insights
- **Multi-year comparisons** for long-term trends
- **Export capabilities** for external analysis
- **Visualization charts** for trend presentation

## 🔧 Technical Details

### Database Schema
- **daily_market_snapshots**: Core snapshot collection
- **market_tracking_status**: System status and metadata
- **price_history**: Legacy price tracking (maintained for compatibility)

### Performance Considerations
- **Batch processing** for large item sets
- **Caching mechanisms** to reduce Firebase reads
- **Efficient querying** with proper indexing
- **Error recovery** for network issues

### Future Scalability
- **Weekly aggregation** for performance optimization
- **Data archiving** for long-term storage efficiency
- **API endpoints** for external integrations
- **Real-time updates** for live market monitoring

## 🎉 Benefits

### For Players
- **Better pack value understanding** with historical context
- **Informed purchasing decisions** based on trend data
- **Market timing insights** for optimal pack purchases

### For Analysis
- **Comprehensive market intelligence** for decision making
- **Trend identification** for strategic planning
- **Data-driven insights** into game economy evolution
- **Historical benchmarking** for performance evaluation

---

## Getting Started

1. **System automatically activates** when users refresh item values
2. **Access admin panel** to monitor tracking progress
3. **Create manual snapshots** as needed for special events
4. **Let the system run** to accumulate valuable historical data

The longer the system runs, the more valuable the insights become! 📊✨
