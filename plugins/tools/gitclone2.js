// ./plugins/tools/gitclone2.js

import axios from 'axios'
import https from 'https'
import { performance } from 'perf_hooks'
import { formatBytes } from '../../lib/utils.js'

// Regex untuk mendeteksi link file spesifik di GitHub
const GITHUB_FILE_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][\w-]{0,38})\/([a-zA-Z0-9._-]{1,100})\/blob\/([a-zA-Z0-9._-]+)\/(.+)/i
// Regex untuk mendeteksi link repository GitHub
const GITHUB_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][\w-]{0,38})\/([a-zA-Z0-9._-]{1,100})(?:\.git)?/i
// Regex untuk format shorthand user/repo
const REPO_SHORTHAND_REGEX = /(?:^|\s)([a-zA-Z0-9][\w-]{0,38})\/([a-zA-Z0-9._-]{1,100})(?:\s|$)/i

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 20 })

function extractRepo(raw) {
  if (!raw) return null
  const text = raw.trim()
  
  // 1. Cek apakah itu link file spesifik
  const fromFile = text.match(GITHUB_FILE_REGEX)
  if (fromFile) {
    return { 
      user: fromFile[1], 
      repo: fromFile[2], 
      branch: fromFile[3], 
      filePath: fromFile[4], 
      isFile: true 
    }
  }

  // 2. Cek apakah itu link repository biasa
  const fromUrl = text.match(GITHUB_URL_REGEX)
  if (fromUrl) {
    return { 
      user: fromUrl[1], 
      repo: fromUrl[2].replace(/\.git$/i, ''), 
      isFile: false 
    }
  }

  // 3. Cek apakah itu format shorthand (user/repo)
  const fromShorthand = text.match(REPO_SHORTHAND_REGEX)
  if (fromShorthand) {
    return { 
      user: fromShorthand[1], 
      repo: fromShorthand[2].replace(/\.git$/i, ''), 
      isFile: false 
    }
  }

  return null
}

export default {
  command: 'gitclone2',
  alias: ['git2'],
  category: 'tools',
  description: `> Mengunduh repository GitHub sebagai file ZIP atau file spesifik.

*Keterangan Format:*
> \`<url repo / url file / user/repo>\`
> (reply) = reply pesan yang berisi link GitHub.

contoh penggunaan:
> \`.gitclone <url repo>\` (Unduh ZIP)
> \`.gitclone <url file>\` (Unduh file spesifik)
> \`.gitclone user/repo\` (Unduh ZIP)
> \`.gitclone\` (reply pesan berisi link GitHub)`,
  help: '<url repository / file>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const typed = args.join(' ')
    const input = typed || m.quoted?.text || ''

    if (!input.trim()) {
      return m.reply(
        `Masukkan repo atau file GitHub yang valid!\n` +
        `Contoh:\n` +
        `• ${m.prefix}${m.command} nazedev/hitori\n` +
        `• ${m.prefix}${m.command} https://github.com/nazedev/hitori\n` +
        `• ${m.prefix}${m.command} https://github.com/BangsulBotz/zapo-js/blob/main/db/rawMessage.js\n` +
        `• reply pesan berisi link GitHub lalu ketik ${m.prefix}${m.command}`
      )
    }

    const target = extractRepo(input)
    if (!target) return m.reply('❌ Tidak menemukan format `user/repo` atau link GitHub yang valid.')

    const { user, repo, branch, filePath, isFile } = target
    
    // Tentukan URL download dan nama file berdasarkan tipe target
    const downloadUrl = isFile 
      ? `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`
      : `https://api.github.com/repos/${user}/${repo}/zipball`
      
    const originalUrl = isFile 
      ? `https://github.com/${user}/${repo}/blob/${branch}/${filePath}`
      : `https://github.com/${user}/${repo}`

    const finalFileName = isFile 
      ? filePath.split('/').pop() 
      : `${repo}.zip`

    const mimeType = isFile 
      ? 'application/octet-stream' 
      : 'application/zip'

    const t0 = performance.now()

    try {
      const response = await axios.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': isFile ? '*/*' : 'application/vnd.github+json',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        httpsAgent: keepAliveAgent,
        responseType: 'stream',
        timeout: 60000,
        maxRedirects: 10,
        decompress: true
      })

      const sizeHeader = Number(response.headers['content-length']) || null
      const typeCaption = isFile ? '📄 *File:*' : '📦 *Repo:*'
      const nameCaption = isFile ? finalFileName : `${user}/${repo}`
      
      const caption =
        `${typeCaption} ${nameCaption}\n` +
        `🔗 *Link:* ${originalUrl}` +
        (sizeHeader ? `\n⚖️ *Ukuran:* ${formatBytes(sizeHeader)}` : '')

      await sock.message.send(m.chat, {
        type: 'document',
        media: response.data,
        mimetype: mimeType,
        fileName: finalFileName,
        caption
      }, { quote: m.raw })

      const duration = ((performance.now() - t0) / 1000).toFixed(2)
      console.log(`[GITCLONE] ${user}/${repo}${isFile ? `/${finalFileName}` : ''} selesai dalam ${duration}s`)

    } catch (err) {
      const status = err.response?.status
      const errMsg = status === 404
        ? `❌ Target *${user}/${repo}${isFile ? `/${finalFileName}` : ''}* tidak ditemukan atau bersifat private.`
        : `❌ Gagal mengunduh target!\n*Status:* ${status || 'Error'}\n*Pesan:* ${err.message}`

      console.error(`[GITCLONE] Error ${user}/${repo}:`, err.message)
      return m.reply(errMsg)
    }
  }
}