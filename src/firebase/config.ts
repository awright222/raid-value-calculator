// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Removed getAuth import to prevent configuration errors

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdwybw1EHUs2ORUtijXd_-XDiwH6SJTN0",
  authDomain: "raid-value-calculator.firebaseapp.com",
  projectId: "raid-value-calculator",
  storageBucket: "raid-value-calculator.firebasestorage.app",
  messagingSenderId: "224424479019",
  appId: "1:224424479019:web:2b8671d17f690e4ed69d6e",
  measurementId: "G-Z928EBCS3P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
// Removed auth initialization to prevent CONFIGURATION_NOT_FOUND error
// export const auth = getAuth(app);
export default app;
