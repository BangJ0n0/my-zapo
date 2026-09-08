import crypto from 'crypto'
import { deepCloneRaw, stripUnsendable, toCode } from '../../lib/rawMessageUtils.js'
import * as rawMessageDb from '../../db/rawMessage.js'

const { getRawMessageById } = rawMessageDb

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
      'interactiveMessage',
      'buttonsMessage',
      'listMessage',
      'templateMessage',
      'productMessage',
      'orderMessage',
      'invoiceMessage',
      'requestPaymentMessage',
      'sendPaymentMessage',
      'declinePaymentRequestMessage',
      'cancelPaymentRequestMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'ephemeralMessage',
      'documentWithCaptionMessage',
      'albumMessage',
      'botForwardedMessage',
      'richResponseMessage'
    ],
    run(message) {
      message.messageContextInfo = message.messageContextInfo || {}
      message.messageContextInfo.deviceListMetadata =
        message.messageContextInfo.deviceListMetadata || {}

      message.messageContextInfo.deviceListMetadataVersion = 2
    }
  },
  {
    types: [
      'documentMessage',
      'imageMessage',
      'videoMessage',
      'audioMessage',
      'stickerMessage',
      'contactMessage',
      'contactsArrayMessage'
    ],
    run(message) {
      if (
        message.fileLength &&
        Number(message.fileLength) > 2000000000
      ) {
        message.fileLength = 50428
      }

      if (
        message.pageCount &&
        Number(message.pageCount) > 1000
      ) {
        message.pageCount = 1
      }

      if (
        message.jpegThumbnail &&
        message.jpegThumbnail.length > 100000
      ) {
        delete message.jpegThumbnail
      }
    }
  }
]

const ALBUM_MEMBER_TYPES = [
  'imageMessage',
  'videoMessage'
]

const WRAPPER_TYPES = [
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'viewOnceMessageV2Extension',
  'documentWithCaptionMessage'
]

function getType(obj) {
  if (!obj || typeof obj !== 'object') {
    return null
  }

  const priority = [
    'albumMessage',
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'audioMessage',
    'stickerMessage',
    'interactiveMessage',
    'buttonsMessage',
    'listMessage',
    'templateMessage',
    'productMessage',
    'orderMessage',
    'invoiceMessage',
    'botForwardedMessage',
    'richResponseMessage',
    'conversation'
  ]

  for (const type of priority) {
    if (obj[type]) {
      return type
    }
  }

  return Object.keys(obj).find(
    key => key.endsWith('Message')
  ) || null
}

function getRecordMessage(record) {
  if (!record) {
    return null
  }

  if (record.raw?.message) {
    return record.raw.message
  }

  if (record.rawMessage?.message) {
    return record.rawMessage.message
  }

  if (record.message?.message) {
    return record.message.message
  }

  if (
    record.message &&
    typeof record.message === 'object'
  ) {
    return record.message
  }

  if (
    record.raw &&
    typeof record.raw === 'object'
  ) {
    return record.raw
  }

  return null
}

function unwrapMessage(message) {
  let current = message
  const visited = new WeakSet()

  while (
    current &&
    typeof current === 'object'
  ) {
    if (visited.has(current)) {
      break
    }

    visited.add(current)

    const type = getType(current)

    if (
      !type ||
      !WRAPPER_TYPES.includes(type)
    ) {
      break
    }

    const wrapper = current[type]

    if (
      wrapper?.message &&
      typeof wrapper.message === 'object'
    ) {
      current = wrapper.message
      continue
    }

    break
  }

  return current
}

function findMessageNode(
  message,
  wantedTypes = ALBUM_MEMBER_TYPES
) {
  if (
    !message ||
    typeof message !== 'object'
  ) {
    return null
  }

  const visited = new WeakSet()

  const walk = (
    obj,
    path = []
  ) => {
    if (
      !obj ||
      typeof obj !== 'object'
    ) {
      return null
    }

    if (visited.has(obj)) {
      return null
    }

    visited.add(obj)

    for (const type of wantedTypes) {
      if (
        obj[type] &&
        typeof obj[type] === 'object'
      ) {
        return {
          type,
          node: obj[type],
          parent: obj,
          path: [...path, type]
        }
      }
    }

    for (const key of Object.keys(obj)) {
      const value = obj[key]

      if (
        value &&
        typeof value === 'object'
      ) {
        const result = walk(
          value,
          [...path, key]
        )

        if (result) {
          return result
        }
      }
    }

    return null
  }

  return walk(message)
}

