// plugins/owner/crm2.js

import crypto from 'crypto'
import { deepCloneRaw, stripUnsendable, toCode } from '../../lib/rawMessageUtils.js'
import { getRawMessageById } from '../../db/rawMessage.js'
import { normalizeJid } from '../../handler.js'

// Ganti dengan ID grup tujuan hasil ekstraksi (hanya ke sini hasil dikirim saat reaction)
const TARGET_GROUP_ID = '120363420089828580@g.us'

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
  },
  {
    // FIREWALL: Menjinakkan parameter media bug/troll yang tidak valid
    types: [
      'documentMessage', 'imageMessage', 'videoMessage', 'audioMessage',
      'stickerMessage', 'contactMessage', 'contactsArrayMessage'
    ],
    run(message) {
      if (message.fileLength && Number(message.fileLength) > 2000000000) {
        message.fileLength = 50428
      }
      if (message.pageCount && Number(message.pageCount) > 1000) {
        message.pageCount = 1
      }
      if (message.jpegThumbnail && message.jpegThumbnail.length > 100000) {
        delete message.jpegThumbnail
      }
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
  if (subtype === 'catalog_message') {
    return [{ tag: 'biz', attrs: { native_flow_name: 'catalog_message' } }]
  }
  if (subtype === 'order_details') {
    return [{ tag: 'biz', attrs: { native_flow_name: 'order_details' } }]
  }
  if (subtype === 'payment_key_info') {
    return [{
      tag: 'biz',
      attrs: {},
      content: [{
        tag: 'interactive',
        attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { name: 'payment_key_info' } }]
      }]
    }]
  }

  return [{
    tag: 'biz',
    attrs: {},
    content: [{
      tag: 'interactive',
      attrs: { type: 'native_flow', v: '1' },
      content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
    }]
  }]
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
      if (type === 'interactiveMessage') {
        nodes.push(...getInteractiveAdditionalNodes(node))
      } else if (/^pollCreationMessage/i.test(type)) {
        nodes.push({ tag: 'meta', attrs: { polltype: 'creation' } })
      } else if (type === 'eventMessage') {
        nodes.push({ tag: 'meta', attrs: { event_type: 'creation' } })
      } else if (type === 'buttonsMessage' || type === 'templateMessage') {
        nodes.push({
          tag: 'biz',
          attrs: {},
          content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
          }]
        })
      } else if (type === 'productMessage' || type === 'invoiceMessage') {
        nodes.push({ tag: 'biz', attrs: {}, content: [] })
      } else if (type === 'orderMessage') {
        nodes.push({ tag: 'biz', attrs: { native_flow_name: 'order_details' } })
      } else if ([
        'requestPaymentMessage',
        'sendPaymentMessage',
        'declinePaymentRequestMessage',
        'cancelPaymentRequestMessage'
      ].includes(type)) {
        nodes.push({
          tag: 'biz',
          attrs: {},
          content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { name: 'payment_key_info' } }]
          }]
        })
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

function cleanDangerousAttributes(attrs) {
  if (!attrs) return null
  const safeAttrs = { ...attrs }
  const dangerousKeys = [
    'from', 'id', 'participant', 't', 'sts', 'notify',
    'addressing_mode', 'participant_pn', 'type', 'v', 'edit', 'phash',
    'verified_name', 'verified_level'
  ]
  for (const key of dangerousKeys) {
    delete safeAttrs[key]
  }
  return Object.keys(safeAttrs).length > 0 ? safeAttrs : null
}

function getReactionTarget(m) {
  const messageId = m.reaction?.messageId
  if (!messageId) return null

  const stored = getRawMessageById(messageId)
  if (!stored?.raw?.message) return null

  const raw = stored.raw
  const key = raw.key || {}
  const sender = normalizeJid(key.participant || key.remoteJid)

  return {
    id: messageId,
    key,
    raw,
    full: raw.message,
    sender
  }
}

