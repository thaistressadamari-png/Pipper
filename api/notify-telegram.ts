/*
  This serverless function is triggered when a new order is created.
  It sends a formatted notification message to a Telegram chat via a bot.
*/
import * as https from "https";
import { Buffer } from "buffer";

// Mimic Vercel's API request/response types for compatibility
interface ApiRequest {
    method?: string;
    body: any;
}

interface ApiResponse {
    setHeader: (key: string, value: any) => void;
    status: (code: number) => {
        json: (data: any) => void;
        end: (message?: string) => void;
    };
}

const formatPrice = (price: number) => (price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

async function sendNewOrderNotification(order: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        throw new Error("Telegram Bot Token or Chat ID are not configured in environment variables.");
    }

    const itemsList = order.items.map((item: any) => `- ${item.quantity}x ${item.name}${item.observations ? ` (${item.observations})` : ''}`).join("\n");

    const address = order.delivery.address;
    const fullAddress = `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood}`;
    
    const customerWhatsapp = `55${order.customer.whatsapp.replace(/\D/g, '')}`;
    const whatsappLink = `https://wa.me/${customerWhatsapp}`;

    const message = `*🔔 NOVO PEDIDO - #${order.orderNumber} 🔔*

Um novo pedido foi realizado no site!

*🗓️ DATA AGENDADA:*
*${formatDisplayDate(order.deliveryDate)}*

---

*👤 CLIENTE*
*Nome:* ${order.customer.name}
*WhatsApp:* ${order.customer.whatsapp}
> [💬 Iniciar conversa no WhatsApp](${whatsappLink})

---

*📦 ITENS DO PEDIDO*
${itemsList}

---

*💰 PAGAMENTO*
*Subtotal:* ${formatPrice(order.total)}
*Método:* ${order.paymentMethod}

---

*🚚 ENDEREÇO DE ENTREGA*
${fullAddress}
*CEP:* ${address.cep}

---

*➡️ PRÓXIMOS PASSOS*
1. Acesse o painel de admin.
2. Calcule a taxa de entrega.
3. Adicione a taxa ao pedido para notificar o cliente.`;

    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
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
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Telegram API request failed with status ${res.statusCode}: ${responseBody}`));
            }
          });
        });

        req.on("error", (error) => { reject(error); });
        req.write(data);
        req.end();
    });
}


export default async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { order } = req.body;
        if (!order || !order.orderNumber) {
             return res.status(400).json({ error: 'Invalid order data provided.' });
        }
        await sendNewOrderNotification(order);
        return res.status(200).json({ message: 'Notification sent successfully.' });
    } catch (error: any) {
        console.error("Error sending Telegram notification:", error);
        return res.status(500).json({ error: 'Failed to send notification.', details: error.message });
    }
}