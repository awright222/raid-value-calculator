import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdwybw1EHUs2ORUtijXd_-XDiwH6SJTN0",
  authDomain: "raid-value-calculator.firebaseapp.com",
  projectId: "raid-value-calculator",
  storageBucket: "raid-value-calculator.firebasestorage.app",
  messagingSenderId: "224424479019",
  appId: "1:224424479019:web:2b8671d17f690e4ed69d6e",
  measurementId: "G-Z928EBCS3P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('=== FIREBASE DATA AUDIT ===');

try {
  // Check packs collection
  const packsSnapshot = await getDocs(collection(db, 'packs'));
  console.log(`📦 Packs collection: ${packsSnapshot.docs.length} documents`);
  
  if (packsSnapshot.docs.length > 0) {
    const samplePack = packsSnapshot.docs[0].data();
    console.log('📋 Sample pack structure:');
    console.log(JSON.stringify(samplePack, null, 2));
    
    // Check for common fields
    console.log('\n🔍 Pack data analysis:');
    console.log('- Has items array:', !!samplePack.items);
    console.log('- Has price:', !!samplePack.price);
    console.log('- Has created_at:', !!samplePack.created_at);
    console.log('- Items count:', samplePack.items?.length || 0);
  }
  
  // Check price_history collection
  const priceSnapshot = await getDocs(collection(db, 'price_history'));
  console.log(`\n📈 Price history collection: ${priceSnapshot.docs.length} documents`);
  
  if (priceSnapshot.docs.length > 0) {
    const sampleHistory = priceSnapshot.docs[0].data();
    console.log('📋 Sample price history:');
    console.log(JSON.stringify(sampleHistory, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
