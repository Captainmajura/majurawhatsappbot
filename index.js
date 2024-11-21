const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

// Use a single file for authentication state
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// Start the bot
async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // This prints the QR code to the Heroku logs
    });

    // Save the auth state when changes occur
    sock.ev.on('creds.update', saveState);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];

        // Ignore system messages
        if (!message.message || message.key.fromMe) return;

        const from = message.key.remoteJid;
        const text = message.message.conversation || '';

        if (text.toLowerCase() === 'hi') {
            const name = message.pushName || 'User';
            await sock.sendMessage(from, { text: `Hello, ${name}!` });
        } else {
            await sock.sendMessage(from, { text: `I can only reply to 'Hi' for now.` });
        }
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401; // Reconnect unless logged out
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp');
        }
    });
}

startBot();