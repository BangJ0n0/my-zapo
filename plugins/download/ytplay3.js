// plugins/download/ytplay3.js

import { createDecipheriv, randomUUID } from 'crypto'
import { spawn } from 'child_process'
import yts from 'yt-search'
import sharp from 'sharp'

const METADATA_DECRYPTION_KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex')
const HEADERS = {
  'Content-Type': 'application/json',
  'Origin': 'https://yt.savetube.me',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
}

const FFMPEG_BITRATE = '16k'
const FFMPEG_SAMPLE_RATE = '24000'
const FFMPEG_CHANNELS = '1'
const FFMPEG_CODEC = 'libopus'
const FFMPEG_FORMAT = 'ogg'
const MAX_ORIGINAL_AUDIO_MB = 20 // Sedikit diturunkan agar lebih stabil
const MAX_ORIGINAL_AUDIO_SIZE = MAX_ORIGINAL_AUDIO_MB * 1024 * 1024
const MAX_COMPRESSED_AUDIO_MB = 4 // WA membatasi ukuran pesan, set max ke 4MB
const MAX_COMPRESSED_AUDIO_SIZE = MAX_COMPRESSED_AUDIO_MB * 1024 * 1024

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function savetube(url, { downloadType = 'audio', quality = '128kbps' } = {}) {
  const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/)
  if (!idMatch) throw new Error('URL YouTube tidak valid')
  
  const videoId = idMatch[1]
  const cdnRes = await fetch('https://media.savetube.vip/api/random-cdn', { headers: HEADERS }).then(v => v.json()).catch(() => null)
  if (!cdnRes?.cdn) throw new Error('CDN tidak tersedia')
  
  const cdn = cdnRes.cdn
  const info = await fetch(`https://${cdn}/v2/info`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` })
  }).then(v => v.json()).catch(() => null)
    
  if (!info?.data) throw new Error('Metadata kosong')
  
  let metadata
  try {
    const encrypted = Buffer.from(info.data, 'base64')
    const decipher = createDecipheriv('aes-128-cbc', METADATA_DECRYPTION_KEY, encrypted.subarray(0, 16))
    const decrypted = Buffer.concat([decipher.update(encrypted.subarray(16)), decipher.final()])
    metadata = JSON.parse(decrypted.toString('utf8'))
  } catch (e) {
    throw new Error('Decrypt metadata gagal')
  }
  
  if (!metadata?.key) throw new Error('Key download tidak ditemukan')
  
  const dl = await fetch(`https://${cdn}/download`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: videoId, downloadType, quality, key: metadata.key })
  }).then(v => v.json()).catch(() => null)
    
  if (!dl?.data?.downloadUrl) throw new Error(dl?.message || 'Download gagal')
  
  return {
    title: metadata.title,
    duration: metadata.durationLabel,
    thumbnail: metadata.thumbnail,
    url: dl.data.downloadUrl
  }
}

