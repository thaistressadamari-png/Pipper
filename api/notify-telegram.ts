
import * as https from "https";
import { Buffer } from "buffer";

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
        throw new Error("Telegram Bot Token or Chat ID not configured.");
    }

    const itemsList = (order.items || []).map((item: any) => {
        let text = `• <b>${item.quantity}x</b> ${escapeHtml(item.name)}`;
        if (item.option) {
            text += ` (<i>${escapeHtml(item.option)}</i>)`;
        }
        
        // Detalhamento das Customizações
        if (item.selectedCustomizations && item.selectedCustomizations.length > 0) {
            item.selectedCustomizations.forEach((group: any) => {
                const opts = group.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ');
                text += `\n   └ <b>${escapeHtml(group.groupName)}:</b> ${escapeHtml(opts)}`;
            });
        }

        if (item.observations) {
            text += `\n   <pre>Obs: ${escapeHtml(item.observations)}</pre>`;
        }
        return text;
    }).join("\n\n");

    const address = order.delivery?.address || {};
    const fullAddress = escapeHtml(`${address.street || ''}, ${address.number || ''}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood || ''}`);
    
    const rawWhatsapp = (order.customer?.whatsapp || '').replace(/\D/g, '');
    const whatsappLink = `https://wa.me/55${rawWhatsapp}`;

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
        inline_keyboard: [[{ text: "🌐 Abrir Painel Admin", url: "https://pipper-psi.vercel.app/" }]],
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
          res.on("end", () => (res.statusCode! >= 200 && res.statusCode! < 300) ? resolve() : reject());
        });
        req.on("error", (error) => reject(error));
        req.write(data);
        req.end();
    });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        await sendNewOrderNotification(req.body.order);
        return res.status(200).json({ message: 'Notification sent successfully.' });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed' });
    }
}
