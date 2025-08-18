import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// Firebase Analytics Collection Interface
interface AnalyticsEvent {
  eventType: string;
  data: {
    sessionId: string;
    timestamp: number;
    url?: string;
    region?: string;
    deviceType?: string;
    spendingTier?: string;
    priceRange?: string;
    [key: string]: any;
  };
  storedAt: number;
  serverTimestamp?: any;
}

// Store analytics event in Firebase
export const storeAnalyticsEvent = async (event: AnalyticsEvent): Promise<void> => {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      ...event,
      serverTimestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('Failed to store analytics event to Firebase:', error);
    // Don't throw - analytics should not break the app
  }
};

// Batch store multiple events
export const batchStoreAnalyticsEvents = async (events: AnalyticsEvent[]): Promise<void> => {
  try {
    const promises = events.map(event => storeAnalyticsEvent(event));
    await Promise.all(promises);
  } catch (error) {
    console.warn('Failed to batch store analytics events:', error);
  }
};

// Get analytics events from Firebase
export const getAnalyticsEvents = async (
  daysBack: number = 30,
  eventType?: string
): Promise<AnalyticsEvent[]> => {
  try {
    const eventsRef = collection(db, 'analytics_events');
    const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
    
    let q = query(
      eventsRef,
      where('data.timestamp', '>=', cutoffDate.getTime()),
      orderBy('data.timestamp', 'desc'),
      limit(1000)
    );

    if (eventType) {
      q = query(
        eventsRef,
        where('eventType', '==', eventType),
        where('data.timestamp', '>=', cutoffDate.getTime()),
        orderBy('data.timestamp', 'desc'),
        limit(1000)
      );
    }

    const snapshot = await getDocs(q);
    const events: AnalyticsEvent[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({ 
        id: doc.id, 
        eventType: data.eventType,
        data: data.data,
        storedAt: data.storedAt,
        serverTimestamp: data.serverTimestamp
      } as AnalyticsEvent);
    });

    return events;
  } catch (error) {
    console.warn('Failed to fetch analytics events from Firebase:', error);
    return [];
  }
};

// Sync local analytics to Firebase
export const syncLocalAnalyticsToFirebase = async (): Promise<void> => {
  try {
    const localEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    
    if (localEvents.length === 0) {
      return;
    }

    // Get last synced timestamp
    const lastSynced = parseInt(localStorage.getItem('analytics_last_synced') || '0');
    
    // Filter events to sync (only new ones)
    const eventsToSync = localEvents.filter((event: AnalyticsEvent) => 
      event.storedAt > lastSynced
    );

    if (eventsToSync.length > 0) {
      await batchStoreAnalyticsEvents(eventsToSync);
      
      // Update last synced timestamp
      localStorage.setItem('analytics_last_synced', Date.now().toString());
      
      console.log(`Synced ${eventsToSync.length} analytics events to Firebase`);
    }
  } catch (error) {
    console.warn('Failed to sync local analytics to Firebase:', error);
  }
};

// Combined analytics (Firebase + Local fallback)
export const getCombinedAnalyticsEvents = async (): Promise<AnalyticsEvent[]> => {
  try {
    // Try Firebase first
    const firebaseEvents = await getAnalyticsEvents();
    
    if (firebaseEvents.length > 0) {
      return firebaseEvents;
    }
    
    // Fallback to local storage
    const localEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    return localEvents;
  } catch (error) {
    console.warn('Failed to get combined analytics events:', error);
    
    // Ultimate fallback to local storage
    const localEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    return localEvents;
  }
};
