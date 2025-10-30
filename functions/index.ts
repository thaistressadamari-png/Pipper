// Fix: Import onDocumentCreated from firebase-functions/v2/firestore for v2 trigger syntax
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as https from "https";
// Fix: Import Buffer to resolve TypeScript type error for Node.js environment.
import { Buffer } from "buffer";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

// Fix: Updated function to use Firebase Functions v2 syntax (onDocumentCreated)
export const onNewOrder = onDocumentCreated({
  document: "orders/{orderId}",
  region: "southamerica-east1",
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const order = snapshot.data();
    const orderId = event.params.orderId;

    // Executa as duas tarefas de notificação em paralelo para maior eficiência
    const promises = [
        sendPushNotification(order, orderId),
        sendTelegramNotification(order),
    ];

    await Promise.all(promises);
  });

// Função auxiliar para Notificações Push (Navegador)
async function sendPushNotification(order: admin.firestore.DocumentData, orderId: string) {
    const subscriptionsSnapshot = await db.collection("pushSubscriptions").get();
    if (subscriptionsSnapshot.empty) {
        console.log("Nenhuma assinatura push encontrada para FCM.");
        return;
    }

    const tokens: string[] = [];
    subscriptionsSnapshot.forEach((doc) => {
        const token = doc.data().token;
        if (token) {
            tokens.push(token);
        }
    });

    if (tokens.length === 0) {
        console.log("Nenhum token FCM válido encontrado.");
        return;
    }

    // Fix: Updated payload to use the modern 'notification' and 'webpush' structure for sendMulticast
    const message: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
            title: "Novo Pedido Recebido!",
            body: `Pedido #${order.orderNumber} de ${order.customer.name}`,
            imageUrl: "https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0",
        },
        webpush: {
            notification: {
                tag: `new-order-${orderId}`,
                icon: "https://ugc.production.linktr.ee/fecf1c45-dcf7-4775-8db7-251ba55caa85_Prancheta-1.png?io=true&size=avatar-v3_0",
            },
        },
    };

    try {
        // Fix: Replaced deprecated sendToDevice with sendMulticast
        const response = await fcm.sendMulticast(message);
        console.log("Mensagem FCM enviada com sucesso:", `${response.successCount} sucessos, ${response.failureCount} falhas.`);

        // Fix: Updated error handling logic for sendMulticast response
        if (response.failureCount > 0) {
            const tokensToRemove: Promise<any>[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    console.error("Falha ao enviar notificação FCM para", tokens[idx], error);
                    if (
                        error.code === "messaging/invalid-registration-token" ||
                        error.code === "messaging/registration-token-not-registered"
                    ) {
                        tokensToRemove.push(subscriptionsSnapshot.docs[idx].ref.delete());
                    }
                }
            });
            await Promise.all(tokensToRemove);
        }
    } catch (error) {
        console.error("Erro ao enviar mensagem FCM:", error);
    }
}

// Função auxiliar para Notificações do Telegram
async function sendTelegramNotification(order: admin.firestore.DocumentData) {
    // --- CONFIGURAÇÃO DO TELEGRAM ---
    const botToken = "8042156037:AAFhtCLGKEhdeGY8RTnw4br1u1hw6T7ox2c";
    // O Chat ID foi extraído da sua resposta da API do Telegram.
    const chatId = "-1003239268231";
    // ------------------------------------

    // Fix: This condition was causing a TypeScript error because `chatId` is a constant
    // and the comparison to "YOUR_CHAT_ID" would always be false. The check is
    // updated to ensure both configuration values are present.
    if (!chatId || !botToken) {
      console.log("Token do Bot do Telegram ou Chat ID não estão configurados. Pulando notificação do Telegram.");
      return;
    }

    const formatPrice = (price: number) => price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatDate = (dateString: string) => {
        const date = new Date(dateString + "T00:00:00");
        return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
    };

    const itemsList = order.items.map((item: any) => `  - ${item.quantity}x ${item.name}`).join("\n");
    const address = order.delivery.address;
    const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}. CEP: ${address.cep}${address.complement ? `, ${address.complement}` : ""}`;

    const messageText = `*🎉 Novo Pedido Recebido!*

*Pedido:* \`#${order.orderNumber}\`

*Cliente:*
  - *Nome:* ${order.customer.name}
  - *WhatsApp:* \`${order.customer.whatsapp}\`

*Entrega:*
  - *Data:* ${formatDate(order.deliveryDate)}
  - *Endereço:* ${fullAddress}

*Itens:*
${itemsList}

*Total:*
  - *Valor:* *${formatPrice(order.total)}*
  - *Pagamento:* ${order.paymentMethod}
`;

    const data = JSON.stringify({
      chat_id: chatId,
      text: messageText,
      parse_mode: "Markdown",
    });

    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    return new Promise<void>((resolve, reject) => {
        const req = https.request(options, (res) => {
          let responseBody = "";
          res.on("data", (chunk) => { responseBody += chunk; });
          res.on("end", () => {
            console.log("Resposta da API do Telegram:", responseBody);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Falha na requisição à API do Telegram com status ${res.statusCode}: ${responseBody}`));
            }
          });
        });

        req.on("error", (error) => {
          console.error("Erro ao enviar mensagem para o Telegram:", error);
          reject(error);
        });

        req.write(data);
        req.end();
    });
}
