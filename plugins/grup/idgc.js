// plugins/grup/idgc.js

export default {
  command: 'idgc',
  alias: ['idgrup', 'idgroup', 'grupid', 'groupid', 'cekidgc'],
  category: 'grup',
  description: `Tampilkan *ID Grup* saat ini atau dari link grup.

\`Cara Penggunaan:\`
> \`.idgc\` (di dalam grup)
> \`.cekidgc [link grup wa]\` (bisa di mana saja)`,
  typing: true,

  // Sesuaikan parameter kedua (conn/client/sock) dengan framework bot yang kamu gunakan
  async execute(m, { sock, text }) { 
    let groupId = '';
    let groupName = 'Grup';

    // 1. Jika user memberikan link grup
    if (text && text.includes('chat.whatsapp.com/')) {
      // Ekstrak kode invite dari link
      const inviteCode = text.match(/chat\.whatsapp\.com\/([\w\d]+)/i)?.[1];
      
      if (!inviteCode) {
        return m.reply('❌ Link grup tidak valid.');
      }

      try {
        // Ambil info grup berdasarkan kode invite menggunakan Baileys
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);
        groupId = groupInfo.id;
        groupName = groupInfo.subject || 'Grup dari Link';
      } catch (error) {
        return m.reply('❌ Gagal mengambil data. Pastikan link grup masih aktif dan tidak di-reset.');
      }
    } 
    // 2. Jika tidak ada link, jalankan fungsi default (cek grup saat ini)
    else {
      // Pastikan perintah dijalankan di dalam grup jika tanpa link
      if (!m.isGroup) {
        return m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup, atau sertakan link grup WhatsApp!\n\n*Contoh:* `.cekidgc https://chat.whatsapp.com/abcd123...`');
      }
      
      groupId = m.chat;
      groupName = 'Grup Ini';
    }

    // 3. Kirim hasil dengan Interactive Message
    await m.reply({
      interactiveMessage: {
        header: { title: `📍 Info Group ID`, hasMediaAttachment: false },
        body: {
          text: `Nama Grup: *${groupName}*\n📌 *ID Grup:*\n\`\`\`${groupId}\`\`\``
        },
        footer: { text: 'Gunakan tombol di bawah untuk menyalin ID' },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'cta_copy',
              buttonParamsJson: JSON.stringify({
                display_text: '📋 Salin ID Grup',
                copy_code: groupId
              })
            }
          ],
          messageVersion: 1
        }
      }
    });
  }
}