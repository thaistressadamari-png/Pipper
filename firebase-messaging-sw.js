// Import and configure the Firebase SDK
// It is safe to import these here, as this file is only registered in the browser
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-sw.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsOBJdz0lYtn1qQ3U1kXNj9oHMAxQVE44",
  authDomain: "pipper-741b6.firebaseapp.com",
  projectId: "pipper-741b6",
  storageBucket: "pipper-741b6.firebasestorage.app",
  messagingSenderId: "461412313555",
  appId: "1:461412313555:web:c5b9a47c617549ac4f6726",
  measurementId: "G-9GMNY8F27X"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});