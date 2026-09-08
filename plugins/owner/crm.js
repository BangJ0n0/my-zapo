import crypto from 'crypto'
import { deepCloneRaw, stripUnsendable, toCode } from '../../lib/rawMessageUtils.js'
import { getRawMessageById } from '../../db/rawMessage.js'

const messageMiddleware = [
  {
    types: [/^pollCreationMessage/i, 'eventMessage'],
    run(message) {
      message.messageContextInfo = message.messageContextInfo || {}
      if (!message.messageContextInfo.messageSecret) {
        message.messageContextInfo.messageSecret = crypto.randomBytes(32).toString('base64')
      }
    }
  },
  {
    types: [
      'interactiveMessage', 'buttonsMessage', 'listMessage', 'templateMessage',
      'productMessage', 'orderMessage', 'invoiceMessage', 'requestPaymentMessage', 
      'sendPaymentMessage', 'declinePaymentRequestMessage', 'cancelPaymentRequestMessage',
      'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension',
      'ephemeralMessage', 'documentWithCaptionMessage', 'albumMessage',
      'botForwardedMessage', 'richResponseMessage' 
    ],
    run(message) {
      message.messageContextInfo = message.messageContextInfo || {}
      message.messageContextInfo.deviceListMetadata = message.messageContextInfo.deviceListMetadata || {}
      message.messageContextInfo.deviceListMetadataVersion = 2
    }
  }
]

function detectInteractiveSubtype(interactiveMsg) {
  const buttons = interactiveMsg?.nativeFlowMessage?.buttons || []
  for (const btn of buttons) {
    const name = btn?.name || ''
    if (name === 'payment_key_info') return 'payment_key_info'
    if (name === 'review_and_pay' || name === 'order_details') return 'order_details'
  }
  const paramsJson = interactiveMsg?.nativeFlowMessage?.messageParamsJson
  if (paramsJson) {
    try {
      const parsed = JSON.parse(paramsJson)
      if (parsed?.catalog_id || parsed?.catalog) return 'catalog_message'
    } catch {}
  }
  return 'mixed'
}

function getInteractiveAdditionalNodes(interactiveMsg) {
  const subtype = detectInteractiveSubtype(interactiveMsg)
  if (subtype === 'catalog_message') return [{ tag: 'biz', attrs: { native_flow_name: 'catalog_message' } }]
  if (subtype === 'order_details') return [{ tag: 'biz', attrs: { native_flow_name: 'order_details' } }]
  if (subtype === 'payment_key_info') return [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { name: 'payment_key_info' } }] }] }]
  
  return [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }]
}

