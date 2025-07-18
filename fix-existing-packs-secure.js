// Fix existing pack by adding pack_signature
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Use environment variables instead of hardcoded keys
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generate pack signature (simplified version)
function generatePackSignature(pack) {
  const items = pack.items || [];
  const itemsString = items.map(item => `${item.itemTypeId}:${item.quantity}`).sort().join(',');
  const baseString = `${pack.name}_${pack.price}_${itemsString}`;
  
  // Simple hash function (for production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

async function fixExistingPacks() {
  try {
    console.log('🔄 Fetching existing packs...');
    
    // Get all pending packs
    const pendingPacksRef = collection(db, 'pending_packs');
    const snapshot = await getDocs(pendingPacksRef);
    
    console.log(`📦 Found ${snapshot.size} packs to process`);
    
    let updated = 0;
    
    for (const docSnap of snapshot.docs) {
      const pack = docSnap.data();
      
      // Check if pack_signature is missing or empty
      if (!pack.pack_signature) {
        const signature = generatePackSignature(pack);
        
        console.log(`🔧 Adding signature to pack: ${pack.name} -> ${signature}`);
        
        await updateDoc(doc(db, 'pending_packs', docSnap.id), {
          pack_signature: signature
        });
        
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} packs with signatures`);
    console.log('🎉 Fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing packs:', error);
  }
}

// Run the fix
fixExistingPacks();
