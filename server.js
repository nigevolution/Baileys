import './server.js'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) startBot()
    }

    if (connection === 'open') {
      console.log('🟢 BOLT CONECTADO AO WHATSAPP')
    }
  })

  // Anti-link
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || !msg.key.remoteJid.endsWith('@g.us')) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (text.includes('http://') || text.includes('https://')) {
      await sock.sendMessage(msg.key.remoteJid, { text: '🚫 LINKS NÃO SÃO PERMITIDOS' })
      await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], 'remove')
    }
  })
}

startBot()
