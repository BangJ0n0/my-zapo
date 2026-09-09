// plugins/maker/sticker.js

import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { downloadMediaMessage } from 'zapo-js'
import { reviveBase64Fields } from '../../lib/utils.js'

const execAsync = promisify(exec)

// Fungsi untuk mengekstrak objek media dari struktur pesan Baileys/Zapo
function extractMediaMessage(msg) {
  if (!msg) return null
  let m = msg.message || msg

  const mediaKeys = [
    'imageMessage',
    'videoMessage',
    'stickerMessage',
    'documentMessage'
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
  command: 's',
  alias: ['sticker', 'stiker', 'sgif'],
  category: 'maker',
  description: `> Mengubah Gambar, Video, atau GIF menjadi Stiker.

*Keterangan Format:*
> (Kirim gambar/video dengan caption) \`.s\`
> (Reply gambar/video) \`.s\`

contoh penggunaan:
> Kirim media dengan caption \`.s\`
> Reply media lalu ketik \`.stiker\``,
  help: '(kirim/reply media)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    // Mengekstrak info dari pesan yang di-reply (jika ada)
    const rawMsg = m.raw?.message
    const contextInfo = rawMsg?.extendedTextMessage?.contextInfo || rawMsg?.[m.type]?.contextInfo
    const rawQuotedMsg = contextInfo?.quotedMessage
    
    // Cari media di pesan saat ini, atau di pesan yang di-reply
    const mediaObj = 
      extractMediaMessage(m.raw) || 
      extractMediaMessage(rawQuotedMsg) || 
      (m.quoted ? extractMediaMessage(reviveBase64Fields(m.quoted.full)) : null)

    if (!mediaObj) {
      return m.reply(
        `❌ Media tidak ditemukan!\n\nKirim gambar/video dengan caption \`${m.prefix}${m.command}\` atau reply media yang sudah ada.`
      )
    }

    const mediaType = Object.keys(mediaObj)[0]
    
    // Validasi apakah media yang didapat adalah gambar atau video
    if (mediaType !== 'imageMessage' && mediaType !== 'videoMessage') {
      return m.reply('❌ Hanya mendukung konversi dari format Gambar, GIF, atau Video pendek!')
    }

    const isVideo = mediaType === 'videoMessage'
    const sessionId = Date.now()
    const tmpIn = path.join(tmpdir(), `sticker_in_${sessionId}.${isVideo ? 'mp4' : 'jpg'}`)
    const tmpOut = path.join(tmpdir(), `sticker_out_${sessionId}.webp`)

    try {
      // 1. Download Media
      const stream = await downloadMediaMessage(mediaObj)
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      fs.writeFileSync(tmpIn, buffer)

      // 2. Konversi menggunakan FFmpeg (Otomatis deteksi Image vs Video)
      let ffmpegCmd = ''
      
      if (isVideo) {
        // Konversi Video/GIF -> Stiker Animasi WebP (Maks 10 detik)
        ffmpegCmd = `ffmpeg -i "${tmpIn}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -ss 00:00:00.0 -t 00:00:10.0 -preset default -an -vsync 0 -s 512:512 "${tmpOut}"`
      } else {
        // Konversi Gambar -> Stiker Static WebP
        ffmpegCmd = `ffmpeg -i "${tmpIn}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -lossless 0 -compression_level 4 -q:v 50 "${tmpOut}"`
      }

      await execAsync(ffmpegCmd)

      // 3. Baca hasil WebP
      const webpBuffer = fs.readFileSync(tmpOut)

      // 4. Kirim sebagai stiker
      await sock.message.send(m.chat, { 
        type: 'sticker',
        media: webpBuffer 
      }, { 
        quote: m.raw 
      })

    } catch (err) {
      console.error('[STICKER] Error:', err.message)
      await m.reply(`❌ *Gagal membuat stiker!*\n\n\`Pesan:\` ${err.message}`)
    } finally {
      // 5. Bersihkan sampah file temp
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
    }
  }
}