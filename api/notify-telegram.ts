import * as https from "https";
import { Buffer } from "buffer";

// Basic types to mimic Vercel/Next.js environment without adding dependencies.
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

async function sendTelegramNotification(order: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        throw new Error("Telegram Bot Token or Chat ID are not configured in environment variables.");
    }

    const now = new Date();
    // Vercel serverless functions run in UTC. Format for São Paulo time (UTC-3).
    const nowInBrazil = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const formattedDateTime = new Intl.DateTimeFormat("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(nowInBrazil).replace(", ", " | ");

    const formatPrice = (price: number) => (price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString + "T00:00:00");
        return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
    };

    const itemsList = order.items.map((item: any) => `* ${item.quantity}x ${item.name} — ${formatPrice(item.price)}`).join("\n");
    const address = order.delivery.address;
    const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}. CEP: ${address.cep}${address.complement ? `, ${address.complement}` : ""}`;

    const messageText = `*Pedido - Pipper Confeitaria*

*Pedido:* \`#${order.orderNumber}\`
${formattedDateTime}

*Nome:*
${order.customer.name}
*Telefone:*
${order.customer.whatsapp}

-----------------------------------

*Itens do Pedido:*
${itemsList}

-----------------------------------

*Data Agendada:* ${formatDate(order.deliveryDate)}

*Endereço:*
${fullAddress}

*Subtotal: ${formatPrice(order.total)}*

*Forma de Pagamento:*
${order.paymentMethod}
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
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Telegram API request failed with status ${res.statusCode}: ${responseBody}`));
            }
          });
        });

        req.on("error", (error) => {
          reject(error);
        });

        req.write(data);
        req.end();
    });
}


export default async function handler(req: ApiRequest, res: ApiResponse) {
    console.log("A função 'notify-telegram' foi acionada.");

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        console.log(`Variáveis de ambiente carregadas: botToken existe = ${!!botToken}, chatId existe = ${!!chatId}`);
        
        const { order } = req.body;
        console.log("Dados do pedido recebidos:", JSON.stringify(order, null, 2));

        if (!order || typeof order.orderNumber === 'undefined') {
             console.error("Dados do pedido inválidos recebidos.");
             return res.status(400).json({ error: 'Dados do pedido inválidos.' });
        }

        await sendTelegramNotification(order);
        console.log(`Notificação para o pedido #${order.orderNumber} enviada com sucesso.`);
        return res.status(200).json({ message: 'Notificação enviada com sucesso.' });
    } catch (error: any) {
        console.error("!!! Erro crítico na função 'notify-telegram':", error);
        return res.status(500).json({ error: 'Falha ao enviar notificação.', details: error.message });
    }
}