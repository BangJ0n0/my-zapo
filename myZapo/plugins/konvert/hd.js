// plugins/konvert/hd.js

import { buildQuoteContext } from '../../lib/utils.js'

function resolveMediaTarget(m, sock) {
    if (m.quoted?.isMedia || m.quoted?.download) {
        return {
            mime: m.quoted.mime || m.quoted.mimetype,
            download: () => m.quoted.download()
        }
    }

    if (m.isMedia || m.msg?.mimetype || m.raw?.message) {
        return {
            mime: m.msg?.mimetype || m.raw?.message?.[m.type]?.mimetype || '',
            download: () => sock.message.downloadBytes(m.raw?.message || m.msg)
        }
    }

    return null
}

export default {
    command: 'hd',
    alias: ['upscale', 'enhance'],
    category: 'konvert',
    help: '`(reply)`',
    description: `> Meningkatkan resolusi / memperjelas gambar menggunakan AI Upscale.\n\ncontoh penggunaan:\n> \`.hd\` (reply pesan gambar)\n> \`.hd\` (kirim gambar dengan caption command)`,
    typing: true,

    async execute(m, { sock }) {
        const target = resolveMediaTarget(m, sock)

        if (!target) return m.reply('❌ Reply gambar atau kirim gambar dengan caption dulu!')

        if (!target.mime?.startsWith('image/')) {
            return m.reply('❌ Fitur ini hanya mendukung gambar!')
        }

        await m.reply('⏳ Sedang memproses gambar ke HD... mohon tunggu sebentar')

        let buffer
        try {
            buffer = await target.download()
        } catch (err) {
            return m.reply(`❌ Gagal download media: ${err?.message || 'file tidak tersedia'}`)
        }

        if (!buffer || !buffer.length) return m.reply('❌ File gambar kosong / gagal diunduh')

        const ext = (target.mime || 'image/jpeg').split('/')[1] || 'jpg'
        const fileName = `hd_${Date.now()}.${ext}`

        try {
            // ===== 1. Upload ke tmpfile.link =====
            const formData = new FormData()
            formData.append('file', new Blob([buffer]), fileName)

            const uploadRes = await fetch('https://tmpfile.link/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!uploadRes.ok) {
                return m.reply(`❌ Upload gagal (HTTP ${uploadRes.status})`)
            }

            const uploadData = await uploadRes.json()
            const imageUrl = uploadData.downloadLink || uploadData.url

            if (!imageUrl) {
                return m.reply('❌ Upload berhasil tapi tidak mendapatkan link gambar')
            }

            // ===== 2. Proses Upscale =====
            const upscaleUrl = `https://wudysoft.my.id/api/tools/upscale/v14?image=${encodeURIComponent(imageUrl)}`
            
            const upscaleRes = await fetch(upscaleUrl)

            if (!upscaleRes.ok) {
                return m.reply(`❌ Server HD error (HTTP ${upscaleRes.status})`)
            }

            const upscaleData = await upscaleRes.json()

            if (upscaleData.status !== 'success' || !upscaleData.downloadUrls?.[0]) {
                console.log('Upscale response:', upscaleData)
                return m.reply('❌ Gagal mendapatkan hasil HD dari server')
            }

            const hdUrl = upscaleData.downloadUrls[0]
            const sizeKB = ((upscaleData.filesize || 0) / 1024).toFixed(1)

            // ===== 3. Download hasil HD sebagai buffer =====
            const hdRes = await fetch(hdUrl)
            if (!hdRes.ok) {
                return m.reply('❌ Gagal mengunduh hasil HD')
            }

            const hdBuffer = Buffer.from(await hdRes.arrayBuffer())

            // ===== 4. Kirim hasil menggunakan format objek media standar zapo-js =====
            const captionText = `✅ *HD Upscale Berhasil*\n\n📦 Ukuran: ${sizeKB} KB\n🖼️ Format: ${(upscaleData.imagemimetype || ext).toUpperCase()}`

            try {
                await m.reply({
                    type: 'image',
                    media: hdBuffer,
                    caption: captionText,
                    contextInfo: buildQuoteContext(m)
                })
            } catch (sendErr) {
                // Fallback jika m.reply format objek gagal di client zapo-js Anda
                await sock.message.send(m.chat, {
                    imageMessage: {
                        jpegThumbnail: hdBuffer.toString('base64'), // Opsional atau biarkan kosong jika error
                        caption: captionText
                    }
                }, { media: hdBuffer })
            }

        } catch (err) {
            console.error('HD Error:', err)
            return m.reply(`❌ Terjadi kesalahan: ${err.message || 'Unknown error'}`)
        }
    }
}