function getAlbumAssociation(
  message
) {
  if (!message) {
    return null
  }

  const normalized = unwrapMessage(message)

  const media = findMessageNode(
    normalized,
    ALBUM_MEMBER_TYPES
  )

  const candidates = []

  if (media?.node) {
    candidates.push(
      media.node?.messageContextInfo?.messageAssociation
    )

    candidates.push(
      media.node?.contextInfo?.messageAssociation
    )

    candidates.push(
      media.node?.messageAssociation
    )
  }

  candidates.push(
    normalized?.messageContextInfo?.messageAssociation
  )

  candidates.push(
    normalized?.contextInfo?.messageAssociation
  )

  candidates.push(
    normalized?.messageAssociation
  )

  for (const association of candidates) {
    const parentId =
      association?.parentMessageKey?.id

    if (parentId) {
      return association
    }
  }

  return null
}

function getAlbumParentId(message) {
  const association =
    getAlbumAssociation(message)

  return (
    association?.parentMessageKey?.id ||
    null
  )
}

function isAlbumMemberMessage(message) {
  const media = findMessageNode(
    message,
    ALBUM_MEMBER_TYPES
  )

  if (!media) {
    return false
  }

  return !!getAlbumParentId(message)
}

function isAlbumContainerMessage(message) {
  const normalized = unwrapMessage(message)

  return !!normalized?.albumMessage
}

function getMessageTimestamp(record) {
  const candidates = [
    record?.timestamp,
    record?.messageTimestamp,
    record?.raw?.timestamp,
    record?.raw?.messageTimestamp,
    record?.rawMessage?.timestamp,
    record?.rawMessage?.messageTimestamp,
    record?.created_at,
    record?.createdAt,
    record?.order
  ]

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null
    ) {
      const number = Number(value)

      if (!Number.isNaN(number)) {
        return number
      }
    }
  }

  return 0
}

function getRecordId(record) {
  return (
    record?.id ||
    record?.msg_id ||
    record?.messageId ||
    record?.key?.id ||
    record?.raw?.key?.id ||
    record?.raw?.id ||
    record?.rawMessage?.key?.id ||
    null
  )
}

function normalizeAlbumRecords(records) {
  if (!Array.isArray(records)) {
    return []
  }

  const seen = new Set()
  const result = []

  for (const record of records) {
    const message =
      getRecordMessage(record)

    if (!message) {
      continue
    }

    const parentId =
      getAlbumParentId(message)

    if (!parentId) {
      continue
    }

    const media =
      findMessageNode(
        message,
        ALBUM_MEMBER_TYPES
      )

    if (!media) {
      continue
    }

    const recordId =
      getRecordId(record) ||
      crypto
        .createHash('md5')
        .update(
          JSON.stringify(
            message,
            (_, value) => {
              if (
                Buffer.isBuffer(value)
              ) {
                return value.toString('base64')
              }

              return value
            }
          )
        )
        .digest('hex')

    if (seen.has(recordId)) {
      continue
    }

    seen.add(recordId)

    result.push({
      record,
      message,
      parentId,
      timestamp:
        getMessageTimestamp(record)
    })
  }

  return result
}

function findAlbumMembers(parentId, chatJid = null) {
  if (!parentId) {
    return []
  }

  if (
    typeof rawMessageDb.getRawMessagesByParentId === 'function'
  ) {
    try {
      const result =
        rawMessageDb.getRawMessagesByParentId(
          parentId,
          chatJid
        )

      if (
        Array.isArray(result) &&
        result.length
      ) {
        return result
      }
    } catch (error) {
      console.log(
        '[CMS] Query album gagal:',
        error?.message || error
      )
    }
  }

  return []
}

