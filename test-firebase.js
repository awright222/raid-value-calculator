// Simple Firebase test
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBm4fgrpz5iKzD8R_EG_ZUKwUMkzCj6iGg",
  authDomain: "raid-value-calculator.firebaseapp.com",
  projectId: "raid-value-calculator",
  storageBucket: "raid-value-calculator.firebasestorage.app",
  messagingSenderId: "570005473653",
  appId: "1:570005473653:web:9d885e7e7b71f7cdb4dbda"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebase() {
  try {
    console.log('Testing Firebase connection...');
    
    // Check packs collection
    const packsSnapshot = await getDocs(collection(db, 'packs'));
    console.log(`✅ Packs collection: ${packsSnapshot.docs.length} documents`);
    
    if (packsSnapshot.docs.length > 0) {
      console.log('Sample pack data:');
      const sample = packsSnapshot.docs[0].data();
      console.log(JSON.stringify(sample, null, 2));
    }
    
    // Check price_history collection
    const priceSnapshot = await getDocs(collection(db, 'price_history'));
    console.log(`✅ Price history collection: ${priceSnapshot.docs.length} documents`);
    
    if (priceSnapshot.docs.length > 0) {
      console.log('Sample price history:');
      const sample = priceSnapshot.docs[0].data();
      console.log(JSON.stringify(sample, null, 2));
    }
    
    if (packsSnapshot.docs.length === 0 && priceSnapshot.docs.length === 0) {
      console.log('❌ No data found in either collection');
    }
    
  } catch (error) {
    console.error('❌ Firebase error:', error);
  }
}

testFirebase();
