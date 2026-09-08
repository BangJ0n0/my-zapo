// plugins/tools/qwa.js

import { getRawMessageById } from '../../db/rawMessage.js'
import { getContactByJid } from '../../db/contacts.js'
import { normalizeJid } from '../../handler.js'
import { reviveBase64Fields } from '../../lib/utils.js'
import { extractStillFrame } from '../../lib/sticker-convert.js'

const API_URL = 'https://qwa.eeq.my.id/api/generate'

function getMessageContent(message) {
  if (!message || typeof message !== 'object') return null

  const type =
    Object.keys(message).find(key => key.endsWith('Message')) ||
    (message.conversation ? 'conversation' : null)

  if (!type) return null

  const content = type === 'conversation' ? message : message[type]
  const text =
    type === 'conversation'
      ? message.conversation
      : content?.text || content?.caption || ''

  return { type, content, text }
}

function getQuotedContent(rawMessage) {
  const content = getMessageContent(rawMessage)
  const context = content?.content?.contextInfo

  if (!context?.quotedMessage) return null

  return {
    message: context.quotedMessage,
    jid: normalizeJid(context.participant)
  }
}

function getContactData(contact, fallbackJid) {
  const jid = contact?.jid || fallbackJid || ''
  const number = contact?.phoneNumber || jid.split('@')[0]

  return {
    name: contact?.pushName || 'Unknown',
    number: number ? `+${number.replace(/^\+/, '')}` : '',
    jid
  }
}

function getContactForJid(jid, fallbackPushName) {
  const row = getContactByJid(jid)

  if (!row) {
    return jid
      ? {
          jid,
          pushName: fallbackPushName || 'Unknown',
          phoneNumber: jid.endsWith('@lid') ? '' : jid.split('@')[0]
        }
      : null
  }

  return {
    jid: row.pn_jid || jid,
    pushName: fallbackPushName || row.push_name || 'Unknown',
    phoneNumber: row.pn_jid?.split('@')[0] || ''
  }
}

function formatMentions(message, text) {
  if (!text) return ''

  const content = getMessageContent(message)
  const mentionedJid = content?.content?.contextInfo?.mentionedJid || []

  if (!mentionedJid.length) return text

  return text.replace(/@(\d+)/g, (match, number) => {
    const mentionJid = mentionedJid.find(jid => {
      const normalized = normalizeJid(jid)
      return normalized?.split('@')[0] === number
    })

    if (!mentionJid) return match

    const contact = getContactByJid(normalizeJid(mentionJid))
    const pushName = contact?.push_name?.trim()

    return pushName ? `[@${pushName.replace(/^@+/, '')}]` : match
  })
}

function getDisplayText(message, includePreviewMetadata = false) {
  const content = getMessageContent(message)
  if (!content) return ''

  const { title, description } = content.content || {}
  const text = content.text || ''

  if (!includePreviewMetadata || (!title && !description)) {
    if (text) return text

    if (content.type === 'imageMessage' || content.content?.jpegThumbnail) {
      return '[Foto]'
    }

    if (content.type.endsWith('Message')) {
      const typeLabels = {
        videoMessage: 'Video',
        audioMessage: 'Audio',
        documentMessage: 'Dokumen',
        stickerMessage: 'Stiker',
        locationMessage: 'Lokasi',
        contactMessage: 'Kontak'
      }

      const label =
        typeLabels[content.type] || content.type.replace(/Message$/, '')

      return `[${label}]`
    }

    return ''
  }

  return (
    [title, description ? `> ${description}` : '', text]
      .filter(Boolean)
      .join('\n') || '[Foto]'
  )
}

function toDataUrl(buffer, mimetype) {
  if (!buffer?.length) return ''

  return (
    `data:${mimetype || 'image/jpeg'};base64,` +
    Buffer.from(buffer).toString('base64')
  )
}

function normalizeLong(value) {
  if (typeof value === 'number' || value == null) return value
  if (typeof value.toNumber === 'function') return value.toNumber()
  if (typeof value.low !== 'number' || typeof value.high !== 'number') return value

  return (value.low >>> 0) + (value.high >>> 0) * 0x100000000
}

async function downloadMedia(message, download) {
  const parsed = getMessageContent(message)
  const content = parsed?.content

  if (!parsed || !content) return null

  const downloadMessage = {
    ...message,
    [parsed.type]: {
      ...content,
      fileLength: normalizeLong(content.fileLength),
      mediaKeyTimestamp: normalizeLong(content.mediaKeyTimestamp)
    }
  }

  try {
    const buffer = await download(downloadMessage)
    return buffer?.length ? buffer : null
  } catch {
    return null
  }
}

async function getStickerImageData(message, download) {
  const parsed = getMessageContent(message)
  if (parsed?.type !== 'stickerMessage') return ''

  const buffer = await downloadMedia(message, download)
  if (!buffer) return ''

  try {
    const frame = await extractStillFrame(buffer)
    return toDataUrl(frame, 'image/webp')
  } catch {
    return ''
  }
}

