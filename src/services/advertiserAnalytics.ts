// Enhanced Analytics for Advertiser Appeal
// Add these tracking events to increase advertiser value

import { useAnalytics } from '../services/analytics';

// Track high-value user behaviors
export const useAdvancedAdvertiserAnalytics = () => {
  const analytics = useAnalytics();

  const trackHighValueBehavior = (behavior: string, data: Record<string, any>) => {
    analytics.trackEngagement('high_value_behavior', {
      behavior,
      ...data
    });
  };

  return {
    // Premium audience indicators
    trackPremiumPackAnalysis: (priceRange: string) => {
      trackHighValueBehavior('premium_pack_analysis', {
        priceRange,
        category: priceRange.includes('100+') ? 'whale_behavior' : 'premium_interest'
      });
    },

    // Purchase timing analysis
    trackMarketTimingBehavior: (action: string) => {
      trackHighValueBehavior('market_timing', {
        action, // 'trend_analysis', 'best_deals_view', 'price_tracking'
        intent: 'purchase_optimization'
      });
    },

    // Feature depth usage
    trackAdvancedFeatureUsage: (feature: string, depth: 'basic' | 'advanced' | 'expert') => {
      trackHighValueBehavior('feature_mastery', {
        feature,
        depth,
        userType: depth === 'expert' ? 'power_user' : 'casual_user'
      });
    },

    // Community engagement
    trackCommunityContribution: (type: 'pack_submit' | 'data_verification' | 'admin_action') => {
      trackHighValueBehavior('community_engagement', {
        contributionType: type,
        userSegment: 'community_contributor'
      });
    },

    // Spending pattern analysis
    trackSpendingPattern: (pattern: {
      averagePriceRange: string;
      frequencyCategory: 'daily' | 'weekly' | 'monthly' | 'occasional';
      optimizationFocus: 'best_value' | 'premium_quality' | 'energy_efficiency';
    }) => {
      trackHighValueBehavior('spending_pattern', pattern);
    },

    // Cross-session behavior
    trackReturnUserBehavior: (sessionData: {
      returnFrequency: 'daily' | 'weekly' | 'monthly';
      featureStickyness: string[];
      growingUsage: boolean;
    }) => {
      trackHighValueBehavior('return_user_profile', {
        ...sessionData,
        loyaltyScore: sessionData.growingUsage ? 'high' : 'moderate'
      });
    }
  };
};
