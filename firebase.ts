import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsOBJdz0lYtn1qQ3U1kXNj9oHMAxQVE44",
  authDomain: "pipper-741b6.firebaseapp.com",
  projectId: "pipper-741b6",
  storageBucket: "pipper-741b6.firebasestorage.app",
  messagingSenderId: "461412313555",
  appId: "1:461412313555:web:c5b9a47c617549ac4f6726",
  measurementId: "G-9GMNY8F27X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };