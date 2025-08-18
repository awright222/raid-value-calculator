import { useConsent } from '../context/ConsentContext';
import { checkRateLimit } from '../utils/rateLimiter';

// Privacy-compliant analytics service
class PrivacyAnalytics {
  private sessionId: string;
  private hasConsent: (type: 'essential' | 'analytics' | 'advertising') => boolean;
  private debugMode: boolean = false; // Set to true for debug logging

  constructor(hasConsentFn: (type: 'essential' | 'analytics' | 'advertising') => boolean) {
    this.hasConsent = hasConsentFn;
    
    // Initialize session immediately (don't wait for consent check)
    this.sessionId = this.generateSessionId();
    
    // Only track events if we have consent, but always initialize session
    if (this.hasConsent('analytics')) {
      this.initializeSession();
    }
  }

  private generateSessionId(): string {
    // Check for existing session ID in sessionStorage (persists for browser tab)
    const existingSessionId = sessionStorage.getItem('analytics_session_id');
    const sessionStartTime = sessionStorage.getItem('analytics_session_start');
    
    // If session exists and is less than 30 minutes old, reuse it
    if (existingSessionId && sessionStartTime) {
      const sessionAge = Date.now() - parseInt(sessionStartTime);
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      if (sessionAge < thirtyMinutes) {
        return existingSessionId;
      }
    }
    
    // Generate new session ID
    const newSessionId = 'sess_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    sessionStorage.setItem('analytics_session_id', newSessionId);
    sessionStorage.setItem('analytics_session_start', Date.now().toString());
    
    return newSessionId;
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

    // Track session activity to calculate duration
    this.trackSessionActivity();
    
    // Set up session end tracking
    this.setupSessionEndTracking();
  }

  private trackSessionActivity() {
    // Update session activity timestamp
    sessionStorage.setItem('analytics_session_last_activity', Date.now().toString());
  }