export default {
  command: 'crm2',
  alias: ['relay2'],
  reaction: '🔥',
  category: 'owner',
  description: 'Ekstrak & relay2 struktur mentah pesan (Raw Message) dari DB.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `.crm2 [--snip] [--code --nama <cmd> --alias <a1,a2>]`\n' +
    '> `.relay2 [--snip]`\n' +
    '> Atau react 🔥 pada pesan (= crm2 --snip, hasil hanya dikirim ke grup target)',
  help: '`(reply pesan) [--snip] [--code --nama <cmd>]` / reaction 🔥 (= --snip)',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    const isReaction = m.isReactionCommand === true
    const cmd = m.command
    const silent = isReaction

    let target = null

    if (isReaction) {
      target = getReactionTarget(m)
      if (!target) return
    } else {
      if (!m.quoted) {
        return m.reply('*❌ Reply pesan yang ingin diproses!*')
      }
      target = m.quoted
    }

    // Reaction selalu dianggap sebagai crm2 --snip
    const isSnip = isReaction || args.includes('--snip') || m.text.includes('--snip')
    const isCode = !isReaction && (args.includes('--code') || m.text.includes('--code'))

    let customCmd = ''
    let customAlias = '[]'

    if (!isReaction && cmd === 'crm2' && isCode) {
      const namaIdx = args.findIndex(a => a === '--nama')
      if (namaIdx !== -1 && args[namaIdx + 1] && !args[namaIdx + 1].startsWith('--')) {
        customCmd = args[namaIdx + 1]
      } else {
        return m.reply('*❌ Parameter --nama wajib diisi!*\nFormat: `.crm2 --code --nama stikerku --alias st1,st2`')
      }

      const aliasIdx = args.findIndex(a => a === '--alias')
      if (aliasIdx !== -1 && args[aliasIdx + 1] && !args[aliasIdx + 1].startsWith('--')) {
        const arr = args[aliasIdx + 1].split(',').map(v => `'${v.trim()}'`)
        customAlias = `[${arr.join(', ')}]`
      }
    }

    const quotedId = target.id || target.key?.id || target.stanzaId
    let dbData = null

    if (quotedId) {
      const savedMessage = getRawMessageById(quotedId)
      if (savedMessage?.raw?.message) {
        dbData = {
          message: savedMessage.raw.message,
          nodes: savedMessage.nodes,
          attributes: savedMessage.attributes
        }
      }
    }

    if (!dbData) {
      const fullMsg = target.full || target.raw || target
      const payload = fullMsg?.message || target.message
      if (!payload) {
        if (silent) return
        return m.reply(`*❌ Pesan (ID: ${quotedId || 'Unknown'}) tidak ditemukan di DB maupun memory!*`)
      }
      dbData = { message: payload, nodes: null, attributes: null }
    }

    let messagePayload = deepCloneRaw(dbData.message)
    const type = getType(messagePayload) || 'Unknown'

    const isAiMessage = type === 'botForwardedMessage' || type === 'richResponseMessage'
    let savedBotMetadata = null

    if (isAiMessage && messagePayload.messageContextInfo?.botMetadata) {
      savedBotMetadata = deepCloneRaw(messagePayload.messageContextInfo.botMetadata)
    }

    if (isSnip) {
      messagePayload = stripUnsendable(messagePayload)
      delete messagePayload.messageContextInfo

      if (messagePayload[type]?.contextInfo) {
        delete messagePayload[type].contextInfo.participant
        delete messagePayload[type].contextInfo.stanzaId
        delete messagePayload[type].contextInfo.remoteJid

        if (messagePayload[type].contextInfo.forwardingScore > 1000) {
          messagePayload[type].contextInfo.forwardingScore = 999
        }
        if (messagePayload[type].contextInfo.quotedMessage) {
          delete messagePayload[type].contextInfo.quotedMessage
        }
      }
    }

    if (isAiMessage && savedBotMetadata) {
      messagePayload.messageContextInfo = messagePayload.messageContextInfo || {}
      messagePayload.messageContextInfo.botMetadata = savedBotMetadata
      messagePayload.messageContextInfo.deviceListMetadata = messagePayload.messageContextInfo.deviceListMetadata || {}
      messagePayload.messageContextInfo.deviceListMetadataVersion = 2
    }

    const relayOptions = walkTree(messagePayload)
    if (dbData.nodes) relayOptions.customNodes = dbData.nodes

    const safeAttrs = cleanDangerousAttributes(dbData.attributes)
    if (safeAttrs) {
      relayOptions.additionalAttributes = safeAttrs
    }

    if (isAiMessage) {
      relayOptions.additionalAttributes = {
        ...(relayOptions.additionalAttributes || {}),
        type: 'text'
      }
    }

    const messageStr = toCode(messagePayload, 2, 1)
    const optionsKeysLen = Object.keys(relayOptions).length
    const fullOptionsStr = optionsKeysLen ? toCode(deepCloneRaw(relayOptions), 2, 1) : ''

    let relayCode = `await sock.message.send(\n  m.chat,\n  \( ${messageStr} \)${optionsKeysLen ? `,\n  ${fullOptionsStr}` : ''}\n)`.trim()

    // Mode relay2 (hanya lewat command)
    if (!isReaction && cmd === 'relay2') {
      try {
        await eval(`(async () => { return ${relayCode} })()`)
        return m.reply('Oke ✓')
      } catch (e) {
        return m.reply(`*❌ Gagal me-relay pesan:* ${e.message}`)
      }
    }

    // Mode crm2 / reaction
    if (!silent) {
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})
    }

    if (isCode) {
      relayCode = `export default {
  command: '${customCmd}',
  alias: ${customAlias},
  category: 'custom',
  description: 'Pesan hasil ekstraksi CRM otomatis',

  async execute(m, { sock }) {
    try {
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})

      // --- KODE RELAY ---
      ${relayCode.replace(/\n/g, '\n      ')}

      await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
    } catch (error) {
      console.error('[CRM PLUGIN ERROR]', error?.message || error)
      await m.reply('❌ Gagal mengirim pesan: ' + (error?.message || error))
    }
  }
}`
    }

    let isAiProcessed = false
    try {
      const promptText = `Tugas: Perbaiki kode JavaScript ini agar bisa dijalankan tanpa Syntax Error.
ATURAN MUTLAK:
1. OUTPUT HANYA KODE MURNI. JANGAN gunakan tag markdown (\`\`\`javascript atau \`\`\`).
2. JANGAN mengubah struktur Buffer.from atau isi string base64.
3. JANGAN menambahkan komentar tambahan.

Kode:
${relayCode}`

      const aiResponse = await fetch(
        `https://wudysoft.my.id/api/ai/gemini/v6?prompt=${encodeURIComponent(promptText)}`
      )

      if (aiResponse.ok) {
        const aiJson = await aiResponse.json()
        if (aiJson?.result) {
          let finalCode = aiJson.result
            .replace(/^```(javascript|js)?\n/gm, '')
            .replace(/```$/gm, '')
            .trim()
          if (finalCode.length > 50) {
            relayCode = finalCode
            isAiProcessed = true
          }
        }
      }
    } catch (aiErr) {
      console.log('[CRM] AI Review dilewati karena:', aiErr.message)
    }

    const bodyText =
      `*✅ Ekstraksi CRM Berhasil*\n\n` +
      `> *Tipe:* ${type}\n` +
      `> *Mode:* ${isSnip ? '✂️ Snipped' : '📄 Full Raw'}\n` +
      `> *Format:* ${isCode ? '📦 Full Plugin (Siap Pakai)' : '📝 Snippet Code'}\n` +
      `> *QC AI:* ${isAiProcessed ? '✔️ Lolos Review' : '➖ Dilewati (Raw)'}\n` +
      (isCode ? `> *Command:* .${customCmd}\n` : '') +
      `> *ID:* ${quotedId || 'Memory Object'}\n` +
      (isReaction ? `> *Sumber:* Reaction 🔥 (= --snip)\n` : '') +
      `\n_Silakan unduh file .js di bawah ini._`

    const fileNamePrefix = isCode ? customCmd : 'crm2'
    const fileName = `\( ${fileNamePrefix}_ \)${isSnip ? 'Snipped' : 'Raw'}_${quotedId || crypto.randomBytes(3).toString('hex')}.js`

    try {
      const docPayload = {
        type: 'document',
        media: Buffer.from(relayCode, 'utf-8'),
        mimetype: 'application/javascript',
        fileName,
        caption: bodyText
      }

      if (isReaction) {
        // Hanya kirim ke grup target
        await sock.message.send(TARGET_GROUP_ID, docPayload)
      } else {
        await m.reply(docPayload)
        await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
      }
    } catch (err) {
      if (silent) return
      return m.reply(`*❌ Gagal membuat file dokumen:* ${err.message}`)
    }
  }
}