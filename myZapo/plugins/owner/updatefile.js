// plugins/owner/updatefile.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadMediaMessage } from 'zapo-js'
import { reviveBase64Fields } from '../../lib/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..', '..')

function extractMediaMessage(msg) {
  if (!msg) return null
  let m = msg.message || msg

  const mediaKeys = [
    'imageMessage',
    'videoMessage',
    'stickerMessage',
    'documentMessage',
    'audioMessage',
    'ptvMessage'
  ]

  while (m && typeof m === 'object') {
    const keys = Object.keys(m)
    const foundKey = keys.find(k => mediaKeys.includes(k))
    if (foundKey) {
      return { [foundKey]: m[foundKey] }
    }

    if (m.documentWithCaptionMessage?.message) {
      m = m.documentWithCaptionMessage.message
    } else if (m.viewOnceMessage?.message) {
      m = m.viewOnceMessage.message
    } else if (m.viewOnceMessageV2?.message) {
      m = m.viewOnceMessageV2.message
    } else if (m.viewOnceMessageV2Extension?.message) {
      m = m.viewOnceMessageV2Extension.message
    } else if (m.ephemeralMessage?.message) {
      m = m.ephemeralMessage.message
    } else {
      break
    }
  }

  return null
}

export default {
  command: 'updatefile',
  alias: ['upfile', 'overwritefile'],
  category: 'owner',
  description: `> Memperbarui (menimpa/overwrite) file yang sudah ada dengan media yang di-reply.

*Keterangan Format:*
> (reply) = reply media yang ingin disimpan.
> \`[directory/nama_file]\` = path tujuan (opsional).

contoh penggunaan:
\`.updatefile plugins/owner/addfile.js\` (reply media/file)`,
  help: '<directory/nama_file> (reply)',
  onlyOwner: true,

  async execute(m, { args }) {
    const q = m.quoted
    if (!q) {
      return m.reply('Balas (reply) media atau file yang ingin digunakan untuk update!')
    }

    const rawMsg = m.raw?.message
    const contextInfo = rawMsg?.extendedTextMessage?.contextInfo
      || rawMsg?.[m.type]?.contextInfo

    const rawQuotedMsg = contextInfo?.quotedMessage
    const mediaObj = extractMediaMessage(rawQuotedMsg)
      || extractMediaMessage(reviveBase64Fields(q.full))

    if (!mediaObj) {
      return m.reply('Media tidak dikenal atau tidak didukung.')
    }

    const mediaType = Object.keys(mediaObj)[0]
    const mediaContent = mediaObj[mediaType]

    let targetFolder = './'
    let customFileName = ''

    if (args[0]) {
      if (path.extname(args[0])) {
        targetFolder = path.dirname(args[0])
        customFileName = path.basename(args[0])
      } else {
        targetFolder = args[0]
      }
    }

    const targetDir = path.resolve(ROOT_DIR, targetFolder)
    let fileName = customFileName || mediaContent?.fileName || mediaContent?.name || ''

    if (!fileName) {
      const mime = mediaContent?.mimetype || q.mime || ''
      const ext = mime.split('/')[1]?.split(';')[0] || 'bin'
      fileName = `file_${Date.now()}.${ext}`
    }

    const fullPath = path.join(targetDir, fileName)

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Mengecek apakah ini overwrite atau membuat file baru
      const isOverwrite = fs.existsSync(fullPath)

      const stream = await downloadMediaMessage(mediaObj)
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      // Menulis/menimpa file langsung
      fs.writeFileSync(fullPath, buffer)

      const relativePath = path.relative(ROOT_DIR, fullPath)
      const actionText = isOverwrite ? 'Berhasil Memperbarui File (Overwrite)' : 'Berhasil Menyimpan File Baru'

      const successText = `*${actionText}*

\`Nama:\` ${fileName}
\`Folder:\` ${targetFolder}
\`Mime:\` ${mediaContent?.mimetype || q.mime || 'unknown'}
\`Size:\` ${(buffer.length / 1024).toFixed(2)} KB

\`Path:\` ${relativePath}`

      await m.reply(successText)

    } catch (err) {
      await m.reply(`Error: ${err.message || 'Gagal memperbarui file'}`)
    }
  }
}