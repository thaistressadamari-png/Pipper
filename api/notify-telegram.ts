
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
    try {
        const date = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
    } catch (e) {
        return dateString;
    }
}

// Helper to escape HTML special characters for Telegram HTML mode
const escapeHtml = (unsafe: string) => {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

async function sendNewOrderNotification(order: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        throw new Error("Telegram Bot Token or Chat ID are not configured in environment variables.");
    }

    const itemsList = (order.items || []).map((item: any) => {
        let text = `• <b>${item.quantity}x</b> ${escapeHtml(item.name)}`;
        if (item.option) {
            text += ` (<i>${escapeHtml(item.option)}</i>)`;
        }
        if (item.observations) {
            text += `\n  <pre>Obs: ${escapeHtml(item.observations)}</pre>`;
        }
        return text;
    }).join("\n");

    const address = order.delivery?.address || {};
    const fullAddress = escapeHtml(`${address.street || ''}, ${address.number || ''}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood || ''}`);
    
    const rawWhatsapp = (order.customer?.whatsapp || '').replace(/\D/g, '');
    const customerWhatsapp = `55${rawWhatsapp}`;
    const whatsappLink = `https://wa.me/${customerWhatsapp}`;

    const message = `<b>🔔 NOVO PEDIDO - #${order.orderNumber} 🔔</b>

<b>🗓️ DATA AGENDADA:</b>
<b>${formatDisplayDate(order.deliveryDate)}</b>

---

<b>👤 CLIENTE</b>
<b>Nome:</b> ${escapeHtml(order.customer?.name)}
<b>WhatsApp:</b> ${escapeHtml(order.customer?.whatsapp)}
<a href="${whatsappLink}">💬 Iniciar conversa no WhatsApp</a>

---

<b>📦 ITENS DO PEDIDO</b>
${itemsList}

---

<b>💰 PAGAMENTO</b>
<b>Subtotal:</b> ${formatPrice(order.total)}
<b>Método:</b> ${escapeHtml(order.paymentMethod)}

---

<b>🚚 ENDEREÇO DE ENTREGA</b>
${fullAddress}
<b>CEP:</b> ${escapeHtml(address.cep)}`;

    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🌐 Abrir Painel Admin",
              url: "https://pipper-psi.vercel.app/", // Certifique-se que esta URL está correta
            },
          ],
        ],
      },
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