async function savetubeRetry(url, opts, retry = 3) {
  let lastErr
  for (let i = 0; i < retry; i++) {
    try {
      return await savetube(url, opts)
    } catch (e) {
      lastErr = e
      if (i < retry - 1) await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  throw lastErr
}

async function downloadAudioBuffer(url) {
  if (!url) throw new Error('URL audio kosong')
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' } })
  if (!res.ok) throw new Error(`Download audio gagal (${res.status})`)
  
  const contentLength = Number(res.headers.get('content-length') || 0)
  if (contentLength > MAX_ORIGINAL_AUDIO_SIZE) throw new Error(`Audio terlalu besar (maks ${MAX_ORIGINAL_AUDIO_MB} MB)`)
  
  const buffer = Buffer.from(await res.arrayBuffer())
  if (!buffer.length) throw new Error('Buffer audio kosong')
  if (buffer.length > MAX_ORIGINAL_AUDIO_SIZE) throw new Error(`Audio terlalu besar (maks ${MAX_ORIGINAL_AUDIO_MB} MB)`)
  
  return buffer
}

async function compressAudio(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) throw new Error('Input audio buffer kosong')
  
  return new Promise((resolve, reject) => {
    let ffmpeg
    try {
      ffmpeg = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn',
        '-c:a', FFMPEG_CODEC, '-b:a', FFMPEG_BITRATE, '-ar', FFMPEG_SAMPLE_RATE,
        '-ac', FFMPEG_CHANNELS, '-application', 'audio', '-f', FFMPEG_FORMAT, 'pipe:1'
      ], { stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (error) {
      reject(error)
      return
    }
    
    const chunks = []
    const errors = []
    let outputSize = 0
    let finished = false
    
    const fail = (error) => {
      if (finished) return
      finished = true
      try { ffmpeg.kill('SIGKILL') } catch {}
      reject(error)
    }
    
    ffmpeg.stdout.on('data', chunk => {
      outputSize += chunk.length
      if (outputSize > MAX_COMPRESSED_AUDIO_SIZE) {
        fail(new Error(`Audio hasil compress terlalu besar (maks ${MAX_COMPRESSED_AUDIO_MB} MB)`))
        return
      }
      chunks.push(chunk)
    })
    
    ffmpeg.stderr.on('data', chunk => errors.push(chunk.toString()))
    
    ffmpeg.on('error', error => {
      if (error?.code === 'ENOENT') {
        fail(new Error('FFmpeg tidak ditemukan. Install FFmpeg terlebih dahulu.'))
        return
      }
      fail(error)
    })
    
    ffmpeg.on('close', code => {
      if (finished) return
      if (code !== 0) {
        fail(new Error(`FFmpeg gagal (${code}): ${errors.join('').trim() || 'unknown error'}`))
        return
      }
      const output = Buffer.concat(chunks)
      if (!output.length) {
        fail(new Error('FFmpeg menghasilkan audio kosong'))
        return
      }
      finished = true
      resolve(output)
    })
    
    ffmpeg.stdin.on('error', error => {
      if (error?.code === 'EPIPE') return
      fail(error)
    })
    
    ffmpeg.stdin.end(inputBuffer)
  })
}

async function getThumb(url) {
  try {
    if (!url) return Buffer.alloc(0)
    const res = await fetch(url)
    if (!res.ok) throw new Error('Thumbnail gagal diambil')
    const raw = Buffer.from(await res.arrayBuffer())
    // Resolusi dikurangi ke 200x200 agar ukuran base64 hemat dan tidak membuat chat bubble WA blank
    return await sharp(raw).resize(200, 200, { fit: 'cover', position: 'center' }).jpeg({ quality: 50 }).toBuffer()
  } catch (e) {
    return Buffer.alloc(0)
  }
}

// =====================================================================
// COMPACT ADVANCED MUSIC PLAYER HTML TEMPLATE (ANTI-TERPOTONG)
// =====================================================================
function createMusicPlayer({ title, artist, duration, audioSrc, imageSrc }) {
  const safeTitle = escapeHtml(title)
  const safeArtist = escapeHtml(artist)
  const safeDuration = escapeHtml(duration || '0:00')
  const safeImage = imageSrc || 'https://via.placeholder.com/200x200.png?text=No+Image'

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    :root { --accent: #00f2fe; --accent-2: #4facfe; --bg-glass: rgba(20, 20, 25, 0.75); --text: #ffffff; --muted: #a0a0b0; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { font-family: system-ui, -apple-system, sans-serif; height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #1a1a2e; color: var(--text); overflow: hidden; padding: 10px; }
    
    .bg-blur { position: absolute; inset: -20%; width: 140%; height: 140%; background-size: cover; background-position: center; filter: blur(30px) brightness(0.35); z-index: 0; }
    
    /* Ukuran Card di-press agar muat di chat bubble WA */
    .player-card { position: relative; z-index: 10; width: 100%; max-width: 320px; background: var(--bg-glass); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .now-playing-text { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); }
    .visualizer { display: flex; gap: 3px; align-items: flex-end; height: 12px; }
    .bar-eq { width: 3px; background: var(--accent); border-radius: 2px; animation: eq 1s ease-in-out infinite alternate; animation-play-state: paused; }
    .visualizer.active .bar-eq { animation-play-state: running; }
    .bar-eq:nth-child(1) { height: 30%; animation-delay: 0.1s; }
    .bar-eq:nth-child(2) { height: 100%; animation-delay: 0.2s; }
    .bar-eq:nth-child(3) { height: 60%; animation-delay: 0.3s; }
    .bar-eq:nth-child(4) { height: 80%; animation-delay: 0.4s; }
    @keyframes eq { 0% { height: 20%; } 100% { height: 100%; } }
    
    /* Ukuran piringan hitam dikecilkan drastis */
    .art-wrapper { position: relative; width: 130px; height: 130px; margin: 0 auto 12px; border-radius: 50%; box-shadow: 0 8px 20px rgba(0,0,0,0.6); border: 3px solid rgba(255, 255, 255, 0.05); }
    .vinyl-art { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; animation: spin 8s linear infinite; animation-play-state: paused; }
    .vinyl-art.playing { animation-play-state: running; }
    /* Lubang piringan juga disesuaikan */
    .art-wrapper::after { content: ''; position: absolute; top: 50%; left: 50%; width: 30px; height: 30px; background: var(--bg-glass); backdrop-filter: blur(5px); border-radius: 50%; transform: translate(-50%, -50%); border: 2px solid rgba(255,255,255,0.1); }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .song-info { text-align: center; margin-bottom: 12px; }
    .title { font-size: 16px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .artist { font-size: 12px; color: var(--muted); }
    
    .progress-container { margin-bottom: 15px; }
    .progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.15); border-radius: 4px; cursor: pointer; position: relative; overflow: hidden; }
    .progress-fill { position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); border-radius: 4px; }
    .time-info { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); margin-top: 6px; font-weight: 500; font-variant-numeric: tabular-nums; }
    
    .controls { display: flex; align-items: center; justify-content: space-between; padding: 0 5px; }
    .btn { background: none; border: none; color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn:active { transform: scale(0.9); }
    .btn svg { width: 20px; height: 20px; fill: currentColor; }
    .btn-play { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-2), var(--accent)); color: #000; box-shadow: 0 5px 15px rgba(0, 242, 254, 0.25); }
    .btn-play svg { width: 22px; height: 22px; margin-left: 2px; }
    .btn-play.playing svg { margin-left: 0; }
    .btn-action.active { color: var(--accent); }
    
    #toast { position: absolute; top: -50px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #fff; padding: 6px 14px; border-radius: 15px; font-size: 11px; opacity: 0; transition: all 0.3s; pointer-events: none; white-space: nowrap; z-index: 100; border: 1px solid rgba(255,255,255,0.1); }
    #toast.show { top: 15px; opacity: 1; }
  </style>
</head>
<body>
  <div class="bg-blur" id="bgBlur"></div>
  <div class="player-card">
    <div id="toast">Notifikasi</div>
    <div class="header">
      <button class="btn" id="btn-mute" aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
      <div class="now-playing-text">Now Playing</div>
      <div class="visualizer" id="visualizer">
        <div class="bar-eq"></div><div class="bar-eq"></div><div class="bar-eq"></div><div class="bar-eq"></div>
      </div>
    </div>

    <div class="art-wrapper"><img src="" alt="Cover" class="vinyl-art" id="vinyl"></div>

    <div class="song-info">
      <div class="title">${safeTitle}</div>
      <div class="artist">${safeArtist}</div>
    </div>

    <div class="progress-container">
      <div class="progress-bar" id="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
      <div class="time-info"><span id="time-current">0:00</span><span id="time-duration">${safeDuration}</span></div>
    </div>

    <div class="controls">
      <button class="btn btn-action" id="btn-shuffle"><svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
      <button class="btn" id="btn-prev"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button class="btn btn-play" id="btn-play">
        <svg id="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <svg id="icon-pause" viewBox="0 0 24 24" style="display:none; margin-left:0;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <button class="btn" id="btn-next"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
      <button class="btn btn-action" id="btn-repeat"><svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>
    </div>
  </div>
  
  <audio id="audio" preload="metadata" src="${audioSrc}"></audio>
  
  <script>
    const imgSrc = "${safeImage}";
    document.getElementById('bgBlur').style.backgroundImage = 'url(' + imgSrc + ')';
    document.getElementById('vinyl').src = imgSrc;

    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('btn-play');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const progressFill = document.getElementById('progress-fill');
    const timeCurrent = document.getElementById('time-current');
    const vinyl = document.getElementById('vinyl');
    const visualizer = document.getElementById('visualizer');
    const toastEl = document.getElementById('toast');

    let toastTimeout;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2000);
    }

    function formatTime(sec){
      if(!Number.isFinite(sec)) return '0:00';
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateProgress(){
      if(!audio.duration) return;
      progressFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      timeCurrent.textContent = formatTime(audio.currentTime);
    }

    function togglePlay(isPlaying){
      if(isPlaying) {
        iconPlay.style.display = 'none'; iconPause.style.display = 'block';
        playBtn.classList.add('playing'); vinyl.classList.add('playing'); visualizer.classList.add('active');
      } else {
        iconPlay.style.display = 'block'; iconPause.style.display = 'none';
        playBtn.classList.remove('playing'); vinyl.classList.remove('playing'); visualizer.classList.remove('active');
      }
    }

    playBtn.onclick = () => audio.paused ? audio.play() : audio.pause();
    
    document.getElementById('btn-mute').onclick = function() {
      audio.muted = !audio.muted;
      this.style.opacity = audio.muted ? '0.5' : '1';
      showToast(audio.muted ? "Audio Dibisukan" : "Audio Menyala");
    };
    
    document.getElementById('btn-repeat').onclick = function() {
      audio.loop = !audio.loop;
      this.classList.toggle('active', audio.loop);
      showToast(audio.loop ? "Mode Ulang: Aktif" : "Mode Ulang: Mati");
    };
    
    document.getElementById('btn-shuffle').onclick = () => showToast("Hanya ada 1 lagu");
    document.getElementById('btn-prev').onclick = () => showToast("Hanya ada 1 lagu");
    document.getElementById('btn-next').onclick = () => showToast("Hanya ada 1 lagu");

    document.getElementById('progress-bar').onpointerdown = (e) => {
      if(!audio.duration) return;
      const rect = e.target.getBoundingClientRect();
      audio.currentTime = (Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width) * audio.duration;
      updateProgress();
    };

    audio.ontimeupdate = updateProgress;
    audio.onplay = () => togglePlay(true);
    audio.onpause = () => togglePlay(false);
    audio.onended = () => {
      if(!audio.loop) {
        togglePlay(false);
        progressFill.style.width = '0%';
        timeCurrent.textContent = '0:00';
      }
    };
  </script>
</body>
</html>`
}

// Terintegrasi langsung dengan API Zapo-JS
async function sendMusicPlayer(sock, jid, html) {
  const responseId = randomUUID()
  const payload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: responseId
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: 'Music Player' }],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: responseId,
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: html,
                        trusted_sources: []
                      },
                      __typename: 'GenAISingleLayoutViewModel'
                    }
                  }
                ]
              })
            ).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
            forwardOrigin: 4
          }
        }
      }
    }
  }

  await sock.message.send(jid, payload, {
    messageId: responseId,
    additionalAttributes: { type: 'text' }
  })
}

export default {
  command: 'play3',
  alias: ["ytplay3"],
  category: 'download',
  description: 'Download audio dan putar lewat HTML Music Player interaktif',
  
  async execute(m, { sock, args }) {
    const text = args.join(' ')
    if (!text) return m.reply(`*Format salah!*\nContoh: \`${m.prefix}${m.command} engkang\``)
    
    await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})
    
    try {
      let url = text.trim()
      
      if (!/youtube\.com|youtu\.be/i.test(text)) {
        const search = await yts(text)
        if (!search?.videos?.length) throw new Error('Lagu tidak ditemukan')
        url = search.videos[0].url
      }
      
      const detail = await yts(url)
      const vid = detail?.videos?.[0]
      if (!vid) throw new Error('Video tidak ditemukan')
      
      const ytUrl = vid.url || url
      const title = vid.title || 'Unknown'
      const artist = vid.author?.name || 'YouTube'
      const duration = vid.timestamp || '0:00'
      
      const thumb = await getThumb(vid.thumbnail)
      
      let imageSrc = ''
      if (thumb?.length) {
        imageSrc = `data:image/jpeg;base64,` + thumb.toString('base64')
      }
      
      const audio = await savetubeRetry(ytUrl, { downloadType: 'audio', quality: '128kbps' })
      if (!audio?.url) throw new Error('URL audio tidak tersedia dari server')
      
      const originalBuffer = await downloadAudioBuffer(audio.url)
      const compressedBuffer = await compressAudio(originalBuffer)
      
      const audioBase64 = compressedBuffer.toString('base64')
      const audioSrc = `data:audio/ogg;base64,` + audioBase64
      
      // Pembatasan strict maksimal ~5 MB (diatas ini bot WhatsApp biasanya error memuat tampilan)
      if (Buffer.byteLength(audioSrc, 'utf8') > 5 * 1024 * 1024) {
        throw new Error('Ukuran Audio terlalu besar untuk ditampilkan di tampilan ini (maks ~4MB).')
      }
      
      const html = createMusicPlayer({
        title: audio.title || title,
        artist,
        duration: audio.duration || duration,
        audioSrc,
        imageSrc
      })
      
      await sendMusicPlayer(sock, m.chat, html)
      
      await sock.sendReact?.(m.chat, '✅', m.id).catch(() => {})
      
    } catch (error) {
      await m.reply(`*❌ Gagal memutar audio:*\n> ${error?.message || 'Unknown error'}`)
    }
  }
}