// plugins/bot/pinglive.js

import os from 'os'
import fs from 'fs'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

const BANNER = 'https://c.termai.cc/a199/0Dw0j.jpg'

// ============================================================
//  SIGNATURE & CERTIFICATE
// ============================================================
const SIG = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YcN55YRyad2+ZA=="
const CERT1 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg"
const CERT2 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZlXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYvNBkuLoZnQAq4j8yRekrQ=="

// ===== HELPERS =====
function formatSize(bytes) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0, v = bytes
    while (v >= 1024 && i < u.length - 1) {
        v /= 1024;
        i++
    }
    return `${v.toFixed(i === 0 ? 0 : 2)} ${u[i]}`
}

function getDisk() {
    try {
        const out = execSync('df -kP /', { timeout: 3000 }).toString().trim().split('\n')
        const r = out.slice(1).map(l => l.trim().split(/\s+/))[0]
        const total = +r[1] * 1024, used = +r[2] * 1024
        return { total, used, percent: +(used / total * 100).toFixed(1) }
    } catch {
        return null
    }
}

function getSwap() {
    try {
        const f = fs.readFileSync('/proc/meminfo', 'utf8')
        const total = (f.match(/^SwapTotal:\s+(\d+)/) || [0, 0])[1] * 1024
        const free = (f.match(/^SwapFree:\s+(\d+)/) || [0, 0])[1] * 1024
        if (!total) return null
        const used = total - free
        return { total, used, free, percent: +(used / total * 100).toFixed(1) }
    } catch {
        return null
    }
}

function getNetwork() {
    const ni = os.networkInterfaces()
    let primary = ''
    for (const [, addrs] of Object.entries(ni)) {
        for (const a of addrs || []) {
            if (!a.internal && a.family === 'IPv4' && !primary) primary = a.address
        }
    }
    return primary || '-'
}

// ===== KUMPULKAN DATA =====
function collect(sock) {
    const cores = os.cpus().length
    const load = os.loadavg()
    const totalMem = os.totalmem(), freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const heap = process.memoryUsage()
    const isBun = typeof Bun !== 'undefined'
    const disk = getDisk()
    return {
        botName: sock?.user?.name || 'Zapo Bot',
        cpu: +Math.min(99.9, (load[0] / Math.max(cores, 1)) * 100).toFixed(1),
        ram: +((usedMem / totalMem) * 100).toFixed(1),
        disk: disk ? disk.percent : 0,
        cpuShort: (os.cpus()[0]?.model || '?').replace(/\(R\)|\(TM\)/g, '').trim(),
        cores,
        osType: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        memUsed: formatSize(usedMem),
        memTotal: formatSize(totalMem),
        heapUsed: formatSize(heap.heapUsed),
        rss: formatSize(heap.rss),
        diskTxt: disk ? `${formatSize(disk.used)} / ${formatSize(disk.total)}` : '-',
        swapTxt: (s => s ? `${formatSize(s.used)} / ${formatSize(s.total)} (${s.percent}%)` : 'tidak ada')(getSwap()),
        net: getNetwork(),
        runtime: isBun ? `Bun ${Bun.version}` : `Node ${process.version}`,
        engine: isBun ? 'JavaScriptCore' : `V8 ${process.versions.v8}`,
        botUpSec: Math.floor(process.uptime()),
        sysUpSec: Math.floor(os.uptime()),
        at: Date.now(),
    }
}

