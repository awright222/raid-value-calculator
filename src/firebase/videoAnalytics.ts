import { db } from './config';
import { collection, addDoc, query, orderBy, limit, getDocs, where, Timestamp, deleteDoc } from 'firebase/firestore';

export interface VideoAnalytics {
  id?: string;
  timestamp: Timestamp;
  sessionId: string;
  event: 'view' | 'play' | 'pause' | 'seek' | 'ended' | 'close';
  currentTime?: number;
  duration?: number;
  watchPercentage?: number;
  userAgent?: string;
  referrer?: string;
}

export interface VideoStats {
  totalViews: number;
  totalPlays: number;
  totalCompletions: number;
  averageWatchTime: number;
  averageWatchPercentage: number;
  completionRate: number;
  recentSessions: VideoSession[];
}

export interface VideoSession {
  sessionId: string;
  timestamp: Timestamp;
  totalWatchTime: number;
  maxWatchPercentage: number;
  events: VideoAnalytics[];
}

// Generate a unique session ID
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Add a simple test log
console.log('[VIDEO ANALYTICS] VideoAnalytics module loaded');
console.warn('[VIDEO ANALYTICS] VideoAnalytics module loaded');

// Track video analytics event
export const trackVideoEvent = async (
  event: VideoAnalytics['event'],
  currentTime?: number,
  duration?: number
): Promise<void> => {
  try {
    console.log('� Video analytics:', event, { currentTime, duration });
    console.warn('[VIDEO ANALYTICS] Attempting to track video event:', event, { currentTime, duration });
    
    // Get or create session ID
    let sessionId = sessionStorage.getItem('video_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('video_session_id', sessionId);
      console.log('[VIDEO ANALYTICS] Created new session ID:', sessionId);
    }

    const watchPercentage = duration && currentTime ? (currentTime / duration) * 100 : undefined;

    const analyticsData: VideoAnalytics = {
      timestamp: Timestamp.now(),
      sessionId,
      event,
      currentTime,
      duration,
      watchPercentage,
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };

    console.log('[VIDEO ANALYTICS] Tracking data:', analyticsData);
    
    const docRef = await addDoc(collection(db, 'video_analytics'), analyticsData);
    console.log('[VIDEO ANALYTICS] Successfully tracked:', event, '(Doc ID:', docRef.id, ')');
    console.warn('[VIDEO ANALYTICS] Successfully tracked:', event, '(Doc ID:', docRef.id, ')');
  } catch (error) {
    console.error('[VIDEO ANALYTICS] Failed to track video analytics:', error);
    console.warn('[VIDEO ANALYTICS] Failed to track video analytics:', error);
    // Log detailed error info
    if (error instanceof Error) {
      console.error('[VIDEO ANALYTICS] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
};

// Get video analytics statistics
export const getVideoStats = async (): Promise<VideoStats> => {
  try {
    console.log('🎬 Fetching video analytics...');
    const analyticsRef = collection(db, 'video_analytics');
    const q = query(analyticsRef, orderBy('timestamp', 'desc'), limit(1000));
    const snapshot = await getDocs(q);
    
    console.log(`🎬 Found ${snapshot.docs.length} analytics records`);
    
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VideoAnalytics[];

    console.log('🎬 Sample events:', events.slice(0, 3));

    // Group events by session
    const sessionMap = new Map<string, VideoAnalytics[]>();
    events.forEach(event => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    });

    // Calculate statistics
    const sessions: VideoSession[] = [];
    let totalViews = 0;
    let totalPlays = 0;
    let totalCompletions = 0;
    let totalWatchTime = 0;
    let totalWatchPercentage = 0;
    let sessionsWithWatchData = 0;

    sessionMap.forEach((sessionEvents, sessionId) => {
      const sortedEvents = sessionEvents.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
      
      const hasView = sortedEvents.some(e => e.event === 'view');
      const hasPlay = sortedEvents.some(e => e.event === 'play');
      const hasEnded = sortedEvents.some(e => e.event === 'ended');
      
      if (hasView) totalViews++;
      if (hasPlay) totalPlays++;
      if (hasEnded) totalCompletions++;

      // Calculate watch time and percentage for this session
      let maxWatchTime = 0;
      let maxWatchPercentage = 0;
      
      sortedEvents.forEach(event => {
        if (event.currentTime !== undefined) {
          maxWatchTime = Math.max(maxWatchTime, event.currentTime);
        }
        if (event.watchPercentage !== undefined) {
          maxWatchPercentage = Math.max(maxWatchPercentage, event.watchPercentage);
        }
      });

      if (maxWatchTime > 0) {
        totalWatchTime += maxWatchTime;
        totalWatchPercentage += maxWatchPercentage;
        sessionsWithWatchData++;
      }

      sessions.push({
        sessionId,
        timestamp: sortedEvents[0].timestamp,
        totalWatchTime: maxWatchTime,
        maxWatchPercentage,
        events: sortedEvents
      });
    });

    const averageWatchTime = sessionsWithWatchData > 0 ? totalWatchTime / sessionsWithWatchData : 0;
    const averageWatchPercentage = sessionsWithWatchData > 0 ? totalWatchPercentage / sessionsWithWatchData : 0;
    const completionRate = totalPlays > 0 ? (totalCompletions / totalPlays) * 100 : 0;

    return {
      totalViews,
      totalPlays,
      totalCompletions,
      averageWatchTime,
      averageWatchPercentage,
      completionRate,
      recentSessions: sessions.slice(0, 10) // Most recent 10 sessions
    };
  } catch (error) {
    console.error('Failed to get video statistics:', error);
    return {
      totalViews: 0,
      totalPlays: 0,
      totalCompletions: 0,
      averageWatchTime: 0,
      averageWatchPercentage: 0,
      completionRate: 0,
      recentSessions: []
    };
  }
};

// Clear old analytics data (optional cleanup function)
export const cleanupOldAnalytics = async (daysToKeep: number = 30): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const analyticsRef = collection(db, 'video_analytics');
    const q = query(analyticsRef, where('timestamp', '<', cutoffTimestamp));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Cleaned up ${snapshot.docs.length} old analytics records`);
  } catch (error) {
    console.error('Failed to cleanup old analytics:', error);
  }
};