async function getImageData(message, download, sock) {
  const parsed = getMessageContent(message)
  const content = parsed?.content

  if (!content) return ''

  if (parsed.type === 'stickerMessage') {
    return getStickerImageData(message, download)
  }

  const isImage = parsed.type === 'imageMessage'
  const isLinkPreview =
    parsed.type === 'extendedTextMessage' && content.jpegThumbnail

  if (!isImage && !isLinkPreview) return ''

  const hasThumbnailMetadata = Boolean(
    content.thumbnailDirectPath && content.mediaKey
  )

  const hasMediaMetadata = Boolean(
    content.directPath && content.mediaKey && content.fileEncSha256
  )

  if (hasThumbnailMetadata) {
    try {
      const result = await sock.downloadThumbnail({
        thumbnailDirectPath: content.thumbnailDirectPath,
        mediaKey: content.mediaKey,
        thumbnailSha256: content.thumbnailSha256,
        thumbnailEncSha256: content.thumbnailEncSha256
      })

      if (result?.buffer?.length) {
        return toDataUrl(result.buffer, result.mimetype || 'image/jpeg')
      }
    } catch {}

    return toDataUrl(content.jpegThumbnail, 'image/jpeg')
  }

  if (!content.mimetype?.startsWith('image/')) {
    return toDataUrl(content.jpegThumbnail, 'image/jpeg')
  }

  if (hasMediaMetadata) {
    const buffer = await downloadMedia(message, download)
    if (buffer?.length) return toDataUrl(buffer, content.mimetype)
  }

  return toDataUrl(content.jpegThumbnail, content.mimetype)
}

async function getProfileUrl(sock, jid) {
  if (!jid) return ''

  try {
    return (await sock.profile.getProfilePicture(jid, 'image'))?.url || ''
  } catch {
    return ''
  }
}

function buildMessageData(message, contact, fallbackJid, includePreviewMetadata = false) {
  const sender = getContactData(contact, fallbackJid)
  const text = getDisplayText(message, includePreviewMetadata)

  return {
    sender,
    message: formatMentions(message, text)
  }
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
    sender,
    contact: getContactForJid(sender)
  }
}

export default {
  command: 'qwa',
  alias: ['quotedwa', 'waquoted'],
  category: 'tools',
  description: `> Membuat gambar percakapan WhatsApp.

Cara penggunaan:
> Reply pesan lalu ketik .qwa`,
  help: '(reply / reaction 🖼️)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    const isReaction = m.isReactionCommand === true
    const target = isReaction ? getReactionTarget(m) : m.quoted

    if (!target) {
      return m.reply(
        'Format salah.\n\n' +
          '*Cara Penggunaan:*\n' +
          `> Reply pesan lalu ketik \( ${m.prefix} \)${m.command}`
      )
    }

    if (!target.full) {
      return m.reply('Data pesan target tidak tersedia.')
    }

    const targetId = target.id || target.key?.id
    const stored = targetId ? getRawMessageById(targetId) : null
    const rawMessage = stored?.raw?.message || target.full
    const nested = getQuotedContent(rawMessage)

    const targetContact = target.contact || getContactForJid(target.sender)
    const main = buildMessageData(target.full, targetContact, target.sender, true)

    if (!main.message) {
      return m.reply(
        'Pesan target tidak memiliki data yang bisa dibuat menjadi gambar.'
      )
    }

    const nestedJid = nested?.jid
    const nestedContact = nested ? getContactForJid(nestedJid) : null
    const nestedData = nested
      ? buildMessageData(nested.message, nestedContact, nestedJid, false)
      : null

    const senderAvatar = await getProfileUrl(sock, main.sender.jid)

    const download = source =>
      sock.message.downloadBytes(reviveBase64Fields(source))

    const senderImage = await getImageData(target.full, download, sock)
    const quotedImage = nested
      ? await getImageData(nested.message, download, sock)
      : ''

    const payload = {
      sender_name: main.sender.name,
      sender_number: main.sender.number,
      sender_avatar: senderAvatar,
      sender_image: senderImage,
      message: main.message,
      time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      background: true
    }

    if (nestedData) {
      payload.quoted = {
        name: nestedData.sender.name,
        number: nestedData.sender.number,
        message: nestedData.message,
        image: quotedImage
      }
    }

    let response

    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      return m.reply(`Gagal terhubung ke API QWA: ${err.message}`)
    }

    if (!response.ok) {
      return m.reply(`API QWA mengembalikan error (${response.status}).`)
    }

    try {
      const image = Buffer.from(await response.arrayBuffer())

      return m.reply({
        type: 'image',
        media: image,
        mimetype: response.headers.get('content-type') || 'image/png',
        caption: '✅ QWA berhasil dibuat.'
      })
    } catch (err) {
      return m.reply(`Gagal membaca hasil gambar QWA: ${err.message}`)
    }
  }
}