// Este service worker é necessário para que a API de Notificações
// do navegador funcione corretamente, mesmo que as notificações
// sejam disparadas apenas pela aba aberta do painel de administração.

// Import e configure o Firebase SDK
// It is safe to import these here, as this file is only registered in the browser
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js";

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

// Com o plano Spark (gratuito), não há backend (Cloud Functions) para enviar
// mensagens em background. Portanto, o listener 'onBackgroundMessage'
// não será acionado. As notificações serão geradas apenas pela
// lógica dentro da aplicação quando a aba do admin estiver aberta.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Esta lógica foca na janela do cliente se ela já estiver aberta.
  // Se não, abre uma nova. Isso é útil para levar o admin
  // direto para a ação ao clicar na notificação.
  event.waitUntil(clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then((clientList) => {
    // Verifica se já existe uma janela aberta com a URL do aplicativo
    for (const client of clientList) {
      if (client.url === self.location.origin + '/' && 'focus' in client) {
        return client.focus();
      }
    }
    // Se nenhum cliente for encontrado, abre uma nova aba/janela
    if (clients.openWindow) {
      // Você pode personalizar esta URL para um link direto para a página de admin/pedidos
      // se a sua aplicação suportar (ex: '/admin/orders')
      return clients.openWindow('/');
    }
  }));
});