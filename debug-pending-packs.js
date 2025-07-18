// Debug script to check pending packs in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAWF14dGP7CJ0SZNM3OmNqDvJeqN8j4_PE",
  authDomain: "raid-value-calculator.firebaseapp.com",
  projectId: "raid-value-calculator",
  storageBucket: "raid-value-calculator.firebasestorage.app",
  messagingSenderId: "334177434488",
  appId: "1:334177434488:web:8b8e9c8efbe7f8e8c9e5ec",
  measurementId: "G-DJ2MP4F0E4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPendingPacks() {
  try {
    console.log('🔍 Checking all documents in pending_packs collection...');
    
    // Get all documents in pending_packs collection
    const allDocsQuery = collection(db, 'pending_packs');
    const allSnapshot = await getDocs(allDocsQuery);
    
    console.log(`📊 Total documents in pending_packs: ${allSnapshot.size}`);
    
    if (allSnapshot.size > 0) {
      console.log('\n📋 All documents:');
      allSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. Document ID: ${doc.id}`);
        console.log(`   Name: ${data.name}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Price: ${data.price}`);
        console.log(`   Submitted at: ${data.submitted_at?.toDate?.() || data.submitted_at}`);
        console.log(`   Has pack_signature: ${!!data.pack_signature}`);
        console.log(`   Raw data:`, JSON.stringify(data, null, 2));
      });
    }
    
    console.log('\n🔍 Checking with admin panel query (status=pending, ordered by submitted_at desc)...');
    
    // Try the same query as admin panel
    const adminQuery = query(
      collection(db, 'pending_packs'),
      where('status', '==', 'pending'),
      orderBy('submitted_at', 'desc')
    );
    
    const adminSnapshot = await getDocs(adminQuery);
    console.log(`📊 Documents matching admin query: ${adminSnapshot.size}`);
    
    if (adminSnapshot.size > 0) {
      console.log('\n📋 Documents matching admin query:');
      adminSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. Document ID: ${doc.id}`);
        console.log(`   Name: ${data.name}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Submitted at: ${data.submitted_at?.toDate?.() || data.submitted_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking pending packs:', error);
    if (error.code === 'failed-precondition') {
      console.error('💡 This might be an index issue. Check Firebase Console for missing indexes.');
    }
  }
}

checkPendingPacks().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
