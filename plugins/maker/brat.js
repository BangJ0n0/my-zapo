// plugins/maker/brat.js

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default {
  command: 'brat',
  alias: ['sbrat', 'bratsticker'],
  category: 'maker',
  description: `> Membuat stiker dengan tema Brat dari teks yang diberikan.

*Keterangan Format:*
> \`<teks>\` = Teks yang ingin dijadikan stiker.
> (reply) = Balas pesan teks untuk dijadikan stiker.

contoh penggunaan:
> \`.brat halo semuanya\`
> \`.brat\` (sambil me-reply pesan orang lain)`,
  help: '<teks / reply pesan>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const text = args.join(' ') || m.quoted?.text

    if (!text) {
      return m.reply(
        `❌ Masukkan teks yang ingin dijadikan stiker!\n\n` +
        `*Contoh:*\n` +
        `• ${m.prefix}${m.command} Kamu nanya?\n` +
        `• Reply pesan orang lalu ketik ${m.prefix}${m.command}`
      )
    }

    // Menyiapkan path untuk file sementara (temp)
    const sessionId = Date.now()
    const tmpIn = path.join(tmpdir(), `brat_in_${sessionId}.png`)
    const tmpOut = path.join(tmpdir(), `brat_out_${sessionId}.webp`)

    try {
      // 1. Ambil gambar dari API
      const apiUrl = `https://api.nexray.eu.cc/maker/brat?text=${encodeURIComponent(text)}`
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      const imageBuffer = Buffer.from(response.data, 'binary')

      // 2. Simpan gambar ke file sementara
      fs.writeFileSync(tmpIn, imageBuffer)

      // 3. Konversi gambar ke format WebP (standar Stiker WhatsApp 512x512) menggunakan FFmpeg
      // Perintah ini akan memastikan aspek rasio terjaga dan tidak gepeng
      const ffmpegCmd = `ffmpeg -i "${tmpIn}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -lossless 0 -compression_level 4 -q:v 50 "${tmpOut}"`
      
      await execAsync(ffmpegCmd)

      // 4. Baca file WebP yang sudah jadi
      const webpBuffer = fs.readFileSync(tmpOut)

      // 5. Kirimkan sebagai stiker
      await sock.message.send(m.chat, { 
        type: 'sticker',
        media: webpBuffer 
      }, { 
        quote: m.raw 
      })

    } catch (err) {
      console.error('[BRAT] Error:', err.message)
      const status = err.response?.status
      
      await m.reply(
        `❌ *Gagal membuat stiker Brat!*\n` +
        (status ? `*Status API:* ${status}` : `*Error:* ${err.message}`)
      )
    } finally {
      // 6. Bersihkan file sementara agar tidak memenuhi memori server
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
    }
  }
}