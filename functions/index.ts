import * as admin from "firebase-admin";

admin.initializeApp();

// A Cloud Function onNewOrder foi removida.
// A notificação de novos pedidos agora é tratada por uma serverless function
// acionada por uma chamada fetch do frontend em `services/menuService.ts`.
// Isso resolve problemas com as restrições de rede do plano Spark do Firebase
// e unifica a lógica de notificação com o sistema funcional de taxa de entrega.