function sortAlbumMembers(members) {
  return [...members].sort(
    (a, b) => {
      const ta =
        Number(a.timestamp || 0)

      const tb =
        Number(b.timestamp || 0)

      if (ta !== tb) {
        return ta - tb
      }

      return 0
    }
  )
}

function sanitizeContextInfo(contextInfo) {
  if (
    !contextInfo ||
    typeof contextInfo !== 'object'
  ) {
    return
  }

  delete contextInfo.participant
  delete contextInfo.stanzaId
  delete contextInfo.remoteJid
  delete contextInfo.quotedMessage

  if (
    contextInfo.forwardingScore &&
    Number(
      contextInfo.forwardingScore
    ) > 1000
  ) {
    contextInfo.forwardingScore = 999
  }
}

function sanitizeAlbumMember(rawMessage) {
  if (!rawMessage) {
    return null
  }

  const cloned =
    deepCloneRaw(rawMessage)

  const normalized =
    unwrapMessage(cloned)

  const media =
    findMessageNode(
      normalized,
      ALBUM_MEMBER_TYPES
    )

  if (!media) {
    return null
  }

  const payload =
    stripUnsendable(
      deepCloneRaw(normalized)
    )

  const payloadMedia =
    findMessageNode(
      payload,
      ALBUM_MEMBER_TYPES
    )

  if (!payloadMedia) {
    return null
  }

  const mediaNode =
    payloadMedia.node

  delete mediaNode.messageContextInfo
  delete mediaNode.messageAssociation

  if (mediaNode.contextInfo) {
    sanitizeContextInfo(
      mediaNode.contextInfo
    )

    delete mediaNode.contextInfo
      .messageAssociation
  }

  delete payload.messageContextInfo
  delete payload.contextInfo
  delete payload.messageAssociation

  return {
    type: payloadMedia.type,
    payload
  }
}

function buildAlbumRelayCode(
  sanitizedItems
) {
  const expectedImageCount =
    sanitizedItems.filter(
      item =>
        item.type === 'imageMessage'
    ).length

  const expectedVideoCount =
    sanitizedItems.filter(
      item =>
        item.type === 'videoMessage'
    ).length

  const itemsCode =
    toCode(
      deepCloneRaw(sanitizedItems),
      2,
      1
    )

  return `const items = ${itemsCode}

const album = await sock.message.send(
  m.chat,
  {
    albumMessage: {
      expectedImageCount: ${expectedImageCount},
      expectedVideoCount: ${expectedVideoCount}
    }
  },
  {
    additionalAttributes: {
      type: 'media'
    }
  }
)

const albumKeyId =
  album?.id ||
  album?.key?.id

if (!albumKeyId) {
  throw new Error(
    'Gagal membuat container album'
  )
}

for (const item of items) {
  const payload =
    deepCloneRaw(item.payload)

  const media =
    findMessageNode(
      payload,
      ['imageMessage', 'videoMessage']
    )

  if (!media) {
    continue
  }

  const association = {
    associationType: 1,
    parentMessageKey: {
      remoteJid: m.chat,
      fromMe: true,
      id: albumKeyId
    }
  }

  media.node.messageContextInfo =
    media.node.messageContextInfo || {}

  media.node.messageContextInfo.messageAssociation =
    association

  await sock.message.send(
    m.chat,
    payload,
    {
      additionalAttributes: {
        type: 'media'
      }
    }
  )
}`.trim()
}

function detectInteractiveSubtype(
  interactiveMsg
) {
  const buttons =
    interactiveMsg
      ?.nativeFlowMessage
      ?.buttons || []

  for (const btn of buttons) {
    const name =
      btn?.name || ''

    if (
      name === 'payment_key_info'
    ) {
      return 'payment_key_info'
    }

    if (
      name === 'review_and_pay' ||
      name === 'order_details'
    ) {
      return 'order_details'
    }
  }

  const paramsJson =
    interactiveMsg
      ?.nativeFlowMessage
      ?.messageParamsJson

  if (paramsJson) {
    try {
      const parsed =
        JSON.parse(paramsJson)

      if (
        parsed?.catalog_id ||
        parsed?.catalog
      ) {
        return 'catalog_message'
      }
    } catch {}
  }

  return 'mixed'
}

