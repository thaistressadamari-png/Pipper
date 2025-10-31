//
// O CONTEÚDO DESTE ARQUIVO FOI COMENTADO E DESATIVADO.
//
// As notificações push do navegador foram removidas do aplicativo.
// Este arquivo é mantido para evitar erros 404 caso navegadores
// antigos ainda tentem acessá-lo, mas ele não tem mais
// funcionalidade ativa.
//

/*
// Import e configure o Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-sw.js";

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === self.location.origin + '/' && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow('/');
    }
  }));
});
*/
