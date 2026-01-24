
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

// Helper to escape HTML special characters
const escapeHtml = (unsafe: string) => {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

function fixedEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

async function sendDeliveryFeeLinkToTelegram(order: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        throw new Error("Telegram Bot Token or Chat ID are not configured in environment variables.");
    }
    
    const itemsList = (order.items || []).map((item: any) => {
        let text = `- ${item.quantity}x ${item.name}`;
        if (item.option) {
            text += ` (${item.option})`;
        }
        return text;
    }).join("\n");

    let customerMessage = `Olá, ${order.customer?.name}! ✨

Recebemos o seu pedido *#${order.orderNumber}* na Pipper Confeitaria.

*Resumo do seu pedido*
${itemsList}

*Subtotal:* ${formatPrice(order.total)}
*Entrega:* ${formatPrice(order.deliveryFee)}
--------------------
*Total:* *${formatPrice((order.total || 0) + (order.deliveryFee || 0))}*`;

    if (order.paymentLink) {
        customerMessage += `

*Link para pagamento*
${order.paymentLink}`;
    }

    customerMessage += `

Assim que o pagamento for confirmado, preparamos tudo com muito carinho pra você 💙

Qualquer dúvida é só responder por aqui!`;

    const encodedMessage = fixedEncodeURIComponent(customerMessage);
    const rawWhatsapp = (order.customer?.whatsapp || '').replace(/\D/g, '');
    const customerWhatsapp = `55${rawWhatsapp}`; 
    const whatsappLink = `https://wa.me/${customerWhatsapp}?text=${encodedMessage}`;

    // Admin message formatted as HTML
    const adminMessage = `Resumo final pronto para <b>${escapeHtml(order.customer?.name)}</b> (Pedido #${order.orderNumber}).\n\n<a href="${whatsappLink}">➡️ ENVIAR WHATSAPP PARA CLIENTE</a>`;

    const data = JSON.stringify({
      chat_id: chatId,
      text: adminMessage,
      parse_mode: "HTML",
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
        
        await sendDeliveryFeeLinkToTelegram(order);
        
        return res.status(200).json({ message: 'Notification link sent successfully.' });
    } catch (error: any) {
        console.error("Error sending Telegram notification:", error);
        return res.status(500).json({ error: 'Failed to send notification.', details: error.message });
    }
}