function getInteractiveAdditionalNodes(
  interactiveMsg
) {
  const subtype =
    detectInteractiveSubtype(
      interactiveMsg
    )

  if (
    subtype === 'catalog_message'
  ) {
    return [
      {
        tag: 'biz',
        attrs: {
          native_flow_name:
            'catalog_message'
        }
      }
    ]
  }

  if (
    subtype === 'order_details'
  ) {
    return [
      {
        tag: 'biz',
        attrs: {
          native_flow_name:
            'order_details'
        }
      }
    ]
  }

  if (
    subtype === 'payment_key_info'
  ) {
    return [
      {
        tag: 'biz',
        attrs: {},
        content: [
          {
            tag: 'interactive',
            attrs: {
              type: 'native_flow',
              v: '1'
            },
            content: [
              {
                tag: 'native_flow',
                attrs: {
                  name:
                    'payment_key_info'
                }
              }
            ]
          }
        ]
      }
    ]
  }

  return [
    {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: {
            type: 'native_flow',
            v: '1'
          },
          content: [
            {
              tag: 'native_flow',
              attrs: {
                v: '9',
                name: 'mixed'
              }
            }
          ]
        }
      ]
    }
  ]
}

function resolveAdditionalNodes(message) {
  const nodes = []
  const visited = new WeakSet()

  const walk = obj => {
    if (
      !obj ||
      typeof obj !== 'object'
    ) {
      return
    }

    if (visited.has(obj)) {
      return
    }

    visited.add(obj)

    const type =
      getType(obj)

    if (type) {
      const node =
        obj[type]

      if (
        type === 'interactiveMessage'
      ) {
        nodes.push(
          ...getInteractiveAdditionalNodes(
            node
          )
        )
      } else if (
        /^pollCreationMessage/i.test(
          type
        )
      ) {
        nodes.push({
          tag: 'meta',
          attrs: {
            polltype: 'creation'
          }
        })
      } else if (
        type === 'eventMessage'
      ) {
        nodes.push({
          tag: 'meta',
          attrs: {
            event_type: 'creation'
          }
        })
      }
    }

    for (const key in obj) {
      const value =
        obj[key]

      if (
        value &&
        typeof value === 'object'
      ) {
        walk(value)
      }
    }
  }

  walk(message)

  const seen =
    new Set()

  return nodes.filter(node => {
    const key =
      JSON.stringify({
        tag: node.tag,
        attrs: node.attrs
      })

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

function walkTree(message) {
  const relayOptions = {}
  const visited =
    new WeakSet()

  const walk = obj => {
    if (
      !obj ||
      typeof obj !== 'object'
    ) {
      return
    }

    if (visited.has(obj)) {
      return
    }

    visited.add(obj)

    const type =
      getType(obj)

    if (
      type &&
      obj[type]
    ) {
      const node =
        obj[type]

      for (
        const mw of messageMiddleware
      ) {
        if (
          mw.types.some(
            rule =>
              rule instanceof RegExp
                ? rule.test(type)
                : rule === type
          )
        ) {
          mw.run(
            node,
            obj,
            type
          )
        }
      }
    }

    for (const key in obj) {
      const value =
        obj[key]

      if (
        value &&
        typeof value === 'object'
      ) {
        walk(value)
      }
    }
  }

  walk(message)

  const additionalNodes =
    resolveAdditionalNodes(message)

  if (additionalNodes.length) {
    relayOptions.additionalNodes =
      additionalNodes
  }

  return relayOptions
}

function cleanDangerousAttributes(attrs) {
  if (!attrs) {
    return null
  }

  const safeAttrs = {
    ...attrs
  }

  const dangerousKeys = [
    'from',
    'id',
    'participant',
    't',
    'sts',
    'notify',
    'addressing_mode',
    'participant_pn',
    'type',
    'v',
    'edit',
    'phash',
    'verified_name',
    'verified_level'
  ]

  for (
    const key of dangerousKeys
  ) {
    delete safeAttrs[key]
  }

  return Object.keys(
    safeAttrs
  ).length > 0
    ? safeAttrs
    : null
}

export default {
  command: 'cms',

  alias: [
    'relaycms'
  ],

  category: 'owner',

  description:
    'Ekstrak dan relay struktur mentah pesan dari DB dengan dukungan album foto/video WhatsApp.',

  help:
    '`(reply foto/video album) [--snip] [--code --nama <cmd>]`',

  onlyOwner: true,

  async execute(
    m,
    {
      sock,
      args
    }
  ) {
    const text =
      m.text || ''

    const isSnip =
      args.includes('--snip') ||
      text.includes('--snip')

    const isCode =
      args.includes('--code') ||
      text.includes('--code')

    let customCmd = ''
    let customAlias = '[]'

    if (isCode) {
      const namaIdx =
        args.findIndex(
          arg =>
            arg === '--nama'
        )

      if (
        namaIdx === -1 ||
        !args[namaIdx + 1] ||
        args[namaIdx + 1]
          .startsWith('--')
      ) {
        return m.reply(
          '*❌ Parameter --nama wajib diisi!*\n\nFormat:\n`.cms --code --nama namafile --alias a1,a2`'
        )
      }

      customCmd =
        args[namaIdx + 1]

      const aliasIdx =
        args.findIndex(
          arg =>
            arg === '--alias'
        )

      if (
        aliasIdx !== -1 &&
        args[aliasIdx + 1] &&
        !args[aliasIdx + 1]
          .startsWith('--')
      ) {
        const aliases =
          args[aliasIdx + 1]
            .split(',')
            .map(
              value =>
                `'${value.trim()}'`
            )

        customAlias =
          `[${aliases.join(', ')}]`
      }
    }

    if (!m.quoted) {
      return m.reply(
        '*❌ Reply salah satu foto/video album atau pesan yang ingin diproses!*'
      )
    }

    const quotedId =
      m.quoted.id ||
      m.quoted.key?.id ||
      m.quoted.stanzaId

    let dbData = null
    let savedMessage = null

    if (quotedId) {
      try {
        savedMessage =
          getRawMessageById(
            quotedId
          )

        const savedPayload =
          getRecordMessage(
            savedMessage
          )

        if (savedPayload) {
          dbData = {
            message:
              savedPayload,

            nodes:
              savedMessage?.nodes ||
              savedMessage?.raw?.nodes ||
              null,

            attributes:
              savedMessage?.attributes ||
              savedMessage?.raw?.attributes ||
              null
          }
        }
      } catch (error) {
        console.log(
          '[CMS] DB lookup gagal:',
          error?.message || error
        )
      }
    }

    if (!dbData) {
      const fullMsg =
        m.quoted.full ||
        m.quoted.raw ||
        m.quoted

      const payload =
        fullMsg?.message ||
        m.quoted.message ||
        fullMsg

      if (!payload) {
        return m.reply(
          `*❌ Pesan ID ${quotedId || 'Unknown'} tidak ditemukan!*`
        )
      }

      dbData = {
        message: payload,
        nodes: null,
        attributes: null
      }
    }

    const originalMessage =
      dbData.message

    const normalizedMessage =
      unwrapMessage(
        originalMessage
      )

    const quotedType =
      getType(normalizedMessage)

    const albumParentId =
      getAlbumParentId(
        originalMessage
      )

    const isAlbumMember =
      isAlbumMemberMessage(
        originalMessage
      )

    const isAlbumContainer =
      isAlbumContainerMessage(
        originalMessage
      )

    let parentId = null

    if (isAlbumContainer) {
      parentId =
        quotedId ||
        savedMessage?.id ||
        savedMessage?.msg_id ||
        savedMessage?.key?.id ||
        null
    } else if (
      isAlbumMember &&
      albumParentId
    ) {
      parentId =
        albumParentId
    }

    if (parentId) {
      console.log(
        '[CMS] Album terdeteksi:',
        {
          quotedId,
          quotedType,
          parentId,
          isAlbumMember,
          isAlbumContainer
        }
      )

      let memberRecords = findAlbumMembers(
      parentId,
      m.chat
     )

      if (
        isAlbumMember &&
        memberRecords.length === 0
      ) {
        memberRecords = [
          {
            message:
              originalMessage,

            parentId,

            timestamp:
              getMessageTimestamp(
                savedMessage
              )
          }
        ]
      }

      memberRecords =
        sortAlbumMembers(
          memberRecords
        )

      const sanitizedItems =
        memberRecords
          .map(
            item =>
              sanitizeAlbumMember(
                item.message ||
                getRecordMessage(
                  item.record
                )
              )
          )
          .filter(Boolean)

      const uniqueItems = []
      const seenItems =
        new Set()

      for (
        const item of sanitizedItems
      ) {
        const signature =
          crypto
            .createHash('sha1')
            .update(
              JSON.stringify(
                item.payload,
                (_, value) => {
                  if (
                    Buffer.isBuffer(value)
                  ) {
                    return value.toString(
                      'base64'
                    )
                  }

                  return value
                }
              )
            )
            .digest('hex')

        if (
          seenItems.has(signature)
        ) {
          continue
        }

        seenItems.add(signature)

        uniqueItems.push(item)
      }

      if (
        uniqueItems.length >= 2
      ) {
        await sock.sendReact?.(
          m.chat,
          '⏳',
          m.id
        ).catch(() => {})

        let relayCode =
          buildAlbumRelayCode(
            uniqueItems
          )

        if (isCode) {
          relayCode =
`export default {
  command: '${customCmd}',
  alias: ${customAlias},
  category: 'custom',
  description: 'Album WhatsApp hasil ekstraksi CMS',

  async execute(m, { sock }) {
    try {
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})

      ${relayCode.replace(/\n/g, '\n      ')}

      await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
    } catch (error) {
      console.error('[CMS ALBUM ERROR]', error?.message || error)
      await m.reply('❌ Gagal mengirim album: ' + (error?.message || error))
    }
  }
}`
        }

        const imageCount =
          uniqueItems.filter(
            item =>
              item.type ===
              'imageMessage'
          ).length

        const videoCount =
          uniqueItems.filter(
            item =>
              item.type ===
              'videoMessage'
          ).length

        const bodyText =
`*✅ Ekstraksi Album CMS Berhasil*

> *Total Media:* ${uniqueItems.length}
> *Foto:* ${imageCount}
> *Video:* ${videoCount}
> *Format:* ${isCode ? '📦 Full Plugin' : '📝 Snippet Code'}
${isCode ? `> *Command:* .${customCmd}\n` : ''}> *Parent ID:* ${parentId}

_Seluruh anggota album berhasil ditemukan dan digabungkan._`

        const fileNamePrefix =
          isCode
            ? customCmd
            : 'cms_album'

        const safeParentId =
          String(parentId)
            .replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            )

        const fileName =
          `${fileNamePrefix}_${uniqueItems.length}media_${safeParentId}.js`

        try {
          await m.reply({
            type: 'document',

            media:
              Buffer.from(
                relayCode,
                'utf-8'
              ),

            mimetype:
              'application/javascript',

            fileName,

            caption:
              bodyText
          })

          await sock.sendReact?.(
            m.chat,
            '✅',
            m.id
          ).catch(() => {})

          return
        } catch (error) {
          return m.reply(
            `*❌ Gagal membuat file album:*\n${error.message}`
          )
        }
      }

      if (
        isAlbumMember &&
        uniqueItems.length === 1
      ) {
        console.log(
          '[CMS] Hanya 1 anggota album ditemukan di DB'
        )

        return m.reply(
          '*⚠️ Album terdeteksi, tetapi anggota album lain tidak ditemukan di database Raw Message.*\n\nPastikan database menyimpan semua pesan media masuk, bukan hanya pesan yang di-reply.'
        )
      }
    }

    let messagePayload =
      deepCloneRaw(
        dbData.message
      )

    const type =
      getType(
        unwrapMessage(
          messagePayload
        )
      ) || 'Unknown'

    const isAiMessage =
      type === 'botForwardedMessage' ||
      type === 'richResponseMessage'

    let savedBotMetadata =
      null

    if (
      isAiMessage &&
      messagePayload
        ?.messageContextInfo
        ?.botMetadata
    ) {
      savedBotMetadata =
        deepCloneRaw(
          messagePayload
            .messageContextInfo
            .botMetadata
        )
    }

    if (isSnip) {
      messagePayload =
        stripUnsendable(
          messagePayload
        )

      delete messagePayload
        .messageContextInfo

      const messageNode =
        findMessageNode(
          messagePayload,
          [
            type
          ]
        )

      if (
        messageNode?.node
          ?.contextInfo
      ) {
        sanitizeContextInfo(
          messageNode.node
            .contextInfo
        )
      }
    }

    if (
      isAiMessage &&
      savedBotMetadata
    ) {
      messagePayload.messageContextInfo =
        messagePayload
          .messageContextInfo ||
        {}

      messagePayload
        .messageContextInfo
        .botMetadata =
          savedBotMetadata

      messagePayload
        .messageContextInfo
        .deviceListMetadata =
          messagePayload
            .messageContextInfo
            .deviceListMetadata ||
          {}

      messagePayload
        .messageContextInfo
        .deviceListMetadataVersion =
          2
    }

    const relayOptions =
      walkTree(
        messagePayload
      )

    if (dbData.nodes) {
      relayOptions.customNodes =
        dbData.nodes
    }

    const safeAttrs =
      cleanDangerousAttributes(
        dbData.attributes
      )

    if (safeAttrs) {
      relayOptions.additionalAttributes =
        safeAttrs
    }

    if (isAiMessage) {
      relayOptions.additionalAttributes = {
        ...(
          relayOptions
            .additionalAttributes ||
          {}
        ),

        type: 'text'
      }
    }

    const messageStr =
      toCode(
        messagePayload,
        2,
        1
      )

    const optionsKeysLen =
      Object.keys(
        relayOptions
      ).length

    const fullOptionsStr =
      optionsKeysLen
        ? toCode(
            deepCloneRaw(
              relayOptions
            ),
            2,
            1
          )
        : ''

    let relayCode =
`await sock.message.send(
  m.chat,
  ${messageStr}${optionsKeysLen ? `,\n  ${fullOptionsStr}` : ''}
)`.trim()

    await sock.sendReact?.(
      m.chat,
      '⏳',
      m.id
    ).catch(() => {})

    if (isCode) {
      relayCode =
`export default {
  command: '${customCmd}',
  alias: ${customAlias},
  category: 'custom',
  description: 'Pesan hasil ekstraksi CMS',

  async execute(m, { sock }) {
    try {
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})

      ${relayCode.replace(/\n/g, '\n      ')}

      await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
    } catch (error) {
      console.error('[CMS ERROR]', error?.message || error)
      await m.reply('❌ Gagal mengirim pesan: ' + (error?.message || error))
    }
  }
}`
    }

    const bodyText =
`*✅ Ekstraksi CMS Berhasil*

> *Tipe:* ${type}
> *Mode:* ${isSnip ? '✂️ Snipped' : '📄 Full Raw'}
> *Format:* ${isCode ? '📦 Full Plugin' : '📝 Snippet Code'}
${isCode ? `> *Command:* .${customCmd}\n` : ''}> *ID:* ${quotedId || 'Memory Object'}

_Silakan unduh file .js di bawah ini._`

    const fileNamePrefix =
      isCode
        ? customCmd
        : 'cms'

    const fileName =
      `${fileNamePrefix}_${isSnip ? 'Snipped' : 'Raw'}_${quotedId || crypto.randomBytes(3).toString('hex')}.js`

    try {
      await m.reply({
        type: 'document',

        media:
          Buffer.from(
            relayCode,
            'utf-8'
          ),

        mimetype:
          'application/javascript',

        fileName,

        caption:
          bodyText
      })

      await sock.sendReact?.(
        m.chat,
        '✅',
        m.id
      ).catch(() => {})
    } catch (error) {
      return m.reply(
        `*❌ Gagal membuat file dokumen:*\n${error.message}`
      )
    }
  }
}