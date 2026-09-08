/**
 * YouTube Play / Music Downloader
 *
 * Usage:
 *   .play <judul lagu>
 *   .music <judul lagu>
 *   .song <judul lagu>
 *
 * Jika tanpa query, plugin akan mengambil teks dari pesan yang direply.
 */

const API_URL = 'https://api.azbry.com/api/download/ytplay2'

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

async function downloadBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8'
    }
  })

  if (!response.ok) {
    throw new Error(`Gagal download audio: HTTP ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (!buffer.length) {
    throw new Error('Audio kosong')
  }

  return buffer
}

export default {
  command: 'play',
  alias: ['music', 'song'],
  category: 'download',
  description: 'Download lagu dari YouTube berdasarkan judul.',
  help: '<judul lagu>',
  typing: true,
  wait: false,

  async execute(m, { sock, args }) {
    let query = args.join(' ').trim()

    // Jika query kosong, ambil teks dari pesan yang direply.
    if (!query && m.quoted) {
      const q = m.quoted
      query =
        q.text ||
        q.caption ||
        q.raw?.message?.conversation ||
        q.raw?.message?.extendedTextMessage?.text ||
        ''
    }

    if (!query) {
      return m.reply('judul lagunya mana wok')
    }

    try {
      await sock.sendReact(m.chat, '🎵', m.id).catch(() => {})

      const url = `${API_URL}?q=${encodeURIComponent(query)}`
      const data = await getJson(url)

      if (!data?.status || !data?.result) {
        throw new Error('API tidak mengembalikan hasil yang valid')
      }

      const res = data.result
      const title = res.title || query
      const downloadUrl = res.download

      if (!downloadUrl) {
        throw new Error('URL download audio tidak tersedia')
      }

      // Kirim judul terlebih dahulu.
      await sock.message.send(
        m.chat,
        { type: 'text', text: title },
        { quote: m.raw }
      )

      // Ambil audio menjadi Buffer supaya konsisten dengan API media Zapo.
      const audioBuffer = await downloadBuffer(downloadUrl)

      await sock.message.send(
        m.chat,
        {
          type: 'audio',
          media: audioBuffer,
          mimetype: 'audio/mpeg',
          ptt: false
        },
        { quote: m.raw }
      )

      await sock.sendReact(m.chat, '', m.id).catch(() => {})
    } catch (e) {
      console.error('[PLAY ERROR]', e)

      await sock.sendReact(m.chat, '', m.id).catch(() => {})
      return m.reply('gagal memproses audio')
    }
  }
}
