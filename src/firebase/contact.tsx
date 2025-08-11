import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  where,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

export interface ContactInquiry {
  id?: string;
  type: 'comment' | 'recommendation' | 'advertising' | 'partnership' | 'bug_report';
  subject: string;
  message: string;
  contactEmail: string;
  timestamp: Date;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  userAgent: string;
  url: string;
  adminNotes?: string;
  adminResponseDate?: Date;
}

interface FirestoreContactInquiry {
  type: string;
  subject: string;
  message: string;
  contactEmail: string;
  timestamp: Timestamp;
  status: string;
  userAgent: string;
  url: string;
  adminNotes?: string;
  adminResponseDate?: Timestamp;
}

// Submit a new contact inquiry
export const submitContactInquiry = async (
  inquiryData: Omit<ContactInquiry, 'id'>
): Promise<{ success: boolean; message: string; id?: string }> => {
  try {
    // Validate input
    if (!inquiryData.subject.trim() || !inquiryData.message.trim()) {
      return { success: false, message: 'Subject and message are required' };
    }

    if (inquiryData.message.length > 2000) {
      return { success: false, message: 'Message must be 2000 characters or less' };
    }

    // Convert to Firestore format
    const firestoreData: FirestoreContactInquiry = {
      type: inquiryData.type,
      subject: inquiryData.subject.trim(),
      message: inquiryData.message.trim(),
      contactEmail: inquiryData.contactEmail.trim(),
      timestamp: Timestamp.fromDate(inquiryData.timestamp),
      status: inquiryData.status,
      userAgent: inquiryData.userAgent,
      url: inquiryData.url
    };

    const docRef = await addDoc(collection(db, 'contact_inquiries'), firestoreData);

    return { 
      success: true, 
      message: 'Your inquiry has been submitted successfully! We\'ll review it soon.',
      id: docRef.id
    };

  } catch (error) {
    console.error('Error submitting contact inquiry:', error);
    return { success: false, message: 'Failed to submit inquiry. Please try again.' };
  }
};

// Get all contact inquiries (for admin)
export const getContactInquiries = async (): Promise<ContactInquiry[]> => {
  try {
    const q = query(
      collection(db, 'contact_inquiries'),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const inquiries: ContactInquiry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreContactInquiry;
      inquiries.push({
        id: doc.id,
        type: data.type as ContactInquiry['type'],
        subject: data.subject,
        message: data.message,
        contactEmail: data.contactEmail,
        timestamp: data.timestamp.toDate(),
        status: data.status as ContactInquiry['status'],
        userAgent: data.userAgent,
        url: data.url,
        adminNotes: data.adminNotes,
        adminResponseDate: data.adminResponseDate?.toDate()
      });
    });

    return inquiries;
  } catch (error) {
    console.error('Error fetching contact inquiries:', error);
    throw error;
  }
};

// Update inquiry status (for admin)
export const updateInquiryStatus = async (
  inquiryId: string, 
  status: ContactInquiry['status'],
  adminNotes?: string
): Promise<boolean> => {
  try {
    const updateData: Partial<FirestoreContactInquiry> = {
      status,
      adminResponseDate: Timestamp.fromDate(new Date())
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await updateDoc(doc(db, 'contact_inquiries', inquiryId), updateData);
    return true;
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    return false;
  }
};

// Delete inquiry (for admin)
export const deleteInquiry = async (inquiryId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'contact_inquiries', inquiryId));
    return true;
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    return false;
  }
};

// Get inquiries by status (for admin filtering)
export const getInquiriesByStatus = async (status: ContactInquiry['status']): Promise<ContactInquiry[]> => {
  try {
    const q = query(
      collection(db, 'contact_inquiries'),
      where('status', '==', status),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const inquiries: ContactInquiry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreContactInquiry;
      inquiries.push({
        id: doc.id,
        type: data.type as ContactInquiry['type'],
        subject: data.subject,
        message: data.message,
        contactEmail: data.contactEmail,
        timestamp: data.timestamp.toDate(),
        status: data.status as ContactInquiry['status'],
        userAgent: data.userAgent,
        url: data.url,
        adminNotes: data.adminNotes,
        adminResponseDate: data.adminResponseDate?.toDate()
      });
    });

    return inquiries;
  } catch (error) {
    console.error('Error fetching inquiries by status:', error);
    throw error;
  }
};

// Get inquiry statistics (for admin dashboard)
export const getInquiryStats = async (): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  recentCount: number;
}> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'contact_inquiries'));
    
    const stats = {
      total: 0,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      recentCount: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreContactInquiry;
      
      stats.total++;
      
      // Count by status
      stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
      
      // Count by type
      stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
      
      // Count recent (last 24 hours)
      if (data.timestamp.toDate() > oneDayAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching inquiry stats:', error);
    throw error;
  }
};
