import { db } from './config';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

// Simple connection test to diagnose Firebase issues
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test 1: Try to read from packs collection
    console.log('📖 Testing read access...');
    const packsRef = collection(db, 'packs');
    const snapshot = await getDocs(packsRef);
    console.log('✅ Read test successful. Found', snapshot.size, 'packs');
    
    // Test 2: Try to write a test document
    console.log('✏️ Testing write access...');
    const testData = {
      test: true,
      timestamp: Timestamp.now(),
      message: 'Connection test'
    };
    
    const testRef = await addDoc(collection(db, 'connection_test'), testData);
    console.log('✅ Write test successful. Document ID:', testRef.id);
    
    return {
      success: true,
      message: 'Firebase connection is working properly',
      packsCount: snapshot.size
    };
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    
    let errorMessage = 'Unknown error';
    let errorCode = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = error.code as string;
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      code: errorCode,
      fullError: error
    };
  }
};
