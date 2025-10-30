import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import type { Messaging } from "firebase/messaging";

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

// We will export a function to get messaging, so it's initialized only when needed and supported.
let messagingInstance: Messaging | null = null;
let supportChecked = false;

export async function getMessagingObject(): Promise<Messaging | null> {
    if (supportChecked) {
        return messagingInstance;
    }
    supportChecked = true;
    try {
        if (await isSupported()) {
            messagingInstance = getMessaging(app);
            return messagingInstance;
        } else {
            console.log("Firebase Messaging is not supported in this browser.");
            return null;
        }
    } catch (err) {
        console.error("Error initializing Firebase Messaging", err);
        return null;
    }
}

export { db };