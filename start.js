import http from 'http'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'

const PORT = process.env.PORT || 3000

// Servidor keep-alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('🟢 BOLT ONLINE')
}).listen(PORT)

console.log('Servidor Bolt ativo na porta', PORT)

// BOT
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) startBot()
    }

    if (connection === 'open') {
      console.log('🟢 BOLT CONECTADO AO WHATSAPP')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || !msg.key.remoteJid.endsWith('@g.us')) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (text.includes('http://') || text.includes('https://')) {
      await sock.sendMessage(msg.key.remoteJid, { text: '🚫 LINKS NÃO SÃO PERMITIDOS AQUI' })
      await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], 'remove')
    }
  })
}

startBot()