// ===== PAYLOAD GENERATOR =====
function buildHtml(d) {
    const DATA = JSON.stringify({
        cpu: d.cpu,
        ram: d.ram,
        disk: d.disk,
        botUpSec: d.botUpSec,
        sysUpSec: d.sysUpSec,
        at: d.at,
    }).replace(/</g, '\\u003c')

    return `<style>
*{box-sizing:border-box;margin:0;font-family:'Segoe UI',Arial,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{width:100%}
body{background:linear-gradient(165deg,#0a1526,#060c18 60%,#04080f);padding:8px;color:#e8f0ff;overflow-y:auto}
#app{max-width:420px;margin:0 auto}
.hdr{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid rgba(90,160,255,.25);border-radius:16px;background:linear-gradient(150deg,rgba(40,90,180,.25),rgba(10,25,50,.5));margin-bottom:8px}
.hdr img{width:52px;height:52px;border-radius:12px;object-fit:cover;border:1px solid rgba(120,180,255,.4)}
.hdr h1{font:900 16px 'Arial Black';color:#fff}
.hdr .st{display:flex;align-items:center;gap:5px;font-size:10px;color:#4ade80;margin-top:2px}
.hdr .st i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:blink 1.6s infinite}
@keyframes blink{50%{opacity:.35}}
.up{border:1px solid rgba(74,222,128,.3);border-radius:13px;background:rgba(74,222,128,.06);padding:9px 11px;margin-bottom:8px;text-align:center}
.up small{font:700 8px Arial;letter-spacing:1.5px;color:#5ea877}
.up b{display:block;font:900 17px 'Arial Black';color:#7dffab;font-variant-numeric:tabular-nums;margin-top:2px}
.up span{font:600 9px monospace;color:#9fb8d8}
.gauge{border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.04);padding:9px 11px;margin-bottom:7px}
.gl{display:flex;justify-content:space-between;font:700 10.5px monospace;margin-bottom:5px}
.gl b{color:#7db8ff}.gl span{color:#eaf3ff;font-variant-numeric:tabular-nums}
.bar{height:9px;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden}
.bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#3b82f6,#22d3ee);transition:width 1.8s cubic-bezier(.45,.05,.3,1);box-shadow:0 0 9px #38bdf866}
.bar.r i{background:linear-gradient(90deg,#f43f5e,#fb923c)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}
.cell{border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:7px 9px;background:rgba(255,255,255,.03)}
.cell i{display:block;font:700 7.5px Arial;font-style:normal;letter-spacing:1px;color:#7285a8}
.cell b{font:700 10.5px monospace;color:#dbe7ff;word-break:break-word}
.ft{display:flex;justify-content:space-between;font:600 8.5px monospace;color:#5d7396;padding:2px 4px}
.pulse{animation:pl 2.4s ease-in-out infinite}
@keyframes pl{50%{opacity:.45}}
</style>
<div id="app">
<div class="hdr"><img src="${BANNER}" onerror="this.remove()"><div><h1>📡 SERVER LIVE</h1><div class="st"><i></i>REALTIME MONITOR · <b id="spd">${d.speed || 0} ms</b></div></div></div>
<div class="up"><small>⏱️ BOT UPTIME — BERJALAN REALTIME</small><b id="up">-</b><span id="sys">-</span></div>
<div class="gauge"><div class="gl"><b>CPU LOAD</b><span id="cv">-</span></div><div class="bar" id="cb"><i style="width:0%"></i></div></div>
<div class="gauge"><div class="gl"><b>RAM</b><span id="rv">-</span></div><div class="bar" id="rb"><i style="width:0%"></i></div></div>
<div class="gauge"><div class="gl"><b>DISK</b><span id="dv">-</span></div><div class="bar" id="db"><i style="width:0%"></i></div></div>
<div class="grid">
<div class="cell"><i>OS</i><b>${d.osType}</b></div>
<div class="cell"><i>ARCH</i><b>${d.arch}</b></div>
<div class="cell"><i>CPU</i><b>${d.cores} core</b></div>
<div class="cell"><i>HEAP / RSS</i><b>${d.heapUsed} / ${d.rss}</b></div>
<div class="cell"><i>SWAP</i><b>${d.swapTxt}</b></div>
<div class="cell"><i>IP PRIMER</i><b>${d.net}</b></div>
<div class="cell" style="grid-column:1/-1"><i>RUNTIME</i><b>${d.runtime} · ${d.engine}</b></div>
</div>
<div class="ft"><span id="age">diperbarui 0 dtk lalu</span><b class="pulse">data monitor · ${d.botName}</b></div>
</div>
<script>
var D=${DATA};
function $(i){return document.getElementById(i)}
function fmt(s){var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;
return (d?d+'h ':'')+(h||d?h+'j ':'')+(m||h||d?m+'m ':'')+x+'s'}
function paint(cpu,ram,disk){
 $('cb').firstChild.style.width=cpu+'%';$('cv').textContent=cpu.toFixed(1)+'%';
 $('rb').firstChild.style.width=ram+'%';$('rv').textContent=ram.toFixed(1)+'%';
 $('db').firstChild.style.width=disk+'%';$('dv').textContent=disk.toFixed(1)+'%';
 $('cb').className='bar'+(cpu>85?' r':'');$('rb').className='bar'+(ram>85?' r':'');$('db').className='bar'+(disk>90?' r':'');
}
function tick(){
var el=Math.floor((Date.now()-D.at)/1000);
 $('up').textContent=fmt(D.botUpSec+el);
 $('sys').textContent='system: '+fmt(D.sysUpSec+el);
 $('age').textContent='diperbarui '+el+' dtk lalu';
}
// ---- animasi "bernafas": fluktuasi fake di sekitar nilai asli ----
function breathe(){
var n=function(v,amp,lo,hi){
var x=v+(Math.random()*2-1)*amp;
return Math.max(lo,Math.min(hi,x));
};
paint(n(D.cpu,3,2,99),n(D.ram,1.5,2,99),n(D.disk,.6,1,99));
}
// loading awal: bar naik dari 0 → nilai, kesan hidup pas pertama muncul
paint(0,0,0);setTimeout(function(){breathe()},350);
setInterval(breathe,2000);
setInterval(tick,1000);tick();
</script>`
}

async function sendPingLive(sock, chatId, html, judul, m) {
    const responseId = randomUUID()
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: responseId,
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: []
                }
            }
        }]
    })).toString('base64')

    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: responseId,
                verificationMetadata: {
                    proofs: [{
                        version: 1,
                        useCase: 1,
                        signature: SIG,
                        certificateChain: [CERT1, CERT2]
                    }]
                }
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{
                        messageType: 2,
                        messageText: judul
                    }],
                    unifiedResponse: {
                        data
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "867051314767696@bot"
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }

    return sock.message.send(chatId, payload, {
        messageId: responseId,
        additionalAttributes: { type: 'text' },
        quoted: m
    })
}

// ===== HANDLER =====
export default {
    command: 'pinglive',
    alias: ['plive'],
    category: 'bot',
    description: 'Server Inspector Realtime',

    async execute(m, { sock }) {
        const start = Date.now()
        await sock.sendReact?.(m.chat, '📡', m.id).catch(() => {})

        try {
            const d = collect(sock)
            d.speed = Date.now() - start
            const html = buildHtml(d)
            
            await sendPingLive(sock, m.chat, html, '📡 SERVER LIVE', m)
        } catch (e) {
            console.error('[PINGLIVE]', e?.message || e)
            return m.reply('⚠️ Gagal kirim kartu live: ' + (e?.message || e))
        }
    }
}