const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

let client = null;
let isReady = false;

function initWhatsApp() {
  console.log("\n[whatsapp] Initializing WhatsApp Client...");
  
  // Puppeteer options
  const puppeteerOptions = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ]
  };

  // Try to use local Google Chrome to bypass large chromium downloads and speed up startup
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  for (const path of chromePaths) {
    if (fs.existsSync(path)) {
      puppeteerOptions.executablePath = path;
      console.log(`[whatsapp] Found local Chrome at: ${path}`);
      break;
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: puppeteerOptions
  });

  client.on("qr", (qr) => {
    console.log("\n=====================================================================");
    console.log("[whatsapp] 📲 Scan this QR code with your phone's WhatsApp Linked Devices:");
    console.log("=====================================================================\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    isReady = true;
    console.log("\n=====================================================================");
    console.log("[whatsapp] 🎉 WhatsApp Client is READY and authenticated!");
    console.log("=====================================================================\n");
  });

  client.on("auth_failure", (msg) => {
    console.error("[whatsapp] Authentication failure:", msg);
  });

  client.on("disconnected", (reason) => {
    isReady = false;
    console.warn("[whatsapp] Client was logged out or disconnected:", reason);
  });

  client.initialize().catch((err) => {
    console.error("[whatsapp] Initialization error:", err.message);
  });
}

async function sendWhatsAppMessage(toPhone, message) {
  if (!client || !isReady) {
    console.warn("[whatsapp] Cannot send message: Client is not authenticated/ready.");
    return { success: false, error: "WhatsApp client not ready" };
  }

  try {
    // Format phone number to WhatsApp format (e.g., "8801712345678@c.us")
    // Bangladesh code: 88
    let cleaned = String(toPhone).replace(/\D/g, "");
    if (!cleaned) {
      return { success: false, error: "Empty phone number" };
    }
    
    if (cleaned.startsWith("01")) {
      cleaned = "88" + cleaned;
    } else if (cleaned.startsWith("1") && cleaned.length === 10) {
      cleaned = "880" + cleaned;
    }
    
    let chatId = `${cleaned}@c.us`;
    try {
      console.log(`[whatsapp] Resolving number ID for ${cleaned}...`);
      const numberId = await client.getNumberId(cleaned);
      if (numberId && numberId._serialized) {
        chatId = numberId._serialized;
        console.log(`[whatsapp] Resolved chat ID to: ${chatId}`);
      } else {
        console.log(`[whatsapp] Could not resolve LID/JID for ${cleaned}, falling back to default ${chatId}`);
      }
    } catch (resolveErr) {
      console.warn(`[whatsapp] Warning: failed to resolve number ID:`, resolveErr.message);
    }

    console.log(`[whatsapp] Sending message to ${chatId}...`);
    const response = await client.sendMessage(chatId, message);
    console.log(`[whatsapp] Message sent successfully! Msg ID: ${response.id.id}`);
    return { success: true, messageId: response.id.id };
  } catch (err) {
    console.error("[whatsapp] Failed to send message:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { initWhatsApp, sendWhatsAppMessage, isReady: () => isReady };