  private setupSessionEndTracking() {
    // Track session activity on user interactions
    const activityEvents = ['click', 'scroll', 'keydown', 'mousemove'];
    
    const throttledActivity = this.throttle(() => {
      this.trackSessionActivity();
    }, 5000); // Only update every 5 seconds to reduce noise

    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, throttledActivity, { passive: true });
    });

    // Track session end on page unload (unreliable but try anyway)
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Track session end on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endSession();
      } else {
        // User came back to tab, update activity
        this.trackSessionActivity();
      }
    });

    // Periodically end stale sessions (every 5 minutes)
    setInterval(() => {
      this.checkAndEndStaleSession();
    }, 5 * 60 * 1000);
  }

  private throttle(func: Function, delay: number) {
    let timeoutId: number;
    let lastExecTime = 0;
    return function(...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(null, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          func.apply(null, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  private checkAndEndStaleSession() {
    const lastActivity = sessionStorage.getItem('analytics_session_last_activity');
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceActivity > fiveMinutes) {
        // Session is stale, end it
        this.endSession();
      }
    }
  }

  private endSession() {
    if (!this.hasConsent('analytics')) return;

    const sessionStart = sessionStorage.getItem('analytics_session_start');
    const lastActivity = sessionStorage.getItem('analytics_session_last_activity');
    
    if (sessionStart && lastActivity) {
      const duration = parseInt(lastActivity) - parseInt(sessionStart);
      
      // Only record session if it's longer than 10 seconds and less than 4 hours
      if (duration > 10000 && duration < (4 * 60 * 60 * 1000)) {
        this.trackEvent('session_end', {
          sessionId: this.sessionId,
          timestamp: Date.now(),
          duration: duration,
          sessionStart: parseInt(sessionStart),
          sessionEnd: parseInt(lastActivity)
        });
      }
    }
  }

  // Track page views
  trackPageView(page: string, additionalData?: Record<string, any>) {
    if (!this.hasConsent('analytics')) return;

    this.trackSessionActivity(); // Update session activity timestamp

    this.trackEvent('page_view', {
      page,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      referrer: document.referrer ? new URL(document.referrer).hostname : 'direct',
      ...additionalData
    });
  }

  // Track pack interactions with advertiser-valuable metrics
  trackPackView(packData: {
    packName: string;
    price: number;
    grade: string;
    energyValue: number;
  }) {
    if (!this.hasConsent('analytics')) return;

    this.trackSessionActivity(); // Update session activity timestamp
    
    const priceRange = this.getPriceRange(packData.price);
    const spendingTier = this.getSpendingTier(packData.price);
    
    this.trackEvent('pack_view', {
      packName: packData.packName,
      priceRange: priceRange,
      spendingTier: spendingTier,
      grade: packData.grade,
      energyValue: Math.round(packData.energyValue),
      valuePerDollar: Math.round((packData.energyValue / packData.price) * 100) / 100,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      deviceType: this.getDeviceType(),
      timeSpentOnSite: this.getTimeSpentOnSite()
    });

    // Also track as engagement for spending interest analysis
    this.trackEvent('user_engagement', {
      sessionId: this.sessionId,
      action: 'pack_analysis',
      priceRange: priceRange,
      packGrade: packData.grade,
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
    if (price < 5) return 'micro';
    if (price < 20) return 'low';
    if (price < 50) return 'medium';
    if (price < 100) return 'high';
    return 'premium';
  }

  // New advertiser-valuable helper methods
  private getSpendingTier(price: number): string {
    if (price < 10) return 'casual_spender';
    if (price < 50) return 'moderate_spender';
    if (price < 100) return 'heavy_spender';
    return 'whale_spender';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private getTimeSpentOnSite(): number {
    const sessionStart = sessionStorage.getItem('analytics_session_start');
    if (sessionStart) {
      return Math.round((Date.now() - parseInt(sessionStart)) / 1000); // seconds
    }
    return 0;
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
      
      if (this.debugMode) {
        console.log(`📊 Analytics: ${eventType}`, anonymizedData);
      }
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
    avgSessionDuration?: number;
    popularPacks: Array<{ name: string; views: number }>;
    peakHours: Array<{ hour: number; activity: number }>;
    regionData?: Array<{ country: string; region: string; users: number }>;
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
        
        const sessionData: Record<string, { start: number; end: number; timezone?: string; duration?: number }> = {};
        const pageViews = events.filter((e: any) => e.eventType === 'page_view');
        const packViews = events.filter((e: any) => e.eventType === 'pack_view');
        const sessionEndEvents = events.filter((e: any) => e.eventType === 'session_end');
        
        // Build session data and calculate durations
        events.forEach((event: any) => {
          if (event.data.sessionId) {
            const sessionId = event.data.sessionId;
            const timestamp = event.data.timestamp;
            
            if (!sessionData[sessionId]) {
              sessionData[sessionId] = { 
                start: timestamp, 
                end: timestamp,
                timezone: event.data.timezone 
              };
            } else {
              sessionData[sessionId].end = Math.max(sessionData[sessionId].end, timestamp);
            }
          }
        });

        // Use actual session durations from session_end events
        sessionEndEvents.forEach((event: any) => {
          const sessionId = event.data.sessionId;
          if (sessionData[sessionId] && event.data.duration) {
            sessionData[sessionId].duration = event.data.duration;
          }
        });

        // Calculate average session duration using actual tracked durations
        const realSessionDurations = sessionEndEvents
          .map((event: any) => event.data.duration)
          .filter((duration: number) => duration > 0 && duration < (60 * 60 * 1000)); // Filter out invalid durations (0 or > 1 hour)
          
        const avgSessionDuration = realSessionDurations.length > 0 
          ? realSessionDurations.reduce((sum: number, duration: number) => sum + duration, 0) / realSessionDurations.length
          : undefined;

        // Only log in debug mode
        if (this.debugMode) {
          console.log('Session analysis:', {
            totalSessions: Object.keys(sessionData).length,
            sessionsWithDuration: realSessionDurations.length,
            avgDuration: avgSessionDuration ? `${Math.round(avgSessionDuration / 1000)}s` : 'N/A'
          });
        }

        // Analyze region data from timezones
        const regionCounts: Record<string, number> = {};
        Object.values(sessionData).forEach((session) => {
          if (session.timezone) {
            // Extract region from timezone (e.g., "America/New_York" -> "America")
            const region = session.timezone.split('/')[0] || 'Unknown';
            regionCounts[region] = (regionCounts[region] || 0) + 1;
          }
        });

        const regionData = Object.entries(regionCounts)
          .map(([region, users]) => ({ 
            country: region, 
            region: region, 
            users 
          }))
          .sort((a, b) => b.users - a.users);

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
          uniqueUsers: Object.keys(sessionData).length,
          totalVisits: pageViews.length,
          avgSessionDuration,
          popularPacks,
          peakHours,
          regionData,
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
          avgSessionDuration: undefined,
          popularPacks: [],
          peakHours: [],
          regionData: [],
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