function resolveAdditionalNodes(message) {
  const nodes = []
  const visited = new WeakSet()
  const walk = obj => {
    if (!obj || typeof obj !== 'object') return
    if (visited.has(obj)) return
    visited.add(obj)
    const type = getType(obj)
    
    if (type) {
      const node = obj[type]
      if (type === 'interactiveMessage') nodes.push(...getInteractiveAdditionalNodes(node))
      else if (/^pollCreationMessage/i.test(type)) nodes.push({ tag: 'meta', attrs: { polltype: 'creation' } })
      else if (type === 'eventMessage') nodes.push({ tag: 'meta', attrs: { event_type: 'creation' } })
      else if (type === 'buttonsMessage' || type === 'templateMessage') nodes.push({ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] })
      else if (type === 'productMessage' || type === 'invoiceMessage') nodes.push({ tag: 'biz', attrs: {}, content: [] })
      else if (type === 'orderMessage') nodes.push({ tag: 'biz', attrs: { native_flow_name: 'order_details' } })
      else if (['requestPaymentMessage', 'sendPaymentMessage', 'declinePaymentRequestMessage', 'cancelPaymentRequestMessage'].includes(type)) {
        nodes.push({ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { name: 'payment_key_info' } }] }] })
      }
    }
    
    for (const key in obj) {
      const value = obj[key]
      if (value && typeof value === 'object') walk(value)
    }
  }
  
  walk(message)
  const seen = new Set()
  return nodes.filter(node => {
    const k = JSON.stringify({ tag: node.tag, attrs: node.attrs })
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function walkTree(message) {
  const relayOptions = {}
  const visited = new WeakSet()

  const walk = obj => {
    if (!obj || typeof obj !== 'object') return
    if (visited.has(obj)) return
    visited.add(obj)

    const type = getType(obj)
    if (type && obj[type]) {
      const node = obj[type]
      for (const mw of messageMiddleware) {
        if (mw.types.some(rule => (rule instanceof RegExp ? rule.test(type) : rule === type))) {
          mw.run(node, obj, type)
        }
      }
    }

    for (const key in obj) {
      const value = obj[key]
      if (value && typeof value === 'object') walk(value)
    }
  }

  walk(message)

  const additionalNodes = resolveAdditionalNodes(message)
  if (additionalNodes.length) {
    relayOptions.additionalNodes = additionalNodes
  }

  return relayOptions
}

const getType = obj => {
  if (!obj || typeof obj !== 'object') return null
  return Object.keys(obj).find(k => k.endsWith('Message')) || null
}

export default {
  command: 'crm',
  alias: ['relay'],
  category: 'owner',
  description: 'Ekstrak struktur mentah pesan (Raw Message) dari DB menjadi file .js yang siap dieksekusi.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Reply pesan lalu ketik:`\n> .crm (atau .crm --snip)',
  help: '`(reply pesan) [--snip]`',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const cmd = m.command
    const isSnip = args.includes('--snip') || m.text.includes('--snip')

    if (!m.quoted) return m.reply('*❌ Reply pesan yang ingin diproses!*')

    const quotedId = m.quoted.id || m.quoted.key?.id || m.quoted.stanzaId
    let dbData = null

    if (quotedId) {
      const savedMessage = getRawMessageById(quotedId)
      if (savedMessage && savedMessage.raw && savedMessage.raw.message) {
        dbData = {
          message: savedMessage.raw.message,
          nodes: savedMessage.nodes,
          attributes: savedMessage.attributes
        }
      }
    }

    if (!dbData) {
      let fullMsg = m.quoted.full || m.quoted.raw || m.quoted
      let payload = fullMsg?.message || m.quoted.message
      if (!payload) return m.reply(`*❌ Pesan (ID: ${quotedId || 'Unknown'}) tidak ditemukan di DB maupun memory!*`)
      dbData = { message: payload, nodes: null, attributes: null }
    }

    let messagePayload = deepCloneRaw(dbData.message)
    const type = getType(messagePayload) || 'Unknown'
    
    // Pengecekan AI Message
    const isAiMessage = type === 'botForwardedMessage' || type === 'richResponseMessage'
    let savedBotMetadata = null

    // Simpan metadata krusial AI sebelum kena snip
    if (isAiMessage && messagePayload.messageContextInfo?.botMetadata) {
      savedBotMetadata = deepCloneRaw(messagePayload.messageContextInfo.botMetadata)
    }

    if (isSnip) {
      messagePayload = stripUnsendable(messagePayload)
    }

    // Kembalikan metadata krusial agar pesan AI tidak ditolak
    if (isAiMessage && savedBotMetadata) {
      messagePayload.messageContextInfo = messagePayload.messageContextInfo || {}
      messagePayload.messageContextInfo.botMetadata = savedBotMetadata
      messagePayload.messageContextInfo.deviceListMetadata = messagePayload.messageContextInfo.deviceListMetadata || {}
      messagePayload.messageContextInfo.deviceListMetadataVersion = 2
    }

    const relayOptions = walkTree(messagePayload)
    if (dbData.nodes) relayOptions.customNodes = dbData.nodes
    if (dbData.attributes) relayOptions.additionalAttributes = dbData.attributes

    // WAJIB: Pesan tipe GenAI butuh type="text" di attribute node XML-nya
    if (isAiMessage) {
      relayOptions.additionalAttributes = {
        ...(relayOptions.additionalAttributes || {}),
        type: 'text'
      }
    }

    if (cmd === 'relay') {
      try {
        const relay = await sock.message.send(m.chat, messagePayload, relayOptions)
        return m.reply('```json\n' + JSON.stringify(relay, null, 2) + '\n```')
      } catch (e) {
         return m.reply(`*❌ Gagal me-relay pesan:* ${e.message}`)
      }
    }

    if (cmd === 'crm') {
      const messageStr = toCode(messagePayload, 2, 1)
      const optionsKeysLen = Object.keys(relayOptions).length
      const fullOptionsStr = optionsKeysLen ? toCode(deepCloneRaw(relayOptions), 2, 1) : ''

      const relayCode = `await sock.message.send(\n  m.chat,\n  ${messageStr}${optionsKeysLen ? `,\n  ${fullOptionsStr}` : ''}\n)`.trim()

      const bodyText = `*✅ Ekstraksi CRM Berhasil*\n\n` + 
                       `> *Tipe:* ${type}\n` +
                       `> *Mode:* ${isSnip ? '✂️ Snipped' : '📄 Full Raw'}\n` +
                       `> *ID:* ${quotedId || 'Memory Object'}\n\n` +
                       `_Silakan unduh file .js di bawah ini untuk melihat struktur kodenya._`

      const fileName = `CRM_${isSnip ? 'Snipped' : 'Raw'}_${quotedId || crypto.randomBytes(3).toString('hex')}.js`

      try {
        // Zapo-JS support mengirim dokumen langsung via reply handler ini
        await m.reply({
          type: 'document',
          media: Buffer.from(relayCode, 'utf-8'),
          mimetype: 'application/javascript',
          fileName: fileName,
          caption: bodyText
        })
      } catch (err) {
        return m.reply(`*❌ Gagal membuat file dokumen:* ${err.message}`)
      }
    }
  }
}