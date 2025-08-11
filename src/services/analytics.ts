import { useConsent } from '../context/ConsentContext';
import { checkRateLimit } from '../utils/rateLimiter';

// Privacy-compliant analytics service
class PrivacyAnalytics {
  private sessionId: string;
  private hasConsent: (type: 'essential' | 'analytics' | 'advertising') => boolean;

  constructor(hasConsentFn: (type: 'essential' | 'analytics' | 'advertising') => boolean) {
    this.hasConsent = hasConsentFn;
    this.sessionId = this.generateSessionId();
    this.initializeSession();
  }

  private generateSessionId(): string {
    // Generate a random session ID (not tied to user)
    return 'sess_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
  }

  private initializeSession() {
    if (!this.hasConsent('analytics')) return;
    
    this.trackEvent('session_start', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    });
  }

  // Track page views
  trackPageView(page: string, additionalData?: Record<string, any>) {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('page_view', {
      page,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      referrer: document.referrer ? new URL(document.referrer).hostname : 'direct',
      ...additionalData
    });
  }

  // Track pack interactions
  trackPackView(packData: {
    packName: string;
    price: number;
    grade: string;
    energyValue: number;
  }) {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('pack_view', {
      sessionId: this.sessionId,
      packName: packData.packName,
      priceRange: this.getPriceRange(packData.price),
      grade: packData.grade,
      energyRange: this.getEnergyRange(packData.energyValue),
      timestamp: Date.now()
    });
  }

  // Track user engagement
  trackEngagement(action: string, data?: Record<string, any>) {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('user_engagement', {
      sessionId: this.sessionId,
      action,
      timestamp: Date.now(),
      ...data
    });
  }

  // Track conversion events (pack submissions, etc.)
  trackConversion(type: 'pack_submit' | 'calculator_use' | 'admin_action' | 'contact_submit', data?: Record<string, any>) {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('conversion', {
      sessionId: this.sessionId,
      conversionType: type,
      timestamp: Date.now(),
      ...data
    });
  }

  // Anonymize sensitive data
  private getPriceRange(price: number): string {
    if (price < 5) return '$0-5';
    if (price < 10) return '$5-10';
    if (price < 25) return '$10-25';
    if (price < 50) return '$25-50';
    if (price < 100) return '$50-100';
    return '$100+';
  }

  private getEnergyRange(energy: number): string {
    if (energy < 500) return '0-500';
    if (energy < 1000) return '500-1K';
    if (energy < 2500) return '1K-2.5K';
    if (energy < 5000) return '2.5K-5K';
    return '5K+';
  }

  // Send data to analytics service
  private async trackEvent(eventType: string, data: Record<string, any>) {
    try {
      // Rate limiting check
      if (!checkRateLimit('ANALYTICS_EVENT')) {
        console.warn('Analytics rate limit reached, skipping event:', eventType);
        return;
      }

      // Remove any potentially identifying information
      const anonymizedData = this.anonymizeData(data);
      
      // In production, send to your analytics service
      // For now, we'll store locally and batch upload
      this.storeEventLocally(eventType, anonymizedData);
      
      console.log(`📊 Analytics: ${eventType}`, anonymizedData);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  private anonymizeData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };
    
    // Remove any IP addresses, user IDs, etc.
    delete cleaned.ip;
    delete cleaned.userId;
    delete cleaned.email;
    
    // Round timestamps to nearest hour for privacy
    if (cleaned.timestamp) {
      cleaned.timestamp = Math.floor(cleaned.timestamp / 3600000) * 3600000;
    }
    
    return cleaned;
  }

  private storeEventLocally(eventType: string, data: Record<string, any>) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push({
        eventType,
        data,
        storedAt: Date.now()
      });
      
      // Keep only last 100 events to prevent storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to store analytics event locally:', error);
    }
  }

  // Get analytics summary (for admin dashboard)
  getAnalyticsSummary(): Promise<{
    uniqueUsers: number;
    totalVisits: number;
    popularPacks: Array<{ name: string; views: number }>;
    peakHours: Array<{ hour: number; activity: number }>;
    engagementData: {
      totalEngagements: number;
      topEngagements: Array<{ action: string; count: number }>;
      priceRangeInterest: Record<string, number>;
      categoryPreferences: Record<string, number>;
    };
    conversionData: {
      totalConversions: number;
      conversionsByType: Record<string, number>;
      packSubmissions: {
        total: number;
        successRate: number;
        priceRangeDistribution: Record<string, number>;
      };
    };
  }> {
    return new Promise((resolve) => {
      try {
        const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
        
        const sessions = new Set();
        const pageViews = events.filter((e: any) => e.eventType === 'page_view');
        const packViews = events.filter((e: any) => e.eventType === 'pack_view');
        
        // Count unique sessions (proxy for unique users)
        events.forEach((event: any) => {
          if (event.data.sessionId) {
            sessions.add(event.data.sessionId);
          }
        });

        // Analyze pack popularity
        const packCounts: Record<string, number> = {};
        packViews.forEach((event: any) => {
          const packName = event.data.packName;
          packCounts[packName] = (packCounts[packName] || 0) + 1;
        });

        const popularPacks = Object.entries(packCounts)
          .map(([name, views]) => ({ name, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);

        // Analyze peak hours
        const hourCounts: Record<number, number> = {};
        events.forEach((event: any) => {
          if (event.data.timestamp) {
            const hour = new Date(event.data.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        });

        const peakHours = Object.entries(hourCounts)
          .map(([hour, activity]) => ({ hour: parseInt(hour), activity }))
          .sort((a, b) => b.activity - a.activity)
          .slice(0, 6);

        // Analyze engagement data
        const engagements = events.filter((e: any) => e.eventType === 'user_engagement');
        const engagementCounts: Record<string, number> = {};
        const priceRangeInterest: Record<string, number> = {};
        const categoryPreferences: Record<string, number> = {};

        engagements.forEach((event: any) => {
          const action = event.data.action;
          engagementCounts[action] = (engagementCounts[action] || 0) + 1;
          
          if (event.data.priceRange) {
            priceRangeInterest[event.data.priceRange] = (priceRangeInterest[event.data.priceRange] || 0) + 1;
          }
          
          if (event.data.selectedCategory || event.data.newCategory) {
            const category = event.data.selectedCategory || event.data.newCategory;
            categoryPreferences[category] = (categoryPreferences[category] || 0) + 1;
          }
        });

        // Analyze conversion data
        const conversions = events.filter((e: any) => e.eventType === 'conversion');
        const conversionsByType: Record<string, number> = {};
        const packSubmissionPriceRanges: Record<string, number> = {};
        let packSubmissionTotal = 0;
        let packSubmissionSuccess = 0;

        conversions.forEach((event: any) => {
          const type = event.data.conversionType;
          conversionsByType[type] = (conversionsByType[type] || 0) + 1;
          
          if (type === 'pack_submit') {
            packSubmissionTotal++;
            if (event.data.submissionResult === 'success') {
              packSubmissionSuccess++;
            }
            if (event.data.priceRange) {
              packSubmissionPriceRanges[event.data.priceRange] = (packSubmissionPriceRanges[event.data.priceRange] || 0) + 1;
            }
          }
        });

        resolve({
          uniqueUsers: sessions.size,
          totalVisits: pageViews.length,
          popularPacks,
          peakHours,
          engagementData: {
            totalEngagements: engagements.length,
            topEngagements: Object.entries(engagementCounts)
              .map(([action, count]) => ({ action, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10),
            priceRangeInterest,
            categoryPreferences
          },
          conversionData: {
            totalConversions: conversions.length,
            conversionsByType,
            packSubmissions: {
              total: packSubmissionTotal,
              successRate: packSubmissionTotal > 0 ? (packSubmissionSuccess / packSubmissionTotal) * 100 : 0,
              priceRangeDistribution: packSubmissionPriceRanges
            }
          }
        });
      } catch (error) {
        console.warn('Failed to generate analytics summary:', error);
        resolve({
          uniqueUsers: 0,
          totalVisits: 0,
          popularPacks: [],
          peakHours: [],
          engagementData: {
            totalEngagements: 0,
            topEngagements: [],
            priceRangeInterest: {},
            categoryPreferences: {}
          },
          conversionData: {
            totalConversions: 0,
            conversionsByType: {},
            packSubmissions: {
              total: 0,
              successRate: 0,
              priceRangeDistribution: {}
            }
          }
        });
      }
    });
  }
}

// React hook for analytics
export const useAnalytics = () => {
  const { hasConsent } = useConsent();
  
  // Create analytics instance
  const analytics = new PrivacyAnalytics(hasConsent);
  
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackPackView: analytics.trackPackView.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    getAnalyticsSummary: analytics.getAnalyticsSummary.bind(analytics)
  };
};
