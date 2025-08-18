import { useEffect } from 'react';
import { useAnalytics } from '../services/analytics';

interface AnalyticsTrackerProps {
  activeTab: string;
}

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ activeTab }) => {
  const analytics = useAnalytics();

  useEffect(() => {
    console.log('📈 AnalyticsTracker: Initial page load, tab:', activeTab);
    // Track initial page load
    analytics.trackPageView('app_load', {
      initialTab: activeTab
    });
  }, []);

  useEffect(() => {
    console.log('📈 AnalyticsTracker: Tab changed to:', activeTab);
    // Track tab changes
    analytics.trackPageView(`tab_${activeTab}`, {
      tab: activeTab
    });
    
    analytics.trackEngagement('tab_switch', {
      tab: activeTab
    });
  }, [activeTab]);

  return null; // This component doesn't render anything
};
