// plugins/main/pingwa.js
import net from 'net'
import https from 'https'

export default {
    command: 'pingwa',
    alias: ['edgewa', 'testwa'],
    category: 'info',
    description: `> Menguji latency koneksi server bot ke WhatsApp.

contoh penggunaan:
> \`.pingwa\``,

    async execute(m, { sock }) {
        const targets = [
            ['Chat Server', '31.13.80.53'],
            ['Media Server', 'mmg.whatsapp.net'],
            ['Static CDN', 'static.whatsapp.net'],
            ['Gateway', 'g.whatsapp.net']
        ]

        const msg = await m.reply('🔎 Menguji koneksi WhatsApp...')

        const [info, ...results] = await Promise.all([
            getServerInfo(),
            ...targets.map(([name, host]) =>
                testEdge(host, 443).then(result => ({
                    name,
                    host,
                    ...result
                }))
            )
        ])

        const server = info
            ? `Server : ${info.org || '-'}\n` +
              `Region : ${info.city ? info.city + ', ' : ''}${info.country || '-'}\n\n`
            : ''

        const text = [
            '📡 *Tes Koneksi WhatsApp*',
            '',
            server,
            ...results.map(item => {
                if (!item.ok) {
                    return [
                        `*${item.name}*`,
                        `Host : ${item.host}`,
                        `Error : ${item.error}`,
                        ''
                    ].join('\n')
                }

                return [
                    `*${item.name}*`,
                    `Host : ${item.host}`,
                    `TCP  : ${item.connectMs}ms`,
                    rate(item.connectMs),
                    ''
                ].join('\n')
            })
        ].join('\n').trim()

        await sock.message.send(
            m.chat,
            text,
            {
                editKey: {
                    id: msg.id
                }
            }
        )
    }
}


function testEdge(host, port) {
    return new Promise(resolve => {
        const start = Date.now()

        const socket = net.createConnection({
            host,
            port,
            timeout: 8000
        })

        socket.once('connect', () => {
            resolve({
                ok: true,
                connectMs: Date.now() - start
            })

            socket.destroy()
        })

        socket.once('timeout', () => {
            socket.destroy()

            resolve({
                ok: false,
                error: 'timeout'
            })
        })

        socket.once('error', err => {
            resolve({
                ok: false,
                error: err.message
            })
        })
    })
}


function rate(ms) {
    if (ms < 50) return '🟢 Sangat cepat'
    if (ms < 150) return '🟡 Cukup baik'
    if (ms < 400) return '🟠 Agak lambat'
    return '🔴 Lambat'
}


function getServerInfo() {
    return new Promise(resolve => {
        const req = https.get(
            'https://ipinfo.io/json',
            {
                timeout: 5000
            },
            res => {
                let data = ''

                res.on('data', chunk => data += chunk)

                res.on('end', () => {
                    try {
                        const json = JSON.parse(data)

                        resolve({
                            org: json.org,
                            city: json.city,
                            country: json.country
                        })
                    } catch {
                        resolve(null)
                    }
                })
            }
        )

        req.once('timeout', () => {
            req.destroy()
            resolve(null)
        })

        req.once('error', () => resolve(null))
    })
}