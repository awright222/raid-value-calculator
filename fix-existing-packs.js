// Fix existing pack by adding pack_signature
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

// Generate pack signature (simplified version)
function generatePackSignature(pack) {
  const items = pack.items || [];
  const itemsStr = items
    .sort((a, b) => a.itemTypeId.localeCompare(b.itemTypeId))
    .map(item => `${item.itemTypeId}:${item.quantity}`)
    .join(',');
  
  return `${pack.name}|${pack.price}|${pack.energy_pots}|${pack.raw_energy}|${itemsStr}`;
}

async function fixExistingPacks() {
  try {
    console.log('🔧 Fixing existing packs without pack_signature...');
    
    const allDocsQuery = collection(db, 'pending_packs');
    const snapshot = await getDocs(allDocsQuery);
    
    let fixedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      if (!data.pack_signature) {
        console.log(`🔧 Fixing pack: ${data.name} (ID: ${docSnap.id})`);
        
        const signature = generatePackSignature(data);
        
        await updateDoc(doc(db, 'pending_packs', docSnap.id), {
          pack_signature: signature
        });
        
        console.log(`✅ Added signature: ${signature}`);
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} pack(s)`);
    
  } catch (error) {
    console.error('❌ Error fixing packs:', error);
  }
}

fixExistingPacks().then(() => {
  console.log('\n✅ Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
