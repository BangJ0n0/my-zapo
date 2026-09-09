// plugins/game/flappy.js

import { randomUUID } from 'crypto'

// ============================================================
//  SIGNATURE & CERTIFICATE
// ============================================================
const SIG = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YcN55YRyad2+ZA=="
const CERT1 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg"
const CERT2 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZlXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYvNBkuLoZnQAq4j8yRekrQ=="

const FLAPPY_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { box-sizing: border-box; user-select: none; -webkit-user-select: none; touch-action: none; }
  body, html { 
    margin: 0; padding: 0; width: 100%; min-height: 100%; 
    background: transparent; display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  
  .wrap { width: 100%; max-width: 620px; margin: auto; padding: 7px; }
  
  #game-wrapper {
    position: relative; width: 100%; aspect-ratio: 3 / 4; 
    background: #4ec0ca; overflow: hidden;
    border: 4px solid #fff; border-radius: 16px;
    box-shadow: 0 14px 35px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.5);
  }
  
  canvas { display: block; width: 100%; height: 100%; }
  
  #ui-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 10;
  }
  
  #score {
    position: absolute; top: 8%; font-size: 15vw;
    font-family: 'Arial Black', Impact, sans-serif; color: #fff;
    text-shadow: -3px -3px 0 #543847, 3px -3px 0 #543847, -3px 3px 0 #543847, 3px 3px 0 #543847, 0 8px 0 rgba(0,0,0,0.2);
    z-index: 10;
  }
  
  .panel {
    background: #ded895; border: 4px solid #543847; border-radius: 12px;
    padding: 20px; text-align: center; color: #543847;
    font-family: 'Arial Black', sans-serif; width: 85%;
    box-shadow: 0 10px 0 rgba(0,0,0,0.2), inset 0 0 10px rgba(255,255,255,0.8);
    transform: scale(0); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .panel.show { transform: scale(1); }
  
  h1 { margin: 0 0 10px; font-size: clamp(22px, 7vw, 32px); color: #f26d21; text-shadow: 2px 2px 0 #fff, -1px -1px 0 #fff; }
  
  .score-board {
    background: #c6b868; border: 3px solid #543847; border-radius: 8px;
    padding: 10px; display: flex; justify-content: space-between; align-items: center; margin: 15px 0;
  }
  .medal-box { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #543847; background: #a59b56; display:flex; align-items:center; justify-content:center; font-size: 30px; box-shadow: inset 0 5px 0 rgba(255,255,255,0.3);}
  .score-details { text-align: right; }
  .s-label { font-size: 12px; color: #f26d21; margin: 0; }
  .s-val { font-size: 28px; margin: 0; color: #fff; text-shadow: 2px 2px 0 #543847; }
  
  .blink { animation: blinker 1s linear infinite; font-size: 14px; margin-top: 10px; color: #f26d21;}
  @keyframes blinker { 50% { opacity: 0; } }
</style>
</head>
<body>

<div class="wrap">
  <div id="game-wrapper">
    <div id="score">0</div>
    <canvas id="cvs" width="450" height="600"></canvas>
    
    <div id="ui-layer">
      <div class="panel show" id="main-panel">
        <h1 id="m-title">FLAPPY BIRD</h1>
        <div id="score-container" style="display:none;">
          <div class="score-board">
            <div>
              <p class="s-label" style="text-align:left;">MEDAL</p>
              <div class="medal-box" id="medal">🥉</div>
            </div>
            <div class="score-details">
              <p class="s-label">SCORE</p>
              <p class="s-val" id="f-score">0</p>
              <p class="s-label" style="margin-top:5px;">BEST</p>
              <p class="s-val" id="f-best">0</p>
            </div>
          </div>
        </div>
        <div class="blink" id="tap-msg">TAP LAYAR UNTUK MULAI</div>
      </div>
    </div>
  </div>
</div>

<script>
  const cvs = document.getElementById('cvs');
  const ctx = cvs.getContext('2d');
  const wrapper = document.getElementById('game-wrapper');
  const panel = document.getElementById('main-panel');
  const title = document.getElementById('m-title');
  const scoreBoard = document.getElementById('score');
  const scoreContainer = document.getElementById('score-container');
  const fScore = document.getElementById('f-score');
  const fBest = document.getElementById('f-best');
  const medalEl = document.getElementById('medal');
  const tapMsg = document.getElementById('tap-msg');

  let frames = 0, score = 0, best = 0;
  let state = 'START'; 
  let bgX = 0, fgX = 0;

  // --- AUDIO API ---
  let actx = null;
  function initAudio() {
    if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === 'suspended') actx.resume();
  }
  function playSound(type) {
    if(!actx) return;
    const now = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain); gain.connect(actx.destination);
    
    if(type === 'flap') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if(type === 'score') {
      osc.type = 'square'; osc.frequency.setValueAtTime(987, now); osc.frequency.setValueAtTime(1318, now + 0.1); 
      gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if(type === 'hit') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  }

  // Objek Burung
  const bird = {
    x: 100, y: 250, w: 40, h: 28,
    v: 0, gravity: 0.35, jump: -7.5, rot: 0,
    draw: function() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      
      // Badan (Kuning)
      ctx.fillStyle = '#f4c824'; ctx.strokeStyle = '#543847'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      
      // Bibir (Orange)
      ctx.fillStyle = '#f26d21';
      ctx.beginPath(); ctx.ellipse(15, 3, 12, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      
      // Mata (Putih & Hitam)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(8, -6, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#543847';
      ctx.beginPath(); ctx.arc(11, -6, 2.5, 0, Math.PI*2); ctx.fill();
      
      // Sayap (Putih) - Animasi Ngepak!
      let wingY = (state === 'PLAY' && this.v < 0) ? Math.sin(frames * 0.5) * 8 : 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-6, 2 + wingY, 12, 7, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      
      ctx.restore();
    },
    update: function() {
      this.v += this.gravity; this.y += this.v;
      
      // Rotasi Fisika
      if (this.v < this.jump + 2) this.rot = -25 * Math.PI/180;
      else if (this.v > 0) { this.rot += 4 * Math.PI/180; if(this.rot > 90 * Math.PI/180) this.rot = 90 * Math.PI/180; }
      else this.rot = -25 * Math.PI/180;
      
      if (this.y + this.h/2 >= cvs.height - 70) { this.y = cvs.height - 70 - this.h/2; if(state === 'PLAY') endGame(); }
      if (this.y - this.h/2 <= 0) { this.y = this.h/2; this.v = 0; }
    },
    reset: function() { this.y = 250; this.v = 0; this.rot = 0; }
  };

  // Objek Pipa
  const pipes = {
    items: [], w: 70, gap: 170, dx: 3.5,
    draw: function() {
      for (let i = 0; i < this.items.length; i++) {
        let p = this.items[i];
        let capH = 30; // Bibir pipa
        
        ctx.fillStyle = '#73bf2e'; ctx.strokeStyle = '#543847'; ctx.lineWidth = 3;
        
        // Atas
        ctx.fillRect(p.x, 0, this.w, p.top - capH); ctx.strokeRect(p.x, 0, this.w, p.top - capH);
        ctx.fillRect(p.x - 4, p.top - capH, this.w + 8, capH); ctx.strokeRect(p.x - 4, p.top - capH, this.w + 8, capH);
        
        // Bawah
        let botY = p.bottom; let floorY = cvs.height - 70;
        ctx.fillRect(p.x, botY + capH, this.w, floorY - botY - capH); ctx.strokeRect(p.x, botY + capH, this.w, floorY - botY - capH);
        ctx.fillRect(p.x - 4, botY, this.w + 8, capH); ctx.strokeRect(p.x - 4, botY, this.w + 8, capH);
        
        // Highlight Pipa (Biar efek 3D Classic)
        ctx.fillStyle = '#9ce659';
        ctx.fillRect(p.x + 5, 0, 10, p.top - capH); ctx.fillRect(p.x + 5, p.top - capH + 2, 10, capH - 4);
        ctx.fillRect(p.x + 5, botY + capH, 10, floorY - botY - capH); ctx.fillRect(p.x + 5, botY + 2, 10, capH - 4);
      }
    },
    update: function() {
      if (frames % 90 === 0) {
        let minH = 60, maxH = cvs.height - 70 - this.gap - minH;
        let topH = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
        this.items.push({ x: cvs.width, top: topH, bottom: topH + this.gap, pass: false });
      }
      
      for (let i = 0; i < this.items.length; i++) {
        let p = this.items[i]; p.x -= this.dx;
        
        // Hitbox lebih fair (-6 toleransi)
        if (bird.x + bird.w/2 - 6 > p.x && bird.x - bird.w/2 + 6 < p.x + this.w &&
            (bird.y - bird.h/2 + 6 < p.top || bird.y + bird.h/2 - 6 > p.bottom)) { endGame(); }

        if (p.x + this.w < bird.x && !p.pass) { score++; scoreBoard.innerText = score; p.pass = true; playSound('score'); }
        if (p.x + this.w < 0) { this.items.shift(); i--; }
      }
    },
    reset: function() { this.items = []; }
  };

  // Lingkungan (Background & Lantai)
  const env = {
    drawBg: function() {
      ctx.fillStyle = '#4ec0ca'; ctx.fillRect(0, 0, cvs.width, cvs.height);
      // Siluet Kota/Awan jalan pelan
      ctx.fillStyle = '#8ce6b0';
      ctx.beginPath();
      for(let i=0; i<3; i++) {
        let x = (bgX % 300) + (i*300);
        ctx.arc(x - 50, cvs.height - 70, 50, Math.PI, 0);
        ctx.arc(x + 20, cvs.height - 70, 70, Math.PI, 0);
        ctx.arc(x + 100, cvs.height - 70, 50, Math.PI, 0);
      }
      ctx.fill();
    },
    drawFg: function() {
      let floorY = cvs.height - 70;
      ctx.fillStyle = '#ded895'; ctx.fillRect(0, floorY, cvs.width, 70);
      ctx.strokeStyle = '#543847'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(cvs.width, floorY); ctx.stroke();
      
      // Garis ilusi kecepatan
      ctx.lineWidth = 4; ctx.strokeStyle = '#c6b868';
      for(let i = fgX; i < cvs.width + 50; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, floorY); ctx.lineTo(i - 30, cvs.height); ctx.stroke();
      }
      ctx.strokeStyle = '#a59b56';
      for(let i = fgX + 15; i < cvs.width + 50; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, floorY); ctx.lineTo(i - 30, cvs.height); ctx.stroke();
      }
    }
  };

  function getMedal(s) {
    if(s >= 40) return { e: '👑', c: '#ffce54' }; // Crown
    if(s >= 30) return { e: '🥇', c: '#ffce54' }; // Gold
    if(s >= 20) return { e: '🥈', c: '#a0aab5' }; // Silver
    if(s >= 10) return { e: '🥉', c: '#c87f63' }; // Bronze
    return { e: '🪵', c: '#a59b56' }; // Wood
  }

  function endGame() {
    if (state === 'OVER') return;
    state = 'OVER'; playSound('hit');
    if (score > best) best = score;
    
    scoreBoard.style.display = 'none';
    title.innerText = 'GAME OVER';
    tapMsg.innerText = 'TAP UNTUK RESTART';
    
    let m = getMedal(score);
    medalEl.innerText = m.e;
    medalEl.style.background = m.c;
    fScore.innerText = score;
    fBest.innerText = best;
    
    scoreContainer.style.display = 'block';
    panel.classList.add('show');
  }

  wrapper.addEventListener('pointerdown', function(e) {
    e.preventDefault(); initAudio();
    if (state === 'START') {
      state = 'PLAY'; panel.classList.remove('show'); scoreBoard.style.display = 'block';
      bird.v = bird.jump; playSound('flap');
    } else if (state === 'PLAY') {
      bird.v = bird.jump; playSound('flap');
    } else if (state === 'OVER') {
      bird.reset(); pipes.reset(); score = 0; scoreBoard.innerText = score; frames = 0;
      state = 'START';
      title.innerText = 'FLAPPY BIRD'; tapMsg.innerText = 'TAP LAYAR UNTUK MULAI';
      scoreContainer.style.display = 'none'; panel.classList.add('show');
    }
  });

  function loop() {
    env.drawBg();
    pipes.draw();
    env.drawFg();
    bird.draw();

    if (state === 'PLAY') {
      bird.update(); pipes.update();
      bgX -= 1; fgX -= 3; if (fgX <= -40) fgX = 0;
      frames++;
    } else if (state === 'OVER') {
      bird.update(); 
    }
    requestAnimationFrame(loop);
  }
  
  loop();
</script>
</body>
</html>`

async function sendFlappyBird(sock, chatId, html, judul, m) {
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

    // Menggunakan send bawaan Zapo-JS dan menyelipkan { type: 'text' }
    return sock.message.send(chatId, payload, {
        messageId: responseId,
        additionalAttributes: { type: 'text' },
        quoted: m
    })
}

export default {
  command: 'flappy',
  alias: ['flappybird', 'fb'],
  category: 'fun',
  description: 'Flappy Bird Classic Arcade (Full Dekor).',
  typing: true,

  async execute(m, { sock }) {
    try {
      // Reaksi loading agar terasa responsif tanpa perlu edit message
      await sock.sendReact?.(m.chat, '⏳', m.id).catch(() => {})
      
      await sendFlappyBird(sock, m.chat, FLAPPY_HTML, 'FLAPPY BIRD - ARCADE EDITION', m)
      
      // Update reaksi jadi stik game saat sukses
      await sock.sendReact?.(m.chat, '🎮', m.id).catch(() => {})
    } catch (err) {
      console.error('[FLAPPY ERROR]', err?.message || err)
      return sock.message.send(m.chat, {
        text: `❌ Gagal memuat game:\n${err.message || err}`
      }, {
        additionalAttributes: { type: "text" }
      })
    }
  }
}